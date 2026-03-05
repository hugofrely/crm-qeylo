import logging

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmailAccount
from .oauth import (
    get_gmail_auth_url,
    get_outlook_auth_url,
    exchange_gmail_code,
    exchange_outlook_code,
)
from .serializers import EmailAccountSerializer, SendEmailSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OAuth connection endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect_gmail(request):
    """Return the Google OAuth consent URL."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    url = get_gmail_auth_url(str(request.user.id), str(org.id))
    return Response({"url": url})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def callback_gmail(request):
    """Handle Google OAuth callback."""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error or not code or not state:
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_error=true")

    try:
        exchange_gmail_code(code, state)
    except Exception:
        logger.exception("Gmail OAuth callback error")
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_error=true")

    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_connected=gmail")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect_outlook(request):
    """Return the Microsoft OAuth consent URL."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    url = get_outlook_auth_url(str(request.user.id), str(org.id))
    return Response({"url": url})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def callback_outlook(request):
    """Handle Microsoft OAuth callback."""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error or not code or not state:
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_error=true")

    try:
        exchange_outlook_code(code, state)
    except Exception:
        logger.exception("Outlook OAuth callback error")
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_error=true")

    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/settings?email_connected=outlook")


# ---------------------------------------------------------------------------
# Email account management
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_accounts(request):
    """List the current user's connected email accounts."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)
    accounts = EmailAccount.objects.filter(user=request.user, organization=org)
    return Response(EmailAccountSerializer(accounts, many=True).data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def disconnect_account(request, account_id):
    """Disconnect (delete) an email account."""
    org = request.organization
    try:
        account = EmailAccount.objects.get(id=account_id, user=request.user, organization=org)
    except EmailAccount.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    account.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Send email (placeholder — actual service created in Task 4)
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_email_view(request):
    """Send an email via the user's connected email account."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = SendEmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        from .service import send_email
        sent = send_email(
            user=request.user,
            organization=org,
            **serializer.validated_data,
        )
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as e:
        return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except Exception:
        logger.exception("Email send error")
        return Response(
            {"detail": "Impossible d'envoyer l'email. Réessayez."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "id": str(sent.id),
        "provider_message_id": sent.provider_message_id,
        "sent_at": sent.sent_at.isoformat(),
    })
