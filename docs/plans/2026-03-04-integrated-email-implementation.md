# Integrated Email (Send MVP) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to send emails from the CRM via their connected Gmail/Outlook account, from the contact page and via the AI chat.

**Architecture:** OAuth flow handled entirely by backend Django. Tokens stored encrypted (Fernet) in DB. New `emails` Django app with `EmailAccount` and `SentEmail` models. New `send_email` chat tool. Frontend: settings section for connecting accounts, compose dialog on contact page, InlineToolCard for the chat tool.

**Tech Stack:** Django, `cryptography` (Fernet), Google OAuth2, Microsoft Graph API, `httpx` for HTTP calls, React/Next.js, shadcn/ui

**Design doc:** `docs/plans/2026-03-04-integrated-email-design.md`

---

### Task 1: Create the `emails` Django app scaffolding

**Files:**
- Create: `backend/emails/__init__.py`
- Create: `backend/emails/apps.py`
- Create: `backend/emails/models.py`
- Create: `backend/emails/admin.py`
- Modify: `backend/config/settings.py:19-39` (INSTALLED_APPS)
- Modify: `backend/requirements.txt`

**Step 1: Create the app directory and files**

Create `backend/emails/__init__.py` (empty).

Create `backend/emails/apps.py`:
```python
from django.apps import AppConfig


class EmailsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "emails"
```

Create `backend/emails/admin.py`:
```python
from django.contrib import admin
from .models import EmailAccount, SentEmail

admin.site.register(EmailAccount)
admin.site.register(SentEmail)
```

**Step 2: Create models**

Create `backend/emails/models.py`:
```python
import uuid
from django.conf import settings
from django.db import models


class EmailAccount(models.Model):
    class Provider(models.TextChoices):
        GMAIL = "gmail", "Gmail"
        OUTLOOK = "outlook", "Outlook"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_accounts",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_accounts",
    )
    provider = models.CharField(max_length=10, choices=Provider.choices)
    email_address = models.EmailField()
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "organization", "provider")

    def __str__(self):
        return f"{self.email_address} ({self.get_provider_display()})"


class SentEmail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="sent_emails",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_emails",
    )
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_emails",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_emails",
    )
    to_email = models.EmailField()
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"To: {self.to_email} — {self.subject[:50]}"
```

**Step 3: Add dependencies and register app**

Add to `backend/requirements.txt` after `resend>=2.23.0` (line 11):
```
cryptography>=44.0.0
httpx>=0.28.0
```

Add `"emails"` to `INSTALLED_APPS` in `backend/config/settings.py` after line 38 (`"notifications"`):
```python
    "emails",
```

Add to `backend/config/settings.py` after line 169 (end of Resend section):
```python

# ---------------------------------------------------------------------------
# OAuth (Email Integration)
# ---------------------------------------------------------------------------
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID", "")
MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET", "")
EMAIL_ENCRYPTION_KEY = os.environ.get("EMAIL_ENCRYPTION_KEY", "")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
```

**Step 4: Generate and run migration**

Run: `docker compose exec backend python manage.py makemigrations emails`
Run: `docker compose exec backend python manage.py migrate`

**Step 5: Commit**

```bash
git add backend/emails/ backend/config/settings.py backend/requirements.txt
git commit -m "feat(emails): add EmailAccount and SentEmail models with app scaffolding"
```

---

### Task 2: Token encryption service

**Files:**
- Create: `backend/emails/encryption.py`
- Create: `backend/emails/tests/__init__.py`
- Create: `backend/emails/tests/test_encryption.py`

**Step 1: Write the failing test**

Create `backend/emails/tests/__init__.py` (empty).

