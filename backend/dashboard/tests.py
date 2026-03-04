from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DashboardTests(TestCase):
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

    def test_dashboard_stats(self):
        response = self.client.get("/api/dashboard/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("revenue_this_month", response.data)
        self.assertIn("total_pipeline", response.data)
        self.assertIn("deals_by_stage", response.data)
        self.assertIn("upcoming_tasks", response.data)
