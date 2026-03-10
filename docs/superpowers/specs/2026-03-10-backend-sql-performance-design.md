# Backend SQL Performance Optimization

**Date:** 2026-03-10
**Status:** Approved
**Approach:** Targeted optimization (no caching layer, no materialized views)

## Context

- ~20K contacts, ~10K companies, ~50K deals per organization
- Django 5.1.4 + DRF + PostgreSQL, pure Django ORM
- Production is noticeably slower than local, especially contacts and companies tabs
- Signals (scoring, workflows, recurring tasks) must remain functional

## 1. Missing Database Indexes

Add composite indexes on fields used for filtering, ordering, and joins.

### Contacts

| Index fields | Rationale |
|---|---|
| `(organization, created_at)` | Default ordering |
| `(organization, lead_score)` | Filter + ordering |
| `(organization, source)` | Filter + `list_sources()` endpoint |
| `(organization, company_entity)` | Filter by company |
| `(organization, owner)` | Filter by owner |

### Companies

| Index fields | Rationale |
|---|---|
| `(organization, created_at)` | Default ordering |
| `(organization, industry)` | Filter by industry |
| `(organization, owner)` | Filter by owner |
| `(organization, parent)` | Subsidiaries + hierarchy queries |
| `(organization, health_score)` | Filter by health score |

### Deals

| Index fields | Rationale |
|---|---|
| `(organization, created_at)` | Default ordering |
| `(organization, stage)` | Pipeline filter |
| `(organization, contact)` | Filter by contact |
| `(organization, company)` | Filter by company |
| `(organization, expected_close)` | Date range filter |
| `(organization, created_by)` | Filter by creator |

### Tasks

| Index fields | Rationale |
|---|---|
| `(organization, due_date)` | Date range filter |
| `(organization, is_done)` | Status filter |

### TimelineEntry (notes)

| Index fields | Rationale |
|---|---|
| `(organization, contact, -created_at)` | Contact timeline + company timeline |

## 2. N+1 Query Fixes

### Company hierarchy (recursive N+1)

**Files:** `backend/companies/views.py` — `company_subsidiaries()` and `company_hierarchy()`

**Problem:** Recursive queries — 1 query per tree node.

**Fix:** Prefetch all companies for the organization in a single query, build the tree in Python memory.

```python
# Before (N+1):
def _collect(parent):
    for child in Company.objects.filter(parent=parent):  # 1 query per node
        data["children"] = _collect(child)

# After (1 query):
all_companies = Company.objects.filter(organization=org)
children_map = defaultdict(list)
for c in all_companies:
    if c.parent_id:
        children_map[c.parent_id].append(c)
# Build tree from children_map
```

### Contact soft delete cascade

**File:** `backend/contacts/models.py` — `soft_delete()`

**Problem:** The deal loop calls `deal.soft_delete()` individually, which triggers `super().soft_delete()` → `save()` per deal, firing `pre_save`/`post_save` signals (workflow `deal_pre_save` does an extra SELECT query, `recalculate_score_on_deal` recalculates scoring). With many deals per contact, this is slow.

**Important:** The loop MUST be kept because `Deal.soft_delete()` cascades to tasks via `Task.objects.filter(deal=self).update(...)`. A bulk update on deals would skip this cascade, leaving tasks un-deleted.

**Fix:** Optimize without breaking cascade:
1. Prefetch deals in a single query before looping: `list(Deal.objects.filter(contact=self))`
2. Set `_workflow_execution = True` on each deal before calling `soft_delete()` to skip workflow signal handlers (they check this flag)
3. Skip scoring recalculation during cascade by setting a `_skip_scoring = True` flag and checking it in `recalculate_score_on_deal`

This preserves the deal→task cascade chain while avoiding unnecessary signal overhead during soft delete.

**Note:** `contact_post_save` workflow signal also fires during contact soft delete (via `super().soft_delete()` → `save()`), dispatching a `contact.updated` event. This is existing behavior and not a regression — no change needed here.

### Contact bulk categorize

**File:** `backend/contacts/views.py` — `bulk_actions()` categorize

