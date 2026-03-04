"""
Email sending service — sends via Gmail API or Microsoft Graph.
"""
import base64
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
from django.utils import timezone

from contacts.models import Contact
from notes.models import TimelineEntry

from .models import EmailAccount, SentEmail
from .oauth import get_valid_access_token

logger = logging.getLogger(__name__)


def send_email(
    user,
    organization,
    subject: str,
    body_html: str,
    contact_id: str | None = None,
    to_email: str = "",
    provider: str = "",
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
            raise ValueError(f"Contact {contact_id} introuvable.")
        if not to_email:
            to_email = contact.email
    if not to_email:
        raise ValueError("Ce contact n'a pas d'adresse email.")

    # Resolve email account
    accounts = EmailAccount.objects.filter(
        user=user, organization=organization, is_active=True,
    )
    if provider:
        accounts = accounts.filter(provider=provider)

    account = accounts.first()
    if not account:
        raise PermissionError("Connectez un compte email dans les parametres.")

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
    )

    # Create timeline entry
    if contact:
        TimelineEntry.objects.create(
            organization=organization,
            created_by=user,
            contact=contact,
            entry_type=TimelineEntry.EntryType.EMAIL_SENT,
            subject=subject,
            content=f"Email envoye a {to_email}",
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
