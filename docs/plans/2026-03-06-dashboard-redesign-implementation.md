# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static 4-metric dashboard with a configurable, widget-based dashboard featuring temporal charts and KPI cards with period-over-period comparison deltas.

**Architecture:** Dashboard = a special Report. Add `is_dashboard` + `user` fields to the Report model. Extend the aggregation engine with comparison mode (`compare: true`) and new date ranges (`today`, `this_week`). Rewrite the frontend dashboard page to render widgets from the report, reusing existing report components.

**Tech Stack:** Django REST Framework, Recharts, Next.js, TypeScript, Tailwind CSS

---

### Task 1: Add `is_dashboard` and `user` fields to Report model

**Files:**
- Modify: `backend/reports/models.py`
- Modify: `backend/reports/serializers.py`

**Step 1: Add fields to Report model**

In `backend/reports/models.py`, add two fields to the `Report` model:

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
    is_dashboard = models.BooleanField(default=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dashboards",
    )
    widgets = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name
```

**Step 2: Update serializer to include new fields**

In `backend/reports/serializers.py`, add `is_dashboard` to fields and read_only_fields:

```python
from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "name", "description", "is_template", "is_dashboard",
            "widgets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_template", "is_dashboard", "created_at", "updated_at"]
```

**Step 3: Create and run migration**

Run:
```bash
docker compose exec backend python manage.py makemigrations reports
docker compose exec backend python manage.py migrate
```

**Step 4: Commit**

```bash
git add backend/reports/models.py backend/reports/serializers.py backend/reports/migrations/
git commit -m "feat(reports): add is_dashboard and user fields to Report model"
```

---

### Task 2: Add `today` and `this_week` date ranges + comparison mode to aggregation engine

**Files:**
- Modify: `backend/reports/aggregation.py`

**Step 1: Add `today` and `this_week` to `_resolve_date_range()`**

In `backend/reports/aggregation.py`, add these two cases at the top of `_resolve_date_range()`, before `this_month`:

```python
def _resolve_date_range(date_range, date_from=None, date_to=None):
    now = timezone.now()
    if date_range == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        return start, end
    elif date_range == "yesterday":
        end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=1)
        return start, end
    elif date_range == "this_week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
        return start, end
    elif date_range == "last_week":
        this_week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = this_week_start
        start = end - timedelta(days=7)
        return start, end
    elif date_range == "this_month":
        # ... existing code
```

Note: `yesterday` and `last_week` are needed internally for comparison mode.

**Step 2: Add comparison period mapping and update `aggregate()`**

Add a `COMPARISON_PERIODS` dict and a `compare` parameter to `aggregate()`:

```python
COMPARISON_PERIODS = {
    "today": "yesterday",
    "this_week": "last_week",
    "this_month": "last_month",
    "last_3_months": "last_6_months",  # compare 3 months to the 3 months before
    "this_year": "last_12_months",
}
```

Update the `aggregate()` function signature to add `compare=False`:

```python
def aggregate(organization, source, metric, group_by, date_field=None,
              date_range=None, date_from=None, date_to=None, filters=None,
              compare=False):
```

At the end of `aggregate()`, after the existing `return {"data": data, "total": total}`, add comparison logic:

```python
    total = sum(d["value"] for d in data)
    result = {"data": data, "total": total}

    if compare and date_range in COMPARISON_PERIODS:
        prev_range = COMPARISON_PERIODS[date_range]
        prev_result = aggregate(
            organization=organization, source=source, metric=metric,
            group_by=group_by, date_field=date_field,
            date_range=prev_range, filters=filters, compare=False,
        )
        prev_total = prev_result.get("total", 0)
        result["previous_total"] = prev_total
        if prev_total > 0:
            result["delta_percent"] = round(((total - prev_total) / prev_total) * 100, 1)
        else:
            result["delta_percent"] = 100.0 if total > 0 else 0.0

    return result
