# Dynamic Segments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic contact segments with rule-based filtering, cached counts, a dedicated management page, and integration into the contacts page.

**Architecture:** New Django app `segments` with a `Segment` model storing rules as JSON. A rule engine translates JSON rules into Django ORM `Q()` objects. Frontend gets a new `/segments` page with a visual rule builder, plus a segment selector dropdown in the contacts page. Counts are cached in Django's Redis cache with 60s TTL.

**Tech Stack:** Django 5 + DRF (backend), Next.js 16 + React 19 + shadcn/ui + Tailwind (frontend), Redis cache, PostgreSQL.

---

## Task 1: Create `segments` Django app with Segment model

**Files:**
- Create: `backend/segments/__init__.py`
- Create: `backend/segments/apps.py`
- Create: `backend/segments/models.py`
- Create: `backend/segments/migrations/__init__.py`
- Create: `backend/segments/admin.py`
- Modify: `backend/config/settings.py:19-44` (add `"segments"` to INSTALLED_APPS)

**Step 1: Create the app directory and files**

```bash
mkdir -p backend/segments/migrations
touch backend/segments/__init__.py
touch backend/segments/migrations/__init__.py
```

**Step 2: Create apps.py**

```python
# backend/segments/apps.py
from django.apps import AppConfig

class SegmentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "segments"
```

**Step 3: Create the Segment model**

```python
# backend/segments/models.py
import uuid
from django.db import models
from django.conf import settings


class Segment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="segments",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=50, blank=True, default="")
    color = models.CharField(max_length=7, blank=True, default="#3b82f6")
    rules = models.JSONField(default=dict)
    is_pinned = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name
```

**Step 4: Create admin.py**

```python
# backend/segments/admin.py
from django.contrib import admin
from .models import Segment

@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "is_pinned", "created_at"]
    list_filter = ["is_pinned"]
```

**Step 5: Add to INSTALLED_APPS**

In `backend/config/settings.py`, add `"segments"` after `"contacts"` in the INSTALLED_APPS list (around line 34).

**Step 6: Generate and run migration**

```bash
cd backend && python manage.py makemigrations segments && python manage.py migrate
```

**Step 7: Commit**

```bash
git add backend/segments/ backend/config/settings.py
git commit -m "feat(segments): add Segment model and Django app"
```

---

## Task 2: Build the segment rule engine

**Files:**
- Create: `backend/segments/engine.py`

This is the core module that translates JSON rules into Django ORM querysets.

**Step 1: Create the rule engine**

