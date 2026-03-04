from unittest.mock import patch, MagicMock
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from organizations.models import Organization, Membership
from contacts.models import Contact
from emails.models import EmailAccount, SentEmail
from emails.service import send_email


class SendEmailServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        Membership.objects.create(user=self.user, organization=self.org, role="owner")
        self.contact = Contact.objects.create(
            organization=self.org,
            created_by=self.user,
            first_name="Jean",
            last_name="Dupont",
            email="jean@example.com",
        )
        self.account = EmailAccount.objects.create(
            user=self.user,
            organization=self.org,
            provider="gmail",
            email_address="test@gmail.com",
            access_token="encrypted_access",
            refresh_token="encrypted_refresh",
            token_expires_at=timezone.now() + timedelta(hours=1),
        )

    def test_no_account_raises_permission_error(self):
        self.account.delete()
        with self.assertRaises(PermissionError):
            send_email(
                user=self.user,
                organization=self.org,
                to_email="jean@example.com",
                subject="Test",
                body_html="<p>Hello</p>",
            )

    def test_contact_without_email_raises_value_error(self):
        self.contact.email = ""
        self.contact.save()
        with self.assertRaises(ValueError):
            send_email(
                user=self.user,
                organization=self.org,
                contact_id=str(self.contact.id),
                subject="Test",
                body_html="<p>Hello</p>",
            )

    @patch("emails.service._send_via_gmail")
    @patch("emails.service.get_valid_access_token")
    def test_send_creates_sent_email_and_timeline(self, mock_token, mock_send):
        mock_token.return_value = "valid_token"
        mock_send.return_value = "msg_id_123"

        sent = send_email(
            user=self.user,
            organization=self.org,
            contact_id=str(self.contact.id),
            subject="Relance devis",
            body_html="<p>Bonjour Jean</p>",
        )

        self.assertIsInstance(sent, SentEmail)
        self.assertEqual(sent.to_email, "jean@example.com")
        self.assertEqual(sent.subject, "Relance devis")
        self.assertEqual(sent.provider_message_id, "msg_id_123")

        # Check timeline entry was created
        from notes.models import TimelineEntry
        entry = TimelineEntry.objects.filter(
            contact=self.contact,
            entry_type=TimelineEntry.EntryType.EMAIL_SENT,
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.subject, "Relance devis")
