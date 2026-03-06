from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from notifications.models import Notification
from organizations.models import Organization, Membership, OrganizationSettings
from tasks.models import Task, TaskAssignment, TaskReminder

User = get_user_model()


class CheckTaskRemindersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="hugo@test.com", password="pass12345678",
            first_name="Hugo", last_name="Frely",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        Membership.objects.create(organization=self.org, user=self.user, role="owner")
        self.settings = OrganizationSettings.objects.create(
            organization=self.org, task_reminder_offsets=[60, 1440]
        )

    def _create_task(self, due_date, is_done=False, assign_user=None):
        task = Task.objects.create(
            organization=self.org, created_by=self.user,
            description="Test task", due_date=due_date, is_done=is_done,
        )
        if assign_user:
            TaskAssignment.objects.create(task=task, user=assign_user, assigned_by=self.user)
        return task

    @patch("tasks.celery_tasks.send_notification_email")
    def test_reminder_sent_for_task_due_in_1h(self, mock_email):
        """Task due in ~1h should trigger a 60min reminder."""
        due = timezone.now() + timedelta(minutes=60)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=60).exists())
        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("1 heure", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_reminder_sent_for_task_due_in_24h(self, mock_email):
        """Task due in ~24h should trigger a 1440min reminder."""
        due = timezone.now() + timedelta(minutes=1440)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=1440).exists())
        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("demain", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_duplicate_reminder(self, mock_email):
        """Already-sent reminder should not be sent again."""
        due = timezone.now() + timedelta(minutes=60)
        task = self._create_task(due, assign_user=self.user)
        TaskReminder.objects.create(task=task, offset_minutes=60)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_reminder_for_done_task(self, mock_email):
        """Completed tasks should not get reminders."""
        due = timezone.now() + timedelta(minutes=60)
        self._create_task(due, is_done=True, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_fallback_to_creator_when_no_assignees(self, mock_email):
        """If no one is assigned, creator gets the reminder."""
        due = timezone.now() + timedelta(minutes=60)
        self._create_task(due)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_custom_offsets_respected(self, mock_email):
        """Org with only [30] offset should only check 30min window."""
        self.settings.task_reminder_offsets = [30]
        self.settings.save()

        due = timezone.now() + timedelta(minutes=30)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=30).exists())
        notif = Notification.objects.filter(type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("30 minutes", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_reminder_outside_window(self, mock_email):
        """Task due in 3h should not trigger a 60min reminder."""
        due = timezone.now() + timedelta(hours=3)
        self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)