Create `backend/emails/tests/test_encryption.py`:
```python
from django.test import TestCase, override_settings

from emails.encryption import encrypt_token, decrypt_token


# Test key generated via Fernet.generate_key()
TEST_KEY = "dGVzdC1rZXktMzItYnl0ZXMtbG9uZy1lbm91Z2gh"


@override_settings(EMAIL_ENCRYPTION_KEY=TEST_KEY)
class EncryptionTests(TestCase):
    def test_encrypt_decrypt_roundtrip(self):
        token = "ya29.a0AfH6SMBx..."
        encrypted = encrypt_token(token)
        self.assertNotEqual(encrypted, token)
        self.assertEqual(decrypt_token(encrypted), token)

    def test_encrypt_produces_different_output_each_time(self):
        token = "some-token"
        a = encrypt_token(token)
        b = encrypt_token(token)
        self.assertNotEqual(a, b)  # Fernet uses random IV

    @override_settings(EMAIL_ENCRYPTION_KEY="")
    def test_encrypt_without_key_raises(self):
        with self.assertRaises(ValueError):
            encrypt_token("token")

    @override_settings(EMAIL_ENCRYPTION_KEY="")
    def test_decrypt_without_key_raises(self):
        with self.assertRaises(ValueError):
            decrypt_token("data")
```

**Step 2: Run test to verify it fails**

Run: `docker compose exec backend python manage.py test emails.tests.test_encryption -v2`
Expected: ImportError (module doesn't exist yet)

**Step 3: Write implementation**

Create `backend/emails/encryption.py`:
```python
from cryptography.fernet import Fernet
from django.conf import settings


def _get_fernet() -> Fernet:
    key = settings.EMAIL_ENCRYPTION_KEY
    if not key:
        raise ValueError(
            "EMAIL_ENCRYPTION_KEY is not set. "
            "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    return _get_fernet().decrypt(ciphertext.encode()).decode()
```

**Step 4: Run tests**

Run: `docker compose exec backend python manage.py test emails.tests.test_encryption -v2`

Note: The test key `TEST_KEY` must be a valid Fernet key. Generate one with:
```bash
docker compose exec backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Then update `TEST_KEY` in the test file with the output.

**Step 5: Commit**

```bash
git add backend/emails/encryption.py backend/emails/tests/
git commit -m "feat(emails): add Fernet token encryption service"
```

---

### Task 3: OAuth flow — backend views (Gmail + Outlook)

**Files:**
- Create: `backend/emails/oauth.py`
- Create: `backend/emails/urls.py`
- Modify: `backend/config/urls.py:4-20`
- Create: `backend/emails/tests/test_oauth.py`

**Step 1: Write the OAuth service**

Create `backend/emails/oauth.py`:
```python
"""
OAuth helpers for Gmail and Outlook email account connections.
"""
import logging
from datetime import timedelta
from urllib.parse import urlencode

import httpx
import jwt as pyjwt
from django.conf import settings
from django.utils import timezone

from .encryption import encrypt_token
from .models import EmailAccount

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State token (CSRF protection for OAuth callbacks)
# ---------------------------------------------------------------------------

def _make_state(user_id: str, org_id: str) -> str:
    """Create a signed JWT state token for OAuth CSRF protection."""
    payload = {
        "user_id": user_id,
        "org_id": org_id,
        "exp": timezone.now() + timedelta(minutes=10),
    }
    return pyjwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _verify_state(state: str) -> dict:
    """Verify and decode an OAuth state token. Raises on invalid/expired."""
    return pyjwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])


# ---------------------------------------------------------------------------
# Google Gmail
# ---------------------------------------------------------------------------

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"


def get_gmail_auth_url(user_id: str, org_id: str) -> str:
    state = _make_state(user_id, org_id)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/email/callback/gmail/",
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_gmail_code(code: str, state: str) -> EmailAccount:
    """Exchange authorization code for tokens, create/update EmailAccount."""
    claims = _verify_state(state)

    with httpx.Client() as client:
        # Exchange code for tokens
        token_resp = client.post(GOOGLE_TOKEN_URL, data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": f"{settings.BACKEND_URL}/api/email/callback/gmail/",
        })
        token_resp.raise_for_status()
        tokens = token_resp.json()

        # Get user email
        userinfo_resp = client.get(GOOGLE_USERINFO_URL, headers={
            "Authorization": f"Bearer {tokens['access_token']}",
        })
        userinfo_resp.raise_for_status()
        email = userinfo_resp.json()["email"]

    account, _ = EmailAccount.objects.update_or_create(
        user_id=claims["user_id"],
        organization_id=claims["org_id"],
        provider=EmailAccount.Provider.GMAIL,
        defaults={
            "email_address": email,
            "access_token": encrypt_token(tokens["access_token"]),
            "refresh_token": encrypt_token(tokens.get("refresh_token", "")),
            "token_expires_at": timezone.now() + timedelta(seconds=tokens.get("expires_in", 3600)),
            "is_active": True,
        },
    )
    return account


