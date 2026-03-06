# Custom Reports Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add customizable reports with a widget-based architecture — a generic aggregation endpoint, Report CRUD, 5 pre-configured templates, and a dedicated `/reports` frontend module with Recharts charts.

**Architecture:** New `reports` Django app with a `Report` model storing widget configs as JSON. A single `POST /api/reports/aggregate/` endpoint handles all data queries using whitelisted sources/metrics/group_by. Frontend uses Recharts (via shadcn/ui charts) for visualization. The existing dashboard becomes a special template report.

**Tech Stack:** Django REST Framework, Next.js, TypeScript, Tailwind CSS, shadcn/ui, Recharts

---

### Task 1: Backend — Report model and migrations

**Files:**
- Create: `backend/reports/__init__.py`
- Create: `backend/reports/models.py`
- Create: `backend/reports/admin.py`
- Modify: `backend/config/settings.py:45`

**Step 1: Create the reports app directory**

Run: `mkdir -p backend/reports`

**Step 2: Create empty init file**

Create `backend/reports/__init__.py` (empty file).

**Step 3: Create the Report model**

Create `backend/reports/models.py`:

```python
import uuid
from django.db import models
from django.conf import settings


class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="reports",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_template = models.BooleanField(default=False)
    widgets = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name
```

**Step 4: Create admin registration**

Create `backend/reports/admin.py`:

```python
from django.contrib import admin
from .models import Report

admin.site.register(Report)
```

**Step 5: Register the app in settings**

In `backend/config/settings.py`, add `"reports"` after `"dashboard"` (line 40):

```python
    "dashboard",
    "reports",
    "notifications",
```

**Step 6: Run migrations**

Run: `docker compose exec -T backend python manage.py makemigrations reports`
Then: `docker compose exec -T backend python manage.py migrate`

**Step 7: Commit**

```bash
git add backend/reports/ backend/config/settings.py
git commit -m "feat(reports): add Report model with widget JSON config"
```

---

### Task 2: Backend — Aggregation engine

**Files:**
- Create: `backend/reports/aggregation.py`

**Step 1: Create the aggregation module**

Create `backend/reports/aggregation.py`:

```python
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from django.db.models.functions import TruncMonth, TruncWeek

from deals.models import Deal, PipelineStage, Quote
from contacts.models import Contact
from tasks.models import Task
from notes.models import TimelineEntry


SOURCE_CONFIG = {
    "deals": {
        "model": Deal,
        "metrics": {
            "count": Count("id"),
            "sum:amount": Sum("amount"),
            "avg:amount": Avg("amount"),
        },
        "group_by": {
            "stage": "stage__name",
            "pipeline": "stage__pipeline__name",
        },
        "date_fields": ["created_at", "closed_at", "updated_at"],
        "allowed_filters": ["stage__name__in", "stage__pipeline__id"],
    },
    "contacts": {
        "model": Contact,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "source": "source",
            "lead_score": "lead_score",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["source", "lead_score"],
    },
    "tasks": {
        "model": Task,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "priority": "priority",
            "is_done": "is_done",
        },
        "date_fields": ["due_date", "created_at"],
        "allowed_filters": ["priority", "is_done"],
    },
    "activities": {
        "model": TimelineEntry,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "entry_type": "entry_type",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["entry_type"],
    },
    "quotes": {
        "model": Quote,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "status": "status",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["status"],
    },
}


def _resolve_date_range(date_range, date_from=None, date_to=None):
    now = timezone.now()
    if date_range == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=now.year + 1, month=1)
        else:
            end = start.replace(month=now.month + 1)
        return start, end
    elif date_range == "last_month":
        first_of_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = first_of_this
        if now.month == 1:
            start = first_of_this.replace(year=now.year - 1, month=12)
        else:
            start = first_of_this.replace(month=now.month - 1)
        return start, end
    elif date_range == "last_3_months":
        end = now
        start = now - timedelta(days=90)
        return start, end
    elif date_range == "last_6_months":
        end = now
        start = now - timedelta(days=180)
        return start, end
    elif date_range == "last_12_months":
        end = now
        start = now - timedelta(days=365)
        return start, end
    elif date_range == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
        return start, end
    elif date_range == "custom" and date_from and date_to:
        from django.utils.dateparse import parse_datetime
        start = parse_datetime(date_from)
        end = parse_datetime(date_to)
        if start and end:
            return start, end
    return None, None


def _format_label(value, group_by):
    if value is None:
        return "N/A"
    if group_by in ("month", "week"):
        from datetime import date, datetime
        if isinstance(value, (date, datetime)):
            from django.utils.formats import date_format
            if group_by == "month":
                return value.strftime("%b %Y").lower()
            else:
                return f"Sem. {value.strftime('%d/%m')}"
        return str(value)
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    return str(value)


def aggregate(organization, source, metric, group_by, date_field=None,
              date_range=None, date_from=None, date_to=None, filters=None):
    config = SOURCE_CONFIG.get(source)
    if not config:
        return {"error": f"Unknown source: {source}"}

    metric_expr = config["metrics"].get(metric)
    if not metric_expr:
        return {"error": f"Unknown metric '{metric}' for source '{source}'"}

    model = config["model"]
    qs = model.objects.filter(organization=organization)

    # Apply date range
    resolved_date_field = date_field if date_field in config["date_fields"] else config["date_fields"][0]
    start, end = _resolve_date_range(date_range, date_from, date_to)
    if start and end:
        qs = qs.filter(**{f"{resolved_date_field}__gte": start, f"{resolved_date_field}__lt": end})

    # Apply whitelisted filters
    if filters:
        for key, value in filters.items():
            if key in ("date_field", "date_range", "date_from", "date_to"):
                continue
            if key in config["allowed_filters"]:
                if isinstance(value, list):
                    qs = qs.filter(**{f"{key}__in" if not key.endswith("__in") else key: value})
                else:
                    qs = qs.filter(**{key: value})

    # Group by
    if group_by in ("month", "week"):
        trunc_fn = TruncMonth if group_by == "month" else TruncWeek
        qs = (
            qs.annotate(period=trunc_fn(resolved_date_field))
            .values("period")
            .annotate(value=metric_expr)
            .order_by("period")
        )
        data = [{"label": _format_label(row["period"], group_by), "value": float(row["value"] or 0)} for row in qs]
    elif group_by in config["group_by"]:
        field_path = config["group_by"][group_by]
        qs = (
            qs.values(field_path)
            .annotate(value=metric_expr)
            .order_by("-value")
        )
        data = [{"label": _format_label(row[field_path], group_by), "value": float(row["value"] or 0)} for row in qs]
    else:
        total = qs.aggregate(value=metric_expr)["value"] or 0
        data = [{"label": "Total", "value": float(total)}]

    total = sum(d["value"] for d in data)
    return {"data": data, "total": total}
```

