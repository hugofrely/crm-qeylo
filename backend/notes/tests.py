from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class TimelineTests(TestCase):
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
        contact_resp = self.client.post(
            "/api/contacts/",
            {"first_name": "Marie", "last_name": "Dupont"},
        )
        self.contact_id = contact_resp.data["id"]

    def test_add_note(self):
        response = self.client.post(
            "/api/notes/",
            {"contact": self.contact_id, "content": "Test note"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_timeline(self):
        self.client.post(
            "/api/notes/",
            {"contact": self.contact_id, "content": "Note 1"},
        )
        self.client.post(
            "/api/notes/",
            {"contact": self.contact_id, "content": "Note 2"},
        )
        response = self.client.get(
            f"/api/timeline/?contact={self.contact_id}"
        )
        self.assertEqual(len(response.data), 2)