# ---------------------------------------------------------------------------
# Microsoft Outlook
# ---------------------------------------------------------------------------

MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MICROSOFT_ME_URL = "https://graph.microsoft.com/v1.0/me"
MICROSOFT_SCOPES = "https://graph.microsoft.com/Mail.Send User.Read offline_access"


def get_outlook_auth_url(user_id: str, org_id: str) -> str:
    state = _make_state(user_id, org_id)
    params = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/api/email/callback/outlook/",
        "response_type": "code",
        "scope": MICROSOFT_SCOPES,
        "state": state,
    }
    return f"{MICROSOFT_AUTH_URL}?{urlencode(params)}"


def exchange_outlook_code(code: str, state: str) -> EmailAccount:
    """Exchange authorization code for tokens, create/update EmailAccount."""
    claims = _verify_state(state)

    with httpx.Client() as client:
        token_resp = client.post(MICROSOFT_TOKEN_URL, data={
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": f"{settings.BACKEND_URL}/api/email/callback/outlook/",
        })
        token_resp.raise_for_status()
        tokens = token_resp.json()

        me_resp = client.get(MICROSOFT_ME_URL, headers={
            "Authorization": f"Bearer {tokens['access_token']}",
        })
        me_resp.raise_for_status()
        email = me_resp.json().get("mail") or me_resp.json().get("userPrincipalName")

    account, _ = EmailAccount.objects.update_or_create(
        user_id=claims["user_id"],
        organization_id=claims["org_id"],
        provider=EmailAccount.Provider.OUTLOOK,
        defaults={
            "email_address": email,
            "access_token": encrypt_token(tokens["access_token"]),
            "refresh_token": encrypt_token(tokens.get("refresh_token", "")),
            "token_expires_at": timezone.now() + timedelta(seconds=tokens.get("expires_in", 3600)),
            "is_active": True,
        },
    )
    return account


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

def refresh_access_token(account: EmailAccount) -> str:
    """Refresh an expired access token. Returns the new decrypted access token."""
    from .encryption import decrypt_token

    refresh_tok = decrypt_token(account.refresh_token)

    if account.provider == EmailAccount.Provider.GMAIL:
        url = GOOGLE_TOKEN_URL
        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_tok,
            "grant_type": "refresh_token",
        }
    else:
        url = MICROSOFT_TOKEN_URL
        data = {
            "client_id": settings.MICROSOFT_CLIENT_ID,
            "client_secret": settings.MICROSOFT_CLIENT_SECRET,
            "refresh_token": refresh_tok,
            "grant_type": "refresh_token",
        }

    with httpx.Client() as client:
        resp = client.post(url, data=data)
        resp.raise_for_status()
        tokens = resp.json()

    account.access_token = encrypt_token(tokens["access_token"])
    account.token_expires_at = timezone.now() + timedelta(seconds=tokens.get("expires_in", 3600))
    if "refresh_token" in tokens:
        account.refresh_token = encrypt_token(tokens["refresh_token"])
    account.save(update_fields=["access_token", "refresh_token", "token_expires_at", "updated_at"])

    return tokens["access_token"]


def get_valid_access_token(account: EmailAccount) -> str:
    """Return a valid access token, refreshing if needed."""
    from .encryption import decrypt_token

    if account.token_expires_at <= timezone.now() + timedelta(minutes=5):
        return refresh_access_token(account)
    return decrypt_token(account.access_token)