```python
# backend/segments/engine.py
from datetime import timedelta
from django.db.models import Q, Count, Max, Subquery, OuterRef
from django.utils import timezone
from contacts.models import Contact


# Maps field names to Django ORM lookups
FIELD_MAP = {
    # Direct contact fields
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email",
    "phone": "phone",
    "company": "company",
    "source": "source",
    "lead_score": "lead_score",
    "job_title": "job_title",
    "city": "city",
    "country": "country",
    "state": "state",
    "postal_code": "postal_code",
    "industry": "industry",
    "language": "language",
    "preferred_channel": "preferred_channel",
    "decision_role": "decision_role",
    "siret": "siret",
    "linkedin_url": "linkedin_url",
    "website": "website",
    "twitter_url": "twitter_url",
    "secondary_email": "secondary_email",
    "secondary_phone": "secondary_phone",
    "mobile_phone": "mobile_phone",
    "notes": "notes",
    "identified_needs": "identified_needs",
    # Date fields
    "created_at": "created_at",
    "updated_at": "updated_at",
    "birthday": "birthday",
    # Numeric
    "estimated_budget": "estimated_budget",
}

# Fields that are date/datetime type
DATE_FIELDS = {"created_at", "updated_at", "birthday"}

# Fields that are numeric
NUMERIC_FIELDS = {"estimated_budget"}

# Unit to timedelta mapping
UNIT_MAP = {
    "days": lambda v: timedelta(days=v),
    "weeks": lambda v: timedelta(weeks=v),
    "months": lambda v: timedelta(days=v * 30),
}


def build_condition_q(condition: dict) -> Q:
    """Build a Q object from a single condition dict."""
    field = condition["field"]
    operator = condition["operator"]
    value = condition.get("value")
    unit = condition.get("unit", "days")

    # Handle custom fields: custom_field.<uuid>
    if field.startswith("custom_field."):
        field_id = field.split(".", 1)[1]
        return _build_custom_field_q(field_id, operator, value)

    # Handle relation fields
    if field in ("deals_count", "open_deals_count", "tasks_count", "open_tasks_count"):
        return _build_relation_count_q(field, operator, value)

    if field == "last_interaction_date":
        return _build_last_interaction_q(operator, value, unit)

    if field == "has_deal_closing_within":
        return _build_deal_closing_q(value, unit)

    # Handle category field
    if field == "categories":
        return _build_category_q(operator, value)

    # Handle tags (JSONField list)
    if field == "tags":
        return _build_tags_q(operator, value)

    # Standard fields
    orm_field = FIELD_MAP.get(field)
    if not orm_field:
        return Q()  # Unknown field, match nothing special

    if field in DATE_FIELDS:
        return _build_date_q(orm_field, operator, value, unit)

    if field in NUMERIC_FIELDS:
        return _build_numeric_q(orm_field, operator, value)

    return _build_text_q(orm_field, operator, value)


def _build_text_q(orm_field: str, operator: str, value) -> Q:
    if operator == "equals":
        return Q(**{orm_field: value})
    if operator == "not_equals":
        return ~Q(**{orm_field: value})
    if operator == "contains":
        return Q(**{f"{orm_field}__icontains": value})
    if operator == "not_contains":
        return ~Q(**{f"{orm_field}__icontains": value})
    if operator == "is_empty":
        return Q(**{orm_field: ""}) | Q(**{f"{orm_field}__isnull": True})
    if operator == "is_not_empty":
        return ~Q(**{orm_field: ""}) & Q(**{f"{orm_field}__isnull": False})
    if operator == "in":
        return Q(**{f"{orm_field}__in": value if isinstance(value, list) else [value]})
    if operator == "not_in":
        return ~Q(**{f"{orm_field}__in": value if isinstance(value, list) else [value]})
    return Q()


def _build_numeric_q(orm_field: str, operator: str, value) -> Q:
    if operator == "equals":
        return Q(**{orm_field: value})
    if operator == "not_equals":
        return ~Q(**{orm_field: value})
    if operator == "greater_than":
        return Q(**{f"{orm_field}__gt": value})
    if operator == "less_than":
        return Q(**{f"{orm_field}__lt": value})
    if operator == "between":
        if isinstance(value, list) and len(value) == 2:
            return Q(**{f"{orm_field}__gte": value[0], f"{orm_field}__lte": value[1]})
    if operator == "is_empty":
        return Q(**{f"{orm_field}__isnull": True})
    if operator == "is_not_empty":
        return Q(**{f"{orm_field}__isnull": False})
    return Q()


def _build_date_q(orm_field: str, operator: str, value, unit: str) -> Q:
    now = timezone.now()
    if operator == "equals":
        return Q(**{f"{orm_field}__date": value})
    if operator == "before":
        return Q(**{f"{orm_field}__lt": value})
    if operator == "after":
        return Q(**{f"{orm_field}__gt": value})
    if operator == "within_last":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(**{f"{orm_field}__gte": now - delta})
    if operator == "within_next":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(**{f"{orm_field}__lte": now + delta, f"{orm_field}__gte": now})
    if operator == "is_empty":
        return Q(**{f"{orm_field}__isnull": True})
    return Q()


def _build_custom_field_q(field_id: str, operator: str, value) -> Q:
    """Query into the custom_fields JSONField."""
    json_path = f"custom_fields__{field_id}"
    if operator == "equals":
        return Q(**{json_path: value})
    if operator == "not_equals":
        return ~Q(**{json_path: value})
    if operator == "contains":
        return Q(**{f"{json_path}__icontains": value})
    if operator == "is_empty":
        return ~Q(**{f"custom_fields__has_key": field_id}) | Q(**{json_path: ""})
    if operator == "is_not_empty":
        return Q(**{f"custom_fields__has_key": field_id}) & ~Q(**{json_path: ""})
    return Q()


def _build_category_q(operator: str, value) -> Q:
    if operator == "equals" or operator == "in":
        ids = value if isinstance(value, list) else [value]
        return Q(categories__id__in=ids)
    if operator == "not_in":
        ids = value if isinstance(value, list) else [value]
        return ~Q(categories__id__in=ids)
    if operator == "has_any":
        return Q(categories__isnull=False)
    if operator == "has_none":
        return Q(categories__isnull=True)
    return Q()


def _build_tags_q(operator: str, value) -> Q:
    if operator == "contains":
        return Q(tags__contains=[value])
    if operator == "not_contains":
        return ~Q(tags__contains=[value])
    if operator == "is_empty":
        return Q(tags=[])
    if operator == "is_not_empty":
        return ~Q(tags=[])
    return Q()


def _build_relation_count_q(field: str, operator: str, value) -> Q:
    """Build Q for deal/task count fields. These require annotation."""
    # This returns a Q that works with annotated querysets
    # The annotation must be added by the caller
    if operator == "has_any":
        return Q(**{f"{field}__gt": 0})
    if operator == "has_none":
        return Q(**{field: 0})
    if operator == "greater_than":
        return Q(**{f"{field}__gt": int(value)})
    if operator == "less_than":
        return Q(**{f"{field}__lt": int(value)})
    if operator == "equals":
        return Q(**{field: int(value)})
    return Q()


def _build_last_interaction_q(operator: str, value, unit: str) -> Q:
    """Filter by last interaction date (from TimelineEntry)."""
    now = timezone.now()
    if operator == "within_last":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(last_interaction__gte=now - delta)
    if operator == "before":
        return Q(last_interaction__lt=value)
    if operator == "is_empty":
        return Q(last_interaction__isnull=True)
    return Q()


def _build_deal_closing_q(value, unit: str) -> Q:
    """Filter contacts that have a deal closing within X days/weeks."""
    now = timezone.now()
    delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
    from deals.models import Deal
    closing_deal_contacts = Deal.objects.filter(
        expected_close__lte=(now + delta).date(),
        expected_close__gte=now.date(),
    ).values("contact_id")
    return Q(id__in=Subquery(closing_deal_contacts))


def build_group_q(group: dict) -> Q:
    """Build a Q from a group of conditions."""
    logic = group.get("logic", "AND")
    conditions = group.get("conditions", [])

    if not conditions:
        return Q()

    combined = build_condition_q(conditions[0])
    for cond in conditions[1:]:
        q = build_condition_q(cond)
        if logic == "OR":
            combined = combined | q
        else:
            combined = combined & q

    return combined


def build_segment_queryset(organization, rules: dict):
    """
    Build a full Contact queryset from segment rules.
    Returns a queryset filtered by the segment rules.
    """
    qs = Contact.objects.filter(organization=organization)

    # Add annotations for relation fields if needed
    rules_json = str(rules)
    if "deals_count" in rules_json or "open_deals_count" in rules_json:
        qs = qs.annotate(deals_count=Count("deals", distinct=True))
    if "open_deals_count" in rules_json:
        from deals.models import PipelineStage
        # Count deals not in "Gagné" or "Perdu" stages
        qs = qs.annotate(
            open_deals_count=Count(
                "deals",
                filter=~Q(deals__stage__name__in=["Gagné", "Perdu"]),
                distinct=True,
            )
        )
    if "tasks_count" in rules_json or "open_tasks_count" in rules_json:
        qs = qs.annotate(tasks_count=Count("tasks", distinct=True))
    if "open_tasks_count" in rules_json:
        qs = qs.annotate(
            open_tasks_count=Count(
                "tasks",
                filter=Q(tasks__is_completed=False),
                distinct=True,
            )
        )
    if "last_interaction" in rules_json:
        from notes.models import TimelineEntry
        qs = qs.annotate(last_interaction=Max("timeline_entries__created_at"))

    # Build Q from rule groups
    groups = rules.get("groups", [])
    root_logic = rules.get("logic", "AND")

    if not groups:
        return qs

    combined = build_group_q(groups[0])
    for group in groups[1:]:
        q = build_group_q(group)
        if root_logic == "OR":
            combined = combined | q
        else:
            combined = combined & q

    return qs.filter(combined).distinct()
```