**Step 2: Verify the module loads**

Run: `docker compose exec -T backend python -c "from reports.aggregation import aggregate; print('OK')"`

**Step 3: Commit**

```bash
git add backend/reports/aggregation.py
git commit -m "feat(reports): add generic aggregation engine with source/metric/group_by support"
```

---

### Task 3: Backend — Report API (CRUD + aggregate endpoint) with tests

**Files:**
- Create: `backend/reports/serializers.py`
- Create: `backend/reports/views.py`
- Create: `backend/reports/urls.py`
- Modify: `backend/config/urls.py`
- Create: `backend/reports/tests.py`

**Step 1: Create the serializer**

Create `backend/reports/serializers.py`:

```python
from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "name", "description", "is_template",
            "widgets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_template", "created_at", "updated_at"]
```

**Step 2: Create the views**

Create `backend/reports/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Report
from .serializers import ReportSerializer
from .aggregation import aggregate


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Report.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_template:
            return Response(
                {"detail": "Cannot delete a template report."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def aggregate_view(request):
    data = request.data
    source = data.get("source")
    metric = data.get("metric")
    group_by = data.get("group_by")

    if not source or not metric:
        return Response(
            {"detail": "source and metric are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = aggregate(
        organization=request.organization,
        source=source,
        metric=metric,
        group_by=group_by,
        date_field=data.get("date_field"),
        date_range=data.get("date_range"),
        date_from=data.get("date_from"),
        date_to=data.get("date_to"),
        filters=data.get("filters"),
    )

    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)
```

**Step 3: Create URL routes**

Create `backend/reports/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ReportViewSet, basename="report")

urlpatterns = [
    path("aggregate/", views.aggregate_view),
    path("", include(router.urls)),
]
```

**Step 4: Register in main URLs**

In `backend/config/urls.py`, add after the dashboard line (line 21):

```python
    path("api/dashboard/", include("dashboard.urls")),
    path("api/reports/", include("reports.urls")),
```

**Step 5: Write the tests**