```

Note: For `last_3_months` comparison, we use `last_6_months` data as a rough approximation of "the 3 months before the last 3 months". This is intentionally simple — the point is to show a trend, not be perfectly precise.

**Step 3: Update `aggregate_view` to pass `compare` parameter**

In `backend/reports/views.py`, update the `aggregate_view` function to pass `compare`:

```python
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
        compare=data.get("compare", False),
    )
```

**Step 4: Commit**

```bash
git add backend/reports/aggregation.py backend/reports/views.py
git commit -m "feat(reports): add today/this_week date ranges and comparison mode"
```

---

### Task 3: Replace dashboard endpoint with get-or-create dashboard view

**Files:**
- Modify: `backend/dashboard/views.py`
- Modify: `backend/dashboard/urls.py`

**Step 1: Define default dashboard widgets**

In `backend/dashboard/views.py`, replace the entire file with:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from reports.models import Report
from reports.serializers import ReportSerializer

DEFAULT_DASHBOARD_WIDGETS = [
    {
        "id": "default-contacts-today",
        "type": "kpi_card",
        "title": "Contacts aujourd'hui",
        "source": "contacts",
        "metric": "count",
        "group_by": None,
        "filters": {"date_range": "today"},
        "size": "small",
    },
    {
        "id": "default-revenue-month",
        "type": "kpi_card",
        "title": "Revenu ce mois",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": None,
        "filters": {"date_range": "this_month", "date_field": "closed_at", "stage__name__in": ["Gagné"]},
        "size": "small",
    },
    {
        "id": "default-pipeline",
        "type": "kpi_card",
        "title": "Pipeline actif",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": None,
        "filters": {},
        "size": "small",
    },
    {
        "id": "default-tasks-today",
        "type": "kpi_card",
        "title": "Taches du jour",
        "source": "tasks",
        "metric": "count",
        "group_by": None,
        "filters": {"date_range": "today", "date_field": "due_date", "is_done": False},
        "size": "small",
    },
    {
        "id": "default-revenue-trend",
        "type": "line_chart",
        "title": "CA mensuel",
        "source": "deals",
        "metric": "sum:amount",
        "group_by": "month",
        "filters": {"date_range": "last_6_months", "date_field": "closed_at", "stage__name__in": ["Gagné"]},
        "size": "medium",
    },
    {
        "id": "default-contacts-trend",
        "type": "bar_chart",
        "title": "Nouveaux contacts",
        "source": "contacts",
        "metric": "count",
        "group_by": "week",
        "filters": {"date_range": "last_3_months"},
        "size": "medium",
    },
    {
        "id": "default-deals-won",
        "type": "bar_chart",
        "title": "Deals gagnes / mois",
        "source": "deals",
        "metric": "count",
        "group_by": "month",
        "filters": {"date_range": "last_6_months", "date_field": "closed_at", "stage__name__in": ["Gagné"]},
        "size": "small",
    },
    {
        "id": "default-deals-by-stage",
        "type": "bar_chart",
        "title": "Deals par etape",
        "source": "deals",
        "metric": "count",
        "group_by": "stage",
        "filters": {},
        "size": "large",
    },
]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    org = request.organization
    user = request.user

    dashboard = Report.objects.filter(
        organization=org, user=user, is_dashboard=True
    ).first()

    if not dashboard:
        dashboard = Report.objects.create(
            organization=org,
            created_by=user,
            user=user,
            name="Mon tableau de bord",
            is_dashboard=True,
            widgets=DEFAULT_DASHBOARD_WIDGETS,
        )

    serializer = ReportSerializer(dashboard)
    return Response(serializer.data)
```

**Step 2: Update URL routing**

In `backend/dashboard/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [path("", views.dashboard_view)]
```

**Step 3: Commit**

```bash
git add backend/dashboard/views.py backend/dashboard/urls.py
git commit -m "feat(dashboard): replace static stats with get-or-create dashboard report"
```

---

### Task 4: Backend tests for new features

**Files:**
- Modify: `backend/reports/tests.py`