**Step 2: Commit**

```bash
git add backend/segments/engine.py
git commit -m "feat(segments): add rule engine to translate JSON rules to Django ORM"
```

---

## Task 3: Create serializers, views, and URL routing

**Files:**
- Create: `backend/segments/serializers.py`
- Create: `backend/segments/views.py`
- Create: `backend/segments/urls.py`
- Modify: `backend/config/urls.py:4-24` (add segments URL)

**Step 1: Create serializers**

```python
# backend/segments/serializers.py
from rest_framework import serializers
from .models import Segment


class SegmentSerializer(serializers.ModelSerializer):
    contact_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Segment
        fields = [
            "id", "name", "description", "icon", "color",
            "rules", "is_pinned", "order",
            "contact_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

**Step 2: Create views**

```python
# backend/segments/views.py
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.cache import cache

from .models import Segment
from .serializers import SegmentSerializer
from .engine import build_segment_queryset
from contacts.serializers import ContactSerializer

CACHE_TTL = 60  # 1 minute


class SegmentViewSet(viewsets.ModelViewSet):
    serializer_class = SegmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Segment.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        # Add cached contact counts
        for item in data:
            cache_key = f"segment:{item['id']}:count"
            count = cache.get(cache_key)
            if count is None:
                segment = queryset.get(id=item["id"])
                qs = build_segment_queryset(request.organization, segment.rules)
                count = qs.count()
                cache.set(cache_key, count, CACHE_TTL)
            item["contact_count"] = count

        return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def segment_contacts(request, pk):
    """Get paginated contacts for a segment."""
    try:
        segment = Segment.objects.get(pk=pk, organization=request.organization)
    except Segment.DoesNotExist:
        return Response({"detail": "Segment non trouvé."}, status=404)

    qs = build_segment_queryset(request.organization, segment.rules)

    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(qs, request)
    serializer = ContactSerializer(page, many=True, context={"request": request})
    return paginator.get_paginated_response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def segment_preview(request):
    """Preview: return count for given rules without saving."""
    rules = request.data.get("rules", {})
    qs = build_segment_queryset(request.organization, rules)
    return Response({"count": qs.count()})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_segments(request):
    """Reorder segments."""
    order = request.data.get("order", [])
    for index, segment_id in enumerate(order):
        Segment.objects.filter(
            id=segment_id,
            organization=request.organization,
        ).update(order=index)
    return Response({"status": "ok"})
```

**Step 3: Create URL routing**

```python
# backend/segments/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.SegmentViewSet, basename="segment")

urlpatterns = [
    path("preview/", views.segment_preview),
    path("reorder/", views.reorder_segments),
    path("<uuid:pk>/contacts/", views.segment_contacts),
    path("", include(router.urls)),
]
```

**Step 4: Add to main URL config**

In `backend/config/urls.py`, add after the contacts line (line 9):

```python
path("api/segments/", include("segments.urls")),
```

**Step 5: Commit**

```bash
git add backend/segments/serializers.py backend/segments/views.py backend/segments/urls.py backend/config/urls.py
git commit -m "feat(segments): add API endpoints for CRUD, contacts, preview, reorder"
```

---

## Task 4: Add frontend types and API service

**Files:**
- Create: `frontend/types/segments.ts`
- Modify: `frontend/types/index.ts:1-14` (add segments export)
- Create: `frontend/services/segments.ts`

**Step 1: Create TypeScript types**

```typescript
// frontend/types/segments.ts
export interface SegmentCondition {
  field: string
  operator: string
  value: unknown
  unit?: string
}

