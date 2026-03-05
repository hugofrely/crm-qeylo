from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact
from notes.models import TimelineEntry


class TimelineTypeFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Test", slug="test")
        self.user = User.objects.create_user(email="t@t.com", password="pass")
        Membership.objects.create(organization=self.org, user=self.user)
        self.client.force_authenticate(user=self.user)

        self.contact = Contact.objects.create(
            organization=self.org, created_by=self.user,
            first_name="Jean", last_name="Dupont",
        )
        # Create one interaction entry
        TimelineEntry.objects.create(
            organization=self.org, created_by=self.user,
            contact=self.contact, entry_type="call",
            content="Appel sortant",
        )
        # Create one journal entry
        TimelineEntry.objects.create(
            organization=self.org, created_by=self.user,
            contact=self.contact, entry_type="contact_updated",
            content="Contact modifié",
        )

    def test_no_type_returns_all(self):
        resp = self.client.get(f"/api/timeline/?contact={self.contact.id}")
        self.assertEqual(len(resp.json()), 2)

    def test_type_interactions(self):
        resp = self.client.get(f"/api/timeline/?contact={self.contact.id}&type=interactions")
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["entry_type"], "call")

    def test_type_journal(self):
        resp = self.client.get(f"/api/timeline/?contact={self.contact.id}&type=journal")
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["entry_type"], "contact_updated")

    def test_unknown_type_returns_all(self):
        resp = self.client.get(f"/api/timeline/?contact={self.contact.id}&type=blah")
        self.assertEqual(len(resp.json()), 2)
