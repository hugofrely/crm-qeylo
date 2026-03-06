from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from contacts.models import Contact
from organizations.models import Organization, Membership
from emails.models import EmailTemplate


class EmailTemplateViewTests(TestCase):
    def setUp(self):
        # User A (primary)
        self.user_a = User.objects.create_user(
            email="alice@example.com",
            password="testpass123",
            first_name="Alice",
            last_name="Martin",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        Membership.objects.create(user=self.user_a, organization=self.org, role="owner")

        # User B (same org)
        self.user_b = User.objects.create_user(
            email="bob@example.com",
            password="testpass123",
            first_name="Bob",
            last_name="Dupont",
        )
        Membership.objects.create(user=self.user_b, organization=self.org, role="member")

        # Templates
        self.tpl_a_private = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user_a,
            name="Alice Private",
            subject="Subject A",
            body_html="<p>Hello</p>",
            is_shared=False,
        )
        self.tpl_a_shared = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user_a,
            name="Alice Shared",
            subject="Subject Shared",
            body_html="<p>Hi {{contact.first_name}}</p>",
            tags=["relance", "devis"],
            is_shared=True,
        )
        self.tpl_b_private = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user_b,
            name="Bob Private",
            subject="Bob Subject",
            body_html="<p>Bob only</p>",
            is_shared=False,
        )
        self.tpl_b_shared = EmailTemplate.objects.create(
            organization=self.org,
            created_by=self.user_b,
            name="Bob Shared",
            subject="Bob Shared Subject",
            body_html="<p>For everyone</p>",
            tags=["relance"],
            is_shared=True,
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)
        self.client_a.credentials(HTTP_X_ORGANIZATION=str(self.org.id))

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)
        self.client_b.credentials(HTTP_X_ORGANIZATION=str(self.org.id))

    # ------------------------------------------------------------------
    # LIST
    # ------------------------------------------------------------------

    def test_list_returns_own_templates(self):
        resp = self.client_a.get("/api/email/templates/")
        self.assertEqual(resp.status_code, 200)
        ids = {t["id"] for t in resp.data}
        # Alice sees her own private and shared templates
        self.assertIn(str(self.tpl_a_private.id), ids)
        self.assertIn(str(self.tpl_a_shared.id), ids)

    def test_list_returns_shared_templates_from_others(self):
        resp = self.client_a.get("/api/email/templates/")
        ids = {t["id"] for t in resp.data}
        # Alice also sees Bob's shared template
        self.assertIn(str(self.tpl_b_shared.id), ids)

    def test_list_hides_private_templates_from_others(self):
        resp = self.client_a.get("/api/email/templates/")
        ids = {t["id"] for t in resp.data}
        # Alice does NOT see Bob's private template
        self.assertNotIn(str(self.tpl_b_private.id), ids)

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    def test_create_template(self):
        data = {
            "name": "New Template",
            "subject": "Hello {{contact.first_name}}",
            "body_html": "<p>Dear {{contact.first_name}}</p>",
            "tags": ["onboarding"],
            "is_shared": True,
        }
        resp = self.client_a.post("/api/email/templates/", data, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["name"], "New Template")
        self.assertEqual(str(resp.data["created_by"]), str(self.user_a.id))
        self.assertTrue(resp.data["is_shared"])

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    def test_update_own_template(self):
        data = {"name": "Alice Updated"}
        resp = self.client_a.put(
            f"/api/email/templates/{self.tpl_a_private.id}/",
            data,
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["name"], "Alice Updated")

    def test_cannot_update_others_template(self):
        """Bob's shared template is visible to Alice but she cannot edit it."""
        data = {"name": "Hijacked"}
        resp = self.client_a.put(
            f"/api/email/templates/{self.tpl_b_shared.id}/",
            data,
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def test_delete_own_template(self):
        resp = self.client_a.delete(
            f"/api/email/templates/{self.tpl_a_private.id}/"
        )
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(
            EmailTemplate.objects.filter(id=self.tpl_a_private.id).exists()
        )

    # ------------------------------------------------------------------
    # RENDER
    # ------------------------------------------------------------------

    def test_render_template(self):
        contact = Contact.objects.create(
            organization=self.org,
            created_by=self.user_a,
            first_name="Jean",
            last_name="Dupont",
            email="jean@example.com",
        )
        resp = self.client_a.post(
            f"/api/email/templates/{self.tpl_a_shared.id}/render/",
            {"contact_id": str(contact.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Jean", resp.data["body_html"])
        self.assertEqual(resp.data["subject"], "Subject Shared")

    # ------------------------------------------------------------------
    # FILTERS
    # ------------------------------------------------------------------

    def test_search_filter(self):
        resp = self.client_a.get("/api/email/templates/?search=Alice")
        self.assertEqual(resp.status_code, 200)
        names = {t["name"] for t in resp.data}
        self.assertIn("Alice Private", names)
        self.assertIn("Alice Shared", names)
        # Bob's templates should not match
        self.assertNotIn("Bob Shared", names)

    def test_tag_filter(self):
        resp = self.client_a.get("/api/email/templates/?tag=devis")
        self.assertEqual(resp.status_code, 200)
        names = {t["name"] for t in resp.data}
        self.assertIn("Alice Shared", names)
        # Bob's shared template has "relance" but not "devis"
        self.assertNotIn("Bob Shared", names)
