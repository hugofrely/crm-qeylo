# Duplicate Detection & Contact Merge - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add proactive duplicate detection at contact creation/import and field-by-field contact merge capability.

**Architecture:** API-side detection using PostgreSQL `pg_trgm` for fuzzy name matching, with exact matching on email/phone/SIRET. A `check-duplicates` endpoint is called before creation; a `merge` endpoint handles atomic fusion. Frontend displays results in a modal dialog. Settings are per-organization.

**Tech Stack:** Django 5 + DRF, PostgreSQL 16 (`pg_trgm`), Next.js 16 + React 19 + Radix UI, TypeScript

---

### Task 1: Enable pg_trgm extension

**Files:**
- Create: `backend/contacts/migrations/0005_enable_pg_trgm.py`

**Step 1: Create the migration**

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ("contacts", "0004_default_categories"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_trgm;",
        ),
    ]
```

**Step 2: Run the migration**

Run: `docker compose exec backend python manage.py migrate contacts`
Expected: `Applying contacts.0005_enable_pg_trgm... OK`

**Step 3: Commit**

```bash
git add backend/contacts/migrations/0005_enable_pg_trgm.py
git commit -m "feat(contacts): enable pg_trgm extension for fuzzy matching"
```

---

### Task 2: Add DuplicateDetectionSettings model + CONTACT_MERGED entry type

**Files:**
- Modify: `backend/contacts/models.py` (add `DuplicateDetectionSettings` class at end)
- Modify: `backend/notes/models.py` (add `CONTACT_MERGED` to `EntryType`)
- Create: `backend/contacts/migrations/0006_duplicatedetectionsettings.py` (auto-generated)
- Create: `backend/notes/migrations/XXXX_contact_merged_entry_type.py` (auto-generated)

**Step 1: Write the test**

Add to `backend/contacts/tests.py`:

```python
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
```

**Step 2: Run test to verify it fails**

Run: `docker compose exec backend python manage.py test contacts.tests.DuplicateDetectionSettingsTests.test_default_settings_created_with_org -v2`
Expected: FAIL — `DuplicateDetectionSettings` does not exist

**Step 3: Add the model to `backend/contacts/models.py`**

Append at the end of the file:

```python
class DuplicateDetectionSettings(models.Model):
    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="duplicate_detection_settings",
    )
    enabled = models.BooleanField(default=True)
    match_email = models.BooleanField(default=True)
    match_name = models.BooleanField(default=True)
    match_phone = models.BooleanField(default=False)
    match_siret = models.BooleanField(default=False)
    match_company = models.BooleanField(default=False)
    similarity_threshold = models.FloatField(default=0.6)

    def __str__(self):
        return f"DuplicateDetectionSettings({self.organization})"
```

**Step 4: Add `CONTACT_MERGED` to `backend/notes/models.py`**

In the `EntryType` class, add after `CUSTOM = "custom"`:

```python
CONTACT_MERGED = "contact_merged"
```

**Step 5: Generate and run migrations**

Run: `docker compose exec backend python manage.py makemigrations contacts notes && docker compose exec backend python manage.py migrate`

**Step 6: Run test to verify it passes**

Run: `docker compose exec backend python manage.py test contacts.tests.DuplicateDetectionSettingsTests -v2`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/contacts/models.py backend/notes/models.py backend/contacts/migrations/ backend/notes/migrations/
git commit -m "feat(contacts): add DuplicateDetectionSettings model and CONTACT_MERGED entry type"
```

---

### Task 3: Implement check-duplicates endpoint

**Files:**
- Create: `backend/contacts/duplicates.py` (detection logic)
- Modify: `backend/contacts/urls.py` (add route)
- Modify: `backend/contacts/tests.py` (add tests)

**Step 1: Write the tests**

Add to `backend/contacts/tests.py`:

```python
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
            {"first_name": "Marie", "last_name": "Dupond"},  # typo
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        # Should find Marie Dupont via fuzzy match
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
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test contacts.tests.CheckDuplicatesTests -v2`
Expected: FAIL — URL not found

**Step 3: Implement the detection logic in `backend/contacts/duplicates.py`**

