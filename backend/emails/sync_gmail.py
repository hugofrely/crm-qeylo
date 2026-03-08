"""Gmail email synchronization using Gmail API."""
import base64
import logging
from datetime import datetime, timezone as tz
from email.utils import parseaddr, parsedate_to_datetime

import httpx

from contacts.models import Contact
from .models import Email, EmailThread, EmailSyncState, EmailAccount
from .oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def _get_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _parse_email_address(raw: str) -> tuple[str, str]:
    name, addr = parseaddr(raw)
    return name, addr


def _extract_header(headers: list[dict], name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _extract_body(payload: dict) -> tuple[str, str]:
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
    if not header_value:
        return []
    results = []
    for raw in header_value.split(","):
        name, addr = _parse_email_address(raw.strip())
        if addr:
            results.append({"name": name, "address": addr})
    return results


def _get_attachments_metadata(payload: dict) -> list[dict]:
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
        attachments.extend(_get_attachments_metadata(part))
    return attachments


def sync_gmail_account(account: EmailAccount) -> int:
    sync_state, _ = EmailSyncState.objects.get_or_create(email_account=account)

    if sync_state.sync_status == EmailSyncState.SyncStatus.SYNCING:
        logger.info("Already syncing %s, skipping", account.email_address)
        return 0

    sync_state.sync_status = EmailSyncState.SyncStatus.SYNCING
    sync_state.save(update_fields=["sync_status", "updated_at"])

    try:
        access_token = get_valid_access_token(account)
        headers = _get_headers(access_token)

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


def _sync_gmail_full(account, sync_state, headers):
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

        for msg_id in fetched_ids[:max_messages]:
            if Email.objects.filter(email_account=account, provider_message_id=msg_id).exists():
                continue
            try:
                resp = client.get(
                    f"{GMAIL_API}/messages/{msg_id}",
                    headers=headers,
                    params={"format": "full"},
                )
                resp.raise_for_status()
                _store_gmail_message(account, resp.json())
                synced += 1
            except Exception:
                logger.exception("Failed to fetch message %s", msg_id)

        profile_resp = client.get(f"{GMAIL_API}/profile", headers=headers)
        profile_resp.raise_for_status()
        sync_state.last_history_id = profile_resp.json().get("historyId", "")
        sync_state.save(update_fields=["last_history_id", "updated_at"])

    return synced


def _sync_gmail_incremental(account, sync_state, headers):
    synced = 0

    with httpx.Client(timeout=30) as client:
        resp = client.get(
            f"{GMAIL_API}/history",
            headers=headers,
            params={
                "startHistoryId": sync_state.last_history_id,
                "historyTypes": "messageAdded",
            },
        )

        if resp.status_code == 404:
            sync_state.last_history_id = ""
            sync_state.save(update_fields=["last_history_id", "updated_at"])
            return _sync_gmail_full(account, sync_state, headers)

        resp.raise_for_status()
        data = resp.json()

        new_history_id = data.get("historyId", sync_state.last_history_id)

        for history in data.get("history", []):
            for added in history.get("messagesAdded", []):
                msg_id = added["message"]["id"]
                if Email.objects.filter(email_account=account, provider_message_id=msg_id).exists():
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

    return synced


def _store_gmail_message(account, msg_data):
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

    direction = Email.Direction.INBOUND
    if from_address.lower() == account.email_address.lower():
        direction = Email.Direction.OUTBOUND

    try:
        sent_at = parsedate_to_datetime(date_str)
    except Exception:
        sent_at = datetime.now(tz.utc)

    label_ids = msg_data.get("labelIds", [])
    is_read = "UNREAD" not in label_ids
    is_starred = "STARRED" in label_ids

    attachments = _get_attachments_metadata(payload)

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