export interface SegmentRuleGroup {
  logic: "AND" | "OR"
  conditions: SegmentCondition[]
}

export interface SegmentRules {
  logic: "AND" | "OR"
  groups: SegmentRuleGroup[]
}

export interface Segment {
  id: string
  name: string
  description: string
  icon: string
  color: string
  rules: SegmentRules
  is_pinned: boolean
  order: number
  contact_count?: number
  created_at: string
  updated_at: string
}
```

**Step 2: Add export to types/index.ts**

Add `export * from "./segments"` at the end of `frontend/types/index.ts`.

**Step 3: Create API service**

```typescript
// frontend/services/segments.ts
import { apiFetch } from "@/lib/api"
import type { Segment, SegmentRules } from "@/types"
import type { Contact } from "@/types"

interface PaginatedContacts {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

export async function fetchSegments(): Promise<Segment[]> {
  return apiFetch<Segment[]>("/segments/")
}

export async function fetchSegment(id: string): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${id}/`)
}

export async function createSegment(data: Partial<Segment>): Promise<Segment> {
  return apiFetch<Segment>("/segments/", { method: "POST", json: data })
}

export async function updateSegment(id: string, data: Partial<Segment>): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${id}/`, { method: "PUT", json: data })
}

export async function deleteSegment(id: string): Promise<void> {
  await apiFetch(`/segments/${id}/`, { method: "DELETE" })
}

export async function fetchSegmentContacts(id: string, page: number = 1): Promise<PaginatedContacts> {
  return apiFetch<PaginatedContacts>(`/segments/${id}/contacts/?page=${page}`)
}

export async function previewSegment(rules: SegmentRules): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/segments/preview/", { method: "POST", json: { rules } })
}

export async function reorderSegments(order: string[]): Promise<void> {
  await apiFetch("/segments/reorder/", { method: "POST", json: { order } })
}
```

**Step 4: Commit**

```bash
git add frontend/types/segments.ts frontend/types/index.ts frontend/services/segments.ts
git commit -m "feat(segments): add frontend types and API service"
```

---

## Task 5: Build the SegmentConditionRow component

**Files:**
- Create: `frontend/components/segments/SegmentConditionRow.tsx`

This is the atomic UI component for a single condition: field selector, operator selector, value input.

**Step 1: Create the component**

```typescript
// frontend/components/segments/SegmentConditionRow.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { SegmentCondition } from "@/types"

const FIELD_OPTIONS = [
  { group: "Contact", fields: [
    { value: "first_name", label: "Prenom" },
    { value: "last_name", label: "Nom" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telephone" },
    { value: "company", label: "Entreprise" },
    { value: "job_title", label: "Poste" },
    { value: "source", label: "Source" },
    { value: "lead_score", label: "Lead score" },
    { value: "city", label: "Ville" },
    { value: "country", label: "Pays" },
    { value: "industry", label: "Industrie" },
    { value: "language", label: "Langue" },
    { value: "preferred_channel", label: "Canal prefere" },
    { value: "decision_role", label: "Role de decision" },
    { value: "tags", label: "Tags" },
    { value: "categories", label: "Categories" },
    { value: "estimated_budget", label: "Budget estime" },
  ]},
  { group: "Dates", fields: [
    { value: "created_at", label: "Date de creation" },
    { value: "updated_at", label: "Date de modification" },
    { value: "birthday", label: "Anniversaire" },
  ]},
  { group: "Relations", fields: [
    { value: "deals_count", label: "Nombre de deals" },
    { value: "open_deals_count", label: "Deals ouverts" },
    { value: "tasks_count", label: "Nombre de taches" },
    { value: "open_tasks_count", label: "Taches ouvertes" },
    { value: "last_interaction_date", label: "Derniere interaction" },
    { value: "has_deal_closing_within", label: "Deal qui ferme dans" },
  ]},
]

const TEXT_OPERATORS = [
  { value: "equals", label: "est egal a" },
  { value: "not_equals", label: "n'est pas egal a" },
  { value: "contains", label: "contient" },
  { value: "not_contains", label: "ne contient pas" },
  { value: "is_empty", label: "est vide" },
  { value: "is_not_empty", label: "n'est pas vide" },
]

const SELECT_OPERATORS = [
  { value: "equals", label: "est" },
  { value: "not_equals", label: "n'est pas" },
  { value: "in", label: "est parmi" },
  { value: "not_in", label: "n'est pas parmi" },
]

const NUMERIC_OPERATORS = [
  { value: "equals", label: "est egal a" },
  { value: "not_equals", label: "n'est pas" },
  { value: "greater_than", label: "superieur a" },
  { value: "less_than", label: "inferieur a" },
  { value: "between", label: "entre" },
  { value: "is_empty", label: "est vide" },
]

const DATE_OPERATORS = [
  { value: "within_last", label: "dans les derniers" },
  { value: "within_next", label: "dans les prochains" },
  { value: "before", label: "avant le" },
  { value: "after", label: "apres le" },
  { value: "is_empty", label: "est vide" },
]

const RELATION_OPERATORS = [
  { value: "has_any", label: "a au moins 1" },
  { value: "has_none", label: "n'en a aucun" },
  { value: "greater_than", label: "plus de" },
  { value: "less_than", label: "moins de" },
  { value: "equals", label: "exactement" },
]

const LEAD_SCORE_OPTIONS = [
  { value: "hot", label: "Chaud" },
  { value: "warm", label: "Tiede" },
  { value: "cold", label: "Froid" },
]

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Telephone" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Autre" },
]