```python
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Q, Value, FloatField
from django.db.models.functions import Concat, Greatest

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contact, DuplicateDetectionSettings
from .serializers import ContactSerializer


def _find_duplicates(organization, data, settings):
    """Return list of (contact, score, matched_on) tuples."""
    if not settings.enabled:
        return []

    contacts = Contact.objects.filter(organization=organization)
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    mobile_phone = data.get("mobile_phone", "").strip()
    company = data.get("company", "").strip()
    siret = data.get("siret", "").strip()

    results = {}  # contact_id -> (contact, score, matched_on)

    # Email exact match
    if settings.match_email and email:
        email_matches = contacts.filter(
            Q(email__iexact=email) | Q(secondary_email__iexact=email)
        )
        for c in email_matches:
            results[c.id] = (c, 0.9, ["email"])

    # Phone exact match
    if settings.match_phone and (phone or mobile_phone):
        phone_q = Q()
        for p in [phone, mobile_phone]:
            if p:
                phone_q |= Q(phone=p) | Q(mobile_phone=p) | Q(secondary_phone=p)
        phone_matches = contacts.filter(phone_q)
        for c in phone_matches:
            if c.id in results:
                existing = results[c.id]
                results[c.id] = (c, max(existing[1], 0.7), existing[2] + ["phone"])
            else:
                results[c.id] = (c, 0.7, ["phone"])

    # SIRET exact match
    if settings.match_siret and siret:
        siret_matches = contacts.filter(siret=siret).exclude(siret="")
        for c in siret_matches:
            if c.id in results:
                existing = results[c.id]
                results[c.id] = (c, max(existing[1], 0.8), existing[2] + ["siret"])
            else:
                results[c.id] = (c, 0.8, ["siret"])

    # Name fuzzy match (trigram similarity)
    if settings.match_name and first_name and last_name:
        full_name = f"{first_name} {last_name}"
        name_matches = (
            contacts.annotate(
                name_similarity=TrigramSimilarity(
                    Concat("first_name", Value(" "), "last_name"),
                    full_name,
                )
            )
            .filter(name_similarity__gte=settings.similarity_threshold)
            .order_by("-name_similarity")[:10]
        )
        for c in name_matches:
            score = float(c.name_similarity)
            if c.id in results:
                existing = results[c.id]
                results[c.id] = (c, max(existing[1], score), existing[2] + ["name"])
            else:
                results[c.id] = (c, score, ["name"])

    # Company fuzzy bonus
    if settings.match_company and company:
        company_matches = (
            contacts.annotate(
                company_similarity=TrigramSimilarity("company", company)
            )
            .filter(company_similarity__gte=0.5)
        )
        for c in company_matches:
            if c.id in results:
                existing = results[c.id]
                new_score = min(existing[1] + 0.1, 1.0)
                matched = existing[2] if "company" in existing[2] else existing[2] + ["company"]
                results[c.id] = (c, new_score, matched)

    # Filter by threshold and sort
    final = [
        (c, score, matched_on)
        for c, score, matched_on in results.values()
        if score >= 0.5
    ]
    final.sort(key=lambda x: x[1], reverse=True)
    return final[:5]


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_duplicates(request):
    """Check for potential duplicate contacts before creation."""
    org = request.organization
    settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)

    duplicates = _find_duplicates(org, request.data, settings)

    return Response({
        "duplicates": [
            {
                "contact": ContactSerializer(contact).data,
                "score": round(score, 2),
                "matched_on": matched_on,
            }
            for contact, score, matched_on in duplicates
        ]
    })
```

**Step 4: Add the URL to `backend/contacts/urls.py`**

Add before the `path("", include(router.urls))` line:

```python
from .duplicates import check_duplicates

# In urlpatterns, add:
path("check-duplicates/", check_duplicates),
```

