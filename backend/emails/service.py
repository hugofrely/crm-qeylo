"""
Email sending service — sends via Gmail API or Microsoft Graph.
"""
import base64
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
from django.utils import timezone
from django.utils.translation import gettext as _

from contacts.models import Contact
from notes.models import TimelineEntry

from .models import EmailAccount, SentEmail, EmailTemplate
from .oauth import get_valid_access_token
from .template_rendering import render_email_template, build_template_context

logger = logging.getLogger(__name__)


def send_email(
    user,
    organization,
    subject: str,
    body_html: str,
    contact_id: str | None = None,
    to_email: str = "",
    provider: str = "",
    template_id: str | None = None,
) -> SentEmail:
    """
    Send an email via the user's connected account.
    Returns the created SentEmail record.
    Raises PermissionError if no account, ValueError if invalid input.
    """
    # Resolve recipient
    contact = None
    if contact_id:
        try:
            contact = Contact.objects.get(id=contact_id, organization=organization)
        except Contact.DoesNotExist:
            raise ValueError(_("Contact {contact_id} introuvable.").format(contact_id=contact_id))
        if not to_email:
            to_email = contact.email
    if not to_email:
        raise ValueError(_("Ce contact n'a pas d'adresse email."))

    # Resolve template if provided
    template = None
    if template_id:
        try:
            template = EmailTemplate.objects.get(id=template_id, organization=organization)
        except EmailTemplate.DoesNotExist:
            raise ValueError(_("Template {template_id} introuvable.").format(template_id=template_id))
        context = build_template_context(contact=contact)
        subject, body_html = render_email_template(template.subject, template.body_html, context)

    # Resolve email account
    accounts = EmailAccount.objects.filter(
        user=user, organization=organization, is_active=True,
    )
    if provider:
        accounts = accounts.filter(provider=provider)

    account = accounts.first()
    if not account:
        raise PermissionError(_("Connectez un compte email dans les paramètres."))

    # Get valid token
    access_token = get_valid_access_token(account)

    # Send via provider
    if account.provider == EmailAccount.Provider.GMAIL:
        message_id = _send_via_gmail(access_token, account.email_address, to_email, subject, body_html)
    else:
        message_id = _send_via_outlook(access_token, to_email, subject, body_html)

    # Log in DB
    sent = SentEmail.objects.create(
        organization=organization,
        sender=user,
        email_account=account,
        contact=contact,
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        provider_message_id=message_id,
        template=template,
    )

    # Also create Email record for unified inbox
    from .models import Email
    Email.objects.create(
        organization=organization,
        email_account=account,
        provider_message_id=message_id or "",
        direction=Email.Direction.OUTBOUND,
        from_address=account.email_address,
        from_name=f"{user.first_name} {user.last_name}".strip(),
        to_addresses=[{"name": "", "address": to_email}],
        subject=subject,
        body_html=body_html,
        contact=contact,
        sent_at=timezone.now(),
        is_read=True,
    )

    # Create timeline entry
    if contact:
        TimelineEntry.objects.create(
            organization=organization,
            created_by=user,
            contact=contact,
            entry_type=TimelineEntry.EntryType.EMAIL_SENT,
            subject=subject,
            content=_("Email envoyé à {to_email}").format(to_email=to_email),
            metadata={
                "recipients": to_email,
                "provider": account.provider,
                "sent_email_id": str(sent.id),
            },
        )

    return sent


def _send_via_gmail(access_token: str, from_email: str, to_email: str, subject: str, body_html: str) -> str:
    """Send email via Gmail API. Returns the message ID."""
    msg = MIMEMultipart("alternative")
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body_html, "html"))

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    with httpx.Client() as client:
        resp = client.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
        )
        resp.raise_for_status()
        return resp.json().get("id", "")


def _send_via_outlook(access_token: str, to_email: str, subject: str, body_html: str) -> str:
    """Send email via Microsoft Graph API. Returns the message ID."""
    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": body_html,
            },
            "toRecipients": [
                {"emailAddress": {"address": to_email}},
            ],
        },
        "saveToSentItems": True,
    }

    with httpx.Client() as client:
        resp = client.post(
            "https://graph.microsoft.com/v1.0/me/sendMail",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        # sendMail returns 202 with no body
        return ""
