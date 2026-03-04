import io

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ContactTests(TestCase):
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

    def test_create_contact(self):
        response = self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
                "email": "marie@decathlon.com",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["first_name"], "Marie")

    def test_list_contacts(self):
        self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        self.client.post(
            "/api/contacts/", {"first_name": "Pierre", "last_name": "Martin"}
        )
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_update_contact(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/", {"company": "Nike"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company"], "Nike")

    def test_delete_contact(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.delete(f"/api/contacts/{create.data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_search_contacts(self):
        self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
            },
        )
        self.client.post(
            "/api/contacts/",
            {
                "first_name": "Pierre",
                "last_name": "Martin",
                "company": "Nike",
            },
        )
        response = self.client.get("/api/contacts/search/?q=decathlon")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_contacts_scoped_to_organization(self):
        self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        client2 = APIClient()
        reg2 = client2.post(
            "/api/auth/register/",
            {
                "email": "other@example.com",
                "password": "securepass123",
                "first_name": "Other",
                "last_name": "User",
            },
        )
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {reg2.data['access']}")
        response = client2.get("/api/contacts/")
        self.assertEqual(response.data["count"], 0)

    def test_create_contact_with_enrichment_fields(self):
        response = self.client.post(
            "/api/contacts/",
            {
                "first_name": "Marie",
                "last_name": "Dupont",
                "company": "Decathlon",
                "job_title": "Directrice commerciale",
                "linkedin_url": "https://linkedin.com/in/mariedupont",
                "industry": "Retail",
                "lead_score": "hot",
                "estimated_budget": "50000.00",
                "decision_role": "decision_maker",
                "preferred_channel": "email",
                "language": "fr",
                "interests": ["sport", "retail"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["job_title"], "Directrice commerciale")
        self.assertEqual(response.data["lead_score"], "hot")
        self.assertEqual(response.data["decision_role"], "decision_maker")
        self.assertEqual(response.data["interests"], ["sport", "retail"])

    def test_update_contact_enrichment_fields(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/",
            {
                "job_title": "CEO",
                "lead_score": "hot",
                "estimated_budget": "100000.00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["job_title"], "CEO")
        self.assertEqual(response.data["lead_score"], "hot")
        self.assertEqual(response.data["estimated_budget"], "100000.00")

    def test_ai_summary_updated_at_is_read_only(self):
        create = self.client.post(
            "/api/contacts/", {"first_name": "Marie", "last_name": "Dupont"}
        )
        response = self.client.patch(
            f"/api/contacts/{create.data['id']}/",
            {"ai_summary_updated_at": "2025-01-01T00:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["ai_summary_updated_at"])


class CSVImportTests(TestCase):
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

    def _make_csv(self, content: str):
        return io.BytesIO(content.encode("utf-8"))

    def test_import_preview(self):
        csv_content = "prénom,nom,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("headers", response.data)
        self.assertIn("suggested_mapping", response.data)
        self.assertEqual(response.data["total_rows"], 2)
        # Auto-detect mapping
        self.assertEqual(response.data["suggested_mapping"]["prénom"], "first_name")

    def test_import_contacts(self):
        csv_content = "first_name,last_name,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        import json
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], 2)
        self.assertEqual(response.data["skipped"], 0)

    def test_import_skips_duplicates(self):
        # Create existing contact
        from contacts.models import Contact
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        Contact.objects.create(
            organization=org, created_by=user,
            first_name="Marie", last_name="Dupont", email="marie@example.com",
        )

        csv_content = "first_name,last_name,email\nMarie,Dupont,marie@example.com\nJean,Martin,jean@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        import json
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(response.data["skipped"], 1)