Create `backend/reports/tests.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "test@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_report(self):
        response = self.client.post(
            "/api/reports/",
            {
                "name": "Mon rapport",
                "description": "Test",
                "widgets": [
                    {
                        "id": "w1",
                        "type": "bar_chart",
                        "title": "Deals par stage",
                        "source": "deals",
                        "metric": "count",
                        "group_by": "stage",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Mon rapport")
        self.assertEqual(len(response.data["widgets"]), 1)

    def test_list_reports(self):
        self.client.post(
            "/api/reports/",
            {"name": "Report 1", "widgets": []},
            format="json",
        )
        self.client.post(
            "/api/reports/",
            {"name": "Report 2", "widgets": []},
            format="json",
        )
        response = self.client.get("/api/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_update_report(self):
        create = self.client.post(
            "/api/reports/",
            {"name": "Original", "widgets": []},
            format="json",
        )
        response = self.client.patch(
            f"/api/reports/{create.data['id']}/",
            {"name": "Updated"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Updated")

    def test_delete_report(self):
        create = self.client.post(
            "/api/reports/",
            {"name": "To delete", "widgets": []},
            format="json",
        )
        response = self.client.delete(f"/api/reports/{create.data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_cannot_delete_template(self):
        from reports.models import Report
        from organizations.models import Membership

        membership = Membership.objects.get(user__email="test@example.com")
        report = Report.objects.create(
            organization=membership.organization,
            created_by=membership.user,
            name="Template",
            is_template=True,
            widgets=[],
        )
        response = self.client.delete(f"/api/reports/{report.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_aggregate_deals_by_stage(self):
        # Create a deal first via the API
        from deals.models import PipelineStage
        from organizations.models import Membership

        membership = Membership.objects.get(user__email="test@example.com")
        org = membership.organization
        stage = PipelineStage.objects.filter(organization=org).first()

        self.client.post(
            "/api/deals/",
            {"name": "Deal 1", "amount": "5000", "stage": str(stage.id)},
            format="json",
        )
        self.client.post(
            "/api/deals/",
            {"name": "Deal 2", "amount": "3000", "stage": str(stage.id)},
            format="json",
        )

        response = self.client.post(
            "/api/reports/aggregate/",
            {
                "source": "deals",
                "metric": "count",
                "group_by": "stage",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        self.assertIn("total", response.data)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_deals_sum_amount(self):
        from deals.models import PipelineStage
        from organizations.models import Membership

        membership = Membership.objects.get(user__email="test@example.com")
        org = membership.organization
        stage = PipelineStage.objects.filter(organization=org).first()

        self.client.post(
            "/api/deals/",
            {"name": "Deal A", "amount": "5000", "stage": str(stage.id)},
            format="json",
        )
        self.client.post(
            "/api/deals/",
            {"name": "Deal B", "amount": "3000", "stage": str(stage.id)},
            format="json",
        )

        response = self.client.post(
            "/api/reports/aggregate/",
            {
                "source": "deals",
                "metric": "sum:amount",
                "group_by": "stage",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 8000)

    def test_aggregate_tasks_by_priority(self):
        self.client.post(
            "/api/tasks/",
            {"description": "Task high", "due_date": "2026-03-10T10:00:00Z", "priority": "high"},
        )
        self.client.post(
            "/api/tasks/",
            {"description": "Task low", "due_date": "2026-03-10T10:00:00Z", "priority": "low"},
        )

        response = self.client.post(
            "/api/reports/aggregate/",
            {
                "source": "tasks",
                "metric": "count",
                "group_by": "priority",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_contacts_by_source(self):
        self.client.post(
            "/api/contacts/",
            {"first_name": "Alice", "last_name": "A", "source": "website"},
            format="json",
        )
        self.client.post(
            "/api/contacts/",
            {"first_name": "Bob", "last_name": "B", "source": "referral"},
            format="json",
        )

        response = self.client.post(
            "/api/reports/aggregate/",
            {
                "source": "contacts",
                "metric": "count",
                "group_by": "source",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)

    def test_aggregate_unknown_source(self):
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "unknown", "metric": "count", "group_by": "month"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aggregate_unknown_metric(self):
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "deals", "metric": "sum:nonexistent", "group_by": "month"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_aggregate_missing_params(self):
        response = self.client.post(
            "/api/reports/aggregate/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

**Step 6: Run the tests**

Run: `docker compose exec -T backend python manage.py test reports -v 2`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add backend/reports/serializers.py backend/reports/views.py backend/reports/urls.py backend/config/urls.py backend/reports/tests.py
git commit -m "feat(reports): add Report CRUD API and aggregation endpoint with tests"
```

---

### Task 4: Backend — Seed template reports via data migration

**Files:**
- Create: `backend/reports/templates.py`

