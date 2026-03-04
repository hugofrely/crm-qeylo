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


class ActivityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "activity@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        contact_resp = self.client.post(
            "/api/contacts/",
            {"first_name": "Marie", "last_name": "Dupont"},
        )
        self.contact_id = contact_resp.data["id"]

    def test_create_call_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "subject": "Appel de suivi",
                "content": "Discussion sur le projet",
                "metadata": {
                    "direction": "outbound",
                    "duration_minutes": 15,
                    "outcome": "answered",
                    "phone_number": "+33612345678",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["entry_type"], "call")
        self.assertEqual(response.data["metadata"]["direction"], "outbound")

    def test_create_call_missing_direction_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "metadata": {"outcome": "answered"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_email_sent_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "email_sent",
                "contact": self.contact_id,
                "content": "Sent follow-up email",
                "metadata": {
                    "subject": "Follow-up",
                    "recipients": ["marie@example.com"],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_email_missing_subject_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "email_sent",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_meeting_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "meeting",
                "contact": self.contact_id,
                "content": "Product demo",
                "metadata": {
                    "title": "Demo produit",
                    "scheduled_at": "2026-03-10T14:00:00Z",
                    "duration_minutes": 60,
                    "location": "Zoom",
                    "participants": ["Marie Dupont"],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_custom_activity(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "custom",
                "contact": self.contact_id,
                "content": "Lunch with client",
                "metadata": {"custom_type_label": "Déjeuner"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_custom_missing_label_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "custom",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activity_shows_in_timeline(self):
        self.client.post(
            "/api/activities/",
            {
                "entry_type": "call",
                "contact": self.contact_id,
                "subject": "Call",
                "metadata": {
                    "direction": "inbound",
                    "outcome": "answered",
                },
            },
            format="json",
        )
        response = self.client.get(f"/api/timeline/?contact={self.contact_id}")
        self.assertTrue(any(e["entry_type"] == "call" for e in response.data))

    def test_invalid_entry_type_fails(self):
        response = self.client.post(
            "/api/activities/",
            {
                "entry_type": "note_added",
                "contact": self.contact_id,
                "metadata": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
