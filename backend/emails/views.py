import logging

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmailAccount, EmailTemplate, Email, EmailThread
from .oauth import (
    get_gmail_auth_url,
    get_outlook_auth_url,
    exchange_gmail_code,
    exchange_outlook_code,
)
from .serializers import (
    EmailAccountSerializer,
    EmailSerializer,
    EmailSyncStateSerializer,
    EmailTemplateRenderSerializer,
    EmailTemplateSerializer,
    EmailThreadSerializer,
    SendEmailSerializer,
)
from .template_rendering import build_template_context, render_email_template

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OAuth connection endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect_gmail(request):
    """Return the Google OAuth consent URL."""
    from subscriptions.permissions import require_feature
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    require_feature(org, "email_integration")
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
    from subscriptions.permissions import require_feature
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    require_feature(org, "email_integration")
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


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def template_list_create(request):
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        qs = EmailTemplate.objects.filter(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org)
        )
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(name__icontains=search)
        tag = request.query_params.get("tag", "").strip()
        if tag:
            qs = qs.filter(tags__contains=[tag])
        if request.query_params.get("mine_only") == "true":
            qs = qs.filter(created_by=request.user)
        if request.query_params.get("shared_only") == "true":
            qs = qs.filter(is_shared=True)
        return Response(EmailTemplateSerializer(qs.distinct(), many=True).data)

    serializer = EmailTemplateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(organization=org, created_by=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def template_detail(request, template_id):
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        template = EmailTemplate.objects.get(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(EmailTemplateSerializer(template).data)

    if template.created_by != request.user:
        return Response(
            {"detail": "Seul le createur peut modifier ce template."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = EmailTemplateSerializer(template, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def template_render(request, template_id):
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        template = EmailTemplate.objects.get(
            Q(created_by=request.user, organization=org)
            | Q(is_shared=True, organization=org),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = EmailTemplateRenderSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    contact = None
    deal = None
    contact_id = serializer.validated_data.get("contact_id")
    deal_id = serializer.validated_data.get("deal_id")

    if contact_id:
        from contacts.models import Contact
        contact = Contact.objects.filter(id=contact_id, organization=org).first()
    if deal_id:
        from deals.models import Deal
        deal = Deal.objects.select_related("stage").filter(id=deal_id, organization=org).first()

    context = build_template_context(contact=contact, deal=deal)
    rendered_subject, rendered_body = render_email_template(
        template.subject, template.body_html, context
    )

    return Response({
        "subject": rendered_subject,
        "body_html": rendered_body,
    })


# ---------------------------------------------------------------------------
# Inbox endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inbox_threads(request):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    threads = EmailThread.objects.filter(
        organization=org,
        email_account__user=request.user,
    ).prefetch_related("emails")

    account_id = request.query_params.get("account")
    if account_id:
        threads = threads.filter(email_account_id=account_id)

    is_unread = request.query_params.get("unread")
    if is_unread == "true":
        threads = threads.filter(emails__is_read=False).distinct()

    contact_id = request.query_params.get("contact")
    if contact_id:
        threads = threads.filter(contacts__id=contact_id)

    search = request.query_params.get("search", "").strip()
    if search:
        threads = threads.filter(
            Q(subject__icontains=search)
            | Q(emails__snippet__icontains=search)
            | Q(emails__from_address__icontains=search)
        ).distinct()

    page = int(request.query_params.get("page", 1))
    page_size = 20
    total = threads.count()
    threads = threads[(page - 1) * page_size : page * page_size]

    return Response({
        "count": total,
        "results": EmailThreadSerializer(threads, many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def thread_emails(request, thread_id):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    try:
        thread = EmailThread.objects.get(
            id=thread_id, organization=org, email_account__user=request.user,
        )
    except EmailThread.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    emails = thread.emails.all().order_by("sent_at")
    return Response(EmailSerializer(emails, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_email_read(request, email_id):
    org = request.organization
    try:
        email = Email.objects.get(
            id=email_id, organization=org, email_account__user=request.user,
        )
    except Email.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    is_read = request.data.get("is_read", True)
    email.is_read = is_read
    email.save(update_fields=["is_read", "updated_at"])
    return Response({"is_read": email.is_read})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def contact_emails(request, contact_id):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    emails = Email.objects.filter(
        organization=org,
        email_account__user=request.user,
        contact_id=contact_id,
    )
    return Response(EmailSerializer(emails, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trigger_sync(request):
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)

    accounts = EmailAccount.objects.filter(user=request.user, organization=org, is_active=True)
    from .tasks import sync_email_account
    for account in accounts:
        sync_email_account.delay(str(account.id))

    return Response({"detail": "Sync started."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sync_status(request):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    from .models import EmailSyncState
    states = EmailSyncState.objects.filter(
        email_account__user=request.user,
        email_account__organization=org,
    ).select_related("email_account")

    result = []
    for state in states:
        result.append({
            "account_id": str(state.email_account.id),
            "email": state.email_account.email_address,
            "provider": state.email_account.provider,
            **EmailSyncStateSerializer(state).data,
        })
    return Response(result)