**Step 1: Create template definitions**

Create `backend/reports/templates.py`:

```python
import uuid

REPORT_TEMPLATES = [
    {
        "name": "Performance commerciale",
        "description": "Suivi du revenu, des deals et de la performance de vente.",
        "widgets": [
            {
                "id": str(uuid.uuid4()),
                "type": "line_chart",
                "title": "Revenu par mois",
                "source": "deals",
                "metric": "sum:amount",
                "group_by": "month",
                "filters": {"date_field": "closed_at", "date_range": "last_6_months", "stage__name__in": ["Gagné"]},
                "size": "large",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "bar_chart",
                "title": "Deals par stage",
                "source": "deals",
                "metric": "count",
                "group_by": "stage",
                "filters": {"date_range": "last_6_months"},
                "size": "medium",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "kpi_card",
                "title": "Montant moyen des deals",
                "source": "deals",
                "metric": "avg:amount",
                "group_by": None,
                "filters": {"date_range": "last_6_months"},
                "size": "small",
            },
        ],
    },
    {
        "name": "Pipeline",
        "description": "Vue d'ensemble du pipeline et de la conversion.",
        "widgets": [
            {
                "id": str(uuid.uuid4()),
                "type": "bar_chart",
                "title": "Deals par stage",
                "source": "deals",
                "metric": "count",
                "group_by": "stage",
                "filters": {},
                "size": "large",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "pie_chart",
                "title": "Valeur par stage",
                "source": "deals",
                "metric": "sum:amount",
                "group_by": "stage",
                "filters": {},
                "size": "medium",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "kpi_card",
                "title": "Deals actifs",
                "source": "deals",
                "metric": "count",
                "group_by": None,
                "filters": {},
                "size": "small",
            },
        ],
    },
    {
        "name": "Activite equipe",
        "description": "Suivi des activites et des taches de l'equipe.",
        "widgets": [
            {
                "id": str(uuid.uuid4()),
                "type": "bar_chart",
                "title": "Activites par type",
                "source": "activities",
                "metric": "count",
                "group_by": "entry_type",
                "filters": {"date_range": "last_3_months"},
                "size": "large",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "bar_chart",
                "title": "Taches par priorite",
                "source": "tasks",
                "metric": "count",
                "group_by": "priority",
                "filters": {},
                "size": "medium",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "kpi_card",
                "title": "Taches en retard",
                "source": "tasks",
                "metric": "count",
                "group_by": None,
                "filters": {"is_done": False},
                "size": "small",
            },
        ],
    },
    {
        "name": "Contacts & Sources",
        "description": "Analyse des contacts et de leur provenance.",
        "widgets": [
            {
                "id": str(uuid.uuid4()),
                "type": "line_chart",
                "title": "Nouveaux contacts par mois",
                "source": "contacts",
                "metric": "count",
                "group_by": "month",
                "filters": {"date_range": "last_6_months"},
                "size": "large",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "pie_chart",
                "title": "Repartition par source",
                "source": "contacts",
                "metric": "count",
                "group_by": "source",
                "filters": {},
                "size": "medium",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "bar_chart",
                "title": "Par lead score",
                "source": "contacts",
                "metric": "count",
                "group_by": "lead_score",
                "filters": {},
                "size": "small",
            },
        ],
    },
    {
        "name": "Devis",
        "description": "Suivi des devis et du taux d'acceptation.",
        "widgets": [
            {
                "id": str(uuid.uuid4()),
                "type": "pie_chart",
                "title": "Devis par statut",
                "source": "quotes",
                "metric": "count",
                "group_by": "status",
                "filters": {},
                "size": "medium",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "line_chart",
                "title": "Montant des devis par mois",
                "source": "quotes",
                "metric": "count",
                "group_by": "month",
                "filters": {"date_range": "last_6_months"},
                "size": "large",
            },
            {
                "id": str(uuid.uuid4()),
                "type": "kpi_card",
                "title": "Total devis",
                "source": "quotes",
                "metric": "count",
                "group_by": None,
                "filters": {},
                "size": "small",
            },
        ],
    },
]
```

**Step 2: Commit**

```bash
git add backend/reports/templates.py
git commit -m "feat(reports): add 5 pre-configured report templates"
```

---

### Task 5: Frontend — Install Recharts and add shadcn chart components

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install recharts**