**Step 5: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test contacts.tests.CheckDuplicatesTests -v2`
Expected: PASS (all 4 tests)

**Step 6: Commit**

```bash
git add backend/contacts/duplicates.py backend/contacts/urls.py backend/contacts/tests.py
git commit -m "feat(contacts): add check-duplicates endpoint with fuzzy matching"
```

---

### Task 4: Implement merge endpoint

**Files:**
- Modify: `backend/contacts/duplicates.py` (add `merge_contacts` view)
- Modify: `backend/contacts/urls.py` (add route)
- Modify: `backend/contacts/tests.py` (add tests)

**Step 1: Write the tests**

Add to `backend/contacts/tests.py`:

```python
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
        # Primary keeps its own fields
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
        # Create a deal on the duplicate
        deal_res = self.client.post("/api/deals/", {
            "title": "Deal Test",
            "contact": self.duplicate_id,
            "amount": "1000.00",
        }, format="json")
        deal_id = deal_res.data["id"]

        self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": self.duplicate_id, "field_overrides": {}},
            format="json",
        )
        from deals.models import Deal
        deal = Deal.objects.get(id=deal_id)
        self.assertEqual(str(deal.contact_id), self.primary_id)

    def test_merge_invalid_duplicate_id(self):
        response = self.client.post(
            f"/api/contacts/{self.primary_id}/merge/",
            {"duplicate_id": "00000000-0000-0000-0000-000000000000", "field_overrides": {}},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test contacts.tests.MergeContactsTests -v2`
Expected: FAIL — URL not found

**Step 3: Implement merge in `backend/contacts/duplicates.py`**

Append to the file:

```python
from django.db import transaction
from rest_framework import status as http_status
from deals.models import Deal
from tasks.models import Task
from notes.models import TimelineEntry


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def merge_contacts(request, pk):
    """Merge a duplicate contact into the primary contact."""
    org = request.organization
    try:
        primary = Contact.objects.get(id=pk, organization=org)
    except Contact.DoesNotExist:
        return Response({"detail": "Contact principal introuvable."}, status=http_status.HTTP_404_NOT_FOUND)

    duplicate_id = request.data.get("duplicate_id")
    try:
        duplicate = Contact.objects.get(id=duplicate_id, organization=org)
    except Contact.DoesNotExist:
        return Response({"detail": "Contact doublon introuvable."}, status=http_status.HTTP_404_NOT_FOUND)

    field_overrides = request.data.get("field_overrides", {})

    with transaction.atomic():
        # Apply field overrides
        for field, value in field_overrides.items():
            if hasattr(primary, field) and field not in ("id", "organization", "created_by", "created_at", "updated_at"):
                setattr(primary, field, value)

        # Merge tags (union)
        primary.tags = list(set(primary.tags + duplicate.tags))

        # Merge interests (union)
        primary.interests = list(set(primary.interests + duplicate.interests))

        # Merge custom_fields (fill gaps)
        for key, value in duplicate.custom_fields.items():
            if key not in primary.custom_fields or not primary.custom_fields[key]:
                primary.custom_fields[key] = value

        primary.save()

        # Transfer categories (union)
        for cat in duplicate.categories.all():
            primary.categories.add(cat)

        # Transfer linked data
        Deal.objects.filter(contact=duplicate).update(contact=primary)
        Task.objects.filter(contact=duplicate).update(contact=primary)
        TimelineEntry.objects.filter(contact=duplicate).update(contact=primary)

        # Create merge timeline entry
        TimelineEntry.objects.create(
            organization=org,
            created_by=request.user,
            contact=primary,
            entry_type=TimelineEntry.EntryType.CONTACT_MERGED,
            content=f"Contact fusionné avec {duplicate.first_name} {duplicate.last_name}",
            metadata={
                "merged_contact_name": f"{duplicate.first_name} {duplicate.last_name}",
                "merged_contact_email": duplicate.email,
            },
        )

        # Delete duplicate
        duplicate.delete()

    # Refresh and return
    primary.refresh_from_db()
    return Response(ContactSerializer(primary).data)
```

**Step 4: Add the URL to `backend/contacts/urls.py`**

Import `merge_contacts` from `.duplicates` and add to urlpatterns before the router include:

```python
from .duplicates import check_duplicates, merge_contacts

# Add to urlpatterns:
path("<uuid:pk>/merge/", merge_contacts),
```

Note: this path must be placed **before** `path("", include(router.urls))` so it's not caught by the router.

**Step 5: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test contacts.tests.MergeContactsTests -v2`
Expected: PASS (all 6 tests)

**Step 6: Commit**

```bash
git add backend/contacts/duplicates.py backend/contacts/urls.py backend/contacts/tests.py
git commit -m "feat(contacts): add merge endpoint with atomic data transfer"
```

---

### Task 5: Add duplicate detection settings API endpoints

**Files:**
- Modify: `backend/contacts/serializers.py` (add `DuplicateDetectionSettingsSerializer`)
- Modify: `backend/contacts/duplicates.py` (add get/update settings views)
- Modify: `backend/contacts/urls.py` (add routes)
- Modify: `backend/contacts/tests.py` (add tests)

**Step 1: Write the tests**

Add to `backend/contacts/tests.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test contacts.tests.DuplicateSettingsAPITests -v2`
Expected: FAIL

**Step 3: Add the serializer to `backend/contacts/serializers.py`**

```python
from .models import DuplicateDetectionSettings

class DuplicateDetectionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateDetectionSettings
        fields = [
            "enabled", "match_email", "match_name", "match_phone",
            "match_siret", "match_company", "similarity_threshold",
        ]
```

**Step 4: Add views to `backend/contacts/duplicates.py`**

```python
from .serializers import DuplicateDetectionSettingsSerializer

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def duplicate_settings(request):
    """Get or update duplicate detection settings for the organization."""
    settings, _ = DuplicateDetectionSettings.objects.get_or_create(
        organization=request.organization
    )
    if request.method == "GET":
        return Response(DuplicateDetectionSettingsSerializer(settings).data)

    serializer = DuplicateDetectionSettingsSerializer(settings, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
```

**Step 5: Add URL to `backend/contacts/urls.py`**

```python
from .duplicates import check_duplicates, merge_contacts, duplicate_settings

# Add to urlpatterns:
path("duplicate-settings/", duplicate_settings),
```

**Step 6: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test contacts.tests.DuplicateSettingsAPITests -v2`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/contacts/serializers.py backend/contacts/duplicates.py backend/contacts/urls.py backend/contacts/tests.py
git commit -m "feat(contacts): add duplicate detection settings API"
```

---

### Task 6: Run all backend tests

**Step 1: Run full test suite**

Run: `docker compose exec backend python manage.py test contacts -v2`
Expected: All tests pass (existing + new)

**Step 2: Fix any regressions if needed**

---

### Task 7: Frontend types and API service functions

**Files:**
- Modify: `frontend/types/contacts.ts` (add `DuplicateMatch`, `DuplicateDetectionSettings`)
- Modify: `frontend/services/contacts.ts` (add `checkDuplicates`, `mergeContacts`, settings functions)

**Step 1: Add types to `frontend/types/contacts.ts`**

```typescript
export interface DuplicateMatch {
  contact: Contact
  score: number
  matched_on: string[]
}

export interface CheckDuplicatesResponse {
  duplicates: DuplicateMatch[]
}

export interface DuplicateDetectionSettings {
  enabled: boolean
  match_email: boolean
  match_name: boolean
  match_phone: boolean
  match_siret: boolean
  match_company: boolean
  similarity_threshold: number
}
```

**Step 2: Add service functions to `frontend/services/contacts.ts`**

```typescript
import type { DuplicateDetectionSettings, CheckDuplicatesResponse } from "@/types"

export async function checkDuplicates(data: Record<string, unknown>): Promise<CheckDuplicatesResponse> {
  return apiFetch<CheckDuplicatesResponse>("/contacts/check-duplicates/", {
    method: "POST",
    json: data,
  })
}

export async function mergeContacts(
  primaryId: string,
  duplicateId: string,
  fieldOverrides: Record<string, unknown>
): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${primaryId}/merge/`, {
    method: "POST",
    json: { duplicate_id: duplicateId, field_overrides: fieldOverrides },
  })
}

