from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.utils.translation import gettext as _

from .serializers import RegisterSerializer, UserSerializer
from organizations.models import Organization, Membership, Invitation
from deals.models import Pipeline

User = get_user_model()


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user = User.objects.create_user(
        email=data["email"],
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
    )

    invite_token = data.get("invite_token", "")
    org = None

    if invite_token:
        # Try to accept invitation directly — skip org creation
        try:
            invitation = Invitation.objects.get(token=invite_token, status="pending")
            if invitation.expires_at >= timezone.now():
                Membership.objects.create(
                    organization=invitation.organization,
                    user=user,
                    role=invitation.role,
                )
                invitation.status = "accepted"
                invitation.save(update_fields=["status"])
                org = invitation.organization
        except Invitation.DoesNotExist:
            pass

    if not org:
        # Default behavior — create personal org
        org_name = data.get("organization_name") or _("Organisation de {name}").format(name=user.first_name)
        org = Organization.objects.create(
            name=org_name,
            slug=f"user-{user.id.hex[:8]}",
        )
        Membership.objects.create(
            organization=org,
            user=user,
            role="owner",
        )
        Pipeline.create_defaults(org)
        from deals.models import DealLossReason
        DealLossReason.create_defaults(org)
        from organizations.models import OrganizationSettings
        OrganizationSettings.objects.create(organization=org)
        from contacts.scoring import create_default_scoring_rules
        create_default_scoring_rules(org)
        from organizations.views import create_default_categories
        create_default_categories(org)

    # Auto-accept other pending invitations for this email
    pending = Invitation.objects.filter(email=user.email, status="pending")
    for invitation in pending:
        if invitation.expires_at >= timezone.now():
            Membership.objects.create(
                organization=invitation.organization,
                user=user,
                role=invitation.role,
            )
            invitation.status = "accepted"
            invitation.save(update_fields=["status"])

    refresh = RefreshToken.for_user(user)
    return Response({
        "user": UserSerializer(user).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")
    user = authenticate(request, email=email, password=password)
    if user is None:
        return Response(
            {"detail": "Invalid credentials"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        "user": UserSerializer(user).data,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        user = request.user
        allowed_fields = [
            "email_notifications", "preferred_language",
            "email_notify_task_reminder", "email_notify_task_assigned",
            "email_notify_task_due", "email_notify_daily_digest",
            "email_notify_deal_update", "email_notify_mention",
            "email_notify_new_comment", "email_notify_reaction",
            "email_notify_import_complete", "email_notify_invitation",
            "email_notify_workflow",
        ]
        update_fields = []
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                update_fields.append(field)
        if update_fields:
            user.save(update_fields=update_fields)
        return Response(UserSerializer(user).data)
    return Response(UserSerializer(request.user).data)
