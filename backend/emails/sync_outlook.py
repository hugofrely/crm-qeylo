"""Outlook/Microsoft Graph email synchronization."""
import logging
from datetime import datetime, timezone as tz

import httpx

from contacts.models import Contact
from .models import Email, EmailThread, EmailSyncState, EmailAccount
from .oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.microsoft.com/v1.0/me"


def sync_outlook_account(account: EmailAccount) -> int:
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


def _sync_outlook_full(account, sync_state, headers):
    synced = 0
    url = f"{GRAPH_API}/mailFolders/inbox/messages/delta?$top=50&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments,internetMessageId"

    with httpx.Client(timeout=30) as client:
        max_pages = 4
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


def _sync_outlook_delta(account, sync_state, headers):
    synced = 0
    url = sync_state.last_delta_token

    with httpx.Client(timeout=30) as client:
        while url:
            resp = client.get(url, headers=headers)

            if resp.status_code == 410:
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


def _store_outlook_message(account, msg, is_sent=False):
    msg_id = msg["id"]

    existing = Email.objects.filter(
        email_account=account, provider_message_id=msg_id
    ).first()
    if existing:
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

    direction = Email.Direction.OUTBOUND if is_sent or from_address.lower() == account.email_address.lower() else Email.Direction.INBOUND

    date_str = msg.get("sentDateTime") or msg.get("receivedDateTime", "")
    try:
        sent_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        sent_at = datetime.now(tz.utc)

    is_read = msg.get("isRead", False)
    is_starred = msg.get("flag", {}).get("flagStatus") == "flagged"
    has_attachments = msg.get("hasAttachments", False)

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
