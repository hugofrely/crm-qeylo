from django.test import TestCase
from rest_framework.test import APIClient


class TrashAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "hugo@example.com",
                "password": "securepass123",
                "first_name": "Hugo",
                "last_name": "Frely",
                "organization_name": "Hugo Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_trash_list_empty(self):
        response = self.client.get("/api/trash/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_trash_list_shows_deleted_contact(self):
        create = self.client.post(
            "/api/contacts/",
            {"first_name": "Trash", "last_name": "Test"},
            format="json",
        )
        self.client.delete(f"/api/contacts/{create.data['id']}/")

        response = self.client.get("/api/trash/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "contact")

    def test_trash_filter_by_type(self):
        # Create and delete a contact
        contact = self.client.post(
            "/api/contacts/",
            {"first_name": "Filter", "last_name": "Contact"},
            format="json",
        )
        self.client.delete(f"/api/contacts/{contact.data['id']}/")

        # Create and delete a task
        task = self.client.post(
            "/api/tasks/",
            {"description": "Filter Task", "due_date": "2026-03-10T10:00:00Z"},
        )
        self.client.delete(f"/api/tasks/{task.data['id']}/")

        # Filter by type=contact should return only the contact
        response = self.client.get("/api/trash/?type=contact")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "contact")

        # Filter by type=task should return only the task
        response = self.client.get("/api/trash/?type=task")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "task")

    def test_restore_item(self):
        create = self.client.post(
            "/api/contacts/",
            {"first_name": "Restore", "last_name": "Test"},
            format="json",
        )
        contact_id = create.data["id"]
        self.client.delete(f"/api/contacts/{contact_id}/")

        response = self.client.post(
            "/api/trash/restore/",
            {"type": "contact", "ids": [contact_id]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        # Contact should be back in normal list
        list_response = self.client.get("/api/contacts/")
        ids = [c["id"] for c in list_response.data["results"]]
        self.assertIn(contact_id, ids)

    def test_permanent_delete(self):
        create = self.client.post(
            "/api/contacts/",
            {"first_name": "Perm", "last_name": "Delete"},
            format="json",
        )
        contact_id = create.data["id"]
        self.client.delete(f"/api/contacts/{contact_id}/")

        response = self.client.delete(
            "/api/trash/permanent-delete/",
            {"type": "contact", "ids": [contact_id]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        from contacts.models import Contact
        self.assertFalse(Contact.all_objects.filter(id=contact_id).exists())

    def test_empty_trash(self):
        create = self.client.post(
            "/api/contacts/",
            {"first_name": "Empty", "last_name": "Test"},
            format="json",
        )
        self.client.delete(f"/api/contacts/{create.data['id']}/")

        response = self.client.delete("/api/trash/empty/")
        self.assertEqual(response.status_code, 200)

        from contacts.models import Contact
        self.assertFalse(
            Contact.all_objects.filter(id=create.data["id"]).exists()
        )

    def test_counts(self):
        create = self.client.post(
            "/api/contacts/",
            {"first_name": "Count", "last_name": "Test"},
            format="json",
        )
        self.client.delete(f"/api/contacts/{create.data['id']}/")

        response = self.client.get("/api/trash/counts/")
        self.assertEqual(response.data["contact"], 1)
        self.assertEqual(response.data["deal"], 0)
        self.assertEqual(response.data["task"], 0)
        self.assertEqual(response.data["total"], 1)