**Step 1: Add tests for new date ranges, comparison mode, and dashboard endpoint**

Append these tests to `backend/reports/tests.py`, inside the `ReportTests` class:

```python
    def test_aggregate_with_today_date_range(self):
        self.client.post("/api/contacts/", {"first_name": "Today", "last_name": "Contact", "source": "website"}, format="json")
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "group_by": None, "date_range": "today"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total"], 1)

    def test_aggregate_with_this_week_date_range(self):
        self.client.post("/api/contacts/", {"first_name": "Week", "last_name": "Contact", "source": "website"}, format="json")
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "group_by": None, "date_range": "this_week"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["total"], 1)

    def test_aggregate_with_compare(self):
        self.client.post("/api/contacts/", {"first_name": "A", "last_name": "B", "source": "website"}, format="json")
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "group_by": None, "date_range": "this_month", "compare": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("previous_total", response.data)
        self.assertIn("delta_percent", response.data)

    def test_aggregate_without_compare_has_no_delta(self):
        response = self.client.post(
            "/api/reports/aggregate/",
            {"source": "contacts", "metric": "count", "group_by": None, "date_range": "this_month"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("previous_total", response.data)

    def test_dashboard_auto_creates(self):
        response = self.client.get("/api/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_dashboard"])
        self.assertEqual(len(response.data["widgets"]), 8)

    def test_dashboard_returns_same_on_second_call(self):
        response1 = self.client.get("/api/dashboard/")
        response2 = self.client.get("/api/dashboard/")
        self.assertEqual(response1.data["id"], response2.data["id"])
```

**Step 2: Run the tests**

```bash
docker compose exec -T backend python manage.py test reports -v 2
```

Expected: All 18 tests pass (12 existing + 6 new).

**Step 3: Commit**

```bash
git add backend/reports/tests.py
git commit -m "test(reports): add tests for date ranges, comparison mode, and dashboard"
```

---

### Task 5: Update frontend types and services for comparison mode

**Files:**
- Modify: `frontend/types/reports.ts`
- Modify: `frontend/services/dashboard.ts`

**Step 1: Update `AggregateRequest` and `AggregateResponse` types**

In `frontend/types/reports.ts`, add `compare` to request and `previous_total`/`delta_percent` to response:

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
  is_dashboard: boolean
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
  compare?: boolean
}

export interface AggregateDataPoint {
  label: string
  value: number
}

export interface AggregateResponse {
  data: AggregateDataPoint[]
  total: number
  previous_total?: number
  delta_percent?: number
}
```

**Step 2: Update dashboard service to fetch dashboard report**

Replace `frontend/services/dashboard.ts` with:

```typescript
import { apiFetch } from "@/lib/api"
import type { Report } from "@/types"

export async function fetchDashboard(): Promise<Report> {
  return apiFetch<Report>("/dashboard/")
}
```

Note: The old `fetchDashboardStats` function and `DashboardStats` type will no longer be used. We'll remove the old type in the next step.

**Step 3: Commit**

```bash
git add frontend/types/reports.ts frontend/services/dashboard.ts
git commit -m "feat(frontend): update types and services for comparison mode and dashboard report"
```

---

### Task 6: Enhance KPI card in WidgetChart with comparison delta

**Files:**
- Modify: `frontend/components/reports/WidgetChart.tsx`

**Step 1: Update WidgetChart to show comparison delta on KPI cards**

In `frontend/components/reports/WidgetChart.tsx`, update the `WidgetChartProps` interface and the `kpi_card` rendering section.

Add `compare` prop:

```typescript
interface WidgetChartProps {
  widget: WidgetConfig
  globalDateRange?: string
  compare?: boolean
}
```

Update the `useEffect` to pass `compare` in the fetch:

```typescript
export function WidgetChart({ widget, globalDateRange, compare }: WidgetChartProps) {
```

In the `useEffect`, update the `fetchAggregate` call:

```typescript
        const result = await fetchAggregate({
          source: widget.source,
          metric: widget.metric,
          group_by: widget.group_by,
          date_field: filters.date_field as string | undefined,
          date_range: filters.date_range as string | undefined,
          filters,
          compare,
        })
```

Add `compare` to the useEffect dependencies:

```typescript
  }, [widget.source, widget.metric, widget.group_by, JSON.stringify(widget.filters), globalDateRange, compare])
