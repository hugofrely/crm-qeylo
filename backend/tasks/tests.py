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