const DECISION_ROLE_OPTIONS = [
  { value: "decision_maker", label: "Decideur" },
  { value: "influencer", label: "Influenceur" },
  { value: "user", label: "Utilisateur" },
  { value: "other", label: "Autre" },
]

const DATE_FIELDS = ["created_at", "updated_at", "birthday"]
const NUMERIC_FIELDS = ["estimated_budget"]
const RELATION_FIELDS = ["deals_count", "open_deals_count", "tasks_count", "open_tasks_count", "last_interaction_date", "has_deal_closing_within"]
const SELECT_FIELDS: Record<string, { value: string; label: string }[]> = {
  lead_score: LEAD_SCORE_OPTIONS,
  preferred_channel: CHANNEL_OPTIONS,
  decision_role: DECISION_ROLE_OPTIONS,
}
const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty", "has_any", "has_none"]

function getOperatorsForField(field: string) {
  if (DATE_FIELDS.includes(field)) return DATE_OPERATORS
  if (NUMERIC_FIELDS.includes(field)) return NUMERIC_OPERATORS
  if (RELATION_FIELDS.includes(field)) return RELATION_OPERATORS
  if (field in SELECT_FIELDS) return SELECT_OPERATORS
  return TEXT_OPERATORS
}

interface Props {
  condition: SegmentCondition
  onChange: (condition: SegmentCondition) => void
  onRemove: () => void
  customFields?: { id: string; label: string; field_type: string }[]
}

export function SegmentConditionRow({ condition, onChange, onRemove, customFields = [] }: Props) {
  const allFields = [
    ...FIELD_OPTIONS,
    ...(customFields.length > 0 ? [{
      group: "Champs personnalises",
      fields: customFields.map(cf => ({ value: `custom_field.${cf.id}`, label: cf.label })),
    }] : []),
  ]

  const operators = getOperatorsForField(condition.field)
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator)
  const selectOptions = SELECT_FIELDS[condition.field]
  const isDateDuration = ["within_last", "within_next"].includes(condition.operator)

  return (
    <div className="flex items-center gap-2">
      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value, operator: getOperatorsForField(e.target.value)[0]?.value ?? "equals", value: "" })}
        className="flex h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm min-w-[160px]"
      >
        <option value="">-- Champ --</option>
        {allFields.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.fields.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="flex h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm min-w-[140px]"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input */}
      {needsValue && (
        <>
          {selectOptions ? (
            <select
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm min-w-[120px]"
            >
              <option value="">--</option>
              {selectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : isDateDuration ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                value={condition.value as number ?? ""}
                onChange={(e) => onChange({ ...condition, value: parseInt(e.target.value) || "" })}
                className="h-9 w-20 bg-secondary/30 border-border/60"
                placeholder="30"
              />
              <select
                value={condition.unit ?? "days"}
                onChange={(e) => onChange({ ...condition, unit: e.target.value })}
                className="flex h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
              >
                <option value="days">jours</option>
                <option value="weeks">semaines</option>
                <option value="months">mois</option>
              </select>
            </div>
          ) : DATE_FIELDS.includes(condition.field) && ["before", "after", "equals"].includes(condition.operator) ? (
            <Input
              type="date"
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="h-9 bg-secondary/30 border-border/60 min-w-[140px]"
            />
          ) : (
            <Input
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="h-9 bg-secondary/30 border-border/60 min-w-[120px]"
              placeholder="Valeur..."
            />
          )}
        </>
      )}

      {/* Remove button */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/segments/SegmentConditionRow.tsx
git commit -m "feat(segments): add SegmentConditionRow component"
```

---

## Task 6: Build the SegmentRuleGroup component

**Files:**
- Create: `frontend/components/segments/SegmentRuleGroup.tsx`

**Step 1: Create the component**

```typescript
// frontend/components/segments/SegmentRuleGroup.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { SegmentConditionRow } from "./SegmentConditionRow"
import type { SegmentRuleGroup as RuleGroupType, SegmentCondition } from "@/types"

interface Props {
  group: RuleGroupType
  onChange: (group: RuleGroupType) => void
  onRemove: () => void
  canRemove: boolean
  customFields?: { id: string; label: string; field_type: string }[]
}

export function SegmentRuleGroup({ group, onChange, onRemove, canRemove, customFields }: Props) {
  const updateCondition = (index: number, condition: SegmentCondition) => {
    const conditions = [...group.conditions]
    conditions[index] = condition
    onChange({ ...group, conditions })
  }

  const removeCondition = (index: number) => {
    const conditions = group.conditions.filter((_, i) => i !== index)
    onChange({ ...group, conditions })
  }

  const addCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, { field: "", operator: "equals", value: "" }],
    })
  }

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground font-[family-name:var(--font-body)]">
            Conditions liees par
          </span>
          <select
            value={group.logic}
            onChange={(e) => onChange({ ...group, logic: e.target.value as "AND" | "OR" })}
            className="h-7 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
          >
            <option value="AND">ET</option>
            <option value="OR">OU</option>
          </select>
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          <SegmentConditionRow
            key={index}
            condition={condition}
            onChange={(c) => updateCondition(index, c)}
            onRemove={() => removeCondition(index)}
            customFields={customFields}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1.5"
        onClick={addCondition}
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une condition
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/segments/SegmentRuleGroup.tsx
git commit -m "feat(segments): add SegmentRuleGroup component"
```

---

## Task 7: Build the SegmentBuilder dialog

**Files:**
- Create: `frontend/components/segments/SegmentBuilder.tsx`

**Step 1: Create the component**

```typescript
// frontend/components/segments/SegmentBuilder.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Users } from "lucide-react"
import { SegmentRuleGroup } from "./SegmentRuleGroup"
import { previewSegment } from "@/services/segments"
import { fetchCustomFieldDefinitions } from "@/services/contacts"
import type { Segment, SegmentRules, SegmentRuleGroup as RuleGroupType } from "@/types"

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"]

