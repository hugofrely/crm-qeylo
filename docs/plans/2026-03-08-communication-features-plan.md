# Communication Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add unified inbox, email sequences, call logging, and calendar integration to Qeylo CRM.

**Architecture:** 4 new Django apps (inbox sync extends emails/, new sequences/, call log in notes/, new calendars/). Celery tasks for async sync and sequence execution. Frontend pages with 3-column inbox, sequence editor, call log modal, and calendar view.

**Tech Stack:** Django 5.1, DRF, Celery/Redis, Next.js 16, React 19, shadcn/ui, Tailwind CSS 4, Gmail API, Microsoft Graph API.

**Order:** Feature 1 (Inbox) → Feature 2 (Sequences) → Feature 3 (Call Log) → Feature 4 (Calendar)

---

## Feature 1: Unified Inbox

### Task 1.1: Email and EmailThread Models

**Files:**
- Modify: `backend/emails/models.py`
- Create: `backend/emails/migrations/` (auto-generated)

**Step 1: Add Email model to emails/models.py**

Add after the existing `SentEmail` model:

```python
class Email(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="emails",
    )
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="emails",
    )
    thread = models.ForeignKey(
        "EmailThread",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="emails",
    )
    provider_message_id = models.CharField(max_length=255, db_index=True)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    from_address = models.EmailField()
    from_name = models.CharField(max_length=255, blank=True)
    to_addresses = models.JSONField(default=list)
    cc_addresses = models.JSONField(default=list, blank=True)
    bcc_addresses = models.JSONField(default=list, blank=True)
    subject = models.CharField(max_length=500, blank=True)
    body_html = models.TextField(blank=True)
    body_text = models.TextField(blank=True)
    snippet = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    labels = models.JSONField(default=list, blank=True)
    has_attachments = models.BooleanField(default=False)
    attachments_metadata = models.JSONField(default=list, blank=True)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
    )
    sent_at = models.DateTimeField()
    synced_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-sent_at"]
        unique_together = ("email_account", "provider_message_id")
        indexes = [
            models.Index(fields=["organization", "-sent_at"]),
            models.Index(fields=["contact", "-sent_at"]),
        ]

    def __str__(self):
        return f"{self.direction}: {self.subject[:50]}"
```

**Step 2: Add EmailThread model**

```python
class EmailThread(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_threads",
    )
    provider_thread_id = models.CharField(max_length=255, db_index=True)
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="threads",
    )
    subject = models.CharField(max_length=500, blank=True)
    last_message_at = models.DateTimeField(null=True)
    message_count = models.PositiveIntegerField(default=0)
    contacts = models.ManyToManyField(
        "contacts.Contact",
        blank=True,
        related_name="email_threads",
    )
    participants = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at"]
        unique_together = ("email_account", "provider_thread_id")

    def __str__(self):
        return f"Thread: {self.subject[:50]}"
```

**Step 3: Add EmailSyncState model**

```python
class EmailSyncState(models.Model):
    class SyncStatus(models.TextChoices):
        IDLE = "idle", "Idle"
        SYNCING = "syncing", "Syncing"
        ERROR = "error", "Error"

    email_account = models.OneToOneField(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="sync_state",
    )
    last_history_id = models.CharField(max_length=255, blank=True)
    last_delta_token = models.CharField(max_length=1000, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=10,
        choices=SyncStatus.choices,
        default=SyncStatus.IDLE,
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sync: {self.email_account.email_address} ({self.sync_status})"
```

**Step 4: Run makemigrations and migrate**

```bash
cd backend && python manage.py makemigrations emails && python manage.py migrate
```

**Step 5: Commit**

```bash
git add backend/emails/models.py backend/emails/migrations/
git commit -m "feat(inbox): add Email, EmailThread, EmailSyncState models"
```

---

### Task 1.2: Gmail Sync Service

**Files:**
- Create: `backend/emails/sync_gmail.py`

**Step 1: Create Gmail sync service**

```python
"""Gmail email synchronization using Gmail API."""
import base64
import logging
from datetime import datetime, timezone as tz
from email.utils import parseaddr

import httpx

from contacts.models import Contact
from .models import Email, EmailThread, EmailSyncState, EmailAccount
from .oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def _get_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _parse_email_address(raw: str) -> tuple[str, str]:
    """Return (name, address) from a raw email header value."""
    name, addr = parseaddr(raw)
    return name, addr


def _extract_header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _extract_body(payload: dict) -> tuple[str, str]:
    """Extract HTML and plain text body from Gmail message payload."""
    html = ""
    text = ""

    mime_type = payload.get("mimeType", "")

    if mime_type == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif "parts" in payload:
        for part in payload["parts"]:
            part_html, part_text = _extract_body(part)
            if part_html and not html:
                html = part_html
            if part_text and not text:
                text = part_text

    return html, text


def _parse_addresses(header_value: str) -> list[dict]:
    """Parse a comma-separated list of email addresses."""
    if not header_value:
        return []
    results = []
    for raw in header_value.split(","):
        name, addr = _parse_email_address(raw.strip())
        if addr:
            results.append({"name": name, "address": addr})
    return results


def _get_attachments_metadata(payload: dict) -> list[dict]:
    """Extract attachment metadata from payload."""
    attachments = []
    parts = payload.get("parts", [])
    for part in parts:
        filename = part.get("filename", "")
        if filename:
            attachments.append({
                "filename": filename,
                "mime_type": part.get("mimeType", ""),
                "size": part.get("body", {}).get("size", 0),
            })
        # Recurse into nested parts
        attachments.extend(_get_attachments_metadata(part))
    return attachments


def sync_gmail_account(account: EmailAccount) -> int:
    """Sync emails for a Gmail account. Returns count of new emails synced."""
    sync_state, _ = EmailSyncState.objects.get_or_create(email_account=account)

    if sync_state.sync_status == EmailSyncState.SyncStatus.SYNCING:
        logger.info("Already syncing %s, skipping", account.email_address)
        return 0

    sync_state.sync_status = EmailSyncState.SyncStatus.SYNCING
    sync_state.save(update_fields=["sync_status", "updated_at"])

    try:
        access_token = get_valid_access_token(account)
        headers = _get_headers(access_token)
        synced_count = 0

        if sync_state.last_history_id:
            synced_count = _sync_gmail_incremental(account, sync_state, headers)
        else:
            synced_count = _sync_gmail_full(account, sync_state, headers)

        sync_state.sync_status = EmailSyncState.SyncStatus.IDLE
        sync_state.error_message = ""
        sync_state.last_sync_at = datetime.now(tz.utc)
        sync_state.save(update_fields=[
            "sync_status", "error_message", "last_sync_at", "updated_at",
        ])
        return synced_count

    except Exception as e:
        logger.exception("Gmail sync error for %s", account.email_address)
        sync_state.sync_status = EmailSyncState.SyncStatus.ERROR
        sync_state.error_message = str(e)[:500]
        sync_state.save(update_fields=["sync_status", "error_message", "updated_at"])
        return 0


def _sync_gmail_full(account: EmailAccount, sync_state: EmailSyncState, headers: dict) -> int:
    """Initial full sync - fetch last 200 messages."""
    synced = 0
    page_token = None
    max_messages = 200

    with httpx.Client(timeout=30) as client:
        fetched_ids = []
        while len(fetched_ids) < max_messages:
            params = {"maxResults": 50}
            if page_token:
                params["pageToken"] = page_token

            resp = client.get(f"{GMAIL_API}/messages", headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()

            messages = data.get("messages", [])
            if not messages:
                break

            fetched_ids.extend([m["id"] for m in messages])
            page_token = data.get("nextPageToken")
            if not page_token:
                break

        # Fetch each message detail
        for msg_id in fetched_ids[:max_messages]:
            if Email.objects.filter(
                email_account=account, provider_message_id=msg_id
            ).exists():
                continue

            try:
                resp = client.get(
                    f"{GMAIL_API}/messages/{msg_id}",
                    headers=headers,
                    params={"format": "full"},
                )
                resp.raise_for_status()
                msg_data = resp.json()
                _store_gmail_message(account, msg_data)
                synced += 1
            except Exception:
                logger.exception("Failed to fetch message %s", msg_id)

        # Get current history ID for incremental sync
        profile_resp = client.get(f"{GMAIL_API}/profile", headers=headers)
        profile_resp.raise_for_status()
        sync_state.last_history_id = profile_resp.json().get("historyId", "")
        sync_state.save(update_fields=["last_history_id", "updated_at"])

    return synced


def _sync_gmail_incremental(account: EmailAccount, sync_state: EmailSyncState, headers: dict) -> int:
    """Incremental sync using Gmail history API."""
    synced = 0

    with httpx.Client(timeout=30) as client:
        try:
            resp = client.get(
                f"{GMAIL_API}/history",
                headers=headers,
                params={
                    "startHistoryId": sync_state.last_history_id,
                    "historyTypes": "messageAdded",
                },
            )

            if resp.status_code == 404:
                # History expired, do full sync
                sync_state.last_history_id = ""
                sync_state.save(update_fields=["last_history_id", "updated_at"])
                return _sync_gmail_full(account, sync_state, headers)

            resp.raise_for_status()
            data = resp.json()

            new_history_id = data.get("historyId", sync_state.last_history_id)

            for history in data.get("history", []):
                for added in history.get("messagesAdded", []):
                    msg_id = added["message"]["id"]
                    if Email.objects.filter(
                        email_account=account, provider_message_id=msg_id
                    ).exists():
                        continue

                    try:
                        msg_resp = client.get(
                            f"{GMAIL_API}/messages/{msg_id}",
                            headers=headers,
                            params={"format": "full"},
                        )
                        msg_resp.raise_for_status()
                        _store_gmail_message(account, msg_resp.json())
                        synced += 1
                    except Exception:
                        logger.exception("Failed to fetch message %s", msg_id)

            sync_state.last_history_id = new_history_id
            sync_state.save(update_fields=["last_history_id", "updated_at"])

        except httpx.HTTPStatusError:
            raise

    return synced


def _store_gmail_message(account: EmailAccount, msg_data: dict) -> Email:
    """Parse and store a Gmail message."""
    headers_list = msg_data.get("payload", {}).get("headers", [])
    payload = msg_data.get("payload", {})

    from_raw = _extract_header(headers_list, "From")
    from_name, from_address = _parse_email_address(from_raw)
    to_raw = _extract_header(headers_list, "To")
    cc_raw = _extract_header(headers_list, "Cc")
    bcc_raw = _extract_header(headers_list, "Bcc")
    subject = _extract_header(headers_list, "Subject")
    date_str = _extract_header(headers_list, "Date")

    to_addresses = _parse_addresses(to_raw)
    cc_addresses = _parse_addresses(cc_raw)
    bcc_addresses = _parse_addresses(bcc_raw)

    body_html, body_text = _extract_body(payload)
    snippet = msg_data.get("snippet", "")

    # Determine direction
    direction = Email.Direction.INBOUND
    if from_address.lower() == account.email_address.lower():
        direction = Email.Direction.OUTBOUND

    # Parse date
    from email.utils import parsedate_to_datetime
    try:
        sent_at = parsedate_to_datetime(date_str)
    except Exception:
        sent_at = datetime.now(tz.utc)

    # Labels
    label_ids = msg_data.get("labelIds", [])
    is_read = "UNREAD" not in label_ids
    is_starred = "STARRED" in label_ids

    # Attachments
    attachments = _get_attachments_metadata(payload)

    # Thread
    thread_id = msg_data.get("threadId", "")
    thread = None
    if thread_id:
        thread, _ = EmailThread.objects.get_or_create(
            email_account=account,
            provider_thread_id=thread_id,
            defaults={
                "organization": account.organization,
                "subject": subject,
            },
        )

    # Match contact
    match_address = from_address if direction == Email.Direction.INBOUND else None
    if not match_address and to_addresses:
        match_address = to_addresses[0].get("address", "")

    contact = None
    if match_address:
        contact = Contact.objects.filter(
            organization=account.organization,
            email__iexact=match_address,
        ).first()

    email = Email.objects.create(
        organization=account.organization,
        email_account=account,
        thread=thread,
        provider_message_id=msg_data["id"],
        direction=direction,
        from_address=from_address,
        from_name=from_name,
        to_addresses=to_addresses,
        cc_addresses=cc_addresses,
        bcc_addresses=bcc_addresses,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        snippet=snippet,
        is_read=is_read,
        is_starred=is_starred,
        labels=label_ids,
        has_attachments=len(attachments) > 0,
        attachments_metadata=attachments,
        contact=contact,
        sent_at=sent_at,
    )

    # Update thread
    if thread:
        thread.last_message_at = sent_at
        thread.message_count = thread.emails.count()
        all_participants = set()
        for e in thread.emails.all():
            all_participants.add(e.from_address)
            for addr in e.to_addresses:
                all_participants.add(addr.get("address", ""))
        thread.participants = [{"address": a} for a in all_participants if a]
        thread.save(update_fields=["last_message_at", "message_count", "participants", "updated_at"])

        if contact:
            thread.contacts.add(contact)

    return email
```

