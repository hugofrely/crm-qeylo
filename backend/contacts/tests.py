import io
import json

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
                "organization_name": "Hugo Test Org",
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
        contact_id = create.data["id"]
        response = self.client.delete(f"/api/contacts/{contact_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Contact should NOT appear in normal list
        list_response = self.client.get("/api/contacts/")
        ids = [c["id"] for c in list_response.data["results"]]
        self.assertNotIn(contact_id, ids)

        # Contact should still exist in DB with deleted_at set
        from contacts.models import Contact
        contact = Contact.all_objects.get(id=contact_id)
        self.assertIsNotNone(contact.deleted_at)

    def test_delete_contact_cascades_to_deals(self):
        # Create a contact
        contact_res = self.client.post(
            "/api/contacts/",
            {"first_name": "Cascade", "last_name": "Test"},
            format="json",
        )
        contact_id = contact_res.data["id"]

        # Need a pipeline stage for creating a deal
        from deals.models import PipelineStage
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="hugo@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        stage = PipelineStage.objects.filter(pipeline__organization=org).first()
        if not stage:
            from deals.models import Pipeline
            Pipeline.create_defaults(org)
            stage = PipelineStage.objects.filter(pipeline__organization=org).first()

        # Create a deal linked to this contact
        from deals.models import Deal
        deal = Deal.objects.create(
            organization=org,
            created_by=user,
            name="Cascade Deal",
            contact_id=contact_id,
            amount=1000,
            stage=stage,
        )
        deal_id = deal.id

        # Delete the contact
        self.client.delete(f"/api/contacts/{contact_id}/")

        # Assert deal is also soft-deleted with cascade source
        deal = Deal.all_objects.get(id=deal_id)
        self.assertIsNotNone(deal.deleted_at)
        self.assertTrue(deal.deletion_source.startswith("cascade_contact:"))

    def test_restore_contact_restores_cascaded(self):
        # Create a contact
        contact_res = self.client.post(
            "/api/contacts/",
            {"first_name": "Restore", "last_name": "Cascade"},
            format="json",
        )
        contact_id = contact_res.data["id"]

        # Set up pipeline stage and deal
        from deals.models import Deal, PipelineStage
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="hugo@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        stage = PipelineStage.objects.filter(pipeline__organization=org).first()
        if not stage:
            from deals.models import Pipeline
            Pipeline.create_defaults(org)
            stage = PipelineStage.objects.filter(pipeline__organization=org).first()

        deal = Deal.objects.create(
            organization=org,
            created_by=user,
            name="Restore Deal",
            contact_id=contact_id,
            amount=500,
            stage=stage,
        )
        deal_id = deal.id

        # Delete the contact (cascades to deal)
        self.client.delete(f"/api/contacts/{contact_id}/")

        # Restore via trash API
        restore_response = self.client.post(
            "/api/trash/restore/",
            {"type": "contact", "ids": [contact_id]},
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)

        # Both contact and deal should be alive again
        from contacts.models import Contact
        contact = Contact.all_objects.get(id=contact_id)
        self.assertIsNone(contact.deleted_at)

        deal = Deal.all_objects.get(id=deal_id)
        self.assertIsNone(deal.deleted_at)

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
                "organization_name": "Other Test Org",
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
            "organization_name": "CSV Test Org",
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

    def test_import_with_extended_fields(self):
        """Import CSV with job_title, city, country etc."""
        csv_content = "first_name,last_name,email,poste,ville,pays\nMarie,Dupont,marie@example.com,CEO,Paris,France"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "last_name": "last_name",
                    "email": "email",
                    "poste": "job_title",
                    "ville": "city",
                    "pays": "country",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        from contacts.models import Contact
        contact = Contact.objects.get(email="marie@example.com")
        self.assertEqual(contact.job_title, "CEO")
        self.assertEqual(contact.city, "Paris")
        self.assertEqual(contact.country, "France")

    def test_import_with_custom_fields(self):
        """Import CSV with custom field mapping."""
        from contacts.models import Contact, CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        cf = CustomFieldDefinition.objects.create(
            organization=org,
            label="Secteur activité",
            field_type="text",
        )

        csv_content = "first_name,secteur\nMarie,Tech"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "secteur": f"custom::{cf.id}",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        contact = Contact.objects.get(first_name="Marie")
        self.assertEqual(contact.custom_fields[str(cf.id)], "Tech")

    def test_import_custom_field_soft_validation(self):
        """Invalid custom field values produce warnings, not errors."""
        from contacts.models import CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        cf = CustomFieldDefinition.objects.create(
            organization=org,
            label="Budget",
            field_type="number",
        )

        csv_content = "first_name,budget\nMarie,not_a_number"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/",
            {
                "file": f,
                "mapping": json.dumps({
                    "first_name": "first_name",
                    "budget": f"custom::{cf.id}",
                }),
            },
            format="multipart",
        )
        self.assertEqual(response.data["created"], 1)
        self.assertTrue(len(response.data["warnings"]) > 0)
        self.assertIn("nombre invalide", response.data["warnings"][0])

    def test_preview_returns_custom_field_definitions(self):
        """Preview endpoint returns custom field definitions."""
        from contacts.models import CustomFieldDefinition
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="test@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        CustomFieldDefinition.objects.create(
            organization=org,
            label="NDA signé",
            field_type="checkbox",
        )

        csv_content = "first_name,email\nMarie,marie@example.com"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("custom_field_definitions", response.data)
        self.assertEqual(len(response.data["custom_field_definitions"]), 1)
        self.assertEqual(response.data["custom_field_definitions"][0]["label"], "NDA signé")

    def test_preview_extended_aliases(self):
        """Auto-detection works for extended aliases like 'poste' -> job_title."""
        csv_content = "prénom,poste,ville\nMarie,CEO,Paris"
        f = self._make_csv(csv_content)
        f.name = "contacts.csv"
        response = self.client.post(
            "/api/contacts/import/preview/",
            {"file": f},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["suggested_mapping"]["prénom"], "first_name")
        self.assertEqual(response.data["suggested_mapping"]["poste"], "job_title")
        self.assertEqual(response.data["suggested_mapping"]["ville"], "city")


class DuplicateDetectionSettingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "dup@example.com",
                "password": "securepass123",
                "first_name": "Dup",
                "last_name": "Test",
                "organization_name": "Dup Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_default_settings_created_with_org(self):
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="dup@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        from contacts.models import DuplicateDetectionSettings
        settings, created = DuplicateDetectionSettings.objects.get_or_create(organization=org)
        self.assertTrue(settings.enabled)
        self.assertTrue(settings.match_email)
        self.assertTrue(settings.match_name)
        self.assertFalse(settings.match_phone)
        self.assertFalse(settings.match_siret)
        self.assertFalse(settings.match_company)
        self.assertAlmostEqual(settings.similarity_threshold, 0.6)


class CheckDuplicatesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "dupcheck@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "DupCheck Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        # Create existing contacts
        self.client.post("/api/contacts/", {
            "first_name": "Marie",
            "last_name": "Dupont",
            "email": "marie@decathlon.com",
            "phone": "0612345678",
            "company": "Decathlon",
        })
        self.client.post("/api/contacts/", {
            "first_name": "Pierre",
            "last_name": "Martin",
            "email": "pierre@nike.com",
        })

    def test_exact_email_match(self):
        response = self.client.post(
            "/api/contacts/check-duplicates/",
            {"first_name": "Different", "last_name": "Name", "email": "marie@decathlon.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["duplicates"]), 1)
        self.assertEqual(response.data["duplicates"][0]["contact"]["email"], "marie@decathlon.com")
        self.assertIn("email", response.data["duplicates"][0]["matched_on"])

    def test_fuzzy_name_match(self):
        response = self.client.post(
            "/api/contacts/check-duplicates/",
            {"first_name": "Marie", "last_name": "Dupont"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data["duplicates"]), 1)

    def test_no_duplicates(self):
        response = self.client.post(
            "/api/contacts/check-duplicates/",
            {"first_name": "Completely", "last_name": "Different"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["duplicates"]), 0)

    def test_disabled_detection(self):
        from contacts.models import DuplicateDetectionSettings
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="dupcheck@example.com")
        org = Organization.objects.filter(memberships__user=user).first()
        settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)
        settings.enabled = False
        settings.save()

        response = self.client.post(
            "/api/contacts/check-duplicates/",
            {"first_name": "Marie", "last_name": "Dupont", "email": "marie@decathlon.com"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["duplicates"]), 0)


class MergeContactsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "merge@example.com",
                "password": "securepass123",
                "first_name": "Merge",
                "last_name": "Test",
                "organization_name": "Merge Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Create two contacts to merge
        r1 = self.client.post("/api/contacts/", {
            "first_name": "Marie",
            "last_name": "Dupont",
            "email": "marie@decathlon.com",
            "phone": "0612345678",
            "company": "Decathlon",
            "tags": ["vip"],
            "interests": ["sport"],
        }, format="json")
        self.primary_id = r1.data["id"]

        r2 = self.client.post("/api/contacts/", {
            "first_name": "Marie",
            "last_name": "Dupond",
            "email": "marie.dupont@gmail.com",
            "mobile_phone": "0698765432",
            "company": "",
            "tags": ["prospect"],
            "interests": ["retail"],
        }, format="json")
        self.duplicate_id = r2.data["id"]

    def test_merge_transfers_field_overrides(self):
        response = self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {
                "duplicate_id": self.duplicate_id,
                "field_overrides": {
                    "mobile_phone": "0698765432",
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mobile_phone"], "0698765432")
        self.assertEqual(response.data["email"], "marie@decathlon.com")
        self.assertEqual(response.data["company"], "Decathlon")

    def test_merge_deletes_duplicate(self):
        self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": self.duplicate_id, "field_overrides": {}},
            format="json",
        )
        response = self.client.get(f"/api/contacts/{self.duplicate_id}/")
        self.assertEqual(response.status_code, 404)

    def test_merge_unions_tags_and_interests(self):
        response = self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": self.duplicate_id, "field_overrides": {}},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("vip", response.data["tags"])
        self.assertIn("prospect", response.data["tags"])
        self.assertIn("sport", response.data["interests"])
        self.assertIn("retail", response.data["interests"])

    def test_merge_creates_timeline_entry(self):
        self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": self.duplicate_id, "field_overrides": {}},
            format="json",
        )
        from notes.models import TimelineEntry
        entry = TimelineEntry.objects.filter(
            contact_id=self.primary_id,
            entry_type="contact_merged",
        ).first()
        self.assertIsNotNone(entry)

    def test_merge_transfers_deals(self):
        from deals.models import Deal, PipelineStage
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="merge@example.com")
        org = Organization.objects.filter(memberships__user=user).first()

        # Create a pipeline stage first if needed
        stage = PipelineStage.objects.filter(organization=org).first()
        if not stage:
            stage = PipelineStage.objects.create(
                organization=org, name="New", order=0
            )

        deal = Deal.objects.create(
            organization=org,
            created_by=user,
            name="Deal Test",
            contact_id=self.duplicate_id,
            amount=1000,
            stage=stage,
        )

        self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": self.duplicate_id, "field_overrides": {}},
            format="json",
        )
        deal.refresh_from_db()
        self.assertEqual(str(deal.contact_id), self.primary_id)

    def test_merge_invalid_duplicate_id(self):
        response = self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": "00000000-0000-0000-0000-000000000000", "field_overrides": {}},
            format="json",
        )
        self.assertEqual(response.status_code, 404)


class DuplicateSettingsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "settings@example.com",
                "password": "securepass123",
                "first_name": "Settings",
                "last_name": "Test",
                "organization_name": "Settings Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_get_settings(self):
        response = self.client.get("/api/contacts/duplicate-settings/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["enabled"])
        self.assertTrue(response.data["match_email"])
        self.assertTrue(response.data["match_name"])

    def test_update_settings(self):
        response = self.client.patch(
            "/api/contacts/duplicate-settings/",
            {"match_phone": True, "similarity_threshold": 0.7},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["match_phone"])
        self.assertAlmostEqual(response.data["similarity_threshold"], 0.7)