const DEFAULT_RULES: SegmentRules = {
  logic: "AND",
  groups: [{ logic: "AND", conditions: [{ field: "", operator: "equals", value: "" }] }],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment?: Segment | null
  onSave: (data: Partial<Segment>) => Promise<void>
}

export function SegmentBuilder({ open, onOpenChange, segment, onSave }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [icon, setIcon] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [rules, setRules] = useState<SegmentRules>(DEFAULT_RULES)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customFields, setCustomFields] = useState<{ id: string; label: string; field_type: string }[]>([])

  useEffect(() => {
    if (open) {
      if (segment) {
        setName(segment.name)
        setDescription(segment.description)
        setColor(segment.color)
        setIcon(segment.icon)
        setIsPinned(segment.is_pinned)
        setRules(segment.rules)
      } else {
        setName("")
        setDescription("")
        setColor("#3b82f6")
        setIcon("")
        setIsPinned(false)
        setRules(DEFAULT_RULES)
      }
      setPreviewCount(null)
      fetchCustomFieldDefinitions().then((defs) =>
        setCustomFields(defs.map((d) => ({ id: d.id, label: d.label, field_type: d.field_type })))
      ).catch(() => {})
    }
  }, [open, segment])

  const loadPreview = useCallback(async () => {
    const hasConditions = rules.groups.some((g) => g.conditions.some((c) => c.field))
    if (!hasConditions) {
      setPreviewCount(null)
      return
    }
    setPreviewLoading(true)
    try {
      const result = await previewSegment(rules)
      setPreviewCount(result.count)
    } catch {
      setPreviewCount(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [rules])

  useEffect(() => {
    const timer = setTimeout(loadPreview, 500)
    return () => clearTimeout(timer)
  }, [loadPreview])

  const updateGroup = (index: number, group: RuleGroupType) => {
    const groups = [...rules.groups]
    groups[index] = group
    setRules({ ...rules, groups })
  }

  const removeGroup = (index: number) => {
    const groups = rules.groups.filter((_, i) => i !== index)
    setRules({ ...rules, groups })
  }

  const addGroup = () => {
    setRules({
      ...rules,
      groups: [...rules.groups, { logic: "AND", conditions: [{ field: "", operator: "equals", value: "" }] }],
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        is_pinned: isPinned,
        rules,
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save segment:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{segment ? "Modifier le segment" : "Nouveau segment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name & description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Nom
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contacts chauds ce mois"
                className="h-10 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionnel..."
                className="h-10 bg-secondary/30 border-border/60"
              />
            </div>
          </div>

          {/* Color & pinned */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Couleur
              </Label>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                id="is_pinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_pinned" className="text-sm font-[family-name:var(--font-body)]">
                Epingler dans les contacts
              </Label>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Regles
              </Label>
              {rules.groups.length > 1 && (
                <select
                  value={rules.logic}
                  onChange={(e) => setRules({ ...rules, logic: e.target.value as "AND" | "OR" })}
                  className="h-7 rounded-md border border-border/60 bg-secondary/30 px-2 text-xs font-medium"
                >
                  <option value="AND">Tous les groupes (ET)</option>
                  <option value="OR">Au moins un groupe (OU)</option>
                </select>
              )}
            </div>

            {rules.groups.map((group, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <span className="text-xs font-medium text-muted-foreground bg-background px-2">
                      {rules.logic === "AND" ? "ET" : "OU"}
                    </span>
                  </div>
                )}
                <SegmentRuleGroup
                  group={group}
                  onChange={(g) => updateGroup(index, g)}
                  onRemove={() => removeGroup(index)}
                  canRemove={rules.groups.length > 1}
                  customFields={customFields}
                />
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={addGroup}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un groupe
            </Button>
          </div>

          {/* Preview count */}
          <div className="flex items-center gap-2 rounded-lg bg-secondary/30 px-4 py-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-[family-name:var(--font-body)]">
              {previewLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calcul...
                </span>
              ) : previewCount !== null ? (
                <span>
                  <strong>{previewCount}</strong> contact{previewCount !== 1 ? "s" : ""} correspondent
                </span>
              ) : (
                <span className="text-muted-foreground">Definissez des regles pour voir le nombre de contacts</span>
              )}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {segment ? "Enregistrer" : "Creer le segment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/segments/SegmentBuilder.tsx
git commit -m "feat(segments): add SegmentBuilder dialog with rule groups and preview"
```

---

## Task 8: Build the segments list page

**Files:**
- Create: `frontend/app/(app)/segments/page.tsx`

**Step 1: Create the page**

```typescript
// frontend/app/(app)/segments/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchSegments, createSegment, updateSegment, deleteSegment } from "@/services/segments"
import { SegmentBuilder } from "@/components/segments/SegmentBuilder"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, Loader2, ListFilter, Users } from "lucide-react"
import type { Segment } from "@/types"

export default function SegmentsPage() {
  const router = useRouter()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)

  const loadSegments = useCallback(async () => {
    try {
      const data = await fetchSegments()
      setSegments(data)
    } catch (err) {
      console.error("Failed to fetch segments:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSegments()
  }, [loadSegments])

  const handleSave = async (data: Partial<Segment>) => {
    if (editingSegment) {
      await updateSegment(editingSegment.id, data)
    } else {
      await createSegment(data)
    }
    setEditingSegment(null)
    loadSegments()
  }

  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment)
    setBuilderOpen(true)
  }

  const handleDuplicate = async (segment: Segment) => {
    await createSegment({
      name: `${segment.name} (copie)`,
      description: segment.description,
      color: segment.color,
      icon: segment.icon,
      rules: segment.rules,
      is_pinned: false,
    })
    loadSegments()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce segment ?")) return
    await deleteSegment(id)
    loadSegments()
  }

  const handleNew = () => {
    setEditingSegment(null)
    setBuilderOpen(true)
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Segments</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {segments.length} segment{segments.length !== 1 ? "s" : ""} dynamique{segments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Nouveau segment
        </Button>
      </div>

      {/* Segment grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListFilter className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">Aucun segment</h3>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)] mb-4">
            Creez votre premier segment pour filtrer vos contacts dynamiquement.
          </p>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Creer un segment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="group relative rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:shadow-sm transition-all cursor-pointer"
              onClick={() => router.push(`/segments/${segment.id}`)}
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: segment.color }}
              />

              <div className="flex items-start justify-between mt-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{segment.name}</h3>
                    {segment.is_pinned && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-[family-name:var(--font-body)]">
                        Epingle
                      </span>
                    )}
                  </div>
                  {segment.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 font-[family-name:var(--font-body)]">
                      {segment.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(segment) }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(segment) }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Dupliquer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleDelete(segment.id) }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Count */}
              <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                <Users className="h-3.5 w-3.5" />
                <span>{segment.contact_count ?? 0} contact{(segment.contact_count ?? 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <SegmentBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open)
          if (!open) setEditingSegment(null)
        }}
        segment={editingSegment}
        onSave={handleSave}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/segments/page.tsx
git commit -m "feat(segments): add segments list page with cards, CRUD, and builder"
```

---

## Task 9: Build the segment detail page (contacts view)

**Files:**
- Create: `frontend/app/(app)/segments/[id]/page.tsx`

**Step 1: Create the page**

```typescript
// frontend/app/(app)/segments/[id]/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchSegment, updateSegment, fetchSegmentContacts } from "@/services/segments"
import { SegmentBuilder } from "@/components/segments/SegmentBuilder"
import { ContactTable } from "@/components/contacts/ContactTable"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Users, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import type { Segment, Contact } from "@/types"

const PAGE_SIZE = 20

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = []
  pages.push(1)
  if (current > 3) pages.push("...")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function SegmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [segment, setSegment] = useState<Segment | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [builderOpen, setBuilderOpen] = useState(false)

  const loadSegment = useCallback(async () => {
    try {
      const data = await fetchSegment(id)
      setSegment(data)
    } catch (err) {
      console.error("Failed to fetch segment:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const data = await fetchSegmentContacts(id, page)
      setContacts(data.results)
      setTotalCount(data.count)
    } catch (err) {
      console.error("Failed to fetch segment contacts:", err)
    } finally {
      setContactsLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    loadSegment()
  }, [loadSegment])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleSave = async (data: Partial<Segment>) => {
    await updateSegment(id, data)
    loadSegment()
    loadContacts()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!segment) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Segment non trouve.</p>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/segments")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 font-[family-name:var(--font-body)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Segments
          </button>
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <h1 className="text-3xl tracking-tight">{segment.name}</h1>
          </div>
          {segment.description && (
            <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
              {segment.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            <Users className="h-3.5 w-3.5" />
            <span>{totalCount} contact{totalCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setBuilderOpen(true)}>
          <Pencil className="h-4 w-4" />
          Modifier les regles
        </Button>
      </div>

      {/* Contacts table */}
      {contactsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContactTable contacts={contacts} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-[family-name:var(--font-body)]">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SegmentBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        segment={segment}
        onSave={handleSave}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/segments/\[id\]/page.tsx
git commit -m "feat(segments): add segment detail page with contacts table and pagination"
```

---

## Task 10: Add Segments to sidebar navigation

**Files:**
- Modify: `frontend/components/Sidebar.tsx:34-41` (add Segments entry)

**Step 1: Add import and navigation entry**

In `frontend/components/Sidebar.tsx`:

1. Add `ListFilter` to the lucide-react imports (line 11-31).
2. Add the Segments entry to the `navigation` array after Contacts (line 36):

```typescript
{ name: "Segments", href: "/segments", icon: ListFilter },
```

The `navigation` array should become:
```typescript
const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Segments", href: "/segments", icon: ListFilter },
  { name: "Pipeline", href: "/deals", icon: Kanban },
  { name: "Tâches", href: "/tasks", icon: CheckSquare },
  { name: "Workflows", href: "/workflows", icon: Workflow },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
]
```

**Step 2: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(segments): add Segments entry to sidebar navigation"
```

---

## Task 11: Add segment selector to contacts page

**Files:**
- Create: `frontend/components/segments/SegmentSelector.tsx`
- Modify: `frontend/app/(app)/contacts/page.tsx` (integrate segment selector)

**Step 1: Create SegmentSelector component**

```typescript
// frontend/components/segments/SegmentSelector.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchSegments } from "@/services/segments"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ListFilter, X, ExternalLink, Users } from "lucide-react"
import type { Segment } from "@/types"

interface Props {
  selectedSegmentId: string | null
  onSelect: (segmentId: string | null) => void
}

export function SegmentSelector({ selectedSegmentId, onSelect }: Props) {
  const router = useRouter()
  const [segments, setSegments] = useState<Segment[]>([])

  useEffect(() => {
    fetchSegments()
      .then((data) => setSegments(data))
      .catch(() => {})
  }, [])

  const pinnedSegments = segments.filter((s) => s.is_pinned)
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId)

  if (segments.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {selectedSegment ? (
        <div className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium font-[family-name:var(--font-body)]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selectedSegment.color }}
          />
          {selectedSegment.name}
          <span className="text-[10px] opacity-70">
            ({selectedSegment.contact_count ?? 0})
          </span>
          <button
            onClick={() => onSelect(null)}
            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ListFilter className="h-3.5 w-3.5" />
              Segments
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {pinnedSegments.length > 0 && (
              <>
                {pinnedSegments.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.contact_count ?? 0}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {segments
              .filter((s) => !s.is_pinned)
              .map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.contact_count ?? 0}
                  </span>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/segments")} className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Voir tous les segments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
```

**Step 2: Integrate into contacts page**

In `frontend/app/(app)/contacts/page.tsx`:

1. Add import at top:
```typescript
import { SegmentSelector } from "@/components/segments/SegmentSelector"
import { fetchSegmentContacts } from "@/services/segments"
```

2. Add state for selected segment (after line 56, after `showDuplicateDialog` state):
```typescript
const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
```

3. Modify `fetchContacts` to handle segment filtering. When a segment is selected, use `fetchSegmentContacts` instead of the regular contacts endpoint. Update the `fetchContacts` callback (lines 73-95):

```typescript
const fetchContacts = useCallback(async () => {
  setLoading(true)
  try {
    if (selectedSegment) {
      const data = await fetchSegmentContacts(selectedSegment, page)
      setContacts(data.results)
      setTotalCount(data.count)
    } else if (search.trim()) {
      const results = await apiFetch<Contact[]>(
        `/contacts/search/?q=${encodeURIComponent(search.trim())}`
      )
      setContacts(results)
      setTotalCount(results.length)
    } else {
      const categoryParam = selectedCategory ? `&category=${selectedCategory}` : ""
      const data = await apiFetch<ContactsResponse>(
        `/contacts/?page=${page}${categoryParam}`
      )
      setContacts(data.results)
      setTotalCount(data.count)
    }
  } catch (err) {
    console.error("Failed to fetch contacts:", err)
  } finally {
    setLoading(false)
  }
}, [search, page, selectedCategory, selectedSegment])
```

4. Add a useEffect to reset page when segment changes (after line 110):
```typescript
useEffect(() => {
  setPage(1)
}, [selectedSegment])
```

5. Add the SegmentSelector in the UI, between the search input and the category tabs (after line 333, after the search `</div>`):

```typescript
{/* Segment selector */}
<div className="flex items-center gap-3">
  <SegmentSelector
    selectedSegmentId={selectedSegment}
    onSelect={(id) => {
      setSelectedSegment(id)
      setSelectedCategory(null)
      setSearch("")
    }}
  />
</div>
```

6. When a segment is selected, clear category and search selections. When a category is selected, clear segment.

In the category button `onClick` (line 339), add: `setSelectedSegment(null)`:
```typescript
onClick={() => { setSelectedCategory(null); setSelectedSegment(null) }}
```

And for each category tab click (line 351):
```typescript
onClick={() => { setSelectedCategory(cat.id); setSelectedSegment(null) }}
```

**Step 3: Commit**

```bash
git add frontend/components/segments/SegmentSelector.tsx frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat(segments): add segment selector to contacts page"
```

---

## Task 12: Final verification and cleanup

**Step 1: Verify backend migration runs**

```bash
cd backend && python manage.py makemigrations --check
```

Expected: No new migrations needed (already created in Task 1).

**Step 2: Verify frontend compiles**

```bash
cd frontend && npx next build 2>&1 | head -50
```

Expected: Build succeeds without errors.

**Step 3: Quick smoke test**

1. Start backend: `cd backend && python manage.py runserver`
2. Start frontend: `cd frontend && npm run dev`
3. Verify:
   - `/segments` page loads with empty state
   - Can create a new segment via the builder
   - Segment appears in the list with correct count
   - Click on segment card navigates to detail page
   - Contacts table shows filtered contacts
   - Sidebar shows "Segments" entry
   - Contacts page shows segment selector dropdown
   - Selecting a segment in contacts page filters the list

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(segments): complete dynamic segments feature"
```
