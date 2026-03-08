import logging
from celery import shared_task
from .models import Meeting, CalendarAccount

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def sync_meeting_to_calendar(self, meeting_id: str):
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
    from emails.models import EmailAccount

    try:
        email_account = EmailAccount.objects.get(id=email_account_id)
    except EmailAccount.DoesNotExist:
        return

    try:
        from .sync import delete_from_google, delete_from_outlook

        class _M:
            pass
        m = _M()
        m.provider_event_id = provider_event_id

        class _CA:
            pass
        ca = _CA()
        ca.email_account = email_account
        ca.calendar_id = "primary"

        if provider == "google":
            delete_from_google(ca, m)
        else:
            delete_from_outlook(ca, m)

    except Exception:
        logger.exception("Failed to delete calendar event %s", provider_event_id)
