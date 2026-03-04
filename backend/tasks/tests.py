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
