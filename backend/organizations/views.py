import uuid
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.text import slugify

from .models import Organization, Membership
from .serializers import OrganizationSerializer


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

    org = Organization.objects.create(
        name=serializer.validated_data["name"],
        slug=slug,
    )
    Membership.objects.create(
        organization=org, user=request.user, role="owner"
    )
    return Response(
        OrganizationSerializer(org).data, status=status.HTTP_201_CREATED
    )
