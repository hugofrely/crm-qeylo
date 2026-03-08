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
