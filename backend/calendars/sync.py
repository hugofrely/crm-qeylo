"""Push events to Google Calendar and Outlook Calendar."""
import logging
import httpx
from emails.oauth import get_valid_access_token

logger = logging.getLogger(__name__)


def push_to_google(calendar_account, meeting) -> str:
    access_token = get_valid_access_token(calendar_account.email_account)
    calendar_id = calendar_account.calendar_id or "primary"

    event_body = {
        "summary": meeting.title,
        "description": meeting.description,
        "location": meeting.location,
        "start": {"dateTime": meeting.start_at.isoformat(), "timeZone": "Europe/Paris"},
        "end": {"dateTime": meeting.end_at.isoformat(), "timeZone": "Europe/Paris"},
        "attendees": [
            {"email": a.get("email", a.get("address", ""))}
            for a in meeting.attendees if a.get("email") or a.get("address")
        ],
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
            resp = client.put(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{meeting.provider_event_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                json=event_body,
            )
        else:
            resp = client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                headers={"Authorization": f"Bearer {access_token}"},
                json=event_body,
            )
        resp.raise_for_status()
        return resp.json().get("id", "")


def push_to_outlook(calendar_account, meeting) -> str:
    access_token = get_valid_access_token(calendar_account.email_account)

    event_body = {
        "subject": meeting.title,
        "body": {"contentType": "text", "content": meeting.description},
        "location": {"displayName": meeting.location},
        "start": {"dateTime": meeting.start_at.isoformat(), "timeZone": "Europe/Paris"},
        "end": {"dateTime": meeting.end_at.isoformat(), "timeZone": "Europe/Paris"},
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

    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    with httpx.Client(timeout=15) as client:
        if meeting.provider_event_id:
            resp = client.patch(
                f"https://graph.microsoft.com/v1.0/me/events/{meeting.provider_event_id}",
                headers=headers, json=event_body,
            )
        else:
            resp = client.post(
                "https://graph.microsoft.com/v1.0/me/events",
                headers=headers, json=event_body,
            )
        resp.raise_for_status()
        return resp.json().get("id", "")


def delete_from_google(calendar_account, meeting):
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
    if not meeting.provider_event_id:
        return
    access_token = get_valid_access_token(calendar_account.email_account)
    with httpx.Client(timeout=15) as client:
        client.delete(
            f"https://graph.microsoft.com/v1.0/me/events/{meeting.provider_event_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