**Step 2: Commit**

```bash
git add backend/emails/sync_gmail.py
git commit -m "feat(inbox): add Gmail sync service"
```

---

### Task 1.3: Outlook Sync Service

**Files:**
- Create: `backend/emails/sync_outlook.py`

**Step 1: Create Outlook sync service**

```python
"""Outlook/Microsoft Graph email synchronization."""
import logging
from datetime import datetime, timezone as tz
from email.utils import parseaddr

import httpx

from contacts.models import Contact
from .models import Email, EmailThread, EmailSyncState, EmailAccount
from .oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0/me"


def sync_outlook_account(account: EmailAccount) -> int:
    """Sync emails for an Outlook account. Returns count of new emails synced."""
    sync_state, _ = EmailSyncState.objects.get_or_create(email_account=account)

    if sync_state.sync_status == EmailSyncState.SyncStatus.SYNCING:
        logger.info("Already syncing %s, skipping", account.email_address)
        return 0

    sync_state.sync_status = EmailSyncState.SyncStatus.SYNCING
    sync_state.save(update_fields=["sync_status", "updated_at"])

    try:
        access_token = get_valid_access_token(account)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        synced_count = 0

        if sync_state.last_delta_token:
            synced_count = _sync_outlook_delta(account, sync_state, headers)
        else:
            synced_count = _sync_outlook_full(account, sync_state, headers)

        sync_state.sync_status = EmailSyncState.SyncStatus.IDLE
        sync_state.error_message = ""
        sync_state.last_sync_at = datetime.now(tz.utc)
        sync_state.save(update_fields=[
            "sync_status", "error_message", "last_sync_at", "updated_at",
        ])
        return synced_count

    except Exception as e:
        logger.exception("Outlook sync error for %s", account.email_address)
        sync_state.sync_status = EmailSyncState.SyncStatus.ERROR
        sync_state.error_message = str(e)[:500]
        sync_state.save(update_fields=["sync_status", "error_message", "updated_at"])
        return 0


def _sync_outlook_full(account: EmailAccount, sync_state: EmailSyncState, headers: dict) -> int:
    """Initial full sync using delta query."""
    synced = 0
    url = f"{GRAPH_API}/mailFolders/inbox/messages/delta?$top=50&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments,internetMessageId"

    with httpx.Client(timeout=30) as client:
        max_pages = 4  # ~200 messages
        page = 0
        while url and page < max_pages:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            for msg in data.get("value", []):
                try:
                    _store_outlook_message(account, msg)
                    synced += 1
                except Exception:
                    logger.exception("Failed to store Outlook message %s", msg.get("id"))

            url = data.get("@odata.nextLink")
            page += 1

            if "@odata.deltaLink" in data:
                sync_state.last_delta_token = data["@odata.deltaLink"]
                sync_state.save(update_fields=["last_delta_token", "updated_at"])

    # Also sync sent items
    sent_url = f"{GRAPH_API}/mailFolders/sentitems/messages?$top=100&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,sentDateTime,isRead,hasAttachments,internetMessageId"
    with httpx.Client(timeout=30) as client:
        resp = client.get(sent_url, headers=headers)
        resp.raise_for_status()
        for msg in resp.json().get("value", []):
            try:
                _store_outlook_message(account, msg, is_sent=True)
                synced += 1
            except Exception:
                logger.exception("Failed to store sent Outlook message %s", msg.get("id"))

    return synced


def _sync_outlook_delta(account: EmailAccount, sync_state: EmailSyncState, headers: dict) -> int:
    """Incremental sync using delta token."""
    synced = 0
    url = sync_state.last_delta_token

    with httpx.Client(timeout=30) as client:
        while url:
            resp = client.get(url, headers=headers)

            if resp.status_code == 410:
                # Delta token expired, do full sync
                sync_state.last_delta_token = ""
                sync_state.save(update_fields=["last_delta_token", "updated_at"])
                return _sync_outlook_full(account, sync_state, headers)

            resp.raise_for_status()
            data = resp.json()

            for msg in data.get("value", []):
                if "@removed" in msg:
                    continue
                try:
                    _store_outlook_message(account, msg)
                    synced += 1
                except Exception:
                    logger.exception("Failed to store Outlook message %s", msg.get("id"))

            url = data.get("@odata.nextLink")
            if "@odata.deltaLink" in data:
                sync_state.last_delta_token = data["@odata.deltaLink"]
                sync_state.save(update_fields=["last_delta_token", "updated_at"])
                break

    return synced


def _store_outlook_message(account: EmailAccount, msg: dict, is_sent: bool = False) -> Email:
    """Parse and store an Outlook message."""
    msg_id = msg["id"]

    # Skip if already exists
    existing = Email.objects.filter(
        email_account=account, provider_message_id=msg_id
    ).first()
    if existing:
        # Update read status
        if existing.is_read != msg.get("isRead", False):
            existing.is_read = msg.get("isRead", False)
            existing.save(update_fields=["is_read", "updated_at"])
        return existing

    from_data = msg.get("from", {}).get("emailAddress", {})
    from_address = from_data.get("address", "")
    from_name = from_data.get("name", "")

    to_addresses = [
        {"name": r["emailAddress"]["name"], "address": r["emailAddress"]["address"]}
        for r in msg.get("toRecipients", [])
    ]
    cc_addresses = [
        {"name": r["emailAddress"]["name"], "address": r["emailAddress"]["address"]}
        for r in msg.get("ccRecipients", [])
    ]
    bcc_addresses = [
        {"name": r["emailAddress"]["name"], "address": r["emailAddress"]["address"]}
        for r in msg.get("bccRecipients", [])
    ]

    subject = msg.get("subject", "")
    body = msg.get("body", {})
    body_html = body.get("content", "") if body.get("contentType") == "html" else ""
    body_text = body.get("content", "") if body.get("contentType") == "text" else ""
    snippet = msg.get("bodyPreview", "")[:500]

    # Direction
    direction = Email.Direction.OUTBOUND if is_sent or from_address.lower() == account.email_address.lower() else Email.Direction.INBOUND

    # Date
    date_str = msg.get("sentDateTime") or msg.get("receivedDateTime", "")
    try:
        sent_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        sent_at = datetime.now(tz.utc)

    is_read = msg.get("isRead", False)
    is_starred = msg.get("flag", {}).get("flagStatus") == "flagged"
    has_attachments = msg.get("hasAttachments", False)

    # Thread
    conversation_id = msg.get("conversationId", "")
    thread = None
    if conversation_id:
        thread, _ = EmailThread.objects.get_or_create(
            email_account=account,
            provider_thread_id=conversation_id,
            defaults={
                "organization": account.organization,
                "subject": subject,
            },
        )

    # Match contact
    match_address = from_address if direction == Email.Direction.INBOUND else None
    if not match_address and to_addresses:
        match_address = to_addresses[0].get("address", "")

    contact = None
    if match_address:
        contact = Contact.objects.filter(
            organization=account.organization,
            email__iexact=match_address,
        ).first()

    email = Email.objects.create(
        organization=account.organization,
        email_account=account,
        thread=thread,
        provider_message_id=msg_id,
        direction=direction,
        from_address=from_address,
        from_name=from_name,
        to_addresses=to_addresses,
        cc_addresses=cc_addresses,
        bcc_addresses=bcc_addresses,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        snippet=snippet,
        is_read=is_read,
        is_starred=is_starred,
        labels=[],
        has_attachments=has_attachments,
        attachments_metadata=[],
        contact=contact,
        sent_at=sent_at,
    )

    if thread:
        thread.last_message_at = sent_at
        thread.message_count = thread.emails.count()
        all_participants = set()
        for e in thread.emails.all():
            all_participants.add(e.from_address)
            for addr in e.to_addresses:
                all_participants.add(addr.get("address", ""))
        thread.participants = [{"address": a} for a in all_participants if a]
        thread.save(update_fields=["last_message_at", "message_count", "participants", "updated_at"])
        if contact:
            thread.contacts.add(contact)

    return email
```