export async function fetchDuplicateSettings(): Promise<DuplicateDetectionSettings> {
  return apiFetch<DuplicateDetectionSettings>("/contacts/duplicate-settings/")
}

export async function updateDuplicateSettings(
  data: Partial<DuplicateDetectionSettings>
): Promise<DuplicateDetectionSettings> {
  return apiFetch<DuplicateDetectionSettings>("/contacts/duplicate-settings/", {
    method: "PATCH",
    json: data,
  })
}
```

**Step 3: Commit**

```bash
git add frontend/types/contacts.ts frontend/services/contacts.ts
git commit -m "feat(contacts): add duplicate detection types and service functions"
```

---

### Task 8: DuplicateDetectionDialog component

**Files:**
- Create: `frontend/components/contacts/DuplicateDetectionDialog.tsx`

**Step 1: Create the component**

Create `frontend/components/contacts/DuplicateDetectionDialog.tsx`. This is the modal that shows when duplicates are detected during contact creation.

The component receives:
- `open: boolean` — whether the dialog is visible
- `onOpenChange: (open: boolean) => void`
- `duplicates: DuplicateMatch[]` — the detected duplicates
- `newContactData: Record<string, unknown>` — the form data for the new contact
- `onCreateAnyway: () => void` — proceed with creation
- `onMerge: (primaryId: string, fieldOverrides: Record<string, unknown>) => void` — merge into existing
- `onCancel: () => void`

**State machine:**
1. `"list"` view — shows the list of duplicates with score badges
2. `"merge"` view — shows the field-by-field comparison for a selected duplicate

**List view content:**
- Title: "Contact(s) similaire(s) trouvé(s)"
- For each duplicate: card showing name, email, company, phone + score badge
  - Score >= 0.8: badge "Très probable" in red/destructive
  - Score >= 0.5: badge "Possible" in yellow/warning
  - Highlighted matched fields
- Footer: "Créer quand même" (outline), "Annuler" (outline), "Fusionner" (primary, per duplicate)

**Merge view content:**
- Title: "Fusionner les contacts"
- Two-column layout: "Contact existant" | "Nouveau contact"
- For each field that differs between existing and new: a row with radio buttons to choose which value to keep
- Default selection: existing value unless empty, in which case new value is pre-selected
- Fields to compare: `first_name`, `last_name`, `email`, `secondary_email`, `phone`, `mobile_phone`, `secondary_phone`, `company`, `job_title`, `industry`, `siret`, `address`, `city`, `postal_code`, `country`, `state`, `linkedin_url`, `twitter_url`, `website`, `lead_score`, `decision_role`, `preferred_channel`, `notes`, `source`
- Footer: "Retour" (outline), "Fusionner" (primary)

Use existing UI components: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Badge`, `Button`, `RadioGroup` (from Radix). Use `lucide-react` icons. Match the existing app styling conventions (font-body, bg-secondary/30, border-border/60).

