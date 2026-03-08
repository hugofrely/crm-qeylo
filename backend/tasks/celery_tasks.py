from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.utils.translation import gettext as _

from notifications.email import send_notification_email
from notifications.models import Notification
from organizations.models import Organization, OrganizationSettings
from .models import Task, TaskReminder


WINDOW_MINUTES = 5


def format_reminder_title(offset_minutes):
    if offset_minutes >= 1440:
        days = offset_minutes // 1440
        if days == 1:
            return _("Tâche due demain")
        return _("Tâche due dans {days} jours").format(days=days)
    if offset_minutes >= 60:
        hours = offset_minutes // 60
        if hours == 1:
            return _("Tâche due dans 1 heure")
        return _("Tâche due dans {hours} heures").format(hours=hours)
    return _("Tâche due dans {minutes} minutes").format(minutes=offset_minutes)


def get_task_recipients(task):
    assignees = [a.user for a in task.assignments.select_related("user").all()]
    if assignees:
        return assignees
    if task.created_by:
        return [task.created_by]
    return []


@shared_task
def check_task_reminders():
    """Periodic task: check for upcoming task deadlines and send reminders."""
    now = timezone.now()

    for org_settings in OrganizationSettings.objects.select_related("organization").all():
        org = org_settings.organization
        offsets = org_settings.task_reminder_offsets or []

        for offset in offsets:
            window_start = now + timedelta(minutes=offset - WINDOW_MINUTES)
            window_end = now + timedelta(minutes=offset + WINDOW_MINUTES)

            tasks = (
                Task.objects.filter(
                    organization=org,
                    is_done=False,
                    due_date__gte=window_start,
                    due_date__lte=window_end,
                )
                .exclude(reminders__offset_minutes=offset)
                .prefetch_related("assignments__user")
                .select_related("created_by")
            )

            title = format_reminder_title(offset)

            for task in tasks:
                recipients = get_task_recipients(task)
                for user in recipients:
                    Notification.objects.create(
                        organization=org,
                        recipient=user,
                        type="task_reminder",
                        title=title,
                        message=_("Rappel : {description}").format(description=task.description),
                        link="/tasks",
                    )
                    if getattr(user, "email_notifications", True):
                        send_notification_email(
                            user.email, title, _("Rappel : {description}").format(description=task.description),
                            user=user,
                        )

                TaskReminder.objects.create(task=task, offset_minutes=offset)


@shared_task
def apply_scoring_decay():
    """Daily task: recalculate scores for all contacts to apply inactivity decay."""
    from contacts.models import Contact
    from contacts.scoring import recalculate_score

    for org in Organization.objects.all():
        contacts = Contact.objects.filter(organization=org, numeric_score__gt=0)
        for contact in contacts.iterator():
            recalculate_score(contact)