**Step 2: Commit**

```bash
git add backend/emails/sync_outlook.py
git commit -m "feat(inbox): add Outlook sync service"
```

---

### Task 1.4: Celery Sync Tasks

**Files:**
- Create: `backend/emails/tasks.py`
- Modify: `backend/config/settings.py` (add to CELERY_BEAT_SCHEDULE)

**Step 1: Create Celery tasks**

```python
"""Celery tasks for email synchronization."""
import logging

from celery import shared_task

from .models import EmailAccount

logger = logging.getLogger(__name__)


@shared_task
def sync_all_email_accounts():
    """Periodic task: sync all active email accounts."""
    accounts = EmailAccount.objects.filter(is_active=True).select_related("user", "organization")

    for account in accounts:
        sync_email_account.delay(str(account.id))


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def sync_email_account(self, account_id: str):
    """Sync a single email account."""
    try:
        account = EmailAccount.objects.get(id=account_id, is_active=True)
    except EmailAccount.DoesNotExist:
        logger.warning("Email account %s not found or inactive", account_id)
        return

    try:
        if account.provider == EmailAccount.Provider.GMAIL:
            from .sync_gmail import sync_gmail_account
            count = sync_gmail_account(account)
        else:
            from .sync_outlook import sync_outlook_account
            count = sync_outlook_account(account)

        logger.info("Synced %d emails for %s", count, account.email_address)
    except Exception as exc:
        logger.exception("Failed to sync %s", account.email_address)
        raise self.retry(exc=exc)
```

**Step 2: Add to Celery Beat schedule in `backend/config/settings.py`**

Add to `CELERY_BEAT_SCHEDULE`:

```python
"sync-email-accounts": {
    "task": "emails.tasks.sync_all_email_accounts",
    "schedule": 180,  # every 3 minutes
},
```

**Step 3: Update OAuth scopes in `backend/emails/oauth.py`**

Update Gmail scope to include read:
```python
"scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
```

Update Outlook scope to include read:
```python
"scope": "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send User.Read offline_access",
```

**Step 4: Commit**

```bash
git add backend/emails/tasks.py backend/config/settings.py backend/emails/oauth.py
git commit -m "feat(inbox): add Celery sync tasks and update OAuth scopes"
```

---

### Task 1.5: Inbox API Endpoints

**Files:**
- Modify: `backend/emails/serializers.py`
- Modify: `backend/emails/views.py`
- Modify: `backend/emails/urls.py`

**Step 1: Add serializers**

Add to `backend/emails/serializers.py`:

```python
from .models import Email, EmailThread, EmailSyncState


class EmailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Email
        fields = [
            "id", "email_account", "thread", "provider_message_id",
            "direction", "from_address", "from_name",
            "to_addresses", "cc_addresses", "bcc_addresses",
            "subject", "body_html", "body_text", "snippet",
            "is_read", "is_starred", "labels",
            "has_attachments", "attachments_metadata",
            "contact", "contact_name", "deal",
            "sent_at", "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None


class EmailThreadSerializer(serializers.ModelSerializer):
    last_email = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = EmailThread
        fields = [
            "id", "provider_thread_id", "subject",
            "last_message_at", "message_count",
            "participants", "last_email", "unread_count",
        ]
        read_only_fields = fields

    def get_last_email(self, obj):
        last = obj.emails.first()  # ordered by -sent_at
        if last:
            return {
                "id": str(last.id),
                "snippet": last.snippet,
                "from_name": last.from_name or last.from_address,
                "direction": last.direction,
                "sent_at": last.sent_at.isoformat(),
                "is_read": last.is_read,
            }
        return None

    def get_unread_count(self, obj):
        return obj.emails.filter(is_read=False).count()


class EmailSyncStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSyncState
        fields = ["sync_status", "last_sync_at", "error_message"]
        read_only_fields = fields
```

**Step 2: Add views**

Add to `backend/emails/views.py`:

```python
from .models import Email, EmailThread
from .serializers import EmailSerializer, EmailThreadSerializer, EmailSyncStateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inbox_threads(request):
    """List email threads for the inbox."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    threads = EmailThread.objects.filter(
        organization=org,
        email_account__user=request.user,
    ).prefetch_related("emails")

    # Filters
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

    # Pagination
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
    """List emails in a thread."""
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
    """Mark an email as read/unread."""
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
    """List all emails for a specific contact."""
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
    """Manually trigger email sync for the user's accounts."""
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
    """Get sync status for user's email accounts."""
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
```

**Step 3: Add URL patterns**

Add to `backend/emails/urls.py`:

```python
# Inbox
path("inbox/threads/", views.inbox_threads, name="inbox-threads"),
path("inbox/threads/<uuid:thread_id>/", views.thread_emails, name="thread-emails"),
path("inbox/emails/<uuid:email_id>/read/", views.mark_email_read, name="mark-email-read"),
path("inbox/contacts/<uuid:contact_id>/", views.contact_emails, name="contact-emails"),
path("inbox/sync/", views.trigger_sync, name="trigger-sync"),
path("inbox/sync/status/", views.sync_status, name="sync-status"),
```

**Step 4: Commit**

```bash
git add backend/emails/serializers.py backend/emails/views.py backend/emails/urls.py
git commit -m "feat(inbox): add inbox API endpoints"
```

---

### Task 1.6: Frontend - Inbox Types and API Service

**Files:**
- Modify: `frontend/types/emails.ts`
- Modify: `frontend/services/emails.ts`

**Step 1: Add types to `frontend/types/emails.ts`**

```typescript
export interface Email {
  id: string;
  email_account: string;
  thread: string | null;
  provider_message_id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  from_name: string;
  to_addresses: { name: string; address: string }[];
  cc_addresses: { name: string; address: string }[];
  bcc_addresses: { name: string; address: string }[];
  subject: string;
  body_html: string;
  body_text: string;
  snippet: string;
  is_read: boolean;
  is_starred: boolean;
  labels: string[];
  has_attachments: boolean;
  attachments_metadata: { filename: string; mime_type: string; size: number }[];
  contact: string | null;
  contact_name: string | null;
  deal: string | null;
  sent_at: string;
  created_at: string;
}

export interface EmailThread {
  id: string;
  provider_thread_id: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  participants: { address: string }[];
  last_email: {
    id: string;
    snippet: string;
    from_name: string;
    direction: "inbound" | "outbound";
    sent_at: string;
    is_read: boolean;
  } | null;
  unread_count: number;
}

export interface SyncStatus {
  account_id: string;
  email: string;
  provider: "gmail" | "outlook";
  sync_status: "idle" | "syncing" | "error";
  last_sync_at: string | null;
  error_message: string;
}
```

**Step 2: Add API functions to `frontend/services/emails.ts`**

```typescript
export async function fetchInboxThreads(params?: {
  account?: string;
  unread?: boolean;
  contact?: string;
  search?: string;
  page?: number;
}): Promise<{ count: number; results: EmailThread[] }> {
  const query = new URLSearchParams();
  if (params?.account) query.set("account", params.account);
  if (params?.unread) query.set("unread", "true");
  if (params?.contact) query.set("contact", params.contact);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  return apiFetch(`/email/inbox/threads/?${query.toString()}`);
}

export async function fetchThreadEmails(threadId: string): Promise<Email[]> {
  return apiFetch(`/email/inbox/threads/${threadId}/`);
}

export async function markEmailRead(emailId: string, isRead: boolean): Promise<void> {
  return apiFetch(`/email/inbox/emails/${emailId}/read/`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: isRead }),
  });
}

export async function fetchContactEmails(contactId: string): Promise<Email[]> {
  return apiFetch(`/email/inbox/contacts/${contactId}/`);
}

export async function triggerSync(): Promise<void> {
  return apiFetch("/email/inbox/sync/", { method: "POST" });
}

export async function fetchSyncStatus(): Promise<SyncStatus[]> {
  return apiFetch("/email/inbox/sync/status/");
}
```

**Step 3: Commit**

```bash
git add frontend/types/emails.ts frontend/services/emails.ts
git commit -m "feat(inbox): add frontend types and API service"
```

---

### Task 1.7: Frontend - Inbox Page

**Files:**
- Create: `frontend/app/(app)/inbox/page.tsx`

**Step 1: Create the inbox page**

