from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.translation import gettext as _

from organizations.models import Organization, Membership
from deals.models import Deal
from tasks.models import Task
from contacts.models import Contact
from notes.models import TimelineEntry
from notifications.models import Notification
from notifications.helpers import create_notification
from notifications.email import send_reminder_email


class Command(BaseCommand):
    help = "Check for deals, tasks, and contacts that need reminders"

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()
        total_created = 0

        for org in Organization.objects.all():
            members = Membership.objects.filter(organization=org).select_related("user")

            for membership in members:
                user = membership.user
                reminders = []

                # Rule 1: Inactive deals (no timeline entry in 7 days)
                active_deals = Deal.objects.filter(
                    organization=org,
                ).exclude(stage__name__in=["Gagné", "Perdu"])

                for deal in active_deals:
                    last_entry = TimelineEntry.objects.filter(
                        organization=org, deal=deal,
                    ).order_by("-created_at").first()
                    cutoff = now - timedelta(days=7)
                    is_inactive = (
                        not last_entry or last_entry.created_at < cutoff
                    )
                    if is_inactive and not self._has_unread(
                        org, user, "reminder", f"deal-inactive-{deal.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="reminder",
                            title=_("Deal inactif : {name}").format(name=deal.name),
                            message=_("Le deal « {name} » n'a pas eu d'activité depuis 7 jours.").format(name=deal.name),
                            link=f"/deals/{deal.id}",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 2: Overdue tasks
                overdue_tasks = Task.objects.filter(
                    organization=org, is_done=False, due_date__lt=now,
                )
                for task in overdue_tasks:
                    if not self._has_unread(
                        org, user, "task_due", f"task-overdue-{task.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="task_due",
                            title=_("Tâche en retard"),
                            message=_("La tâche « {description} » est en retard.").format(description=task.description),
                            link=f"/tasks/{task.id}",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 3: Tasks due today
                tasks_today = Task.objects.filter(
                    organization=org,
                    is_done=False,
                    due_date__date=today,
                )
                for task in tasks_today:
                    if not self._has_unread(
                        org, user, "task_due", f"task-today-{task.id}"
                    ):
                        n = create_notification(
                            organization=org,
                            recipient=user,
                            type="task_due",
                            title=_("Rappel"),
                            message=_("La tâche « {description} » est prévue pour aujourd'hui.").format(description=task.description),
                            link=f"/tasks/{task.id}",
                        )
                        reminders.append({"title": n.title, "message": n.message})
                        total_created += 1

                # Rule 4: Contacts without follow-up (30 days)
                cutoff_30 = now - timedelta(days=30)
                contacts = Contact.objects.filter(organization=org)
                for contact in contacts:
                    last = TimelineEntry.objects.filter(
                        organization=org, contact=contact,
                    ).order_by("-created_at").first()
                    if last and last.created_at < cutoff_30:
                        if not self._has_unread(
                            org, user, "reminder", f"contact-inactive-{contact.id}"
                        ):
                            name = f"{contact.first_name} {contact.last_name}"
                            n = create_notification(
                                organization=org,
                                recipient=user,
                                type="reminder",
                                title=_("Contact sans suivi : {name}").format(name=name),
                                message=_("Vous n'avez pas eu de contact avec {name} depuis 30 jours.").format(name=name),
                                link=f"/contacts/{contact.id}",
                            )
                            reminders.append({"title": n.title, "message": n.message})
                            total_created += 1

                # Send email digest if any reminders and user wants emails
                if reminders and getattr(user, "email_notifications", True):
                    send_reminder_email(user.email, reminders, user=user)

        self.stdout.write(
            self.style.SUCCESS(f"Created {total_created} reminder notifications.")
        )

    def _has_unread(self, org, user, notif_type, key):
        """Check if an unread notification with similar content exists (anti-duplicate)."""
        return Notification.objects.filter(
            organization=org,
            recipient=user,
            type=notif_type,
            is_read=False,
            link__contains=key.split("-")[-1] if "-" in key else "",
        ).exists()