**Problem:** `contact.categories.add()` in a loop — 1 M2M insert per contact.

**Fix:** Use the through model with `bulk_create`:
```python
Through = Contact.categories.through
through_objects = [
    Through(contact_id=cid, contactcategory_id=cat_id)
    for cid in contact_ids for cat_id in category_ids
]
Through.objects.bulk_create(through_objects, ignore_conflicts=True)
```

### Contact custom field deletion

**File:** `backend/contacts/views.py` — `CustomFieldDefinitionViewSet.perform_destroy()`

**Problem:** Individual `save()` per contact in loop.

**Fix:** Modify custom_fields in memory, then `bulk_update()`:
```python
contacts = list(Contact.objects.filter(...))
for contact in contacts:
    del contact.custom_fields[field_id]
Contact.objects.bulk_update(contacts, ["custom_fields"])
```

## 3. Missing Eager Loading

### ContactViewSet.get_queryset()

**Current:** No `select_related` or `prefetch_related`.
**Fix:** Add `.select_related("owner", "company_entity").prefetch_related("categories")`

### DealViewSet.get_queryset()

**Current:** Only `.select_related("loss_reason")`.
**Fix:** Add `"company"` → `.select_related("loss_reason", "company")`

### CompanySerializer (detail/retrieve action)

**Current:** `get_contacts_count()`, `get_deals_count()`, etc. each run a separate query.
**Fix:** Use same annotation pattern as list view for retrieve action. Add `Count("subsidiaries")` and a `Subquery` for `last_interaction`.

### QuoteViewSet

**Current:** No prefetch on lines.
**Fix:** Add `.prefetch_related("lines", "lines__product")`

## 4. Inefficient Aggregations

### Contact tags endpoint

**File:** `backend/contacts/views.py` — `list_tags()`

**Problem:** Materializes ALL contacts to extract tags from JSONField in Python.

**Fix:** Use PostgreSQL `jsonb_array_elements_text()` via RawSQL:
```python
from django.db.models.expressions import RawSQL
tags = (Contact.objects
    .filter(organization=org)
    .exclude(tags=[])
    .annotate(tag=RawSQL("jsonb_array_elements_text(tags)", []))
    .values_list("tag", flat=True)
    .distinct())
```

### Company timeline

**File:** `backend/companies/views.py` — `company_timeline()`

**Problem:** `TimelineEntry.objects.filter(contact__company_entity=obj)` joins through contact table without index support, and no eager loading on author.

**Fix:**
1. The `(organization, contact, -created_at)` index from Section 1 speeds up the query
2. Add `.select_related("created_by")` to avoid N+1 on author info
3. No structural change needed — the query pattern is correct, just slow without index

## 5. Test Strategy

### Approach

- Use existing pattern: Django TestCase + DRF APIClient
- Add tests in existing `tests.py` files per app
- No factory_boy (project doesn't use it)

### Tests to add

**Contacts:**
- All filter combinations: category, created_after/before, lead_score, source, tags
- All ordering options
- Bulk categorize produces correct M2M associations
- Bulk custom field delete removes field from all contacts
- Soft delete cascade: verify deals and tasks are soft-deleted
- Soft delete cascade: verify signals don't fire unexpectedly
- Tags endpoint returns correct distinct tags
- Sources endpoint returns correct distinct sources

**Companies:**
- All filter combinations: search, industry, owner, health_score, parent, has_open_deals
- Subsidiaries tree returns correct hierarchy
- Hierarchy endpoint returns correct ancestor chain
- Detail view annotations match expected counts

**Deals:**
- Pipeline view filters: contact, company, amount range, probability range, date ranges, search
- Quote line prefetch: verify no extra queries on quote detail

**Signal integrity:**
- Scoring recalculation still fires on timeline/call/deal create
- Workflow events still fire on deal stage change, contact create/update, task completion
- Recurring task creation still works on task completion
- Soft delete cascade does NOT fire workflow signals (expected behavior)

## Non-Goals

- No Redis caching layer (can be added later if needed)
- No materialized views
- No pagination changes on config endpoints (volume is negligible)
- No raw SQL rewrites beyond the tags aggregation