**Step 2: Commit**

```bash
git add frontend/components/contacts/DuplicateDetectionDialog.tsx
git commit -m "feat(contacts): add DuplicateDetectionDialog component"
```

---

### Task 9: Integrate duplicate check into contact creation flow

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Modify `handleCreate` in `page.tsx`**

Update the contact creation flow:

1. Import `checkDuplicates`, `mergeContacts` from `@/services/contacts`
2. Import `DuplicateDetectionDialog` component
3. Add state: `duplicates` (array), `showDuplicateDialog` (boolean)
4. In `handleCreate`:
   - Before creating, call `checkDuplicates(formData)`
   - If duplicates found: set state and show dialog instead of creating
   - If no duplicates: proceed with creation as before
5. Add `handleCreateAnyway` — calls the original creation logic
6. Add `handleMerge(primaryId, fieldOverrides)` — calls `mergeContacts`, closes dialogs, refreshes
7. Render `DuplicateDetectionDialog` with the appropriate props

**Key behavior:**
- The "Créer" button in the form now calls `checkDuplicates` first
- If duplicates are found, the create dialog stays open and `DuplicateDetectionDialog` opens on top
- After merge or create-anyway, both dialogs close and the contact list refreshes

**Step 2: Verify manually**

Run the dev server and test:
1. Create a contact "Marie Dupont"
2. Try to create "Marie Dupond" — should show duplicate dialog
3. Test "Create anyway" — should create the contact
4. Test "Merge" — should merge and redirect

**Step 3: Commit**

```bash
git add frontend/app/(app)/contacts/page.tsx
git commit -m "feat(contacts): integrate duplicate detection into contact creation"
```

---

