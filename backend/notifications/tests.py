from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status

from notifications.models import Notification
from organizations.models import Organization
from django.contrib.auth import get_user_model
from deals.models import Deal, PipelineStage
from tasks.models import Task
from contacts.models import Contact
from notes.models import TimelineEntry

User = get_user_model()


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "first_name": "Test",
            "last_name": "User",
        })
        self.token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.user = User.objects.get(email="test@example.com")
        self.org = Organization.objects.filter(memberships__user=self.user).first()

    def _create_notification(self, **kwargs):
        defaults = {
            "organization": self.org,
            "recipient": self.user,
            "type": "reminder",
            "title": "Test notification",
            "message": "This is a test",
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)

    def test_list_notifications(self):
        self._create_notification()
        self._create_notification(title="Second")
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_unread_first(self):
        self._create_notification(title="Read", is_read=True)
        self._create_notification(title="Unread", is_read=False)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.data[0]["title"], "Unread")

    def test_mark_read(self):
        n = self._create_notification()
        response = self.client.post("/api/notifications/read/", {"ids": [str(n.id)]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        n.refresh_from_db()
        self.assertTrue(n.is_read)

    def test_mark_all_read(self):
        self._create_notification()
        self._create_notification()
        self.client.post("/api/notifications/read-all/")
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    def test_unread_count(self):
        self._create_notification()
        self._create_notification(is_read=True)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_unauthenticated_rejected(self):
        self.client.credentials()
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ReminderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reg = self.client.post("/api/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "first_name": "Test",
            "last_name": "User",
        })
        self.token = reg.data["access"]
        self.user = User.objects.get(email="test@example.com")
        self.org = Organization.objects.filter(memberships__user=self.user).first()

    def test_overdue_task_creates_notification(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Overdue task",
            due_date=timezone.now() - timedelta(days=1),
            priority="high",
        )
        call_command("check_reminders")
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, type="task_due").count(),
            1,
        )

    def test_task_due_today_creates_notification(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Today task",
            due_date=timezone.now(),
            priority="normal",
        )
        call_command("check_reminders")
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.user, message__contains="Today task"
            ).exists()
        )

    def test_no_duplicate_reminders(self):
        Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Overdue task",
            due_date=timezone.now() - timedelta(days=1),
            priority="high",
        )
        call_command("check_reminders")
        call_command("check_reminders")
        # Should not create duplicate
        self.assertEqual(
            Notification.objects.filter(recipient=self.user, type="task_due").count(),
            1,
        )