Build a 3-column layout inbox page with:
- Left column: Thread list with search, filters (all/unread/by account), sync button
- Middle column: Selected thread's email conversation
- Right column: Contact detail sidebar (if email is linked to contact)
- Use shadcn components: Card, Input, Badge, ScrollArea, Button, Tabs
- Use existing ComposeEmailDialog for replies
- Use Lucide icons: Mail, RefreshCw, Search, Inbox, Send, Paperclip
- Responsive: on mobile, show only one column at a time

This is a large component (~400-500 lines). The implementing agent should follow the existing page patterns from `frontend/app/(app)/contacts/[id]/page.tsx` for structure and styling conventions.

**Key behaviors:**
- Load threads on mount via `fetchInboxThreads()`
- Click thread → load emails via `fetchThreadEmails(threadId)`
- Mark as read when opening a thread
- Reply button opens ComposeEmailDialog
- Sync button calls `triggerSync()` and shows loading state
- Polling: refresh thread list every 30 seconds
- Unread count badges on threads

**Step 2: Add inbox route to Sidebar**

Modify `frontend/components/Sidebar.tsx` to add inbox link with icon `Mail` from lucide-react, positioned after Dashboard.

**Step 3: Commit**

```bash
git add frontend/app/(app)/inbox/ frontend/components/Sidebar.tsx
git commit -m "feat(inbox): add inbox page and sidebar navigation"
```

---

### Task 1.8: Frontend - Contact Emails Tab

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Update contact detail Emails tab**

Replace the existing Emails tab content to use `fetchContactEmails(contactId)` and display a chronological list of all emails (inbound and outbound) with:
- Direction indicator (sent/received icon)
- Subject line
- Snippet/preview
- Date
- Click to expand full email body

**Step 2: Commit**

```bash
git add frontend/app/(app)/contacts/[id]/page.tsx
git commit -m "feat(inbox): update contact emails tab with synced emails"
```

---

### Task 1.9: Migrate SentEmail to Email model

**Files:**
- Modify: `backend/emails/service.py`

**Step 1: Update send_email service**

Modify the `send_email` function in `backend/emails/service.py` to also create an `Email` record (direction=OUTBOUND) alongside the existing `SentEmail` record. This ensures backwards compatibility while populating the new inbox.

```python
# After creating SentEmail, also create Email record
from .models import Email, EmailThread
email_record = Email.objects.create(
    organization=organization,
    email_account=account,
    provider_message_id=message_id,
    direction=Email.Direction.OUTBOUND,
    from_address=account.email_address,
    from_name=f"{user.first_name} {user.last_name}".strip(),
    to_addresses=[{"name": "", "address": to_email}],
    subject=subject,
    body_html=body_html,
    contact=contact,
    sent_at=timezone.now(),
)
```

**Step 2: Commit**

```bash
git add backend/emails/service.py
git commit -m "feat(inbox): create Email record when sending emails"
```

---

## Feature 2: Email Sequences

### Task 2.1: Sequences Django App and Models

**Files:**
- Create: `backend/sequences/` (new Django app)

**Step 1: Create Django app**

```bash
cd backend && python manage.py startapp sequences
```

**Step 2: Create models in `backend/sequences/models.py`**

```python
import uuid
from django.conf import settings
from django.db import models


class Sequence(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="sequences",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    email_account = models.ForeignKey(
        "emails.EmailAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sequences",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sequences",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class SequenceStep(models.Model):
    class StepType(models.TextChoices):
        EMAIL = "email", "Email"
        MANUAL_TASK = "manual_task", "Manual Task"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        Sequence,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    order = models.PositiveIntegerField()
    delay_days = models.PositiveIntegerField(default=1)
    delay_hours = models.PositiveIntegerField(default=0)
    subject = models.CharField(max_length=500, blank=True)
    body_html = models.TextField(blank=True)
    body_text = models.TextField(blank=True)
    step_type = models.CharField(max_length=15, choices=StepType.choices, default=StepType.EMAIL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("sequence", "order")

    def __str__(self):
        return f"Step {self.order}: {self.subject[:50]}"

    @property
    def delay_total_hours(self):
        return self.delay_days * 24 + self.delay_hours


class SequenceEnrollment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        REPLIED = "replied", "Replied"
        BOUNCED = "bounced", "Bounced"
        OPTED_OUT = "opted_out", "Opted Out"
        PAUSED = "paused", "Paused"
        UNENROLLED = "unenrolled", "Unenrolled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        Sequence,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="sequence_enrollments",
    )
    current_step = models.ForeignKey(
        SequenceStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    enrolled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sequence_enrollments",
    )

    class Meta:
        unique_together = ("sequence", "contact")
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.contact} in {self.sequence.name}"


class SequenceEmail(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        SENT = "sent", "Sent"
        OPENED = "opened", "Opened"
        CLICKED = "clicked", "Clicked"
        BOUNCED = "bounced", "Bounced"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        SequenceEnrollment,
        on_delete=models.CASCADE,
        related_name="emails",
    )
    step = models.ForeignKey(
        SequenceStep,
        on_delete=models.CASCADE,
        related_name="sent_emails",
    )
    email = models.ForeignKey(
        "emails.Email",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sequence_emails",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"Email for {self.enrollment.contact} - Step {self.step.order}"
```

**Step 3: Add to INSTALLED_APPS in `backend/config/settings.py`**

Add `"sequences"` to `INSTALLED_APPS`.

**Step 4: Create migrations and migrate**

```bash
cd backend && python manage.py makemigrations sequences && python manage.py migrate
```

**Step 5: Commit**

```bash
git add backend/sequences/ backend/config/settings.py
git commit -m "feat(sequences): add Sequence models and Django app"
```

---

### Task 2.2: Sequence Execution Engine (Celery)

**Files:**
- Create: `backend/sequences/tasks.py`
- Modify: `backend/config/settings.py` (CELERY_BEAT_SCHEDULE)

**Step 1: Create Celery tasks**

```python
"""Celery tasks for sequence execution."""
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from emails.models import Email, EmailAccount
from emails.service import send_email
from emails.template_rendering import build_template_context, render_email_template

from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail

logger = logging.getLogger(__name__)


@shared_task
def process_sequence_emails():
    """Periodic task: send scheduled sequence emails that are due."""
    now = timezone.now()
    due_emails = SequenceEmail.objects.filter(
        status=SequenceEmail.Status.SCHEDULED,
        scheduled_at__lte=now,
        enrollment__status=SequenceEnrollment.Status.ACTIVE,
        enrollment__sequence__status=Sequence.Status.ACTIVE,
    ).select_related(
        "enrollment__contact",
        "enrollment__sequence__email_account",
        "step",
    )

    for seq_email in due_emails:
        try:
            _send_sequence_email(seq_email)
        except Exception:
            logger.exception("Failed to send sequence email %s", seq_email.id)
            seq_email.status = SequenceEmail.Status.FAILED
            seq_email.save(update_fields=["status"])


def _send_sequence_email(seq_email: SequenceEmail):
    """Send a single sequence email and advance the enrollment."""
    enrollment = seq_email.enrollment
    contact = enrollment.contact
    sequence = enrollment.sequence
    step = seq_email.step

    if not contact.email:
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    account = sequence.email_account
    if not account or not account.is_active:
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    # Render template variables
    context = build_template_context(contact=contact)
    subject, body_html = render_email_template(step.subject, step.body_html, context)

    try:
        sent = send_email(
            user=sequence.created_by,
            organization=sequence.organization,
            subject=subject,
            body_html=body_html,
            contact_id=str(contact.id),
            provider=account.provider,
        )

        seq_email.status = SequenceEmail.Status.SENT
        seq_email.sent_at = timezone.now()

        # Link to Email record if it was created
        email_record = Email.objects.filter(
            email_account=account,
            contact=contact,
            subject=subject,
        ).order_by("-created_at").first()
        if email_record:
            seq_email.email = email_record

        seq_email.save(update_fields=["status", "sent_at", "email"])

    except Exception as e:
        logger.exception("Sequence email send failed: %s", e)
        seq_email.status = SequenceEmail.Status.FAILED
        seq_email.save(update_fields=["status"])
        return

    # Advance to next step
    _advance_enrollment(enrollment, step)


def _advance_enrollment(enrollment: SequenceEnrollment, completed_step: SequenceStep):
    """Schedule the next step or mark enrollment as completed."""
    next_step = SequenceStep.objects.filter(
        sequence=enrollment.sequence,
        order__gt=completed_step.order,
    ).first()

    if next_step:
        enrollment.current_step = next_step
        enrollment.save(update_fields=["current_step"])

        # Schedule next email
        delay_hours = next_step.delay_total_hours
        scheduled_at = timezone.now() + timedelta(hours=delay_hours)

        SequenceEmail.objects.create(
            enrollment=enrollment,
            step=next_step,
            status=SequenceEmail.Status.SCHEDULED,
            scheduled_at=scheduled_at,
        )
    else:
        # Sequence completed
        enrollment.status = SequenceEnrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "completed_at"])


@shared_task
def enroll_contact_in_sequence(enrollment_id: str):
    """Start a sequence enrollment by scheduling the first email."""
    try:
        enrollment = SequenceEnrollment.objects.get(id=enrollment_id)
    except SequenceEnrollment.DoesNotExist:
        return

    first_step = enrollment.sequence.steps.first()
    if not first_step:
        return

    enrollment.current_step = first_step
    enrollment.save(update_fields=["current_step"])

    # Schedule first email (with the step's delay)
    delay_hours = first_step.delay_total_hours
    scheduled_at = timezone.now() + timedelta(hours=delay_hours)

    SequenceEmail.objects.create(
        enrollment=enrollment,
        step=first_step,
        status=SequenceEmail.Status.SCHEDULED,
        scheduled_at=scheduled_at,
    )


@shared_task
def check_sequence_replies():
    """Check if contacts in active sequences have replied (stop sequence on reply)."""
    active_enrollments = SequenceEnrollment.objects.filter(
        status=SequenceEnrollment.Status.ACTIVE,
    ).select_related("contact", "sequence__organization")

    for enrollment in active_enrollments:
        # Check for inbound emails from this contact after enrollment
        has_reply = Email.objects.filter(
            organization=enrollment.sequence.organization,
            contact=enrollment.contact,
            direction=Email.Direction.INBOUND,
            sent_at__gte=enrollment.enrolled_at,
        ).exists()

        if has_reply:
            enrollment.status = SequenceEnrollment.Status.REPLIED
            enrollment.completed_at = timezone.now()
            enrollment.save(update_fields=["status", "completed_at"])

            # Cancel pending emails
            SequenceEmail.objects.filter(
                enrollment=enrollment,
                status=SequenceEmail.Status.SCHEDULED,
            ).update(status=SequenceEmail.Status.FAILED)

            logger.info(
                "Stopped sequence for %s - contact replied",
                enrollment.contact,
            )
```