### Task 10: Add duplicate detection settings to settings page

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`

**Step 1: Add the settings section**

Add a new card section "Détection de doublons" to the settings page, after the email notifications toggle. Use the same card styling as existing sections.

Content:
- Icon: `Copy` from lucide-react (or `GitMerge`)
- Global toggle: "Détection de doublons activée" with `Checkbox`
- When enabled, show the criteria checkboxes:
  - "Email" (default: checked)
  - "Nom et prénom" (default: checked)
  - "Téléphone" (default: unchecked)
  - "SIRET" (default: unchecked)
  - "Entreprise" (default: unchecked)
- Similarity threshold slider/input (0.4 to 0.9, step 0.1)
- Each change calls `updateDuplicateSettings` immediately (optimistic UI with toast on error)

Load settings on mount with `fetchDuplicateSettings`.

**Step 2: Commit**

```bash
git add frontend/app/(app)/settings/page.tsx
git commit -m "feat(settings): add duplicate detection settings section"
```

---

### Task 11: Update chat AI create_contact tool

**Files:**
- Modify: `backend/chat/tools.py` (update `create_contact` function)

**Step 1: Update `create_contact` in `backend/chat/tools.py`**

Replace the existing duplicate check (lines 88-102) with a call to the shared `_find_duplicates` function:

```python
from contacts.duplicates import _find_duplicates
from contacts.models import DuplicateDetectionSettings

# Inside create_contact, replace the existing duplicate check with:
settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization_id=org_id)
duplicates = _find_duplicates(
    Contact.objects.get(id=org_id).__class__.objects.get(id=org_id),  # organization instance
    {"first_name": first_name, "last_name": last_name, "email": email, "phone": phone},
    settings,
)
```

Actually, since `_find_duplicates` takes an organization object, fetch it properly:

```python
from organizations.models import Organization
from contacts.duplicates import _find_duplicates
from contacts.models import DuplicateDetectionSettings

# In create_contact, replace lines 88-102:
org = Organization.objects.get(id=org_id)
settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)
duplicates = _find_duplicates(
    org,
    {"first_name": first_name, "last_name": last_name, "email": email, "phone": phone},
    settings,
)
if duplicates:
    contact, score, matched_on = duplicates[0]
    return {
        "action": "duplicate_found",
        "id": str(contact.id),
        "name": f"{contact.first_name} {contact.last_name}",
        "company": contact.company,
        "email": contact.email,
        "score": round(score, 2),
        "matched_on": matched_on,
        "message": f"Un contact similaire existe déjà: {contact.first_name} {contact.last_name} (score: {round(score, 2)}).",
    }
```

**Step 2: Run chat tests**

Run: `docker compose exec backend python manage.py test chat -v2`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): use shared duplicate detection in create_contact tool"
```

---

### Task 12: Enhance CSV import with fuzzy duplicate detection

**Files:**
- Modify: `backend/contacts/import_views.py`

**Step 1: Update `import_contacts` in `backend/contacts/import_views.py`**

Replace the simple email-based duplicate check (lines 199-204 and 251-254) with the shared `_find_duplicates` function:

```python
from contacts.duplicates import _find_duplicates
from contacts.models import DuplicateDetectionSettings

# In import_contacts, after getting org:
settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)

# Remove the existing_emails set and email check.
# Instead, in the per-row loop, replace the duplicate check with:
if settings.enabled:
    row_data = {
        "first_name": native_data.get("first_name", ""),
        "last_name": native_data.get("last_name", ""),
        "email": native_data.get("email", ""),
        "phone": native_data.get("phone", ""),
        "siret": native_data.get("siret", ""),
        "company": native_data.get("company", ""),
    }
    dups = _find_duplicates(org, row_data, settings)
    if dups:
        skipped += 1
        continue
```

Keep the `existing_emails` set as a fast-path cache to avoid calling `_find_duplicates` for every row when email matches are obvious. The `_find_duplicates` call is only needed when there's no email or the email doesn't match.

**Step 2: Run import tests**

Run: `docker compose exec backend python manage.py test contacts.tests.CSVImportTests -v2`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/contacts/import_views.py
git commit -m "feat(import): use fuzzy duplicate detection in CSV import"
```

---

### Task 13: Run full test suite and manual verification

**Step 1: Run all backend tests**

Run: `docker compose exec backend python manage.py test -v2`
Expected: All tests pass

**Step 2: Manual smoke test**

1. Create contact "Marie Dupont" with email "marie@test.com"
2. Try creating "Marie Dupond" — duplicate dialog should appear
3. Try creating with same email "marie@test.com" — duplicate dialog should appear
4. Test "Create anyway" — contact created
5. Test "Merge" — contacts merged, deals/tasks transferred
6. Check settings page — duplicate detection section visible
7. Toggle settings — detection behavior changes
8. Import CSV with duplicates — skipped count correct

**Step 3: Final commit if any fixes needed**
