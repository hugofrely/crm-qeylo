# Backend SQL Performance Optimization Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Django ORM queries, add missing indexes, fix N+1 patterns, and add eager loading across contacts/companies/deals to handle 20K-50K rows efficiently.

**Architecture:** Add composite database indexes via Django migrations, fix N+1 queries by prefetching/bulk operations, add `select_related`/`prefetch_related` to viewsets, and optimize aggregations. All changes are backward-compatible ORM-level optimizations with no schema changes.

**Tech Stack:** Django 5.1.4, PostgreSQL, Django ORM, DRF

**Spec:** `docs/superpowers/specs/2026-03-10-backend-sql-performance-design.md`

---

## Chunk 1: Database Indexes

### Task 1: Add indexes to Contact model

**Files:**
- Modify: `backend/contacts/models.py:113-114` (Meta class)
- Migration will be auto-generated

- [ ] **Step 1: Add indexes to Contact Meta class**

In `backend/contacts/models.py`, replace the `Meta` class:

```python
class Meta:
    ordering = ["-created_at"]
    indexes = [
        models.Index(fields=["organization", "created_at"]),
        models.Index(fields=["organization", "lead_score"]),
        models.Index(fields=["organization", "source"]),
        models.Index(fields=["organization", "company_entity"]),
        models.Index(fields=["organization", "owner"]),
    ]
```

- [ ] **Step 2: Generate migration**

Run: `cd backend && python manage.py makemigrations contacts --name add_performance_indexes`
Expected: Migration file created

- [ ] **Step 3: Verify migration applies**

Run: `cd backend && python manage.py migrate --run-syncdb 2>&1 | tail -5`
Expected: Migration applied successfully

- [ ] **Step 4: Run existing contact tests**

Run: `cd backend && python manage.py test contacts -v2 2>&1 | tail -20`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/contacts/models.py backend/contacts/migrations/
git commit -m "perf: add composite indexes to Contact model for filtered queries"
```

### Task 2: Add indexes to Company model

**Files:**
- Modify: `backend/companies/models.py:73-75` (Meta class)

- [ ] **Step 1: Add indexes to Company Meta class**

In `backend/companies/models.py`, replace the `Meta` class:

```python
class Meta:
    ordering = ["-created_at"]
    verbose_name_plural = "companies"
    indexes = [
        models.Index(fields=["organization", "created_at"]),
        models.Index(fields=["organization", "industry"]),
        models.Index(fields=["organization", "owner"]),
        models.Index(fields=["organization", "parent"]),
        models.Index(fields=["organization", "health_score"]),
    ]
```

- [ ] **Step 2: Generate and apply migration**

Run: `cd backend && python manage.py makemigrations companies --name add_performance_indexes && python manage.py migrate`

- [ ] **Step 3: Commit**

```bash
git add backend/companies/models.py backend/companies/migrations/
git commit -m "perf: add composite indexes to Company model for filtered queries"
```

### Task 3: Add indexes to Deal model

**Files:**
- Modify: `backend/deals/models.py:193-194` (Deal Meta class)

- [ ] **Step 1: Add indexes to Deal Meta class**

In `backend/deals/models.py`, replace the Deal `Meta` class:

```python
class Meta:
    ordering = ["-created_at"]
    indexes = [
        models.Index(fields=["organization", "created_at"]),
        models.Index(fields=["organization", "stage"]),
        models.Index(fields=["organization", "contact"]),
        models.Index(fields=["organization", "company"]),
        models.Index(fields=["organization", "expected_close"]),
        models.Index(fields=["organization", "created_by"]),
    ]
```

- [ ] **Step 2: Generate and apply migration**

Run: `cd backend && python manage.py makemigrations deals --name add_deal_performance_indexes && python manage.py migrate`

- [ ] **Step 3: Run existing deal tests**

Run: `cd backend && python manage.py test deals -v2 2>&1 | tail -20`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/deals/models.py backend/deals/migrations/
git commit -m "perf: add composite indexes to Deal model for filtered queries"
```

### Task 4: Add indexes to Task and TimelineEntry models

**Files:**
- Modify: `backend/tasks/models.py:44-45` (Task Meta class)
- Modify: `backend/notes/models.py:54-55` (TimelineEntry Meta class)

- [ ] **Step 1: Add indexes to Task Meta class**

In `backend/tasks/models.py`, replace the Task `Meta` class:

```python
class Meta:
    ordering = ["due_date"]
    indexes = [
        models.Index(fields=["organization", "due_date"]),
        models.Index(fields=["organization", "is_done"]),
    ]
```

- [ ] **Step 2: Add indexes to TimelineEntry Meta class**

In `backend/notes/models.py`, replace the TimelineEntry `Meta` class:

```python
class Meta:
    ordering = ["-created_at"]
    indexes = [
        models.Index(fields=["organization", "contact", "-created_at"]),
    ]
```

- [ ] **Step 3: Generate and apply migrations**

Run: `cd backend && python manage.py makemigrations tasks --name add_task_performance_indexes && python manage.py makemigrations notes --name add_timeline_performance_indexes && python manage.py migrate`

- [ ] **Step 4: Run task tests**

Run: `cd backend && python manage.py test tasks -v2 2>&1 | tail -20`
Expected: All existing tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/tasks/models.py backend/tasks/migrations/ backend/notes/models.py backend/notes/migrations/
git commit -m "perf: add composite indexes to Task and TimelineEntry models"
```

---

## Chunk 2: Eager Loading & Contact Optimizations

### Task 5: Add eager loading to ContactViewSet

**Files:**
- Modify: `backend/contacts/views.py:23-24` (get_queryset)
- Test: `backend/contacts/tests.py` (add filter tests)

- [ ] **Step 1: Write tests for contact filters**

Add to the end of `backend/contacts/tests.py`:

```python
class ContactFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "filter@example.com",
                "password": "securepass123",
                "first_name": "Filter",
                "last_name": "Test",
                "organization_name": "Filter Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Create contacts with varied attributes
        self.client.post(
            "/api/contacts/",
            {"first_name": "Hot", "last_name": "Lead", "source": "website", "tags": ["vip", "enterprise"]},
            format="json",
        )
        self.client.post(
            "/api/contacts/",
            {"first_name": "Cold", "last_name": "Lead", "source": "referral", "tags": ["startup"]},
            format="json",
        )
        self.client.post(
            "/api/contacts/",
            {"first_name": "No", "last_name": "Source"},
            format="json",
        )

    def test_filter_by_source(self):
        response = self.client.get("/api/contacts/?source=website")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["first_name"], "Hot")

    def test_filter_by_tags(self):
        response = self.client.get("/api/contacts/?tags=vip")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_tags_multiple(self):
        response = self.client.get("/api/contacts/?tags=vip,startup")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_ordering_by_last_name(self):
        response = self.client.get("/api/contacts/?ordering=last_name")
        self.assertEqual(response.status_code, 200)
        names = [c["first_name"] for c in response.data["results"]]
        self.assertEqual(names[0], "Hot")  # "Lead" < "Source"

    def test_ordering_by_created_at(self):
        response = self.client.get("/api/contacts/?ordering=-created_at")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

    def test_filter_by_created_after(self):
        response = self.client.get("/api/contacts/?created_after=2020-01-01")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

    def test_filter_by_created_before(self):
        response = self.client.get("/api/contacts/?created_before=2020-01-01")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_filter_by_lead_score(self):
        # Update one contact to have a lead_score
        contacts = self.client.get("/api/contacts/").data["results"]
        self.client.patch(
            f"/api/contacts/{contacts[0]['id']}/",
            {"lead_score": "hot"},
            format="json",
        )
        response = self.client.get("/api/contacts/?lead_score=hot")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_category(self):
        cat = self.client.post(
            "/api/contacts/categories/",
            {"name": "VIP", "color": "#ff0000"},
            format="json",
        ).data
        contacts = self.client.get("/api/contacts/").data["results"]
        self.client.patch(
            f"/api/contacts/{contacts[0]['id']}/",
            {"category_ids": [cat["id"]]},
            format="json",
        )
        response = self.client.get(f"/api/contacts/?category={cat['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_list_tags_returns_empty_when_no_tags(self):
        from contacts.models import Contact
        Contact.objects.all().update(tags=[])
        response = self.client.get("/api/contacts/tags/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_tags_endpoint(self):
        response = self.client.get("/api/contacts/tags/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("vip", response.data)
        self.assertIn("enterprise", response.data)
        self.assertIn("startup", response.data)

    def test_list_sources_endpoint(self):
        response = self.client.get("/api/contacts/sources/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("website", response.data)
        self.assertIn("referral", response.data)

    def test_list_contacts_includes_owner_name(self):
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, 200)
        for contact in response.data["results"]:
            self.assertIn("owner_name", contact)

    def test_list_contacts_includes_company_entity_name(self):
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, 200)
        for contact in response.data["results"]:
            self.assertIn("company_entity_name", contact)

    def test_list_contacts_includes_categories(self):
        response = self.client.get("/api/contacts/")
        self.assertEqual(response.status_code, 200)
        for contact in response.data["results"]:
            self.assertIn("categories", contact)
```

- [ ] **Step 2: Run tests to verify they pass with current code**

Run: `cd backend && python manage.py test contacts.tests.ContactFilterTests -v2 2>&1 | tail -30`
Expected: All tests PASS (they test current behavior, not new behavior)

- [ ] **Step 3: Add select_related and prefetch_related to ContactViewSet**

In `backend/contacts/views.py`, modify `get_queryset` (line 24):

Replace:
```python
qs = Contact.objects.filter(organization=self.request.organization)
```
With:
```python
qs = Contact.objects.filter(
    organization=self.request.organization
).select_related("owner", "company_entity").prefetch_related("categories")
```

- [ ] **Step 4: Run all contact tests**

Run: `cd backend && python manage.py test contacts -v2 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/contacts/views.py backend/contacts/tests.py
git commit -m "perf: add eager loading to ContactViewSet and filter tests"
```

### Task 6: Optimize list_tags endpoint

**Files:**
- Modify: `backend/contacts/views.py:249-258` (list_tags function)

- [ ] **Step 1: Replace Python-side tag aggregation with database query**

In `backend/contacts/views.py`, replace the `list_tags` function (lines 249-258):

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_tags(request):
    """Return all distinct tags used across contacts in this organization."""
    from django.db.models.expressions import RawSQL
    tags = (
        Contact.objects.filter(organization=request.organization)
        .exclude(tags=[])
        .annotate(tag=RawSQL("jsonb_array_elements_text(tags)", []))
        .values_list("tag", flat=True)
        .distinct()
    )
    return Response(sorted(tags))
```

- [ ] **Step 2: Run the tag test**

Run: `cd backend && python manage.py test contacts.tests.ContactFilterTests.test_list_tags_endpoint -v2`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/contacts/views.py
git commit -m "perf: use PostgreSQL jsonb_array_elements for tags aggregation"
```

### Task 7: Optimize custom field deletion (bulk_update)

**Files:**
- Modify: `backend/contacts/views.py:126-133` (CustomFieldDefinitionViewSet.perform_destroy)
- Test: `backend/contacts/tests.py`

- [ ] **Step 1: Write test for custom field deletion**

Add to `backend/contacts/tests.py`:

```python
class CustomFieldDeletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "cfdel@example.com",
                "password": "securepass123",
                "first_name": "CF",
                "last_name": "Del",
                "organization_name": "CF Del Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_delete_custom_field_removes_from_contacts(self):
        # Create a custom field
        cf_res = self.client.post(
            "/api/contacts/custom-fields/",
            {"label": "Secteur", "field_type": "text"},
            format="json",
        )
        cf_id = cf_res.data["id"]

        # Create contacts with that custom field
        c1 = self.client.post(
            "/api/contacts/",
            {"first_name": "A", "last_name": "One", "custom_fields": {cf_id: "Tech"}},
            format="json",
        )
        c2 = self.client.post(
            "/api/contacts/",
            {"first_name": "B", "last_name": "Two", "custom_fields": {cf_id: "Finance"}},
            format="json",
        )
        c3 = self.client.post(
            "/api/contacts/",
            {"first_name": "C", "last_name": "Three"},
            format="json",
        )

        # Delete the custom field
        self.client.delete(f"/api/contacts/custom-fields/{cf_id}/")

        # Verify custom field value removed from contacts
        r1 = self.client.get(f"/api/contacts/{c1.data['id']}/")
        r2 = self.client.get(f"/api/contacts/{c2.data['id']}/")
        r3 = self.client.get(f"/api/contacts/{c3.data['id']}/")
        self.assertNotIn(cf_id, r1.data["custom_fields"])
        self.assertNotIn(cf_id, r2.data["custom_fields"])
        self.assertEqual(r3.data["custom_fields"], {})
```

- [ ] **Step 2: Run test to verify it passes with current code**

Run: `cd backend && python manage.py test contacts.tests.CustomFieldDeletionTests -v2`
Expected: PASS

- [ ] **Step 3: Replace loop with bulk_update**

In `backend/contacts/views.py`, replace `perform_destroy` of `CustomFieldDefinitionViewSet` (lines 126-133):

```python
def perform_destroy(self, instance):
    field_id = str(instance.id)
    contacts = list(
        Contact.objects.filter(
            organization=self.request.organization,
            custom_fields__has_key=field_id,
        )
    )
    for contact in contacts:
        del contact.custom_fields[field_id]
    if contacts:
        Contact.objects.bulk_update(contacts, ["custom_fields"])
    instance.delete()
```

- [ ] **Step 4: Run test again**

Run: `cd backend && python manage.py test contacts.tests.CustomFieldDeletionTests -v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/contacts/views.py backend/contacts/tests.py
git commit -m "perf: use bulk_update for custom field deletion instead of save loop"
```

### Task 8: Optimize bulk categorize

**Files:**
- Modify: `backend/contacts/views.py:213-227` (bulk_actions categorize)
- Test: `backend/contacts/tests.py`

- [ ] **Step 1: Write test for bulk categorize**

Add to `backend/contacts/tests.py`:

```python
class BulkCategorizeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "bulkcat@example.com",
                "password": "securepass123",
                "first_name": "Bulk",
                "last_name": "Cat",
                "organization_name": "Bulk Cat Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_bulk_categorize_assigns_categories(self):
        # Create categories
        cat1 = self.client.post(
            "/api/contacts/categories/",
            {"name": "VIP", "color": "#ff0000"},
            format="json",
        ).data
        cat2 = self.client.post(
            "/api/contacts/categories/",
            {"name": "Enterprise", "color": "#00ff00"},
            format="json",
        ).data

        # Create contacts
        c1 = self.client.post(
            "/api/contacts/",
            {"first_name": "A", "last_name": "One"},
            format="json",
        ).data
        c2 = self.client.post(
            "/api/contacts/",
            {"first_name": "B", "last_name": "Two"},
            format="json",
        ).data

        # Bulk categorize
        response = self.client.post(
            "/api/contacts/bulk-actions/",
            {
                "action": "categorize",
                "ids": [c1["id"], c2["id"]],
                "params": {"category_ids": [cat1["id"], cat2["id"]]},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        # Verify categories assigned
        r1 = self.client.get(f"/api/contacts/{c1['id']}/")
        cat_names = [c["name"] for c in r1.data["categories"]]
        self.assertIn("VIP", cat_names)
        self.assertIn("Enterprise", cat_names)
```

- [ ] **Step 2: Run test**

Run: `cd backend && python manage.py test contacts.tests.BulkCategorizeTests -v2`
Expected: PASS

- [ ] **Step 3: Replace M2M loop with bulk_create**

In `backend/contacts/views.py`, replace the categorize branch (lines 213-227):

```python
elif action == "categorize":
    category_ids = params.get("category_ids", [])
    if not category_ids:
        return Response(
            {"error": "category_ids required"}, status=400
        )
    categories = ContactCategory.objects.filter(
        id__in=category_ids,
        organization=request.organization,
    )
    contact_ids = list(qs.values_list("id", flat=True))
    Through = Contact.categories.through
    through_objects = [
        Through(contact_id=cid, contactcategory_id=cat.id)
        for cid in contact_ids
        for cat in categories
    ]
    if through_objects:
        Through.objects.bulk_create(through_objects, ignore_conflicts=True)
    return Response({"status": "ok", "count": len(contact_ids)})
```

- [ ] **Step 4: Run test again**

Run: `cd backend && python manage.py test contacts.tests.BulkCategorizeTests -v2`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/contacts/views.py backend/contacts/tests.py
git commit -m "perf: use bulk_create for M2M categorize instead of per-contact loop"
```

---

## Chunk 3: Company & Deal Optimizations

### Task 9: Optimize company subsidiaries (fix N+1 recursive)

**Files:**
- Modify: `backend/companies/views.py:119-131` (company_subsidiaries)
- Modify: `backend/companies/views.py:134-148` (company_hierarchy)
- Test: `backend/companies/tests.py` (new file)

- [ ] **Step 1: Write tests for company hierarchy**

Create `backend/companies/tests.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class CompanyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "company@example.com",
                "password": "securepass123",
                "first_name": "Company",
                "last_name": "Test",
                "organization_name": "Company Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_list_companies(self):
        self.client.post(
            "/api/companies/",
            {"name": "Acme Corp"},
            format="json",
        )
        response = self.client.get("/api/companies/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_industry(self):
        self.client.post(
            "/api/companies/",
            {"name": "TechCo", "industry": "Technology"},
            format="json",
        )
        self.client.post(
            "/api/companies/",
            {"name": "FinCo", "industry": "Finance"},
            format="json",
        )
        response = self.client.get("/api/companies/?industry=Technology")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "TechCo")

    def test_filter_by_search(self):
        self.client.post("/api/companies/", {"name": "Acme Corp"}, format="json")
        self.client.post("/api/companies/", {"name": "Beta Inc"}, format="json")
        response = self.client.get("/api/companies/?search=acme")
        self.assertEqual(response.data["count"], 1)

    def test_subsidiaries_returns_tree(self):
        parent = self.client.post(
            "/api/companies/",
            {"name": "Parent Corp"},
            format="json",
        ).data
        child = self.client.post(
            "/api/companies/",
            {"name": "Child Inc", "parent": parent["id"]},
            format="json",
        ).data
        self.client.post(
            "/api/companies/",
            {"name": "Grandchild LLC", "parent": child["id"]},
            format="json",
        )

        response = self.client.get(f"/api/companies/{parent['id']}/subsidiaries/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Child Inc")
        self.assertEqual(len(response.data[0]["children"]), 1)
        self.assertEqual(response.data[0]["children"][0]["name"], "Grandchild LLC")

    def test_hierarchy_returns_full_tree(self):
        parent = self.client.post(
            "/api/companies/",
            {"name": "Root Corp"},
            format="json",
        ).data
        child = self.client.post(
            "/api/companies/",
            {"name": "Mid Inc", "parent": parent["id"]},
            format="json",
        ).data

        response = self.client.get(f"/api/companies/{child['id']}/hierarchy/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "Root Corp")
        self.assertEqual(len(response.data["children"]), 1)

    def test_company_stats(self):
        company = self.client.post(
            "/api/companies/",
            {"name": "Stats Corp"},
            format="json",
        ).data
        response = self.client.get(f"/api/companies/{company['id']}/stats/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("contacts_count", response.data)
        self.assertIn("total_deals", response.data)

    def test_filter_by_health_score(self):
        self.client.post(
            "/api/companies/",
            {"name": "Healthy", "health_score": "excellent"},
            format="json",
        )
        self.client.post(
            "/api/companies/",
            {"name": "Risky", "health_score": "at_risk"},
            format="json",
        )
        response = self.client.get("/api/companies/?health_score=excellent")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Healthy")

    def test_list_includes_counts(self):
        self.client.post("/api/companies/", {"name": "Counted"}, format="json")
        response = self.client.get("/api/companies/")
        self.assertIn("contacts_count", response.data["results"][0])
        self.assertIn("deals_count", response.data["results"][0])

    def test_subsidiaries_empty_tree(self):
        company = self.client.post(
            "/api/companies/",
            {"name": "Lonely Corp"},
            format="json",
        ).data
        response = self.client.get(f"/api/companies/{company['id']}/subsidiaries/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_filter_by_owner(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(email="company@example.com")
        c1 = self.client.post(
            "/api/companies/",
            {"name": "Owned", "owner": str(user.id)},
            format="json",
        ).data
        self.client.post(
            "/api/companies/",
            {"name": "Unowned"},
            format="json",
        )
        response = self.client.get(f"/api/companies/?owner={user.id}")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Owned")
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd backend && python manage.py test companies -v2 2>&1 | tail -30`
Expected: All tests PASS

- [ ] **Step 3: Optimize company_subsidiaries — prefetch all, build tree in memory**

In `backend/companies/views.py`, replace `company_subsidiaries` (lines 117-131):

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_subsidiaries(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    all_companies = list(
        Company.objects.filter(organization=request.organization)
        .select_related("parent", "owner")
    )
    from collections import defaultdict
    children_map = defaultdict(list)
    company_map = {}
    for c in all_companies:
        company_map[c.id] = c
        if c.parent_id:
            children_map[c.parent_id].append(c)

    def _collect(parent_id, depth=0):
        result = []
        for child in children_map.get(parent_id, []):
            data = CompanySerializer(child).data
            data["depth"] = depth
            data["children"] = _collect(child.id, depth + 1)
            result.append(data)
        return result

    return Response(_collect(company.id))
```

- [ ] **Step 4: Optimize company_hierarchy — same approach**

In `backend/companies/views.py`, replace `company_hierarchy` (lines 134-148):

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_hierarchy(request, pk):
    company = Company.objects.select_related("parent").get(
        id=pk, organization=request.organization
    )
    all_companies = list(
        Company.objects.filter(organization=request.organization)
        .select_related("parent", "owner")
    )
    from collections import defaultdict
    children_map = defaultdict(list)
    company_map = {}
    for c in all_companies:
        company_map[c.id] = c
        if c.parent_id:
            children_map[c.parent_id].append(c)

    # Find root
    root = company
    while root.parent_id and root.parent_id in company_map:
        root = company_map[root.parent_id]

    def _build_tree(node_id):
        node = company_map[node_id]
        data = CompanySerializer(node).data
        data["children"] = [_build_tree(c.id) for c in children_map.get(node_id, [])]
        return data

    return Response(_build_tree(root.id))
```

- [ ] **Step 5: Run company tests**

Run: `cd backend && python manage.py test companies -v2 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/companies/views.py backend/companies/tests.py
git commit -m "perf: fix N+1 recursive queries in company hierarchy/subsidiaries"
```

### Task 10: Add eager loading to DealViewSet and CompanySerializer detail

**Files:**
- Modify: `backend/deals/views.py:180-182` (DealViewSet.get_queryset)
- Modify: `backend/companies/views.py:22-43` (CompanyViewSet.get_queryset for retrieve)
- Modify: `backend/companies/views.py:217-224` (company_timeline)
- Modify: `backend/deals/views.py:362-369` (QuoteViewSet.get_queryset)

- [ ] **Step 1: Add company to DealViewSet select_related**

In `backend/deals/views.py`, line 182, replace:
```python
).select_related("loss_reason")
```
With:
```python
).select_related("loss_reason", "company")
```

- [ ] **Step 2: Add annotations to CompanyViewSet retrieve action**

In `backend/companies/views.py`, modify `get_queryset`. After the `if self.action == "list":` block (after line 43), add an `elif self.action == "retrieve":` block:

```python
        elif self.action == "retrieve":
            from notes.models import TimelineEntry
            from django.db.models import Subquery, OuterRef
            last_interaction_sq = Subquery(
                TimelineEntry.objects.filter(
                    contact__company_entity=OuterRef("pk")
                ).order_by("-created_at").values("created_at")[:1]
            )
            qs = qs.select_related("parent", "owner").annotate(
                contacts_count=Count("contacts", distinct=True),
                deals_count=Count("deals", distinct=True),
                open_deals_value=Sum(
                    "deals__amount",
                    filter=~Q(deals__stage__name__in=["Gagne", "Perdu", "Gagné"]),
                    default=0,
                ),
                won_deals_value=Sum(
                    "deals__amount",
                    filter=Q(deals__stage__name__in=["Gagne", "Gagné"]),
                    default=0,
                ),
                subsidiaries_count=Count("subsidiaries", distinct=True),
                last_interaction_dt=last_interaction_sq,
                owner_name=Concat(
                    "owner__first_name", Value(" "), "owner__last_name",
                    output_field=CharField(),
                ),
            )
```

- [ ] **Step 3: Update CompanySerializer to use annotations when available**

In `backend/companies/serializers.py`, update the method fields to use annotations when available:

```python
def get_contacts_count(self, obj):
    if hasattr(obj, 'contacts_count'):
        return obj.contacts_count
    return obj.contacts.count()

def get_deals_count(self, obj):
    if hasattr(obj, 'deals_count'):
        return obj.deals_count
    return obj.deals.count()

def get_open_deals_value(self, obj):
    if hasattr(obj, 'open_deals_value'):
        return str(obj.open_deals_value or 0)
    result = obj.deals.exclude(
        stage__name__in=["Gagne", "Perdu", "Gagné"]
    ).aggregate(total=Sum("amount"))
    return str(result["total"] or 0)

def get_won_deals_value(self, obj):
    if hasattr(obj, 'won_deals_value'):
        return str(obj.won_deals_value or 0)
    result = obj.deals.filter(
        stage__name__in=["Gagne", "Gagné"]
    ).aggregate(total=Sum("amount"))
    return str(result["total"] or 0)

def get_subsidiaries_count(self, obj):
    if hasattr(obj, 'subsidiaries_count'):
        return obj.subsidiaries_count
    return obj.subsidiaries.count()

def get_last_interaction(self, obj):
    if hasattr(obj, 'last_interaction_dt'):
        return obj.last_interaction_dt.isoformat() if obj.last_interaction_dt else None
    from notes.models import TimelineEntry
    entry = TimelineEntry.objects.filter(
        contact__company_entity=obj
    ).order_by("-created_at").first()
    return entry.created_at.isoformat() if entry else None

def get_owner_name(self, obj):
    if hasattr(obj, 'owner_name') and obj.owner_name and obj.owner_name.strip():
        return obj.owner_name.strip()
    if obj.owner:
        name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return name or obj.owner.email
    return None
```

- [ ] **Step 4: Add select_related to company_timeline**

In `backend/companies/views.py`, line 221-223, replace:
```python
entries = TimelineEntry.objects.filter(
    contact__company_entity=company,
).order_by("-created_at")[:50]
```
With:
```python
entries = TimelineEntry.objects.filter(
    contact__company_entity=company,
).select_related("created_by").order_by("-created_at")[:50]
```

- [ ] **Step 5: Add prefetch_related to QuoteViewSet**

In `backend/deals/views.py`, modify `QuoteViewSet.get_queryset`. After line 369 (`return qs`), add prefetch for retrieve:

Replace the full method:
```python
def get_queryset(self):
    qs = Quote.objects.filter(organization=self.request.organization)
    deal_id = self.request.query_params.get("deal")
    if deal_id:
        qs = qs.filter(deal_id=deal_id)
    if self.action == "list":
        qs = qs.annotate(line_count=Count("lines"))
    elif self.action == "retrieve":
        qs = qs.prefetch_related("lines", "lines__product")
    return qs
```

- [ ] **Step 6: Run all tests**

Run: `cd backend && python manage.py test contacts deals companies -v2 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/deals/views.py backend/companies/views.py backend/companies/serializers.py
git commit -m "perf: add eager loading to DealViewSet, CompanySerializer detail, QuoteViewSet, and company_timeline"
```

---

## Chunk 4: Soft Delete Optimization & Deal Filter Tests

### Task 11: Optimize contact soft delete cascade

**Files:**
- Modify: `backend/contacts/models.py:119-132` (soft_delete)
- Modify: `backend/contacts/signals.py` (add _skip_scoring guard)
- Test: existing tests in `backend/contacts/tests.py`

- [ ] **Step 1: Add _skip_scoring guard to recalculate_score_on_deal signal**

In `backend/contacts/signals.py`, modify `recalculate_score_on_deal` (line 24-28):

```python
@receiver(post_save, sender="deals.Deal")
def recalculate_score_on_deal(sender, instance, created, **kwargs):
    if getattr(instance, '_skip_scoring', False):
        return
    if not instance.contact_id:
        return
    from .scoring import recalculate_score
    recalculate_score(instance.contact)
```

- [ ] **Step 2: Optimize soft_delete to skip signals during cascade**

In `backend/contacts/models.py`, replace `soft_delete` (lines 119-132):

```python
def soft_delete(self, user=None, source="direct"):
    super().soft_delete(user=user, source=source)
    cascade_source = f"cascade_contact:{self.id}"
    # Cascade to deals — must keep loop because Deal.soft_delete cascades to tasks
    from deals.models import Deal
    deals = list(Deal.objects.filter(contact=self))
    for deal in deals:
        deal._workflow_execution = True
        deal._skip_scoring = True
        deal.soft_delete(user=user, source=cascade_source)
    # Cascade to tasks linked directly to this contact (not via deal)
    from tasks.models import Task
    Task.objects.filter(contact=self).update(
        deleted_at=self.deleted_at,
        deleted_by=user,
        deletion_source=cascade_source,
    )
```

- [ ] **Step 3: Run cascade tests**

Run: `cd backend && python manage.py test contacts.tests.ContactTests.test_delete_contact_cascades_to_deals contacts.tests.ContactTests.test_restore_contact_restores_cascaded -v2`
Expected: Both pass

- [ ] **Step 4: Run all contact tests**

Run: `cd backend && python manage.py test contacts -v2 2>&1 | tail -20`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add backend/contacts/models.py backend/contacts/signals.py
git commit -m "perf: skip workflow/scoring signals during contact soft delete cascade"
```

### Task 12: Add deal filter tests

**Files:**
- Modify: `backend/deals/tests.py` (add filter tests)

- [ ] **Step 1: Add pipeline view filter tests**

Add to `backend/deals/tests.py`:

```python
class DealFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "dealfilter@example.com",
                "password": "securepass123",
                "first_name": "Deal",
                "last_name": "Filter",
                "organization_name": "Deal Filter Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        self.stages = self.client.get("/api/pipeline-stages/").data

    def test_pipeline_view_filter_by_amount_range(self):
        self.client.post(
            "/api/deals/",
            {"name": "Small", "amount": "1000", "stage": self.stages[0]["id"]},
            format="json",
        )
        self.client.post(
            "/api/deals/",
            {"name": "Large", "amount": "50000", "stage": self.stages[0]["id"]},
            format="json",
        )
        response = self.client.get(
            "/api/deals/pipeline/?amount_min=5000&amount_max=100000"
        )
        self.assertEqual(response.status_code, 200)
        stage_data = response.data[0]
        deal_names = [d["name"] for d in stage_data["deals"]]
        self.assertIn("Large", deal_names)
        self.assertNotIn("Small", deal_names)

    def test_pipeline_view_filter_by_search(self):
        self.client.post(
            "/api/deals/",
            {"name": "Website Redesign", "amount": "5000", "stage": self.stages[0]["id"]},
            format="json",
        )
        self.client.post(
            "/api/deals/",
            {"name": "Mobile App", "amount": "10000", "stage": self.stages[0]["id"]},
            format="json",
        )
        response = self.client.get("/api/deals/pipeline/?search=website")
        self.assertEqual(response.status_code, 200)
        all_deals = []
        for stage in response.data:
            all_deals.extend(stage["deals"])
        names = [d["name"] for d in all_deals]
        self.assertIn("Website Redesign", names)
        self.assertNotIn("Mobile App", names)

    def test_deal_list_includes_company_name(self):
        self.client.post(
            "/api/deals/",
            {"name": "Test Deal", "amount": "1000", "stage": self.stages[0]["id"]},
            format="json",
        )
        response = self.client.get("/api/deals/")
        self.assertEqual(response.status_code, 200)
        for deal in response.data["results"]:
            self.assertIn("company_name", deal)

    def test_pipeline_view_filter_by_probability(self):
        self.client.post(
            "/api/deals/",
            {"name": "Low Prob", "amount": "5000", "stage": self.stages[0]["id"], "probability": 20},
            format="json",
        )
        self.client.post(
            "/api/deals/",
            {"name": "High Prob", "amount": "5000", "stage": self.stages[0]["id"], "probability": 80},
            format="json",
        )
        response = self.client.get("/api/deals/pipeline/?probability_min=50")
        all_deals = []
        for stage in response.data:
            all_deals.extend(stage["deals"])
        names = [d["name"] for d in all_deals]
        self.assertIn("High Prob", names)
        self.assertNotIn("Low Prob", names)

    def test_pipeline_view_filter_by_date_range(self):
        self.client.post(
            "/api/deals/",
            {
                "name": "Future Deal",
                "amount": "5000",
                "stage": self.stages[0]["id"],
                "expected_close": "2027-06-01",
            },
            format="json",
        )
        response = self.client.get(
            "/api/deals/pipeline/?expected_close_after=2027-01-01&expected_close_before=2027-12-31"
        )
        self.assertEqual(response.status_code, 200)
        all_deals = []
        for stage in response.data:
            all_deals.extend(stage["deals"])
        self.assertTrue(len(all_deals) >= 1)
```

- [ ] **Step 2: Run deal filter tests**

Run: `cd backend && python manage.py test deals.tests.DealFilterTests -v2`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add backend/deals/tests.py
git commit -m "test: add deal pipeline filter tests for non-regression"
```

### Task 13: Final test run — all apps

- [ ] **Step 1: Run full test suite**

Run: `cd backend && python manage.py test contacts deals companies tasks notes -v2 2>&1 | tail -40`
Expected: All tests pass

- [ ] **Step 2: Commit all remaining changes (if any)**

```bash
git status
```

Verify clean working tree. If any unstaged changes remain, commit them.