```

Replace the `kpi_card` rendering block with:

```typescript
  if (widget.type === "kpi_card") {
    const hasDelta = data.delta_percent !== undefined && data.delta_percent !== null
    const deltaPositive = (data.delta_percent ?? 0) >= 0

    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <span className="text-4xl font-light tracking-tight">
          {formatValue(data.total)}
        </span>
        {hasDelta && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                deltaPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {deltaPositive ? "\u2191" : "\u2193"}
              {Math.abs(data.delta_percent ?? 0)}%
            </span>
          </div>
        )}
      </div>
    )
  }
```

**Step 2: Commit**

```bash
git add frontend/components/reports/WidgetChart.tsx
git commit -m "feat(frontend): enhance KPI card with comparison delta display"
```

---

### Task 7: Rewrite dashboard page

**Files:**
- Modify: `frontend/app/(app)/dashboard/page.tsx`

**Step 1: Replace the entire dashboard page**

Replace `frontend/app/(app)/dashboard/page.tsx` with:

```typescript
"use client"

import { useEffect, useState, useCallback } from "react"
import { useOrganization } from "@/lib/organization"
import { fetchDashboard } from "@/services/dashboard"
import { updateReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Settings2 } from "lucide-react"
import type { Report, WidgetConfig } from "@/types"
import { ReportWidget } from "@/components/reports/ReportWidget"
import { WidgetEditor } from "@/components/reports/WidgetEditor"

const SIZE_CLASSES: Record<string, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-2",
  large: "col-span-1 lg:col-span-3",
}