Run: `cd frontend && npm install recharts`

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(frontend): add recharts dependency for chart components"
```

---

### Task 6: Frontend — Types and services for reports

**Files:**
- Create: `frontend/types/reports.ts`
- Modify: `frontend/types/index.ts`
- Create: `frontend/services/reports.ts`

**Step 1: Create report types**

Create `frontend/types/reports.ts`:

```typescript
export interface WidgetConfig {
  id: string
  type: "line_chart" | "bar_chart" | "pie_chart" | "kpi_card" | "table"
  title: string
  source: "deals" | "contacts" | "tasks" | "activities" | "quotes"
  metric: string
  group_by: string | null
  filters: Record<string, unknown>
  size: "small" | "medium" | "large"
}

export interface Report {
  id: string
  name: string
  description: string
  is_template: boolean
  widgets: WidgetConfig[]
  created_at: string
  updated_at: string
}

export interface AggregateRequest {
  source: string
  metric: string
  group_by?: string | null
  date_field?: string
  date_range?: string
  date_from?: string
  date_to?: string
  filters?: Record<string, unknown>
}

export interface AggregateDataPoint {
  label: string
  value: number
}

export interface AggregateResponse {
  data: AggregateDataPoint[]
  total: number
}
```

**Step 2: Export from barrel**

In `frontend/types/index.ts`, add at the end:

```typescript
export * from "./reports"
```

**Step 3: Create report service**

Create `frontend/services/reports.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { Report, AggregateRequest, AggregateResponse } from "@/types"

export async function fetchReports(): Promise<Report[]> {
  return apiFetch<Report[]>("/reports/")
}

export async function fetchReport(id: string): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}/`)
}

export async function createReport(data: {
  name: string
  description?: string
  widgets: unknown[]
}): Promise<Report> {
  return apiFetch<Report>("/reports/", { method: "POST", json: data })
}

export async function updateReport(
  id: string,
  data: Record<string, unknown>
): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}/`, { method: "PATCH", json: data })
}

export async function deleteReport(id: string): Promise<void> {
  await apiFetch(`/reports/${id}/`, { method: "DELETE" })
}

export async function fetchAggregate(
  request: AggregateRequest
): Promise<AggregateResponse> {
  return apiFetch<AggregateResponse>("/reports/aggregate/", {
    method: "POST",
    json: request,
  })
}
```

**Step 4: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend/types/reports.ts frontend/types/index.ts frontend/services/reports.ts
git commit -m "feat(frontend): add report types and API services"
```

---

### Task 7: Frontend — WidgetChart component (renders all chart types)

**Files:**
- Create: `frontend/components/reports/WidgetChart.tsx`

**Step 1: Create the chart dispatcher component**

Create `frontend/components/reports/WidgetChart.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { WidgetConfig, AggregateResponse } from "@/types"
import { fetchAggregate } from "@/services/reports"

const COLORS = [
  "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#64748B",
]

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

interface WidgetChartProps {
  widget: WidgetConfig
  globalDateRange?: string
}

export function WidgetChart({ widget, globalDateRange }: WidgetChartProps) {
  const [data, setData] = useState<AggregateResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const filters = { ...widget.filters }
        if (globalDateRange && !filters.date_range) {
          filters.date_range = globalDateRange
        }
        const result = await fetchAggregate({
          source: widget.source,
          metric: widget.metric,
          group_by: widget.group_by,
          date_field: filters.date_field as string | undefined,
          date_range: filters.date_range as string | undefined,
          filters,
        })
        setData(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [widget.source, widget.metric, widget.group_by, JSON.stringify(widget.filters), globalDateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Aucune donnee
      </div>
    )
  }

  if (widget.type === "kpi_card") {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-4xl font-light tracking-tight">
          {formatValue(data.total)}
        </span>
      </div>
    )
  }

  if (widget.type === "bar_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip
            formatter={(value: number) => [formatValue(value), ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "line_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip
            formatter={(value: number) => [formatValue(value), ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ r: 4, fill: "#6366F1" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "pie_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data.data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
            labelLine={{ strokeWidth: 1 }}
          >
            {data.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatValue(value), ""]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "table") {
    return (
      <div className="overflow-auto max-h-[250px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Label</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 px-3">{row.label}</td>
                <td className="py-2 px-3 text-right font-medium">{formatValue(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/reports/WidgetChart.tsx
git commit -m "feat(frontend): add WidgetChart component with bar/line/pie/kpi/table rendering"
```

---

### Task 8: Frontend — ReportWidget container and WidgetEditor dialog

**Files:**
- Create: `frontend/components/reports/ReportWidget.tsx`
- Create: `frontend/components/reports/WidgetEditor.tsx`

**Step 1: Create the widget container**

Create `frontend/components/reports/ReportWidget.tsx`:

