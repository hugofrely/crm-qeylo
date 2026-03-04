from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import RegisterSerializer, UserSerializer
from organizations.models import Organization, Membership
from deals.models import PipelineStage

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

    # Create personal organization
    org = Organization.objects.create(
        name=f"{user.first_name}'s Workspace",
        slug=f"user-{user.id.hex[:8]}",
    )
    Membership.objects.create(
        organization=org,
        user=user,
        role="owner",
    )
    PipelineStage.create_defaults(org)

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)
