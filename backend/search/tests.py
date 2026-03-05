from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact
from deals.models import Deal, PipelineStage
from tasks.models import Task


class GlobalSearchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = User.objects.create_user(
            email="test@example.com", password="testpass123"
        )
        Membership.objects.create(organization=self.org, user=self.user)
        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            organization=self.org,
            created_by=self.user,
            first_name="Jean",
            last_name="Dupont",
            company="Acme",
            email="jean@acme.com",
        )
        self.stage = PipelineStage.objects.create(
            organization=self.org, name="Negociation", order=1
        )
        self.deal = Deal.objects.create(
            organization=self.org,
            created_by=self.user,
            name="Contrat Acme",
            amount=50000,
            stage=self.stage,
            contact=self.contact,
        )
        self.task = Task.objects.create(
            organization=self.org,
            created_by=self.user,
            description="Rappeler Jean Dupont",
            due_date="2026-03-10T10:00:00Z",
            contact=self.contact,
        )

    def test_search_requires_auth(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/search/?q=jean")
        self.assertEqual(resp.status_code, 401)

    def test_search_short_query_returns_empty(self):
        resp = self.client.get("/api/search/?q=j")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["contacts"], [])
        self.assertEqual(data["deals"], [])
        self.assertEqual(data["tasks"], [])

    def test_search_contacts_by_name(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        self.assertEqual(len(data["contacts"]), 1)
        self.assertEqual(data["contacts"][0]["first_name"], "Jean")

    def test_search_contacts_by_company(self):
        resp = self.client.get("/api/search/?q=acme")
        data = resp.json()
        self.assertGreaterEqual(len(data["contacts"]), 1)

    def test_search_deals_by_name(self):
        resp = self.client.get("/api/search/?q=contrat")
        data = resp.json()
        self.assertEqual(len(data["deals"]), 1)
        self.assertEqual(data["deals"][0]["name"], "Contrat Acme")

    def test_search_deals_by_contact_name(self):
        resp = self.client.get("/api/search/?q=dupont")
        data = resp.json()
        self.assertGreaterEqual(len(data["deals"]), 1)

    def test_search_tasks_by_description(self):
        resp = self.client.get("/api/search/?q=rappeler")
        data = resp.json()
        self.assertEqual(len(data["tasks"]), 1)
        self.assertEqual(data["tasks"][0]["description"], "Rappeler Jean Dupont")

    def test_search_tasks_by_contact_name(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        self.assertGreaterEqual(len(data["tasks"]), 1)

    def test_search_multi_word(self):
        resp = self.client.get("/api/search/?q=jean acme")
        data = resp.json()
        self.assertGreaterEqual(len(data["contacts"]), 1)

    def test_search_cross_entity(self):
        resp = self.client.get("/api/search/?q=jean")
        data = resp.json()
        self.assertGreaterEqual(len(data["contacts"]), 1)
        self.assertGreaterEqual(len(data["deals"]), 1)
        self.assertGreaterEqual(len(data["tasks"]), 1)

    def test_search_max_results(self):
        for i in range(10):
            Contact.objects.create(
                organization=self.org,
                created_by=self.user,
                first_name=f"Test{i}",
                last_name="Bulk",
                email=f"test{i}@bulk.com",
            )
        resp = self.client.get("/api/search/?q=bulk")
        data = resp.json()
        self.assertLessEqual(len(data["contacts"]), 5)

    def test_search_org_isolation(self):
        other_org = Organization.objects.create(name="Other", slug="other")
        Contact.objects.create(
            organization=other_org,
            first_name="Secret",
            last_name="Contact",
            email="secret@other.com",
        )
        resp = self.client.get("/api/search/?q=secret")
        data = resp.json()
        self.assertEqual(len(data["contacts"]), 0)
