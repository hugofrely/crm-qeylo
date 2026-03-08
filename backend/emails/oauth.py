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
GOOGLE_SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"


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
MICROSOFT_SCOPES = "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send User.Read offline_access"


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