```tsx
"use client"

import { MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { WidgetConfig } from "@/types"
import { WidgetChart } from "./WidgetChart"

interface ReportWidgetProps {
  widget: WidgetConfig
  globalDateRange?: string
  onEdit: (widget: WidgetConfig) => void
  onDuplicate: (widget: WidgetConfig) => void
  onDelete: (widgetId: string) => void
}

export function ReportWidget({
  widget,
  globalDateRange,
  onEdit,
  onDuplicate,
  onDelete,
}: ReportWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-medium tracking-tight">{widget.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(widget)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(widget)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(widget.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-4">
        <WidgetChart widget={widget} globalDateRange={globalDateRange} />
      </div>
    </div>
  )
}
```

**Step 2: Create the widget editor dialog**

Create `frontend/components/reports/WidgetEditor.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "crypto"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WidgetConfig } from "@/types"

interface WidgetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: WidgetConfig | null
  onSave: (widget: WidgetConfig) => void
}

const CHART_TYPES = [
  { value: "bar_chart", label: "Barres" },
  { value: "line_chart", label: "Lignes" },
  { value: "pie_chart", label: "Camembert" },
  { value: "kpi_card", label: "KPI" },
  { value: "table", label: "Tableau" },
] as const

const SOURCES = [
  { value: "deals", label: "Deals" },
  { value: "contacts", label: "Contacts" },
  { value: "tasks", label: "Taches" },
  { value: "activities", label: "Activites" },
  { value: "quotes", label: "Devis" },
] as const

const METRICS_BY_SOURCE: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "count", label: "Nombre" },
    { value: "sum:amount", label: "Somme des montants" },
    { value: "avg:amount", label: "Montant moyen" },
  ],
  contacts: [{ value: "count", label: "Nombre" }],
  tasks: [{ value: "count", label: "Nombre" }],
  activities: [{ value: "count", label: "Nombre" }],
  quotes: [{ value: "count", label: "Nombre" }],
}

const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "stage", label: "Par stage" },
    { value: "pipeline", label: "Par pipeline" },
  ],
  contacts: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "source", label: "Par source" },
    { value: "lead_score", label: "Par lead score" },
  ],
  tasks: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "priority", label: "Par priorite" },
    { value: "is_done", label: "Par statut" },
  ],
  activities: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "entry_type", label: "Par type" },
  ],
  quotes: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "status", label: "Par statut" },
  ],
}

const DATE_RANGES = [
  { value: "", label: "Pas de filtre" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "last_12_months", label: "12 derniers mois" },
  { value: "this_year", label: "Cette annee" },
]

const SIZES = [
  { value: "small", label: "Petit" },
  { value: "medium", label: "Moyen" },
  { value: "large", label: "Grand" },
] as const

export function WidgetEditor({ open, onOpenChange, widget, onSave }: WidgetEditorProps) {
  const [title, setTitle] = useState("")
  const [chartType, setChartType] = useState<WidgetConfig["type"]>("bar_chart")
  const [source, setSource] = useState<WidgetConfig["source"]>("deals")
  const [metric, setMetric] = useState("count")
  const [groupBy, setGroupBy] = useState<string>("month")
  const [dateRange, setDateRange] = useState("")
  const [size, setSize] = useState<WidgetConfig["size"]>("medium")

  useEffect(() => {
    if (open && widget) {
      setTitle(widget.title)
      setChartType(widget.type)
      setSource(widget.source)
      setMetric(widget.metric)
      setGroupBy(widget.group_by || "month")
      setDateRange((widget.filters?.date_range as string) || "")
      setSize(widget.size)
    } else if (open) {
      setTitle("")
      setChartType("bar_chart")
      setSource("deals")
      setMetric("count")
      setGroupBy("month")
      setDateRange("")
      setSize("medium")
    }
  }, [open, widget])

  const handleSourceChange = (newSource: WidgetConfig["source"]) => {
    setSource(newSource)
    setMetric("count")
    const groupOptions = GROUP_BY_OPTIONS[newSource]
    if (groupOptions && !groupOptions.find((o) => o.value === groupBy)) {
      setGroupBy(groupOptions[0]?.value || "month")
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    const filters: Record<string, unknown> = {}
    if (dateRange) filters.date_range = dateRange
    onSave({
      id: widget?.id || crypto.randomUUID(),
      type: chartType,
      title: title.trim(),
      source,
      metric,
      group_by: chartType === "kpi_card" ? null : groupBy,
      filters,
      size,
    })
    onOpenChange(false)
  }

  const selectClass =
    "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{widget ? "Modifier" : "Ajouter"} un widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du widget" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de graphique</Label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value as WidgetConfig["type"])} className={selectClass}>
                {CHART_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Source de donnees</Label>
              <select value={source} onChange={(e) => handleSourceChange(e.target.value as WidgetConfig["source"])} className={selectClass}>
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Metrique</Label>
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
                {(METRICS_BY_SOURCE[source] || []).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {chartType !== "kpi_card" && (
              <div className="space-y-1.5">
                <Label>Grouper par</Label>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={selectClass}>
                  {(GROUP_BY_OPTIONS[source] || []).map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                {DATE_RANGES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Taille</Label>
              <select value={size} onChange={(e) => setSize(e.target.value as WidgetConfig["size"])} className={selectClass}>
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/components/reports/ReportWidget.tsx frontend/components/reports/WidgetEditor.tsx
git commit -m "feat(frontend): add ReportWidget container and WidgetEditor dialog"
```