**Step 2: Add to CELERY_BEAT_SCHEDULE**

```python
"process-sequence-emails": {
    "task": "sequences.tasks.process_sequence_emails",
    "schedule": 60,  # every minute
},
"check-sequence-replies": {
    "task": "sequences.tasks.check_sequence_replies",
    "schedule": 180,  # every 3 minutes
},
```

**Step 3: Commit**

```bash
git add backend/sequences/tasks.py backend/config/settings.py
git commit -m "feat(sequences): add sequence execution engine"
```

---

### Task 2.3: Sequences API

**Files:**
- Create: `backend/sequences/serializers.py`
- Create: `backend/sequences/views.py`
- Create: `backend/sequences/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Create serializers**

```python
from rest_framework import serializers
from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail


class SequenceStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceStep
        fields = [
            "id", "order", "delay_days", "delay_hours",
            "subject", "body_html", "body_text", "step_type",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SequenceSerializer(serializers.ModelSerializer):
    steps = SequenceStepSerializer(many=True, read_only=True)
    stats = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Sequence
        fields = [
            "id", "name", "description", "status",
            "email_account", "created_by", "created_by_name",
            "steps", "stats",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "steps", "stats", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()

    def get_stats(self, obj):
        enrollments = obj.enrollments.all()
        total = enrollments.count()
        active = enrollments.filter(status="active").count()
        completed = enrollments.filter(status="completed").count()
        replied = enrollments.filter(status="replied").count()
        return {
            "total_enrolled": total,
            "active": active,
            "completed": completed,
            "replied": replied,
            "reply_rate": round(replied / total * 100, 1) if total > 0 else 0,
        }


class SequenceEnrollmentSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    contact_email = serializers.SerializerMethodField()

    class Meta:
        model = SequenceEnrollment
        fields = [
            "id", "sequence", "contact", "contact_name", "contact_email",
            "current_step", "status",
            "enrolled_at", "completed_at", "enrolled_by",
        ]
        read_only_fields = ["id", "enrolled_at", "completed_at", "enrolled_by", "current_step"]

    def get_contact_name(self, obj):
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()

    def get_contact_email(self, obj):
        return obj.contact.email


class SequenceEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceEmail
        fields = [
            "id", "enrollment", "step", "email",
            "status", "scheduled_at", "sent_at", "opened_at", "clicked_at",
        ]
        read_only_fields = fields


class EnrollContactsSerializer(serializers.Serializer):
    contact_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
```

**Step 2: Create views**

```python
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail
from .serializers import (
    SequenceSerializer, SequenceStepSerializer,
    SequenceEnrollmentSerializer, SequenceEmailSerializer,
    EnrollContactsSerializer,
)
from .tasks import enroll_contact_in_sequence


class SequenceViewSet(viewsets.ModelViewSet):
    serializer_class = SequenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Sequence.objects.filter(
            organization=self.request.organization,
        ).prefetch_related("steps", "enrollments")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def steps(self, request, pk=None):
        """Add a step to a sequence."""
        sequence = self.get_object()
        serializer = SequenceStepSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Auto-assign order if not provided
        if "order" not in request.data:
            last_order = sequence.steps.order_by("-order").values_list("order", flat=True).first()
            serializer.save(sequence=sequence, order=(last_order or 0) + 1)
        else:
            serializer.save(sequence=sequence)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        """Enroll contacts in a sequence."""
        sequence = self.get_object()
        serializer = EnrollContactsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from contacts.models import Contact
        contact_ids = serializer.validated_data["contact_ids"]
        contacts = Contact.objects.filter(
            id__in=contact_ids,
            organization=request.organization,
        )

        enrolled = []
        for contact in contacts:
            enrollment, created = SequenceEnrollment.objects.get_or_create(
                sequence=sequence,
                contact=contact,
                defaults={
                    "enrolled_by": request.user,
                    "status": SequenceEnrollment.Status.ACTIVE,
                },
            )
            if created:
                enroll_contact_in_sequence.delay(str(enrollment.id))
                enrolled.append(str(enrollment.id))

        return Response({
            "enrolled_count": len(enrolled),
            "enrollment_ids": enrolled,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        """List enrollments for a sequence."""
        sequence = self.get_object()
        enrollments = sequence.enrollments.select_related("contact")
        status_filter = request.query_params.get("status")
        if status_filter:
            enrollments = enrollments.filter(status=status_filter)
        return Response(SequenceEnrollmentSerializer(enrollments, many=True).data)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def step_detail(request, sequence_id, step_id):
    """Update or delete a sequence step."""
    try:
        step = SequenceStep.objects.get(
            id=step_id,
            sequence_id=sequence_id,
            sequence__organization=request.organization,
        )
    except SequenceStep.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        step.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SequenceStepSerializer(step, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unenroll_contact(request, enrollment_id):
    """Unenroll a contact from a sequence."""
    try:
        enrollment = SequenceEnrollment.objects.get(
            id=enrollment_id,
            sequence__organization=request.organization,
        )
    except SequenceEnrollment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    enrollment.status = SequenceEnrollment.Status.UNENROLLED
    enrollment.completed_at = timezone.now()
    enrollment.save(update_fields=["status", "completed_at"])

    # Cancel pending emails
    SequenceEmail.objects.filter(
        enrollment=enrollment,
        status=SequenceEmail.Status.SCHEDULED,
    ).update(status=SequenceEmail.Status.FAILED)

    return Response({"status": "unenrolled"})
```

**Step 3: Create URLs**

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.SequenceViewSet, basename="sequences")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "<uuid:sequence_id>/steps/<uuid:step_id>/",
        views.step_detail,
        name="sequence-step-detail",
    ),
    path(
        "enrollments/<uuid:enrollment_id>/unenroll/",
        views.unenroll_contact,
        name="sequence-unenroll",
    ),
]
```

**Step 4: Add to main urls.py**

Add to `backend/config/urls.py`:
```python
path("api/sequences/", include("sequences.urls")),
```

**Step 5: Commit**

```bash
git add backend/sequences/serializers.py backend/sequences/views.py backend/sequences/urls.py backend/config/urls.py
git commit -m "feat(sequences): add sequences API endpoints"
```

---

### Task 2.4: Frontend - Sequences Types, Service, and Pages

**Files:**
- Create: `frontend/types/sequences.ts`
- Create: `frontend/services/sequences.ts`
- Create: `frontend/app/(app)/sequences/page.tsx`
- Create: `frontend/app/(app)/sequences/[id]/page.tsx`
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Create types**

```typescript
// frontend/types/sequences.ts
export interface SequenceStep {
  id: string;
  order: number;
  delay_days: number;
  delay_hours: number;
  subject: string;
  body_html: string;
  body_text: string;
  step_type: "email" | "manual_task";
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  name: string;
  description: string;
  status: "draft" | "active" | "paused" | "archived";
  email_account: string | null;
  created_by: string;
  created_by_name: string;
  steps: SequenceStep[];
  stats: {
    total_enrolled: number;
    active: number;
    completed: number;
    replied: number;
    reply_rate: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence: string;
  contact: string;
  contact_name: string;
  contact_email: string;
  current_step: string | null;
  status: "active" | "completed" | "replied" | "bounced" | "opted_out" | "paused" | "unenrolled";
  enrolled_at: string;
  completed_at: string | null;
  enrolled_by: string;
}
```

**Step 2: Create API service**

```typescript
// frontend/services/sequences.ts
import { apiFetch } from "@/lib/api";
import type { Sequence, SequenceStep, SequenceEnrollment } from "@/types/sequences";

export async function fetchSequences(): Promise<Sequence[]> {
  return apiFetch("/sequences/");
}

export async function fetchSequence(id: string): Promise<Sequence> {
  return apiFetch(`/sequences/${id}/`);
}

export async function createSequence(data: Partial<Sequence>): Promise<Sequence> {
  return apiFetch("/sequences/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSequence(id: string, data: Partial<Sequence>): Promise<Sequence> {
  return apiFetch(`/sequences/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteSequence(id: string): Promise<void> {
  return apiFetch(`/sequences/${id}/`, { method: "DELETE" });
}

export async function addSequenceStep(sequenceId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  return apiFetch(`/sequences/${sequenceId}/steps/`, { method: "POST", body: JSON.stringify(data) });
}

export async function updateSequenceStep(sequenceId: string, stepId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  return apiFetch(`/sequences/${sequenceId}/steps/${stepId}/`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteSequenceStep(sequenceId: string, stepId: string): Promise<void> {
  return apiFetch(`/sequences/${sequenceId}/steps/${stepId}/`, { method: "DELETE" });
}

export async function enrollContacts(sequenceId: string, contactIds: string[]): Promise<{ enrolled_count: number }> {
  return apiFetch(`/sequences/${sequenceId}/enroll/`, {
    method: "POST",
    body: JSON.stringify({ contact_ids: contactIds }),
  });
}

export async function fetchEnrollments(sequenceId: string, status?: string): Promise<SequenceEnrollment[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch(`/sequences/${sequenceId}/enrollments/${query}`);
}

export async function unenrollContact(enrollmentId: string): Promise<void> {
  return apiFetch(`/sequences/enrollments/${enrollmentId}/unenroll/`, { method: "POST" });
}
```

**Step 3: Create sequences list page**

Build `/sequences` page with:
- List of sequences as cards showing name, status badge, stats (enrolled, reply rate)
- Create button opens dialog with name, description, email account selector
- Status filter tabs: All / Draft / Active / Paused
- Click sequence → navigate to detail page
- Follow existing page patterns

**Step 4: Create sequence detail page**

Build `/sequences/[id]` page with:
- Sequence header: name, status toggle (draft→active→paused), delete
- Steps editor: ordered list of steps, each showing delay, subject, body preview
- Add step button: opens form with delay_days, delay_hours, subject, body (TipTap editor)
- Drag-to-reorder steps (use dnd-kit like kanban)
- Enrollments tab: list of enrolled contacts with status badges, unenroll button
- Enroll button: contact selector dialog for bulk enrollment
- Stats sidebar: total enrolled, active, completed, replied, reply rate

**Step 5: Add to Sidebar**

Add "Sequences" link with `Zap` icon from lucide-react, positioned after Inbox.

**Step 6: Commit**

```bash
git add frontend/types/sequences.ts frontend/services/sequences.ts frontend/app/(app)/sequences/ frontend/components/Sidebar.tsx
git commit -m "feat(sequences): add frontend sequences pages"
```

---

## Feature 3: Call Log

### Task 3.1: Call Model

**Files:**
- Modify: `backend/notes/models.py`
- Create migration

**Step 1: Add Call model**

Add to `backend/notes/models.py`:

```python
class Call(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    class Outcome(models.TextChoices):
        ANSWERED = "answered", "Answered"
        VOICEMAIL = "voicemail", "Voicemail"
        NO_ANSWER = "no_answer", "No Answer"
        BUSY = "busy", "Busy"
        WRONG_NUMBER = "wrong_number", "Wrong Number"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="calls",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="calls",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    outcome = models.CharField(max_length=15, choices=Outcome.choices)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    started_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    logged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="logged_calls",
    )
    timeline_entry = models.OneToOneField(
        TimelineEntry,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="call",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"Call {self.direction} - {self.contact} ({self.outcome})"

    @property
    def duration_formatted(self):
        if self.duration_seconds is None:
            return ""
        minutes = self.duration_seconds // 60
        seconds = self.duration_seconds % 60
        return f"{minutes}:{seconds:02d}"
```

**Step 2: Run migrations**

```bash
cd backend && python manage.py makemigrations notes && python manage.py migrate
```

**Step 3: Commit**

```bash
git add backend/notes/models.py backend/notes/migrations/
git commit -m "feat(calls): add Call model"
```

---

### Task 3.2: Call API

**Files:**
- Modify: `backend/notes/serializers.py`
- Modify: `backend/notes/views.py`
- Create: `backend/notes/call_urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Add CallSerializer**

Add to `backend/notes/serializers.py`:

```python
from .models import Call


class CallSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    duration_formatted = serializers.ReadOnlyField()

    class Meta:
        model = Call
        fields = [
            "id", "contact", "contact_name", "deal",
            "direction", "outcome", "duration_seconds", "duration_formatted",
            "started_at", "notes", "logged_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "logged_by", "duration_formatted", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()


class CallCreateSerializer(serializers.Serializer):
    contact = serializers.UUIDField()
    deal = serializers.UUIDField(required=False, allow_null=True)
    direction = serializers.ChoiceField(choices=Call.Direction.choices)
    outcome = serializers.ChoiceField(choices=Call.Outcome.choices)
    duration_seconds = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    started_at = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
```

**Step 2: Add call views**

Add to `backend/notes/views.py`:

```python
from .models import Call
from .serializers import CallSerializer, CallCreateSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def call_list_create(request):
    """List or create calls."""
    org = request.organization

    if request.method == "GET":
        calls = Call.objects.filter(organization=org)
        contact_id = request.query_params.get("contact")
        if contact_id:
            calls = calls.filter(contact_id=contact_id)
        deal_id = request.query_params.get("deal")
        if deal_id:
            calls = calls.filter(deal_id=deal_id)
        return Response(CallSerializer(calls, many=True).data)

    serializer = CallCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contact_id = data["contact"]

    if not Contact.objects.filter(id=contact_id, organization=org).exists():
        return Response(
            {"contact": "Contact introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Create timeline entry
    duration_text = ""
    if data.get("duration_seconds"):
        mins = data["duration_seconds"] // 60
        secs = data["duration_seconds"] % 60
        duration_text = f" ({mins}:{secs:02d})"

    timeline_entry = TimelineEntry.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=data.get("deal"),
        entry_type=TimelineEntry.EntryType.CALL,
        subject=f"Appel {data['direction']}",
        content=data.get("notes", ""),
        metadata={
            "direction": data["direction"],
            "outcome": data["outcome"],
            "duration_seconds": data.get("duration_seconds"),
        },
    )

    call = Call.objects.create(
        organization=org,
        contact_id=contact_id,
        deal_id=data.get("deal"),
        direction=data["direction"],
        outcome=data["outcome"],
        duration_seconds=data.get("duration_seconds"),
        started_at=data["started_at"],
        notes=data.get("notes", ""),
        logged_by=request.user,
        timeline_entry=timeline_entry,
    )

    return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def call_detail(request, pk):
    """Get, update, or delete a call."""
    try:
        call = Call.objects.get(pk=pk, organization=request.organization)
    except Call.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(CallSerializer(call).data)

    if request.method == "DELETE":
        if call.timeline_entry:
            call.timeline_entry.delete()
        call.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT
    serializer = CallCreateSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    for field, value in serializer.validated_data.items():
        if field != "contact":
            setattr(call, field, value)
    call.save()

    # Update timeline entry metadata
    if call.timeline_entry:
        call.timeline_entry.metadata = {
            "direction": call.direction,
            "outcome": call.outcome,
            "duration_seconds": call.duration_seconds,
        }
        call.timeline_entry.content = call.notes
        call.timeline_entry.save(update_fields=["metadata", "content"])

    return Response(CallSerializer(call).data)
```

**Step 3: Create call URLs**

```python
# backend/notes/call_urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.call_list_create, name="call-list-create"),
    path("<uuid:pk>/", views.call_detail, name="call-detail"),
]
```

**Step 4: Add to main urls.py**

```python
path("api/calls/", include("notes.call_urls")),
```

**Step 5: Commit**

```bash
git add backend/notes/serializers.py backend/notes/views.py backend/notes/call_urls.py backend/config/urls.py
git commit -m "feat(calls): add call log API endpoints"
```

---

### Task 3.3: Frontend - Call Log UI

**Files:**
- Create: `frontend/types/calls.ts`
- Create: `frontend/services/calls.ts`
- Create: `frontend/components/calls/LogCallDialog.tsx`
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create types**

```typescript
// frontend/types/calls.ts
export interface Call {
  id: string;
  contact: string;
  contact_name: string;
  deal: string | null;
  direction: "inbound" | "outbound";
  outcome: "answered" | "voicemail" | "no_answer" | "busy" | "wrong_number";
  duration_seconds: number | null;
  duration_formatted: string;
  started_at: string;
  notes: string;
  logged_by: string;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Create API service**

```typescript
// frontend/services/calls.ts
import { apiFetch } from "@/lib/api";
import type { Call } from "@/types/calls";

export async function fetchCalls(params?: { contact?: string; deal?: string }): Promise<Call[]> {
  const query = new URLSearchParams();
  if (params?.contact) query.set("contact", params.contact);
  if (params?.deal) query.set("deal", params.deal);
  return apiFetch(`/calls/?${query.toString()}`);
}

export async function createCall(data: {
  contact: string;
  deal?: string;
  direction: string;
  outcome: string;
  duration_seconds?: number;
  started_at: string;
  notes?: string;
}): Promise<Call> {
  return apiFetch("/calls/", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteCall(id: string): Promise<void> {
  return apiFetch(`/calls/${id}/`, { method: "DELETE" });
}
```

**Step 3: Create LogCallDialog component**

Build a dialog with:
- Contact autocomplete (pre-filled if opened from contact page)
- Direction toggle: Outbound / Inbound
- Outcome selector: Answered, Voicemail, No Answer, Busy, Wrong Number
- Duration input: minutes and seconds fields
- Date/time picker (default: now)
- Notes textarea
- Deal selector (optional)
- Use shadcn Dialog, Select, Input, Button, Textarea
- On submit: call `createCall()`, toast success, close dialog
- Use `Phone`, `PhoneIncoming`, `PhoneOutgoing` icons from lucide-react

**Step 4: Integrate into contact detail page**

- Add a "Log call" button (Phone icon) next to the existing Activity button
- Clicking it opens LogCallDialog with contact pre-filled
- Calls appear in the Activities timeline with phone icon, duration, outcome badge
- Add click-to-call on phone number field: opens `tel:` link, then prompts to log the call

**Step 5: Commit**

```bash
git add frontend/types/calls.ts frontend/services/calls.ts frontend/components/calls/ frontend/app/(app)/contacts/[id]/page.tsx
git commit -m "feat(calls): add call log UI and dialog"
```

---

## Feature 4: Calendar Integration (Push)

### Task 4.1: Calendars Django App and Models

**Files:**
- Create: `backend/calendars/` (new Django app)

**Step 1: Create Django app**

```bash
cd backend && python manage.py startapp calendars
```

**Step 2: Create models**

```python
# backend/calendars/models.py
import uuid
from django.conf import settings
from django.db import models


class CalendarAccount(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        OUTLOOK = "outlook", "Outlook"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="calendar_accounts",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="calendar_accounts",
    )
    email_account = models.ForeignKey(
        "emails.EmailAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calendar_account",
    )
    provider = models.CharField(max_length=10, choices=Provider.choices)
    calendar_id = models.CharField(max_length=255, default="primary")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "organization", "provider")

    def __str__(self):
        return f"{self.provider} calendar for {self.user.email}"


class Meeting(models.Model):
    class SyncStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SYNCED = "synced", "Synced"
        FAILED = "failed", "Failed"
        NOT_SYNCED = "not_synced", "Not Synced"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="meetings",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=500, blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meetings",
    )
    contacts = models.ManyToManyField(
        "contacts.Contact",
        blank=True,
        related_name="meeting_invitations",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meetings",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meetings",
    )
    provider_event_id = models.CharField(max_length=255, blank=True)
    calendar_account = models.ForeignKey(
        CalendarAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meetings",
    )
    sync_status = models.CharField(
        max_length=15,
        choices=SyncStatus.choices,
        default=SyncStatus.NOT_SYNCED,
    )
    attendees = models.JSONField(default=list, blank=True)
    reminder_minutes = models.PositiveIntegerField(default=15)
    timeline_entry = models.OneToOneField(
        "notes.TimelineEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meeting",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at"]

    def __str__(self):
        return self.title
```

**Step 3: Add to INSTALLED_APPS and migrate**

Add `"calendars"` to INSTALLED_APPS.

```bash
cd backend && python manage.py makemigrations calendars && python manage.py migrate
```

**Step 4: Commit**

```bash
git add backend/calendars/ backend/config/settings.py
git commit -m "feat(calendar): add CalendarAccount and Meeting models"
```

---

### Task 4.2: Calendar Push Sync Service

**Files:**
- Create: `backend/calendars/sync.py`
- Create: `backend/calendars/tasks.py`

**Step 1: Create sync service**

```python
# backend/calendars/sync.py
"""Push events to Google Calendar and Outlook Calendar."""
import logging

import httpx

from emails.oauth import get_valid_access_token

logger = logging.getLogger(__name__)


def push_to_google(calendar_account, meeting) -> str:
    """Create/update event in Google Calendar. Returns provider event ID."""
    access_token = get_valid_access_token(calendar_account.email_account)
    calendar_id = calendar_account.calendar_id or "primary"

    event_body = {
        "summary": meeting.title,
        "description": meeting.description,
        "location": meeting.location,
        "start": {
            "dateTime": meeting.start_at.isoformat(),
            "timeZone": "Europe/Paris",
        },
        "end": {
            "dateTime": meeting.end_at.isoformat(),
            "timeZone": "Europe/Paris",
        },
        "attendees": [{"email": a.get("email", a.get("address", ""))} for a in meeting.attendees if a.get("email") or a.get("address")],
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "popup", "minutes": meeting.reminder_minutes}],
        },
    }

    if meeting.is_all_day:
        event_body["start"] = {"date": meeting.start_at.strftime("%Y-%m-%d")}
        event_body["end"] = {"date": meeting.end_at.strftime("%Y-%m-%d")}

    with httpx.Client(timeout=15) as client:
        if meeting.provider_event_id:
            # Update existing event
            resp = client.put(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{meeting.provider_event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                json=event_body,
            )
        else:
            # Create new event
            resp = client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                headers={"Authorization": f"Bearer {access_token}"},
                json=event_body,
            )

        resp.raise_for_status()
        return resp.json().get("id", "")


def push_to_outlook(calendar_account, meeting) -> str:
    """Create/update event in Outlook Calendar. Returns provider event ID."""
    access_token = get_valid_access_token(calendar_account.email_account)

    event_body = {
        "subject": meeting.title,
        "body": {"contentType": "text", "content": meeting.description},
        "location": {"displayName": meeting.location},
        "start": {
            "dateTime": meeting.start_at.isoformat(),
            "timeZone": "Europe/Paris",
        },
        "end": {
            "dateTime": meeting.end_at.isoformat(),
            "timeZone": "Europe/Paris",
        },
        "attendees": [
            {
                "emailAddress": {"address": a.get("email", a.get("address", "")), "name": a.get("name", "")},
                "type": "required",
            }
            for a in meeting.attendees if a.get("email") or a.get("address")
        ],
        "isReminderOn": True,
        "reminderMinutesBeforeStart": meeting.reminder_minutes,
        "isAllDay": meeting.is_all_day,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=15) as client:
        if meeting.provider_event_id:
            resp = client.patch(
                f"https://graph.microsoft.com/v1.0/me/events/{meeting.provider_event_id}",
                headers=headers,
                json=event_body,
            )
        else:
            resp = client.post(
                "https://graph.microsoft.com/v1.0/me/events",
                headers=headers,
                json=event_body,
            )

        resp.raise_for_status()
        return resp.json().get("id", "")


def delete_from_google(calendar_account, meeting):
    """Delete event from Google Calendar."""
    if not meeting.provider_event_id:
        return
    access_token = get_valid_access_token(calendar_account.email_account)
    calendar_id = calendar_account.calendar_id or "primary"
    with httpx.Client(timeout=15) as client:
        client.delete(
            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{meeting.provider_event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )


def delete_from_outlook(calendar_account, meeting):
    """Delete event from Outlook Calendar."""
    if not meeting.provider_event_id:
        return
    access_token = get_valid_access_token(calendar_account.email_account)
    with httpx.Client(timeout=15) as client:
        client.delete(
            f"https://graph.microsoft.com/v1.0/me/events/{meeting.provider_event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
```

**Step 2: Create Celery tasks**

```python
# backend/calendars/tasks.py
import logging

from celery import shared_task

from .models import Meeting, CalendarAccount

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def sync_meeting_to_calendar(self, meeting_id: str):
    """Push a meeting to the external calendar."""
    try:
        meeting = Meeting.objects.get(id=meeting_id)
    except Meeting.DoesNotExist:
        return

    calendar_account = meeting.calendar_account
    if not calendar_account or not calendar_account.is_active:
        meeting.sync_status = Meeting.SyncStatus.NOT_SYNCED
        meeting.save(update_fields=["sync_status"])
        return

    try:
        from .sync import push_to_google, push_to_outlook

        if calendar_account.provider == CalendarAccount.Provider.GOOGLE:
            event_id = push_to_google(calendar_account, meeting)
        else:
            event_id = push_to_outlook(calendar_account, meeting)

        meeting.provider_event_id = event_id
        meeting.sync_status = Meeting.SyncStatus.SYNCED
        meeting.save(update_fields=["provider_event_id", "sync_status", "updated_at"])

    except Exception as exc:
        logger.exception("Failed to sync meeting %s", meeting_id)
        meeting.sync_status = Meeting.SyncStatus.FAILED
        meeting.save(update_fields=["sync_status", "updated_at"])
        raise self.retry(exc=exc)


@shared_task
def delete_meeting_from_calendar(meeting_id: str, provider: str, provider_event_id: str, email_account_id: str):
    """Delete a meeting from external calendar."""
    from emails.models import EmailAccount

    try:
        email_account = EmailAccount.objects.get(id=email_account_id)
    except EmailAccount.DoesNotExist:
        return

    try:
        from .sync import delete_from_google, delete_from_outlook

        # Create a minimal object for the delete functions
        class MinimalMeeting:
            pass

        m = MinimalMeeting()
        m.provider_event_id = provider_event_id

        class MinimalCalendarAccount:
            pass

        ca = MinimalCalendarAccount()
        ca.email_account = email_account
        ca.calendar_id = "primary"

        if provider == "google":
            delete_from_google(ca, m)
        else:
            delete_from_outlook(ca, m)

    except Exception:
        logger.exception("Failed to delete calendar event %s", provider_event_id)
```

**Step 3: Commit**

```bash
git add backend/calendars/sync.py backend/calendars/tasks.py
git commit -m "feat(calendar): add calendar push sync service"
```

---

### Task 4.3: Calendar API

**Files:**
- Create: `backend/calendars/serializers.py`
- Create: `backend/calendars/views.py`
- Create: `backend/calendars/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Create serializers**

```python
from rest_framework import serializers
from .models import CalendarAccount, Meeting


class CalendarAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarAccount
        fields = ["id", "provider", "calendar_id", "is_active", "email_account", "created_at"]
        read_only_fields = ["id", "created_at"]


class MeetingSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "description", "location",
            "start_at", "end_at", "is_all_day",
            "contact", "contact_name", "deal",
            "created_by", "calendar_account", "sync_status",
            "attendees", "reminder_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "sync_status", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None


class MeetingCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    is_all_day = serializers.BooleanField(default=False)
    contact = serializers.UUIDField(required=False, allow_null=True)
    contact_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    deal = serializers.UUIDField(required=False, allow_null=True)
    calendar_account = serializers.UUIDField(required=False, allow_null=True)
    attendees = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    reminder_minutes = serializers.IntegerField(default=15, min_value=0)

    def validate(self, data):
        if data["end_at"] <= data["start_at"]:
            raise serializers.ValidationError("end_at doit être après start_at.")
        return data
```

**Step 2: Create views**

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notes.models import TimelineEntry
from .models import CalendarAccount, Meeting
from .serializers import CalendarAccountSerializer, MeetingSerializer, MeetingCreateSerializer
from .tasks import sync_meeting_to_calendar, delete_meeting_from_calendar


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def calendar_account_list(request):
    """List or create calendar accounts."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    if request.method == "GET":
        accounts = CalendarAccount.objects.filter(user=request.user, organization=org)
        return Response(CalendarAccountSerializer(accounts, many=True).data)

    # POST: create from an existing email account
    email_account_id = request.data.get("email_account")
    if not email_account_id:
        return Response({"detail": "email_account requis."}, status=status.HTTP_400_BAD_REQUEST)

    from emails.models import EmailAccount
    try:
        email_account = EmailAccount.objects.get(id=email_account_id, user=request.user, organization=org)
    except EmailAccount.DoesNotExist:
        return Response({"detail": "Compte email introuvable."}, status=status.HTTP_404_NOT_FOUND)

    provider = "google" if email_account.provider == "gmail" else "outlook"

    account, created = CalendarAccount.objects.get_or_create(
        user=request.user,
        organization=org,
        provider=provider,
        defaults={
            "email_account": email_account,
            "calendar_id": "primary",
        },
    )
    return Response(
        CalendarAccountSerializer(account).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def meeting_list_create(request):
    """List or create meetings."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    if request.method == "GET":
        meetings = Meeting.objects.filter(organization=org, created_by=request.user)

        contact_id = request.query_params.get("contact")
        if contact_id:
            meetings = meetings.filter(contact_id=contact_id)

        deal_id = request.query_params.get("deal")
        if deal_id:
            meetings = meetings.filter(deal_id=deal_id)

        # Date range filter for calendar view
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            meetings = meetings.filter(end_at__gte=start)
        if end:
            meetings = meetings.filter(start_at__lte=end)

        return Response(MeetingSerializer(meetings, many=True).data)

    # POST
    serializer = MeetingCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contact_id = data.pop("contact", None)
    contact_ids = data.pop("contact_ids", [])
    calendar_account_id = data.pop("calendar_account", None)
    deal_id = data.pop("deal", None)

    calendar_account = None
    if calendar_account_id:
        try:
            calendar_account = CalendarAccount.objects.get(
                id=calendar_account_id, user=request.user, organization=org,
            )
        except CalendarAccount.DoesNotExist:
            pass

    # Create timeline entry
    timeline_entry = TimelineEntry.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.MEETING,
        subject=data["title"],
        content=data.get("description", ""),
        metadata={
            "scheduled_at": data["start_at"].isoformat(),
            "end_at": data["end_at"].isoformat(),
            "location": data.get("location", ""),
            "title": data["title"],
        },
    )

    meeting = Meeting.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=deal_id,
        calendar_account=calendar_account,
        sync_status=Meeting.SyncStatus.PENDING if calendar_account else Meeting.SyncStatus.NOT_SYNCED,
        timeline_entry=timeline_entry,
        **{k: v for k, v in data.items() if k in [
            "title", "description", "location", "start_at", "end_at",
            "is_all_day", "attendees", "reminder_minutes",
        ]},
    )

    # Add multiple contacts
    if contact_ids:
        from contacts.models import Contact
        contacts = Contact.objects.filter(id__in=contact_ids, organization=org)
        meeting.contacts.set(contacts)

    # Push to calendar if account is set
    if calendar_account:
        sync_meeting_to_calendar.delay(str(meeting.id))

    return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def meeting_detail(request, pk):
    """Get, update, or delete a meeting."""
    try:
        meeting = Meeting.objects.get(pk=pk, organization=request.organization)
    except Meeting.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(MeetingSerializer(meeting).data)

    if request.method == "DELETE":
        # Delete from external calendar if synced
        if meeting.provider_event_id and meeting.calendar_account:
            delete_meeting_from_calendar.delay(
                str(meeting.id),
                meeting.calendar_account.provider,
                meeting.provider_event_id,
                str(meeting.calendar_account.email_account_id),
            )
        if meeting.timeline_entry:
            meeting.timeline_entry.delete()
        meeting.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT
    serializer = MeetingCreateSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    for field in ["title", "description", "location", "start_at", "end_at", "is_all_day", "attendees", "reminder_minutes"]:
        if field in data:
            setattr(meeting, field, data[field])

    if "contact" in data:
        meeting.contact_id = data["contact"]
    if "deal" in data:
        meeting.deal_id = data["deal"]
    if "calendar_account" in data:
        try:
            meeting.calendar_account = CalendarAccount.objects.get(id=data["calendar_account"])
        except CalendarAccount.DoesNotExist:
            pass

    meeting.save()

    # Re-sync to calendar
    if meeting.calendar_account:
        meeting.sync_status = Meeting.SyncStatus.PENDING
        meeting.save(update_fields=["sync_status"])
        sync_meeting_to_calendar.delay(str(meeting.id))

    return Response(MeetingSerializer(meeting).data)
```

**Step 3: Create URLs**

```python
# backend/calendars/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("accounts/", views.calendar_account_list, name="calendar-accounts"),
    path("meetings/", views.meeting_list_create, name="meeting-list-create"),
    path("meetings/<uuid:pk>/", views.meeting_detail, name="meeting-detail"),
]
```

**Step 4: Add to main urls.py**

```python
path("api/calendar/", include("calendars.urls")),
```

**Step 5: Update OAuth scopes**

In `backend/emails/oauth.py`, update Gmail scope to include calendar:
```python
"scope": "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar",
```

Update Outlook scope:
```python
"scope": "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.ReadWrite User.Read offline_access",
```

**Step 6: Commit**

```bash
git add backend/calendars/serializers.py backend/calendars/views.py backend/calendars/urls.py backend/config/urls.py backend/emails/oauth.py
git commit -m "feat(calendar): add calendar API and OAuth scopes"
```

---

### Task 4.4: Frontend - Calendar Types, Service, and Pages

**Files:**
- Create: `frontend/types/calendar.ts`
- Create: `frontend/services/calendar.ts`
- Create: `frontend/app/(app)/calendar/page.tsx`
- Create: `frontend/components/calendar/CreateMeetingDialog.tsx`
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Create types**

```typescript
// frontend/types/calendar.ts
export interface CalendarAccount {
  id: string;
  provider: "google" | "outlook";
  calendar_id: string;
  is_active: boolean;
  email_account: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  contact: string | null;
  contact_name: string | null;
  deal: string | null;
  created_by: string;
  calendar_account: string | null;
  sync_status: "pending" | "synced" | "failed" | "not_synced";
  attendees: { email?: string; address?: string; name?: string }[];
  reminder_minutes: number;
  created_at: string;
  updated_at: string;
}
```

**Step 2: Create API service**

```typescript
// frontend/services/calendar.ts
import { apiFetch } from "@/lib/api";
import type { CalendarAccount, Meeting } from "@/types/calendar";

export async function fetchCalendarAccounts(): Promise<CalendarAccount[]> {
  return apiFetch("/calendar/accounts/");
}

export async function createCalendarAccount(emailAccountId: string): Promise<CalendarAccount> {
  return apiFetch("/calendar/accounts/", {
    method: "POST",
    body: JSON.stringify({ email_account: emailAccountId }),
  });
}

export async function fetchMeetings(params?: {
  contact?: string;
  deal?: string;
  start?: string;
  end?: string;
}): Promise<Meeting[]> {
  const query = new URLSearchParams();
  if (params?.contact) query.set("contact", params.contact);
  if (params?.deal) query.set("deal", params.deal);
  if (params?.start) query.set("start", params.start);
  if (params?.end) query.set("end", params.end);
  return apiFetch(`/calendar/meetings/?${query.toString()}`);
}

export async function createMeeting(data: Partial<Meeting> & { contact_ids?: string[] }): Promise<Meeting> {
  return apiFetch("/calendar/meetings/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
  return apiFetch(`/calendar/meetings/${id}/`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteMeeting(id: string): Promise<void> {
  return apiFetch(`/calendar/meetings/${id}/`, { method: "DELETE" });
}
```

**Step 3: Create calendar page**

Build `/calendar` page with:
- Month/Week/Day view toggle (build simple grid-based calendar, no external library)
- Meetings displayed as colored blocks on the calendar
- Click on empty slot → opens CreateMeetingDialog
- Click on meeting → shows detail popover with edit/delete options
- Month navigation (prev/next buttons)
- Use date range params to fetch meetings for visible range
- Sync status indicator on each meeting (small icon)

**Step 4: Create CreateMeetingDialog**

Dialog with:
- Title input
- Start/End datetime pickers
- All-day checkbox
- Location input
- Description textarea
- Contact autocomplete
- Deal selector
- Calendar account selector (for push sync)
- Attendees: email input with add/remove
- Reminder minutes selector
- Use shadcn Dialog, Input, Textarea, Button, Select, Checkbox

**Step 5: Add to Sidebar**

Add "Calendar" link with `Calendar` icon from lucide-react, after Sequences.

**Step 6: Commit**

```bash
git add frontend/types/calendar.ts frontend/services/calendar.ts frontend/app/(app)/calendar/ frontend/components/calendar/ frontend/components/Sidebar.tsx
git commit -m "feat(calendar): add calendar page and meeting dialog"
```

---

## Final Integration Tasks

### Task 5.1: Update Contact Detail Page

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

Add to the contact detail page:
- "Meetings" section in timeline showing upcoming and past meetings
- "Sequences" indicator showing if contact is enrolled in a sequence (with unenroll button)
- Enhanced timeline filtering to include calls, emails, meetings

**Commit:**
```bash
git commit -m "feat: integrate all communication features into contact detail"
```

---

### Task 5.2: Update Deal Detail Page

**Files:**
- Modify: `frontend/app/(app)/deals/[id]/page.tsx`

Add to the deal detail page:
- "Calls" tab or section showing calls associated with this deal
- "Meetings" section showing meetings associated with this deal
- "Log call" and "Schedule meeting" quick action buttons

**Commit:**
```bash
git commit -m "feat: integrate calls and meetings into deal detail"
```

---

### Task 5.3: Update AI Chat Tools

**Files:**
- Modify: `backend/chat/tools.py`

Add new AI tools:
- `log_call()` - Log a call via AI chat
- `schedule_meeting()` - Schedule a meeting via AI chat
- `enroll_in_sequence()` - Enroll a contact in a sequence

**Commit:**
```bash
git commit -m "feat(chat): add call, meeting, and sequence AI tools"
```
