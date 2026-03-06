from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TaskTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "hugo@example.com",
                "password": "securepass123",
                "first_name": "Hugo",
                "last_name": "Frely",
                "organization_name": "Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_task(self):
        response = self.client.post(
            "/api/tasks/",
            {
                "description": "Rappeler Marie",
                "due_date": "2026-03-10T10:00:00Z",
                "priority": "high",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_list_tasks(self):
        self.client.post(
            "/api/tasks/",
            {"description": "Task 1", "due_date": "2026-03-10T10:00:00Z"},
        )
        self.client.post(
            "/api/tasks/",
            {"description": "Task 2", "due_date": "2026-03-11T10:00:00Z"},
        )
        response = self.client.get("/api/tasks/")
        self.assertEqual(response.data["count"], 2)

    def test_complete_task(self):
        create = self.client.post(
            "/api/tasks/",
            {"description": "Task 1", "due_date": "2026-03-10T10:00:00Z"},
        )
        response = self.client.patch(
            f"/api/tasks/{create.data['id']}/", {"is_done": True}
        )
        self.assertTrue(response.data["is_done"])

    def test_delete_task(self):
        create = self.client.post(
            "/api/tasks/",
            {"description": "Delete me", "due_date": "2026-03-10T10:00:00Z"},
        )
        task_id = create.data["id"]
        response = self.client.delete(f"/api/tasks/{task_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Task should NOT appear in normal list
        list_response = self.client.get("/api/tasks/")
        ids = [t["id"] for t in list_response.data["results"]]
        self.assertNotIn(task_id, ids)

        # Task should still exist in DB with deleted_at set
        from tasks.models import Task
        task = Task.all_objects.get(id=task_id)
        self.assertIsNotNone(task.deleted_at)

    def test_filter_tasks_by_is_done(self):
        self.client.post("/api/tasks/", {"description": "Done task", "due_date": "2026-03-10T10:00:00Z"})
        create2 = self.client.post("/api/tasks/", {"description": "Todo task", "due_date": "2026-03-11T10:00:00Z"})
        self.client.patch(f"/api/tasks/{create2.data['id']}/", {"is_done": True})

        response = self.client.get("/api/tasks/?is_done=false")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "Done task")

        response = self.client.get("/api/tasks/?is_done=true")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "Todo task")

    def test_filter_tasks_by_priority(self):
        self.client.post("/api/tasks/", {"description": "High", "due_date": "2026-03-10T10:00:00Z", "priority": "high"})
        self.client.post("/api/tasks/", {"description": "Low", "due_date": "2026-03-11T10:00:00Z", "priority": "low"})

        response = self.client.get("/api/tasks/?priority=high")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "High")

    def test_filter_tasks_by_due_date_overdue(self):
        self.client.post("/api/tasks/", {"description": "Overdue", "due_date": "2020-01-01T10:00:00Z"})
        self.client.post("/api/tasks/", {"description": "Future", "due_date": "2030-01-01T10:00:00Z"})

        response = self.client.get("/api/tasks/?due_date=overdue")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "Overdue")

    def test_counters_stay_global_with_is_done_filter(self):
        self.client.post("/api/tasks/", {"description": "Todo", "due_date": "2026-03-10T10:00:00Z"})
        create2 = self.client.post("/api/tasks/", {"description": "Done", "due_date": "2026-03-11T10:00:00Z"})
        self.client.patch(f"/api/tasks/{create2.data['id']}/", {"is_done": True})

        response = self.client.get("/api/tasks/?is_done=false")
        self.assertEqual(response.data["todo_count"], 1)
        self.assertEqual(response.data["done_count"], 1)

    def test_create_task_with_assignees(self):
        """Creating a task with assigned_to should create TaskAssignment records."""
        from accounts.models import User
        user = User.objects.get(email="hugo@example.com")

        response = self.client.post(
            "/api/tasks/",
            {
                "description": "Tâche assignée",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [str(user.id)],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["assignees"]), 1)
        self.assertEqual(response.data["assignees"][0]["user_id"], str(user.id))
        self.assertEqual(response.data["assignees"][0]["first_name"], "Hugo")

    def test_assignees_returned_in_list(self):
        """Task list should include assignees."""
        from accounts.models import User
        user = User.objects.get(email="hugo@example.com")

        self.client.post(
            "/api/tasks/",
            {
                "description": "Tâche avec assigné",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [str(user.id)],
            },
            format="json",
        )
        response = self.client.get("/api/tasks/")
        self.assertEqual(len(response.data["results"][0]["assignees"]), 1)

    def test_filter_by_assigned_to_me(self):
        """Filter assigned_to=me returns tasks assigned to current user."""
        from accounts.models import User
        user = User.objects.get(email="hugo@example.com")

        self.client.post(
            "/api/tasks/",
            {"description": "My task", "due_date": "2026-03-10T10:00:00Z", "assigned_to": [str(user.id)]},
            format="json",
        )
        self.client.post(
            "/api/tasks/",
            {"description": "Unassigned", "due_date": "2026-03-11T10:00:00Z"},
        )

        response = self.client.get("/api/tasks/?assigned_to=me")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "My task")

    def test_filter_by_assigned_to_user_id(self):
        """Filter assigned_to=<uuid> returns tasks assigned to that user."""
        from accounts.models import User
        user = User.objects.get(email="hugo@example.com")

        self.client.post(
            "/api/tasks/",
            {"description": "Assigned", "due_date": "2026-03-10T10:00:00Z", "assigned_to": [str(user.id)]},
            format="json",
        )
        self.client.post(
            "/api/tasks/",
            {"description": "Not assigned", "due_date": "2026-03-11T10:00:00Z"},
        )

        response = self.client.get(f"/api/tasks/?assigned_to={user.id}")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["description"], "Assigned")

    def test_assign_non_member_fails(self):
        """Assigning a user who is not a member of the org should fail validation."""
        import uuid as uuid_mod
        fake_user_id = str(uuid_mod.uuid4())
        response = self.client.post(
            "/api/tasks/",
            {
                "description": "Bad assign",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [fake_user_id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_assignees(self):
        """Updating assigned_to should sync TaskAssignment records."""
        from accounts.models import User
        user = User.objects.get(email="hugo@example.com")

        r = self.client.post(
            "/api/tasks/",
            {"description": "Task", "due_date": "2026-03-10T10:00:00Z"},
        )
        task_id = r.data["id"]
        self.assertEqual(len(r.data["assignees"]), 0)

        r2 = self.client.patch(
            f"/api/tasks/{task_id}/",
            {"assigned_to": [str(user.id)]},
            format="json",
        )
        self.assertEqual(len(r2.data["assignees"]), 1)

        r3 = self.client.patch(
            f"/api/tasks/{task_id}/",
            {"assigned_to": []},
            format="json",
        )
        self.assertEqual(len(r3.data["assignees"]), 0)

    def test_notification_created_on_assign(self):
        """Assigning someone else should create a notification."""
        from accounts.models import User
        from notifications.models import Notification

        from organizations.models import Membership
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()

        alice = UserModel.objects.create_user(
            email="alice@example.com",
            password="securepass123",
            first_name="Alice",
            last_name="Martin",
        )

        hugo = UserModel.objects.get(email="hugo@example.com")
        org = hugo.memberships.first().organization
        Membership.objects.create(organization=org, user=alice, role="member")

        self.client.post(
            "/api/tasks/",
            {
                "description": "Tâche pour Alice",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [str(alice.id)],
            },
            format="json",
        )

        notif = Notification.objects.filter(recipient=alice, type="task_assigned").first()
        self.assertIsNotNone(notif)
        self.assertIn("Hugo", notif.message)
        self.assertIn("Tâche pour Alice", notif.message)

    def test_no_self_notification(self):
        """Assigning yourself should not create a notification."""
        from accounts.models import User
        from notifications.models import Notification

        user = User.objects.get(email="hugo@example.com")
        self.client.post(
            "/api/tasks/",
            {
                "description": "Self assign",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [str(user.id)],
            },
            format="json",
        )

        count = Notification.objects.filter(recipient=user, type="task_assigned").count()
        self.assertEqual(count, 0)

    def test_unique_assignment(self):
        """Assigning same user twice in update should not duplicate."""
        from accounts.models import User
        from tasks.models import TaskAssignment

        user = User.objects.get(email="hugo@example.com")
        r = self.client.post(
            "/api/tasks/",
            {
                "description": "Dedup test",
                "due_date": "2026-03-10T10:00:00Z",
                "assigned_to": [str(user.id)],
            },
            format="json",
        )
        task_id = r.data["id"]

        self.client.patch(
            f"/api/tasks/{task_id}/",
            {"assigned_to": [str(user.id)]},
            format="json",
        )
        self.assertEqual(TaskAssignment.objects.filter(task_id=task_id).count(), 1)

    def test_reminders_reset_on_due_date_change(self):
        """Changing due_date should delete existing TaskReminder records."""
        from tasks.models import TaskReminder

        r = self.client.post(
            "/api/tasks/",
            {"description": "Reminder test", "due_date": "2026-03-10T10:00:00Z"},
        )
        task_id = r.data["id"]

        # Simulate a sent reminder
        TaskReminder.objects.create(task_id=task_id, offset_minutes=60)
        self.assertEqual(TaskReminder.objects.filter(task_id=task_id).count(), 1)

        # Change due_date
        self.client.patch(
            f"/api/tasks/{task_id}/",
            {"due_date": "2026-03-15T14:00:00Z"},
        )

        # Reminders should be cleared
        self.assertEqual(TaskReminder.objects.filter(task_id=task_id).count(), 0)

    def test_filter_by_date_range(self):
        """Filter by due_date_gte and due_date_lte returns tasks in range."""
        self.client.post("/api/tasks/", {"description": "March 5", "due_date": "2026-03-05T10:00:00Z"})
        self.client.post("/api/tasks/", {"description": "March 10", "due_date": "2026-03-10T10:00:00Z"})
        self.client.post("/api/tasks/", {"description": "March 20", "due_date": "2026-03-20T10:00:00Z"})

        response = self.client.get("/api/tasks/?due_date_gte=2026-03-01T00:00:00Z&due_date_lte=2026-03-15T23:59:59Z")
        self.assertEqual(response.data["count"], 2)
        descriptions = [t["description"] for t in response.data["results"]]
        self.assertIn("March 5", descriptions)
        self.assertIn("March 10", descriptions)
        self.assertNotIn("March 20", descriptions)

    def test_date_range_returns_unpaginated(self):
        """When due_date_gte + due_date_lte are set, all results are returned (no pagination)."""
        for i in range(25):
            self.client.post("/api/tasks/", {"description": f"Task {i}", "due_date": "2026-03-10T10:00:00Z"})

        response = self.client.get("/api/tasks/?due_date_gte=2026-03-01T00:00:00Z&due_date_lte=2026-03-31T23:59:59Z")
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(len(response.data["results"]), 25)