---

### Task 9: Frontend — Report list page (`/reports`)

**Files:**
- Create: `frontend/app/(app)/reports/page.tsx`

**Step 1: Create the reports list page**

Create `frontend/app/(app)/reports/page.tsx`:

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/lib/organization"
import { fetchReports, createReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import {
  Plus, Loader2, FileText, BarChart3, Users, ListTodo,
  PieChart, FileBarChart,
} from "lucide-react"
import type { Report } from "@/types"

const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  "Performance commerciale": BarChart3,
  "Pipeline": PieChart,
  "Activite equipe": ListTodo,
  "Contacts & Sources": Users,
  "Devis": FileBarChart,
}

export default function ReportsPage() {
  const router = useRouter()
  const { orgVersion } = useOrganization()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchReports()
      setReports(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { load() }, [load])

  const templates = reports.filter((r) => r.is_template)
  const custom = reports.filter((r) => !r.is_template)

  const handleCreate = async () => {
    try {
      const report = await createReport({
        name: "Nouveau rapport",
        widgets: [],
      })
      router.push(`/reports/${report.id}`)
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Rapports</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Analysez vos donnees avec des rapports personnalisables
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau rapport
        </Button>
      </div>

      {templates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((report) => {
              const Icon = TEMPLATE_ICONS[report.name] || FileText
              return (
                <button
                  key={report.id}
                  onClick={() => router.push(`/reports/${report.id}`)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/8 text-primary group-hover:bg-primary/12 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{report.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                        {report.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        {report.widgets.length} widget{report.widgets.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Mes rapports</h2>
        {custom.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun rapport personnalise</p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-[family-name:var(--font-body)]">
              Creez votre premier rapport ou utilisez un template
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {custom.map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(`/reports/${report.id}`)}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-sm font-medium">{report.name}</h3>
                {report.description && (
                  <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                    {report.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {report.widgets.length} widget{report.widgets.length !== 1 ? "s" : ""} · Modifie le{" "}
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(report.updated_at))}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/reports/page.tsx
git commit -m "feat(frontend): add reports list page with templates and custom reports"
```

---

### Task 10: Frontend — Report detail page (`/reports/[id]`)

**Files:**
- Create: `frontend/app/(app)/reports/[id]/page.tsx`

**Step 1: Create the report detail page**

Create `frontend/app/(app)/reports/[id]/page.tsx`:

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useOrganization } from "@/lib/organization"
import { fetchReport, updateReport, deleteReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, ArrowLeft, Trash2, Check, Pencil } from "lucide-react"
import type { Report, WidgetConfig } from "@/types"
import { ReportWidget } from "@/components/reports/ReportWidget"
import { WidgetEditor } from "@/components/reports/WidgetEditor"

const DATE_RANGES = [
  { value: "", label: "Toutes les periodes" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "last_12_months", label: "12 derniers mois" },
  { value: "this_year", label: "Cette annee" },
]

const SIZE_CLASSES: Record<string, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-2",
  large: "col-span-1 lg:col-span-3",
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { orgVersion } = useOrganization()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [globalDateRange, setGlobalDateRange] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchReport(params.id as string)
      setReport(data)
      setNameInput(data.name)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [params.id, orgVersion])

  useEffect(() => { load() }, [load])

  const saveWidgets = async (widgets: WidgetConfig[]) => {
    if (!report) return
    try {
      const updated = await updateReport(report.id, { widgets })
      setReport(updated)
    } catch {
      // silently fail
    }
  }

  const handleSaveName = async () => {
    if (!report || !nameInput.trim()) return
    try {
      const updated = await updateReport(report.id, { name: nameInput.trim() })
      setReport(updated)
      setEditingName(false)
    } catch {
      // silently fail
    }
  }

  const handleAddWidget = () => {
    setEditingWidget(null)
    setEditorOpen(true)
  }

  const handleEditWidget = (widget: WidgetConfig) => {
    setEditingWidget(widget)
    setEditorOpen(true)
  }

  const handleSaveWidget = (widget: WidgetConfig) => {
    if (!report) return
    const exists = report.widgets.find((w) => w.id === widget.id)
    const newWidgets = exists
      ? report.widgets.map((w) => (w.id === widget.id ? widget : w))
      : [...report.widgets, widget]
    saveWidgets(newWidgets)
  }

  const handleDuplicateWidget = (widget: WidgetConfig) => {
    if (!report) return
    const copy = { ...widget, id: crypto.randomUUID(), title: `${widget.title} (copie)` }
    saveWidgets([...report.widgets, copy])
  }

  const handleDeleteWidget = (widgetId: string) => {
    if (!report) return
    saveWidgets(report.widgets.filter((w) => w.id !== widgetId))
  }

  const handleDeleteReport = async () => {
    if (!report) return
    try {
      await deleteReport(report.id)
      router.push("/reports")
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 lg:p-12">
        <p className="text-muted-foreground">Rapport introuvable.</p>
      </div>
    )
  }

  const selectClass =
    "h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-9 text-lg font-medium w-64"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <Button size="icon" className="h-8 w-8" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => !report.is_template && setEditingName(true)}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-2xl tracking-tight">{report.name}</h1>
              {!report.is_template && (
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={globalDateRange}
            onChange={(e) => setGlobalDateRange(e.target.value)}
            className={selectClass}
          >
            {DATE_RANGES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleAddWidget}>
            <Plus className="h-3.5 w-3.5" />
            Widget
          </Button>
          {!report.is_template && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDeleteReport}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {report.widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun widget</p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-[family-name:var(--font-body)]">
            Ajoutez votre premier widget pour visualiser vos donnees
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={handleAddWidget}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un widget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {report.widgets.map((widget) => (
            <div key={widget.id} className={SIZE_CLASSES[widget.size] || "col-span-1"}>
              <ReportWidget
                widget={widget}
                globalDateRange={globalDateRange}
                onEdit={handleEditWidget}
                onDuplicate={handleDuplicateWidget}
                onDelete={handleDeleteWidget}
              />
            </div>
          ))}
        </div>
      )}

      <WidgetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/reports/\[id\]/page.tsx
git commit -m "feat(frontend): add report detail page with widget grid and editing"
```

---

### Task 11: Frontend — Add "Rapports" to sidebar navigation

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Add the navigation entry**

In `frontend/components/Sidebar.tsx`, add `FileBarChart` to the lucide-react import (line 10-33), then add the Rapports entry after Dashboard in the `navigation` array (line 44):

Add `FileBarChart` to the import:
```typescript
import {
  MessageSquare,
  Users,
  Kanban,
  CheckSquare,
  BarChart3,
  Workflow,
  ListFilter,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Check,
  ChevronsUpDown,
  Plus,
  FileBarChart,
} from "lucide-react"
```

Update the navigation array:
```typescript
const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Segments", href: "/segments", icon: ListFilter },
  { name: "Pipeline", href: "/deals", icon: Kanban },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Tâches", href: "/tasks", icon: CheckSquare },
  { name: "Workflows", href: "/workflows", icon: Workflow },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Rapports", href: "/reports", icon: FileBarChart },
]
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(frontend): add Rapports entry to sidebar navigation"
```

---

### Task 12: Full test suite + build verification

**Step 1: Run all backend report tests**

Run: `docker compose exec -T backend python manage.py test reports -v 2`
Expected: All tests PASS.

**Step 2: Run frontend build check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

**Step 3: Verify in browser**

1. Check sidebar — "Rapports" should appear between Dashboard and Settings
2. Click Rapports — should show templates section (5 templates) and empty custom section
3. Click a template (e.g. "Performance commerciale") — should show report with 3 widgets
4. Widgets should load data and display charts
5. Click "Widget" button — should open widget editor dialog
6. Configure a new widget and save — should appear in the grid
7. Click ... menu on a widget → Modifier, Dupliquer, Supprimer should all work
8. Click the report name → should allow inline editing
9. Change the global date range selector → widgets should reload
10. Create a new custom report from the list page → should redirect to detail page
11. Delete a custom report → should redirect back to list
