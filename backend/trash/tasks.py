from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task


@shared_task
def purge_trash():
    cutoff = timezone.now() - timedelta(days=30)
    total = 0
    for Model in [Task, Deal, Contact]:
        count, _ = Model.all_objects.filter(
            deleted_at__isnull=False,
            deleted_at__lte=cutoff,
        ).delete()
        total += count
    return f"Purged {total} items from trash"