```

**Step 2: Create URL routes and views**

Create `backend/emails/views.py`:
```python
import logging

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
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
from .service import send_email

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OAuth connection endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect_gmail(request):
    """Redirect the user to Google OAuth consent screen."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    url = get_gmail_auth_url(str(request.user.id), str(org.id))
    return HttpResponseRedirect(url)


@api_view(["GET"])
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
    """Redirect the user to Microsoft OAuth consent screen."""
    org = request.organization
    if not org:
        return Response({"detail": "No organization."}, status=status.HTTP_400_BAD_REQUEST)
    url = get_outlook_auth_url(str(request.user.id), str(org.id))
    return HttpResponseRedirect(url)


@api_view(["GET"])
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
# Send email
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
```

Create `backend/emails/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    # OAuth
    path("connect/gmail/", views.connect_gmail, name="email-connect-gmail"),
    path("callback/gmail/", views.callback_gmail, name="email-callback-gmail"),
    path("connect/outlook/", views.connect_outlook, name="email-connect-outlook"),
    path("callback/outlook/", views.callback_outlook, name="email-callback-outlook"),
    # Account management
    path("accounts/", views.list_accounts, name="email-accounts"),
    path("accounts/<uuid:account_id>/", views.disconnect_account, name="email-disconnect"),
    # Send
    path("send/", views.send_email_view, name="email-send"),
]
```

Add to `backend/config/urls.py` after line 18 (notifications):
```python
    path("api/email/", include("emails.urls")),
```

**Step 3: Create serializers**

Create `backend/emails/serializers.py`:
```python
from rest_framework import serializers
from .models import EmailAccount


class EmailAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAccount
        fields = ["id", "provider", "email_address", "is_active", "created_at"]
        read_only_fields = fields


class SendEmailSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    to_email = serializers.EmailField(required=False, allow_blank=True)
    subject = serializers.CharField(max_length=500)
    body_html = serializers.CharField()
    provider = serializers.ChoiceField(
        choices=[("gmail", "Gmail"), ("outlook", "Outlook")],
        required=False,
        allow_blank=True,
    )

    def validate(self, data):
        if not data.get("contact_id") and not data.get("to_email"):
            raise serializers.ValidationError(
                "Fournissez contact_id ou to_email."
            )
        return data
```

**Step 4: Commit**

```bash
git add backend/emails/ backend/config/urls.py
git commit -m "feat(emails): add OAuth views, URL routes, and serializers"
```

---

### Task 4: Email sending service (Gmail API + Microsoft Graph)

**Files:**
- Create: `backend/emails/service.py`
- Create: `backend/emails/tests/test_service.py`

**Step 1: Write the failing test**

Create `backend/emails/tests/test_service.py`:
```python
from unittest.mock import patch, MagicMock
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact
from emails.models import EmailAccount, SentEmail
from emails.service import send_email


class SendEmailServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.org = Organization.objects.create(name="Test Org")
        Membership.objects.create(user=self.user, organization=self.org, role="owner")
        self.contact = Contact.objects.create(
            organization=self.org,
            created_by=self.user,
            first_name="Jean",
            last_name="Dupont",
            email="jean@example.com",
        )
        self.account = EmailAccount.objects.create(
            user=self.user,
            organization=self.org,
            provider="gmail",
            email_address="test@gmail.com",
            access_token="encrypted_access",
            refresh_token="encrypted_refresh",
            token_expires_at=timezone.now() + timedelta(hours=1),
        )

    def test_no_account_raises_permission_error(self):
        self.account.delete()
        with self.assertRaises(PermissionError):
            send_email(
                user=self.user,
                organization=self.org,
                to_email="jean@example.com",
                subject="Test",
                body_html="<p>Hello</p>",
            )

    def test_contact_without_email_raises_value_error(self):
        self.contact.email = ""
        self.contact.save()
        with self.assertRaises(ValueError):
            send_email(
                user=self.user,
                organization=self.org,
                contact_id=str(self.contact.id),
                subject="Test",
                body_html="<p>Hello</p>",
            )

    @patch("emails.service._send_via_gmail")
    @patch("emails.service.get_valid_access_token")
    def test_send_creates_sent_email_and_timeline(self, mock_token, mock_send):
        mock_token.return_value = "valid_token"
        mock_send.return_value = "msg_id_123"

        sent = send_email(
            user=self.user,
            organization=self.org,
            contact_id=str(self.contact.id),
            subject="Relance devis",
            body_html="<p>Bonjour Jean</p>",
        )

        self.assertIsInstance(sent, SentEmail)
        self.assertEqual(sent.to_email, "jean@example.com")
        self.assertEqual(sent.subject, "Relance devis")
        self.assertEqual(sent.provider_message_id, "msg_id_123")

        # Check timeline entry was created
        from notes.models import TimelineEntry
        entry = TimelineEntry.objects.filter(
            contact=self.contact,
            entry_type=TimelineEntry.EntryType.EMAIL_SENT,
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.subject, "Relance devis")
```

**Step 2: Run test to verify it fails**

Run: `docker compose exec backend python manage.py test emails.tests.test_service -v2`
Expected: ImportError (service module doesn't exist)

**Step 3: Write the email sending service**

Create `backend/emails/service.py`:
```python
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
        raise PermissionError("Connectez un compte email dans les paramètres.")

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
            content=f"Email envoyé à {to_email}",
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
```

**Step 4: Run tests**

Run: `docker compose exec backend python manage.py test emails.tests.test_service -v2`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/emails/service.py backend/emails/tests/test_service.py
git commit -m "feat(emails): add email sending service with Gmail and Outlook support"
```

---

### Task 5: Add `send_email` chat tool

**Files:**
- Modify: `backend/chat/tools.py:8-21` (imports), `backend/chat/tools.py:373` (new tool), `backend/chat/tools.py:457-468` (ALL_TOOLS)
- Modify: `backend/chat/prompts.py:1-34` (system prompt)

**Step 1: Add the send_email tool**

In `backend/chat/tools.py`, add import after line 21:
```python
from emails.models import EmailAccount
from emails.service import send_email as service_send_email
```

Add new tool after `add_note` function (after line 372), before the Dashboard section:

```python

# ---------------------------------------------------------------------------
# Emails
# ---------------------------------------------------------------------------

def send_contact_email(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    subject: str,
    body: str,
) -> dict:
    """Send an email to a contact using the user's connected email account.
    Use when the user asks to email, send a message, or follow up with a contact.
    The body should be plain text — it will be converted to HTML automatically.
    """
    from accounts.models import User
    from organizations.models import Organization

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    # Check email account exists
    account = EmailAccount.objects.filter(
        user_id=user_id, organization_id=org_id, is_active=True,
    ).first()
    if not account:
        return {
            "action": "error",
            "message": "Aucun compte email connecté. Connectez votre Gmail ou Outlook dans Paramètres.",
        }

    # Convert plain text body to simple HTML
    body_html = "".join(f"<p>{line}</p>" for line in body.split("\n") if line.strip())
    if not body_html:
        body_html = f"<p>{body}</p>"

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=org_id)
        sent = service_send_email(
            user=user,
            organization=org,
            contact_id=contact_id,
            subject=subject,
            body_html=body_html,
        )
    except (ValueError, PermissionError) as e:
        return {"action": "error", "message": str(e)}
    except Exception:
        return {"action": "error", "message": "Erreur lors de l'envoi de l'email."}

    return {
        "action": "email_sent",
        "to": sent.to_email,
        "subject": subject,
    }
```

Add `send_contact_email` to `ALL_TOOLS` list (after `add_note`):
```python
ALL_TOOLS = [
    create_contact,
    search_contacts,
    update_contact,
    create_deal,
    move_deal,
    create_task,
    complete_task,
    add_note,
    send_contact_email,
    get_dashboard_summary,
    search_all,
]
```

**Step 2: Update the system prompt**

In `backend/chat/prompts.py`, update the SYSTEM_PROMPT. Add to capabilities (after line 9):
```
- Envoyer des emails aux contacts (si un compte email est connecté)
```

Add to the "Comportement" section (after line 18):
```
- Pour envoyer un email, rédige un objet et un corps professionnels et concis en français. Utilise send_contact_email avec le contact_id
```

Add a new section after the "Contexte actuel" section (after line 26):
```

## Compte email
{email_status}
```

**Step 3: Update context building in views**

In `backend/chat/views.py`, update `_build_context` (line 43) to also return email status. Add after line 71:
```python
    # Email account status
    from emails.models import EmailAccount
    email_account = EmailAccount.objects.filter(
        organization=org, is_active=True,
    ).first()
    if email_account:
        email_status = f"Compte {email_account.get_provider_display()} connecté ({email_account.email_address}). Tu peux envoyer des emails."
    else:
        email_status = "Aucun compte email connecté. Suggère à l'utilisateur de connecter son email dans Paramètres."

    return contacts_summary, deals_summary, tasks_summary, email_status
```

Update the `formatted_prompt` calls in both `send_message` (line 254) and `stream_message` (line 393) to include `email_status`:
```python
    contacts_summary, deals_summary, tasks_summary, email_status = ...
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=...,
        current_datetime=...,
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
        email_status=email_status,
    )
```

**Step 4: Commit**

```bash
git add backend/chat/tools.py backend/chat/prompts.py backend/chat/views.py
git commit -m "feat(emails): add send_contact_email chat tool with email status in prompt"
```

---

### Task 6: Frontend — Settings email accounts section

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`

**Step 1: Add the email accounts section**

In `frontend/app/(app)/settings/page.tsx`:

Add imports at the top:
```tsx
import { useState, useEffect } from "react"
import { Mail, Plug, X, AlertCircle } from "lucide-react"  // add to existing imports
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
```

Add interfaces and state inside the component (after the `initials` const):
```tsx
  interface EmailAccount {
    id: string
    provider: "gmail" | "outlook"
    email_address: string
    is_active: boolean
    created_at: string
  }

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const searchParams = useSearchParams()

  useEffect(() => {
    apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
  }, [])

  useEffect(() => {
    const connected = searchParams.get("email_connected")
    const error = searchParams.get("email_error")
    if (connected) {
      toast.success(`Compte ${connected === "gmail" ? "Gmail" : "Outlook"} connecté`)
      // Refresh accounts
      apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
    }
    if (error) {
      toast.error("Erreur lors de la connexion du compte email")
    }
  }, [searchParams])

  const disconnectAccount = async (id: string) => {
    await apiFetch(`/email/accounts/${id}/`, { method: "DELETE" })
    setEmailAccounts((prev) => prev.filter((a) => a.id !== id))
    toast.success("Compte déconnecté")
  }
```

Add a new card section between the "Email notifications toggle" (after line 125's closing `</div>`) and "Organization settings link":

```tsx
      {/* Connected email accounts */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">Comptes email connectés</h2>
          <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
            Envoyez des emails directement depuis le CRM
          </p>
        </div>
        <div className="p-6 space-y-4 font-[family-name:var(--font-body)]">
          {emailAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  account.is_active ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <p className="text-sm font-medium">
                    {account.provider === "gmail" ? "Gmail" : "Outlook"}
                  </p>
                  <p className="text-xs text-muted-foreground">{account.email_address}</p>
                </div>
              </div>
              <button
                onClick={() => disconnectAccount(account.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            {!emailAccounts.find((a) => a.provider === "gmail") && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/email/connect/gmail/`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                <Plug className="h-4 w-4" />
                Connecter Gmail
              </a>
            )}
            {!emailAccounts.find((a) => a.provider === "outlook") && (
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL}/email/connect/outlook/`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                <Plug className="h-4 w-4" />
                Connecter Outlook
              </a>
            )}
          </div>
        </div>
      </div>
```

Note: Add `import { cn } from "@/lib/utils"` at the top if not already imported.

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/settings/page.tsx
git commit -m "feat(frontend): add connected email accounts section to settings"
```

---

### Task 7: Frontend — Email compose dialog on contact page

**Files:**
- Create: `frontend/components/emails/ComposeEmailDialog.tsx`
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create the compose dialog**

Create `frontend/components/emails/ComposeEmailDialog.tsx`:
```tsx
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"

interface EmailAccount {
  id: string
  provider: "gmail" | "outlook"
  email_address: string
  is_active: boolean
}

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactEmail: string
  contactName: string
  onSent?: () => void
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  contactId,
  contactEmail,
  contactName,
  onSent,
}: ComposeEmailDialogProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      apiFetch<EmailAccount[]>("/email/accounts/")
        .then((data) => {
          setAccounts(data.filter((a) => a.is_active))
          if (data.length === 1) {
            setSelectedProvider(data[0].provider)
          }
        })
        .catch(() => {})
    }
  }, [open])

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Remplissez l'objet et le corps de l'email")
      return
    }

    setSending(true)
    try {
      const bodyHtml = body
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("")

      await apiFetch("/email/send/", {
        method: "POST",
        json: {
          contact_id: contactId,
          subject,
          body_html: bodyHtml,
          ...(selectedProvider && { provider: selectedProvider }),
        },
      })

      toast.success(`Email envoyé à ${contactName}`)
      setSubject("")
      setBody("")
      onOpenChange(false)
      onSent?.()
    } catch {
      toast.error("Erreur lors de l'envoi de l'email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer un email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-[family-name:var(--font-body)]">
          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.provider}>
                      {acc.email_address} ({acc.provider === "gmail" ? "Gmail" : "Outlook"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">À</Label>
            <Input value={contactEmail} disabled className="bg-secondary/30" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Objet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add the email button to the contact page**

In `frontend/app/(app)/contacts/[id]/page.tsx`:

Add import:
```tsx
import { ComposeEmailDialog } from "@/components/emails/ComposeEmailDialog"
```

Add state (near other useState declarations):
```tsx
const [emailDialogOpen, setEmailDialogOpen] = useState(false)
```

Add state for tracking email accounts (to know whether to show the button):
```tsx
const [hasEmailAccount, setHasEmailAccount] = useState(false)

useEffect(() => {
  apiFetch<{ id: string }[]>("/email/accounts/")
    .then((data) => setHasEmailAccount(data.length > 0))
    .catch(() => {})
}, [])
```

Add the email button in the contact header area, next to existing action buttons. Find the area with edit/delete buttons and add:
```tsx
{contact.email && hasEmailAccount && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setEmailDialogOpen(true)}
  >
    <Mail className="h-3.5 w-3.5 mr-1.5" />
    Email
  </Button>
)}
```

Add the dialog before the closing `</div>` of the page:
```tsx
{contact && (
  <ComposeEmailDialog
    open={emailDialogOpen}
    onOpenChange={setEmailDialogOpen}
    contactId={id}
    contactEmail={contact.email}
    contactName={`${contact.first_name} ${contact.last_name}`}
    onSent={() => fetchTimeline()}
  />
)}
```

Make sure `Mail` is imported from `lucide-react` at the top of the file.

**Step 3: Commit**

```bash
git add frontend/components/emails/ frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "feat(frontend): add email compose dialog on contact page"
```

---

### Task 8: Frontend — InlineToolCard for `send_contact_email`

**Files:**
- Modify: `frontend/components/chat/InlineToolCard.tsx:3-14` (imports), `frontend/components/chat/InlineToolCard.tsx:26-89` (toolConfig), `frontend/components/chat/InlineToolCard.tsx:98-124` (formatResult), `frontend/components/chat/InlineToolCard.tsx:126-148` (formatArgs)

**Step 1: Update InlineToolCard**

In `frontend/components/chat/InlineToolCard.tsx`:

Add `Mail` to the lucide-react imports (line 3):
```tsx
import {
  User,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle,
  StickyNote,
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
  Mail,
} from "lucide-react"
```

Add to `toolConfig` after `search_all` (after line 88):
```tsx
  send_contact_email: {
    icon: Mail,
    label: "Envoi d'email",
    accentColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
```

Add to `formatResult` switch (after `case "search_all":`, before `default:`):
```tsx
    case "email_sent":
      return `${result.to} — ${result.subject}`
```

Add to `formatArgs` switch (after `case "get_dashboard_summary":`, before `default:`):
```tsx
    case "send_contact_email":
      return String(args.subject || "")
```

**Step 2: Commit**

```bash
git add frontend/components/chat/InlineToolCard.tsx
git commit -m "feat(frontend): add send_contact_email to InlineToolCard"
```

---

### Task 9: Add PyJWT dependency and handle OAuth callback auth

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/emails/views.py` (callback views need to work without auth)

**Step 1: Add PyJWT**

The OAuth state tokens use `jwt.encode/decode`. Add to `backend/requirements.txt`:
```
PyJWT>=2.9.0
```

Note: `djangorestframework-simplejwt` already depends on PyJWT, so it's likely already installed, but we should pin it explicitly since we use it directly.

**Step 2: Fix callback views authentication**

The callback views (`callback_gmail`, `callback_outlook`) are called by the OAuth provider redirect — the user's browser hits these URLs after the OAuth dance, so they won't have JWT auth headers. These views should use `@permission_classes([])` (already done in the views code above) and `@authentication_classes([])`:

In `backend/emails/views.py`, update the callback views to add:
```python
from rest_framework.decorators import api_view, permission_classes, authentication_classes
```

Add `@authentication_classes([])` decorator to both callback views:
```python
@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def callback_gmail(request):
    ...

@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def callback_outlook(request):
    ...
```

**Step 3: Rebuild backend container**

Run: `docker compose up --build backend -d`

**Step 4: Commit**

```bash
git add backend/requirements.txt backend/emails/views.py
git commit -m "feat(emails): add PyJWT dependency and fix callback auth"
```

---

### Task 10: Integration testing and final verification

**Step 1: Run all backend tests**

Run: `docker compose exec backend python manage.py test -v2`
Expected: All tests pass

**Step 2: Verify migrations are clean**

Run: `docker compose exec backend python manage.py makemigrations --check`
Expected: No new migrations needed

**Step 3: Verify the app starts without errors**

Run: `docker compose up -d && docker compose logs backend --tail 20`
Expected: No import errors or startup crashes

**Step 4: Manual smoke test checklist**

1. Navigate to `/settings` — see "Comptes email connectés" section
2. Click "Connecter Gmail" — redirects to Google OAuth (needs real credentials to test fully)
3. Navigate to a contact with an email — see "Email" button in header
4. Click "Email" — compose dialog opens with pre-filled recipient
5. In chat, ask "Envoie un email de relance à [contact]" — AI should use `send_contact_email` tool (needs connected account)

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(emails): address integration issues"
```

---

## Summary of all files

### New files (13):
- `backend/emails/__init__.py`
- `backend/emails/apps.py`
- `backend/emails/admin.py`
- `backend/emails/models.py`
- `backend/emails/encryption.py`
- `backend/emails/oauth.py`
- `backend/emails/service.py`
- `backend/emails/serializers.py`
- `backend/emails/views.py`
- `backend/emails/urls.py`
- `backend/emails/tests/__init__.py`
- `backend/emails/tests/test_encryption.py`
- `backend/emails/tests/test_service.py`
- `frontend/components/emails/ComposeEmailDialog.tsx`

### Modified files (7):
- `backend/config/settings.py` — INSTALLED_APPS + OAuth env vars
- `backend/config/urls.py` — add email routes
- `backend/requirements.txt` — cryptography, httpx, PyJWT
- `backend/chat/tools.py` — add send_contact_email tool
- `backend/chat/prompts.py` — add email capability + email_status
- `backend/chat/views.py` — pass email_status to prompt
- `frontend/app/(app)/settings/page.tsx` — connected accounts section
- `frontend/app/(app)/contacts/[id]/page.tsx` — email button + dialog
- `frontend/components/chat/InlineToolCard.tsx` — send_contact_email config