export default function DashboardPage() {
  const { orgVersion } = useOrganization()
  const [dashboard, setDashboard] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchDashboard()
      setDashboard(data)
    } catch (err) {
      console.error("Failed to fetch dashboard:", err)
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => {
    load()
  }, [load])

  const saveWidgets = async (widgets: WidgetConfig[]) => {
    if (!dashboard) return
    try {
      const updated = await updateReport(dashboard.id, { widgets })
      setDashboard(updated)
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
    if (!dashboard) return
    const exists = dashboard.widgets.find((w) => w.id === widget.id)
    const newWidgets = exists
      ? dashboard.widgets.map((w) => (w.id === widget.id ? widget : w))
      : [...dashboard.widgets, widget]
    saveWidgets(newWidgets)
  }

  const handleDuplicateWidget = (widget: WidgetConfig) => {
    if (!dashboard) return
    const copy = { ...widget, id: crypto.randomUUID(), title: `${widget.title} (copie)` }
    saveWidgets([...dashboard.widgets, copy])
  }

  const handleDeleteWidget = (widgetId: string) => {
    if (!dashboard) return
    saveWidgets(dashboard.widgets.filter((w) => w.id !== widgetId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Impossible de charger le tableau de bord.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Vue d&apos;ensemble de votre activite
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleAddWidget}>
              <Plus className="h-3.5 w-3.5" />
              Widget
            </Button>
          )}
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setEditing(!editing)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {editing ? "Terminer" : "Personnaliser"}
          </Button>
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboard.widgets.map((widget) => (
          <div key={widget.id} className={SIZE_CLASSES[widget.size] || "col-span-1"}>
            {editing ? (
              <ReportWidget
                widget={widget}
                compare={widget.type === "kpi_card"}
                onEdit={handleEditWidget}
                onDuplicate={handleDuplicateWidget}
                onDelete={handleDeleteWidget}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
                    {widget.title}
                  </h3>
                </div>
                <div className="p-4">
                  <WidgetChart widget={widget} compare={widget.type === "kpi_card"} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <WidgetEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          widget={editingWidget}
          onSave={handleSaveWidget}
        />
      )}
    </div>
  )
}
```

Note: This file imports `WidgetChart` directly — add this import at the top:

```typescript
import { WidgetChart } from "@/components/reports/WidgetChart"
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/dashboard/page.tsx
git commit -m "feat(frontend): rewrite dashboard page with configurable widgets"
```

---

### Task 8: Update ReportWidget to support `compare` prop

**Files:**
- Modify: `frontend/components/reports/ReportWidget.tsx`

**Step 1: Pass `compare` prop through to WidgetChart**

In `frontend/components/reports/ReportWidget.tsx`, add `compare` to the interface and pass it to `WidgetChart`:

```typescript
interface ReportWidgetProps {
  widget: WidgetConfig
  globalDateRange?: string
  compare?: boolean
  onEdit: (widget: WidgetConfig) => void
  onDuplicate: (widget: WidgetConfig) => void
  onDelete: (widgetId: string) => void
}

export function ReportWidget({
  widget,
  globalDateRange,
  compare,
  onEdit,
  onDuplicate,
  onDelete,
}: ReportWidgetProps) {
```

And update the WidgetChart usage:

```typescript
        <WidgetChart widget={widget} globalDateRange={globalDateRange} compare={compare} />
```

**Step 2: Commit**

```bash
git add frontend/components/reports/ReportWidget.tsx
git commit -m "feat(frontend): pass compare prop through ReportWidget to WidgetChart"
```

---

### Task 9: Update WidgetEditor with new date range options (today, this_week)

**Files:**
- Modify: `frontend/components/reports/WidgetEditor.tsx`

**Step 1: Add `today` and `this_week` to the DATE_RANGES array**

In `frontend/components/reports/WidgetEditor.tsx`, update the `DATE_RANGES` constant:

```typescript
const DATE_RANGES = [
  { value: "", label: "Pas de filtre" },
  { value: "today", label: "Aujourd'hui" },
  { value: "this_week", label: "Cette semaine" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "last_12_months", label: "12 derniers mois" },
  { value: "this_year", label: "Cette annee" },
]
```

**Step 2: Commit**

```bash
git add frontend/components/reports/WidgetEditor.tsx
git commit -m "feat(frontend): add today and this_week options to WidgetEditor"
```

---

### Task 10: Clean up old dashboard types and StatCard

**Files:**
- Modify: `frontend/types/dashboard.ts` (if it exists — check and remove `DashboardStats` type)
- Delete: `frontend/components/dashboard/StatCard.tsx` (no longer used)

**Step 1: Check what's in `frontend/types/dashboard.ts`**

Read the file. If it only contains `DashboardStats`, remove the type or leave the file empty. If it exports other types, only remove `DashboardStats`.

**Step 2: Check if `StatCard` is used anywhere else**

Search for `StatCard` imports. If it's only used by the old dashboard page (which we've now rewritten), delete `frontend/components/dashboard/StatCard.tsx`.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused DashboardStats type and StatCard component"
```

---

### Task 11: Full test suite + build verification

**Step 1: Run backend tests**

```bash
docker compose exec -T backend python manage.py test reports -v 2
```

Expected: All 18 tests pass.

**Step 2: Run frontend TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Visual verification checklist**

1. Go to `/dashboard` — should see 8 widgets (4 KPI cards + 4 charts)
2. KPI cards show delta badges (may show +100% if no historical data)
3. Line chart shows CA mensuel over 6 months
4. Bar chart shows new contacts by week
5. Click "Personnaliser" — widgets become editable with dropdown menus
6. Add a new widget, verify it appears
7. Delete a widget, verify it's removed
8. Refresh the page — customizations persist
9. Go to `/reports` — dashboard should NOT appear in reports list
10. Check mobile responsive layout

**Step 4: Commit everything and push**

```bash
git add -A
git commit -m "feat: configurable dashboard with temporal charts and KPI comparison"
git push
```
