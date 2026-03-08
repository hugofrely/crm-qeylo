import uuid
from datetime import timedelta

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from contacts.models import ContactCategory
from notifications.email import send_invitation_email
from notifications.helpers import create_notification

from subscriptions.models import Subscription

from .models import Invitation, Membership, Organization, OrganizationSettings
from .serializers import (
    InvitationSerializer,
    MemberSerializer,
    OrganizationSerializer,
)

User = get_user_model()

DEFAULT_CATEGORIES = [
    {"name": "Non contacté", "color": "#3b82f6", "order": 0},
    {"name": "Prospect", "color": "#eab308", "order": 1},
    {"name": "Qualifié", "color": "#f97316", "order": 2},
    {"name": "Client", "color": "#22c55e", "order": 3},
    {"name": "Ancien client", "color": "#ef4444", "order": 4},
    {"name": "Partenaire", "color": "#a855f7", "order": 5},
    {"name": "VIP", "color": "#f59e0b", "order": 6},
]


def create_default_categories(organization):
    for cat in DEFAULT_CATEGORIES:
        ContactCategory.objects.create(
            organization=organization,
            name=cat["name"],
            color=cat["color"],
            order=cat["order"],
            is_default=True,
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def organization_list(request):
    if request.method == "GET":
        orgs = Organization.objects.filter(memberships__user=request.user)
        return Response(OrganizationSerializer(orgs, many=True).data)
    serializer = OrganizationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    slug = slugify(serializer.validated_data["name"])
    if Organization.objects.filter(slug=slug).exists():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    org = Organization.objects.create(name=serializer.validated_data["name"], slug=slug)
    Membership.objects.create(organization=org, user=request.user, role="owner")
    create_default_categories(org)
    OrganizationSettings.objects.create(organization=org)
    Subscription.objects.create(organization=org)
    return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def member_list(request, org_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    if not Membership.objects.filter(organization=org, user=request.user).exists():
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    memberships = Membership.objects.filter(organization=org).select_related("user")
    invitations = Invitation.objects.filter(organization=org, status="pending")
    return Response({
        "members": MemberSerializer(memberships, many=True).data,
        "invitations": InvitationSerializer(invitations, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_member(request, org_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    membership = Membership.objects.filter(organization=org, user=request.user).first()
    if not membership or membership.role not in ("owner", "admin"):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    email = request.data.get("email", "").strip().lower()
    role = request.data.get("role", "member")
    if not email:
        return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
    if role not in ("admin", "member"):
        return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
    from subscriptions.permissions import require_can_add_member
    require_can_add_member(org)
    existing_user = User.objects.filter(email=email).first()
    if existing_user and Membership.objects.filter(organization=org, user=existing_user).exists():
        return Response({"detail": "Already a member"}, status=status.HTTP_400_BAD_REQUEST)
    if Invitation.objects.filter(organization=org, email=email, status="pending").exists():
        return Response({"detail": "Invitation already sent"}, status=status.HTTP_400_BAD_REQUEST)
    invitation = Invitation.objects.create(
        organization=org,
        invited_by=request.user,
        email=email,
        role=role,
        expires_at=timezone.now() + timedelta(days=7),
    )
    invite_link = f"{django_settings.FRONTEND_URL}/invite/accept/{invitation.token}"
    send_invitation_email(email, org.name, invite_link)
    return Response(InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_member(request, org_id, user_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role != "owner":
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    target = Membership.objects.filter(organization=org, user_id=user_id).first()
    if not target:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    if str(target.user_id) == str(request.user.id):
        return Response({"detail": "Cannot remove yourself"}, status=status.HTTP_400_BAD_REQUEST)
    target.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_member_role(request, org_id, user_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role != "owner":
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    role = request.data.get("role")
    if role not in ("admin", "member"):
        return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
    target = Membership.objects.filter(organization=org, user_id=user_id).first()
    if not target:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    target.role = role
    target.save(update_fields=["role"])
    return Response(MemberSerializer(target).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def accept_invitation(request, token):
    try:
        invitation = Invitation.objects.get(token=token, status="pending")
    except Invitation.DoesNotExist:
        return Response({"detail": "Invalid or expired invitation"}, status=status.HTTP_404_NOT_FOUND)
    if invitation.expires_at < timezone.now():
        invitation.status = "expired"
        invitation.save(update_fields=["status"])
        return Response({"detail": "Invitation expired"}, status=status.HTTP_410_GONE)
    if not request.user.is_authenticated:
        return Response({
            "requires_auth": True,
            "email": invitation.email,
            "organization_name": invitation.organization.name,
        })
    if Membership.objects.filter(organization=invitation.organization, user=request.user).exists():
        return Response({"detail": "Already a member"}, status=status.HTTP_400_BAD_REQUEST)
    Membership.objects.create(
        organization=invitation.organization,
        user=request.user,
        role=invitation.role,
    )
    invitation.status = "accepted"
    invitation.save(update_fields=["status"])
    create_notification(
        organization=invitation.organization,
        recipient=request.user,
        type="invitation",
        title=f"Bienvenue dans {invitation.organization.name}",
        message=f"Vous avez rejoint l'organisation {invitation.organization.name}.",
        link="/settings/organization",
    )
    return Response({"status": "accepted", "organization": OrganizationSerializer(invitation.organization).data})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def member_search(request, org_id):
    q = request.query_params.get("q", "").strip()
    members = Membership.objects.filter(
        organization_id=org_id,
    ).select_related("user")

    if q:
        from django.db.models import Q
        members = members.filter(
            Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
            | Q(user__email__icontains=q)
        )

    results = []
    for m in members[:20]:
        u = m.user
        results.append({
            "id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "name": f"{u.first_name} {u.last_name}".strip() or u.email,
        })

    return Response(results)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def organization_settings(request, org_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    if not Membership.objects.filter(organization=org, user=request.user).exists():
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    settings_obj, _ = OrganizationSettings.objects.get_or_create(organization=org)

    if request.method == "GET":
        from .serializers import OrganizationSettingsSerializer
        return Response(OrganizationSettingsSerializer(settings_obj).data)

    # PATCH — only owner/admin
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role not in ("owner", "admin"):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    from .serializers import OrganizationSettingsSerializer
    serializer = OrganizationSettingsSerializer(settings_obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)
