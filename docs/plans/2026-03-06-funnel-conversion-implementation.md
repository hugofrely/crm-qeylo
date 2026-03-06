# Funnel Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a conversion funnel visualization showing deal progression rates between pipeline stages, based on historical transition tracking.

**Architecture:** New `DealStageTransition` model to log every stage change. Dedicated `/api/reports/funnel/` endpoint computing conversion rates per stage. Custom SVG `FunnelChart` component on frontend. Available as dashboard widget (`funnel_chart`) and dedicated page (`/pipeline/funnel`).

**Tech Stack:** Django (models, views, management command), Django REST Framework, Recharts color palette, custom SVG, Next.js app router.

---

### Task 1: DealStageTransition model + migration

**Files:**
- Modify: `backend/deals/models.py:110` (after Deal class)
- Create: migration via `makemigrations`

**Step 1: Add DealStageTransition model**

Add after the `Deal` class (line 143) in `backend/deals/models.py`:

```python
class DealStageTransition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="transitions")
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deal_transitions",
    )
    from_stage = models.ForeignKey(
        PipelineStage, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    to_stage = models.ForeignKey(
        PipelineStage, on_delete=models.CASCADE, related_name="+"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    transitioned_at = models.DateTimeField(auto_now_add=True)
    duration_in_previous = models.DurationField(null=True, blank=True)

    class Meta:
        ordering = ["-transitioned_at"]
        indexes = [
            models.Index(fields=["organization", "to_stage", "transitioned_at"]),
            models.Index(fields=["deal", "transitioned_at"]),
        ]

    def __str__(self):
        from_name = self.from_stage.name if self.from_stage else "New"
        return f"{self.deal.name}: {from_name} -> {self.to_stage.name}"
```

**Step 2: Generate migration**

Run: `cd backend && python manage.py makemigrations deals`
Expected: new migration file created

**Step 3: Apply migration**

Run: `cd backend && python manage.py migrate`
Expected: migration applied successfully

**Step 4: Commit**

```bash
git add backend/deals/models.py backend/deals/migrations/
git commit -m "feat(deals): add DealStageTransition model"
```

---

### Task 2: Capture transitions on deal create/update

**Files:**
- Modify: `backend/deals/views.py:169-184` (DealViewSet)

**Step 1: Write tests**

Add to `backend/deals/tests.py` (or create if only skeleton exists). Add at the end:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class DealStageTransitionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "transition@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Test Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        from organizations.models import Membership
        self.membership = Membership.objects.get(user__email="transition@example.com")
        self.org = self.membership.organization
        from deals.models import PipelineStage
        self.stages = list(
            PipelineStage.objects.filter(pipeline__organization=self.org).order_by("order")
        )

    def test_create_deal_creates_initial_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 1", "amount": "1000", "stage": str(self.stages[0].id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        deal_id = response.data["id"]
        transitions = DealStageTransition.objects.filter(deal_id=deal_id)
        self.assertEqual(transitions.count(), 1)
        t = transitions.first()
        self.assertIsNone(t.from_stage)
        self.assertEqual(t.to_stage, self.stages[0])
        self.assertIsNone(t.duration_in_previous)

    def test_update_stage_creates_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 2", "amount": "2000", "stage": str(self.stages[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        self.client.patch(
            f"/api/deals/{deal_id}/",
            {"stage": str(self.stages[1].id)},
            format="json",
        )
        transitions = DealStageTransition.objects.filter(deal_id=deal_id).order_by("transitioned_at")
        self.assertEqual(transitions.count(), 2)
        second = transitions.last()
        self.assertEqual(second.from_stage, self.stages[0])
        self.assertEqual(second.to_stage, self.stages[1])
        self.assertIsNotNone(second.duration_in_previous)

    def test_update_without_stage_change_no_new_transition(self):
        from deals.models import DealStageTransition
        response = self.client.post(
            "/api/deals/",
            {"name": "Deal 3", "amount": "3000", "stage": str(self.stages[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        self.client.patch(
            f"/api/deals/{deal_id}/",
            {"name": "Deal 3 renamed"},
            format="json",
        )
        transitions = DealStageTransition.objects.filter(deal_id=deal_id)
        self.assertEqual(transitions.count(), 1)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test deals.tests.DealStageTransitionTests -v2`
Expected: FAIL (no transitions created yet)

**Step 3: Implement transition capture in DealViewSet**

Modify `backend/deals/views.py`. Update imports at top (line 7):

```python
from .models import Pipeline, PipelineStage, Deal, PIPELINE_TEMPLATES, DealStageTransition
```

Replace `perform_create` and add `perform_update` in `DealViewSet` (lines 180-184):

```python
    def perform_create(self, serializer):
        deal = serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )
        DealStageTransition.objects.create(
            deal=deal,
            organization=deal.organization,
            from_stage=None,
            to_stage=deal.stage,
            changed_by=self.request.user,
        )

    def perform_update(self, serializer):
        deal = self.get_object()
        old_stage = deal.stage
        updated_deal = serializer.save()
        if updated_deal.stage_id != old_stage.id:
            last_transition = (
                DealStageTransition.objects.filter(deal=deal)
                .order_by("-transitioned_at")
                .first()
            )
            duration = None
            if last_transition:
                from django.utils import timezone
                duration = timezone.now() - last_transition.transitioned_at
            DealStageTransition.objects.create(
                deal=updated_deal,
                organization=updated_deal.organization,
                from_stage=old_stage,
                to_stage=updated_deal.stage,
                changed_by=self.request.user,
                duration_in_previous=duration,
            )
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && python manage.py test deals.tests.DealStageTransitionTests -v2`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add backend/deals/views.py backend/deals/tests.py
git commit -m "feat(deals): capture stage transitions on deal create/update"
```

---

### Task 3: Backfill management command

**Files:**
- Create: `backend/deals/management/__init__.py`
- Create: `backend/deals/management/commands/__init__.py`
- Create: `backend/deals/management/commands/backfill_transitions.py`

**Step 1: Create directory structure and command**

Create `backend/deals/management/__init__.py` (empty).
Create `backend/deals/management/commands/__init__.py` (empty).
Create `backend/deals/management/commands/backfill_transitions.py`:

```python
from django.core.management.base import BaseCommand
from deals.models import Deal, DealStageTransition


class Command(BaseCommand):
    help = "Create initial transitions for existing deals that have none"

    def handle(self, *args, **options):
        deals_without = Deal.objects.exclude(
            id__in=DealStageTransition.objects.values_list("deal_id", flat=True)
        ).select_related("stage", "organization", "created_by")

        count = 0
        for deal in deals_without:
            DealStageTransition.objects.create(
                deal=deal,
                organization=deal.organization,
                from_stage=None,
                to_stage=deal.stage,
                changed_by=deal.created_by,
                transitioned_at=deal.created_at,
            )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"Created {count} initial transitions"))
```

**Step 2: Test the command manually**

Run: `cd backend && python manage.py backfill_transitions`
Expected: "Created N initial transitions"

Run again: `cd backend && python manage.py backfill_transitions`
Expected: "Created 0 initial transitions" (idempotent)

**Step 3: Commit**

```bash
git add backend/deals/management/
git commit -m "feat(deals): add backfill_transitions management command"
```

---

### Task 4: Funnel API endpoint

**Files:**
- Create: `backend/reports/funnel.py`
- Modify: `backend/reports/views.py`
- Modify: `backend/reports/urls.py`

**Step 1: Write tests**

Add to `backend/reports/tests.py` at the end:

```python
class FunnelTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "funnel@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
                "organization_name": "Funnel Org",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        from organizations.models import Membership
        from deals.models import Pipeline, PipelineStage
        self.membership = Membership.objects.get(user__email="funnel@example.com")
        self.org = self.membership.organization
        self.pipeline = Pipeline.objects.filter(organization=self.org).first()
        self.stages = list(self.pipeline.stages.order_by("order"))

    def _create_deal_and_advance(self, name, amount, stages_to_visit):
        """Create a deal and move it through the given stages in order."""
        response = self.client.post(
            "/api/deals/",
            {"name": name, "amount": str(amount), "stage": str(stages_to_visit[0].id)},
            format="json",
        )
        deal_id = response.data["id"]
        for stage in stages_to_visit[1:]:
            self.client.patch(
                f"/api/deals/{deal_id}/",
                {"stage": str(stage.id)},
                format="json",
            )
        return deal_id

    def test_funnel_basic(self):
        # 3 deals enter stage 0, 2 advance to stage 1, 1 advances to stage 2
        self._create_deal_and_advance("D1", 1000, self.stages[:3])
        self._create_deal_and_advance("D2", 2000, self.stages[:2])
        self._create_deal_and_advance("D3", 3000, [self.stages[0]])

        response = self.client.post(
            "/api/reports/funnel/",
            {"pipeline_id": str(self.pipeline.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data["pipeline"], self.pipeline.name)
        self.assertIn("stages", data)
        # First stage: 3 entered
        self.assertEqual(data["stages"][0]["entered"], 3)
        # Second stage: 2 entered
        self.assertEqual(data["stages"][1]["entered"], 2)
        # Third stage: 1 entered
        self.assertEqual(data["stages"][2]["entered"], 1)

    def test_funnel_requires_pipeline_id(self):
        response = self.client.post(
            "/api/reports/funnel/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_funnel_cohort_filter(self):
        self._create_deal_and_advance("D1", 1000, self.stages[:2])
        response = self.client.post(
            "/api/reports/funnel/",
            {
                "pipeline_id": str(self.pipeline.id),
                "filter_mode": "cohort",
                "date_range": "this_month",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["stages"][0]["entered"], 1)

    def test_funnel_activity_filter(self):
        self._create_deal_and_advance("D1", 1000, self.stages[:2])
        response = self.client.post(
            "/api/reports/funnel/",
            {
                "pipeline_id": str(self.pipeline.id),
                "filter_mode": "activity",
                "date_range": "this_month",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["stages"][0]["entered"], 1)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test reports.tests.FunnelTests -v2`
Expected: FAIL (endpoint does not exist)

**Step 3: Create funnel aggregation logic**

Create `backend/reports/funnel.py`:

```python
from datetime import timedelta
from django.db.models import Count, Avg, Sum, Q, F
from deals.models import Deal, DealStageTransition, PipelineStage, Pipeline
from .aggregation import _resolve_date_range


def compute_funnel(organization, pipeline_id, filter_mode=None,
                   date_range=None, date_from=None, date_to=None):
    try:
        pipeline = Pipeline.objects.get(id=pipeline_id, organization=organization)
    except Pipeline.DoesNotExist:
        return {"error": "Pipeline not found"}

    stages = list(pipeline.stages.order_by("order"))
    if not stages:
        return {"error": "Pipeline has no stages"}

    # Base queryset: all transitions for this org and pipeline
    qs = DealStageTransition.objects.filter(
        organization=organization,
        to_stage__pipeline=pipeline,
    )

    # Apply date filtering
    start, end = _resolve_date_range(date_range, date_from, date_to)

    if filter_mode == "cohort" and start and end:
        # Filter deals created in the date range
        deal_ids = Deal.objects.filter(
            organization=organization,
            stage__pipeline=pipeline,
            created_at__gte=start,
            created_at__lt=end,
        ).values_list("id", flat=True)
        # Include all deals that were ever in this pipeline
        deal_ids_in_pipeline = DealStageTransition.objects.filter(
            organization=organization,
            to_stage__pipeline=pipeline,
            deal__created_at__gte=start,
            deal__created_at__lt=end,
        ).values_list("deal_id", flat=True).distinct()
        qs = qs.filter(deal_id__in=deal_ids_in_pipeline)
    elif filter_mode == "activity" and start and end:
        # Filter transitions that happened in the date range
        qs = qs.filter(transitioned_at__gte=start, transitioned_at__lt=end)

    # Compute per-stage metrics
    result_stages = []
    stage_ids = [s.id for s in stages]

    for i, stage in enumerate(stages):
        # Deals that entered this stage
        entered = qs.filter(to_stage=stage).values("deal_id").distinct().count()

        # Deals that exited to the next stage
        exited_to_next = 0
        if i + 1 < len(stages):
            next_stage = stages[i + 1]
            exited_to_next = qs.filter(
                to_stage=next_stage,
                from_stage=stage,
            ).values("deal_id").distinct().count()

        # Conversion rate
        conversion_rate = round((exited_to_next / entered) * 100, 1) if entered > 0 else 0

        # Average duration in this stage
        avg_dur = qs.filter(
            from_stage=stage,
        ).exclude(duration_in_previous__isnull=True).aggregate(
            avg=Avg("duration_in_previous")
        )["avg"]

        avg_duration_iso = None
        if avg_dur:
            total_seconds = int(avg_dur.total_seconds())
            days = total_seconds // 86400
            hours = (total_seconds % 86400) // 3600
            avg_duration_iso = f"P{days}DT{hours}H"

        # Total amount of deals currently in this stage (from deals that entered)
        deal_ids_entered = list(
            qs.filter(to_stage=stage).values_list("deal_id", flat=True).distinct()
        )
        total_amount = float(
            Deal.objects.filter(id__in=deal_ids_entered).aggregate(
                total=Sum("amount")
            )["total"] or 0
        )

        result_stages.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "color": stage.color,
            "entered": entered,
            "exited_to_next": exited_to_next,
            "conversion_rate": conversion_rate,
            "avg_duration": avg_duration_iso,
            "total_amount": total_amount,
        })

    # Overall conversion: first stage entered vs last non-terminal stage
    total_entered = result_stages[0]["entered"] if result_stages else 0
    # Find "Gagne" or last stage
    won_stage = next(
        (s for s in result_stages if s["stage_name"] in ("Gagné", "Signé")),
        None,
    )
    total_won = won_stage["entered"] if won_stage else 0
    overall_conversion = round((total_won / total_entered) * 100, 1) if total_entered > 0 else 0

    return {
        "pipeline": pipeline.name,
        "stages": result_stages,
        "overall_conversion": overall_conversion,
        "total_entered": total_entered,
        "total_won": total_won,
    }
```

**Step 4: Add funnel view**

Add to `backend/reports/views.py` at the end:

```python
from .funnel import compute_funnel


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def funnel_view(request):
    data = request.data
    pipeline_id = data.get("pipeline_id")
    if not pipeline_id:
        return Response(
            {"detail": "pipeline_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = compute_funnel(
        organization=request.organization,
        pipeline_id=pipeline_id,
        filter_mode=data.get("filter_mode"),
        date_range=data.get("date_range"),
        date_from=data.get("date_from"),
        date_to=data.get("date_to"),
    )

    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)
```

**Step 5: Add URL route**

Modify `backend/reports/urls.py` to add the funnel route:

```python
urlpatterns = [
    path("aggregate/", views.aggregate_view),
    path("funnel/", views.funnel_view),
    path("", include(router.urls)),
]
```

**Step 6: Run tests to verify they pass**

Run: `cd backend && python manage.py test reports.tests.FunnelTests -v2`
Expected: all tests PASS

**Step 7: Commit**

```bash
git add backend/reports/funnel.py backend/reports/views.py backend/reports/urls.py backend/reports/tests.py
git commit -m "feat(reports): add funnel conversion API endpoint"
```

---

### Task 5: Frontend types and service

**Files:**
- Modify: `frontend/types/reports.ts`
- Modify: `frontend/services/reports.ts`

**Step 1: Add funnel types**

Add to end of `frontend/types/reports.ts`:

```typescript
export interface FunnelStage {
  stage_id: string
  stage_name: string
  color: string
  entered: number
  exited_to_next: number
  conversion_rate: number
  avg_duration: string | null
  total_amount: number
}

export interface FunnelRequest {
  pipeline_id: string
  filter_mode?: "cohort" | "activity"
  date_range?: string
  date_from?: string
  date_to?: string
}

export interface FunnelResponse {
  pipeline: string
  stages: FunnelStage[]
  overall_conversion: number
  total_entered: number
  total_won: number
}
```

**Step 2: Add fetch function**

Add to end of `frontend/services/reports.ts`:

```typescript
import type { FunnelRequest, FunnelResponse } from "@/types"

export async function fetchFunnel(
  request: FunnelRequest
): Promise<FunnelResponse> {
  return apiFetch<FunnelResponse>("/reports/funnel/", {
    method: "POST",
    json: request,
  })
}
```

Note: ensure `FunnelRequest`, `FunnelResponse`, and `FunnelStage` are re-exported from `frontend/types/index.ts` if a barrel file is used.

**Step 3: Commit**

```bash
git add frontend/types/reports.ts frontend/services/reports.ts
git commit -m "feat(frontend): add funnel types and API service"
```

---

### Task 6: FunnelChart SVG component

**Files:**
- Create: `frontend/components/reports/FunnelChart.tsx`

**Step 1: Create FunnelChart component**

Create `frontend/components/reports/FunnelChart.tsx`:

```tsx
"use client"

import type { FunnelStage } from "@/types"

interface FunnelChartProps {
  stages: FunnelStage[]
  compact?: boolean
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

function formatDuration(iso: string | null): string | null {
  if (!iso) return null
  const match = iso.match(/P(\d+)DT(\d+)H/)
  if (!match) return null
  const days = parseInt(match[1])
  const hours = parseInt(match[2])
  if (days > 0) return `~${days}j`
  return `~${hours}h`
}

export function FunnelChart({ stages, compact = false }: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Aucune donnee
      </div>
    )
  }

  const maxEntered = Math.max(...stages.map((s) => s.entered), 1)
  const stageHeight = compact ? 36 : 52
  const gapHeight = compact ? 20 : 32
  const totalHeight = stages.length * stageHeight + (stages.length - 1) * gapHeight
  const chartWidth = 500
  const labelLeftWidth = compact ? 100 : 140
  const barAreaWidth = chartWidth - labelLeftWidth - (compact ? 60 : 120)
  const minBarWidth = 40

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${totalHeight}`}
      className="w-full"
      style={{ maxHeight: compact ? 300 : undefined }}
    >
      {stages.map((stage, i) => {
        const y = i * (stageHeight + gapHeight)
        const widthRatio = maxEntered > 0 ? stage.entered / maxEntered : 0
        const barWidth = Math.max(widthRatio * barAreaWidth, minBarWidth)
        const barX = labelLeftWidth + (barAreaWidth - barWidth) / 2

        // Trapezoid: current bar connects to next bar
        const nextStage = stages[i + 1]
        const nextWidthRatio = nextStage
          ? Math.max(nextStage.entered / maxEntered, minBarWidth / barAreaWidth)
          : 0
        const nextBarWidth = nextStage
          ? Math.max(nextWidthRatio * barAreaWidth, minBarWidth)
          : 0

        const nextBarX = nextStage
          ? labelLeftWidth + (barAreaWidth - nextBarWidth) / 2
          : 0

        return (
          <g key={stage.stage_id}>
            {/* Trapezoid bar */}
            <polygon
              points={`${barX},${y} ${barX + barWidth},${y} ${barX + barWidth},${y + stageHeight} ${barX},${y + stageHeight}`}
              fill={stage.color}
              opacity={0.85}
              rx={4}
            />

            {/* Stage name (left) */}
            <text
              x={labelLeftWidth - 8}
              y={y + stageHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-foreground"
              fontSize={compact ? 11 : 13}
              fontWeight={500}
            >
              {stage.stage_name}
            </text>

            {/* Deal count (center of bar) */}
            <text
              x={barX + barWidth / 2}
              y={y + stageHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={compact ? 11 : 13}
              fontWeight={600}
            >
              {stage.entered}
            </text>

            {/* Right side info */}
            {!compact && (
              <>
                <text
                  x={barX + barWidth + 10}
                  y={y + stageHeight / 2 - 7}
                  className="fill-muted-foreground"
                  fontSize={11}
                  dominantBaseline="central"
                >
                  {formatValue(stage.total_amount)} EUR
                </text>
                {stage.avg_duration && (
                  <text
                    x={barX + barWidth + 10}
                    y={y + stageHeight / 2 + 9}
                    className="fill-muted-foreground"
                    fontSize={10}
                    dominantBaseline="central"
                  >
                    {formatDuration(stage.avg_duration)}
                  </text>
                )}
              </>
            )}

            {/* Conversion arrow between stages */}
            {nextStage && (
              <g>
                {/* Connector trapezoid shape */}
                <polygon
                  points={`${barX},${y + stageHeight} ${barX + barWidth},${y + stageHeight} ${nextBarX + nextBarWidth},${y + stageHeight + gapHeight} ${nextBarX},${y + stageHeight + gapHeight}`}
                  fill={stage.color}
                  opacity={0.15}
                />
                {/* Conversion rate label */}
                <text
                  x={labelLeftWidth + barAreaWidth / 2}
                  y={y + stageHeight + gapHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-muted-foreground"
                  fontSize={11}
                  fontWeight={500}
                >
                  {stage.conversion_rate}%
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/reports/FunnelChart.tsx
git commit -m "feat(frontend): add FunnelChart SVG component"
```

---

### Task 7: Funnel dashboard widget

**Files:**
- Modify: `frontend/types/reports.ts:3` (WidgetConfig type union)
- Modify: `frontend/components/reports/WidgetChart.tsx`
- Modify: `frontend/components/reports/WidgetEditor.tsx`

**Step 1: Update WidgetConfig type**

In `frontend/types/reports.ts` line 3, add `"funnel_chart"` to the type union:

```typescript
type: "line_chart" | "bar_chart" | "pie_chart" | "kpi_card" | "table" | "funnel_chart"
```

**Step 2: Add funnel rendering in WidgetChart**

Add imports at the top of `frontend/components/reports/WidgetChart.tsx`:

```typescript
import { FunnelChart } from "./FunnelChart"
import { fetchFunnel } from "@/services/reports"
import type { FunnelResponse } from "@/types"
```

Add a new state and effect branch for funnel. Before the existing `if (widget.type === "kpi_card")` block (line 92), add:

```tsx
  const [funnelData, setFunnelData] = useState<FunnelResponse | null>(null)

  useEffect(() => {
    if (widget.type !== "funnel_chart") return
    const loadFunnel = async () => {
      setLoading(true)
      try {
        const pipelineId = widget.filters?.pipeline_id as string
        if (!pipelineId) return
        const result = await fetchFunnel({
          pipeline_id: pipelineId,
          filter_mode: (widget.filters?.filter_mode as "cohort" | "activity") || undefined,
          date_range: (widget.filters?.date_range as string) || undefined,
        })
        setFunnelData(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    loadFunnel()
  }, [widget.type, JSON.stringify(widget.filters)])

  if (widget.type === "funnel_chart") {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )
    }
    if (!funnelData || funnelData.stages.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Aucune donnee
        </div>
      )
    }
    return (
      <div>
        <FunnelChart stages={funnelData.stages} compact />
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            Conversion globale: <span className="font-medium text-foreground">{funnelData.overall_conversion}%</span>
          </span>
        </div>
      </div>
    )
  }
```

Also update the existing `useEffect` (line 42) to skip for funnel_chart:

Add at the start of the `load` function body: `if (widget.type === "funnel_chart") return`

**Step 3: Add funnel option in WidgetEditor**

In `frontend/components/reports/WidgetEditor.tsx`, add to `CHART_TYPES` array (line 28):

```typescript
  { value: "funnel_chart", label: "Entonnoir" },
```

When `funnel_chart` is selected, the editor needs to show a pipeline selector instead of source/metric/groupBy. Add a state for pipeline and conditionally render. After the `handleSourceChange` function (line 136), add pipeline-specific logic:

```typescript
  const [pipelineId, setPipelineId] = useState("")
  const [filterMode, setFilterMode] = useState<string>("")
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (chartType === "funnel_chart") {
      import("@/services/deals").then((mod) => {
        mod.fetchPipelines().then(setPipelines)
      })
    }
  }, [chartType])

  useEffect(() => {
    if (open && widget && widget.type === "funnel_chart") {
      setPipelineId((widget.filters?.pipeline_id as string) || "")
      setFilterMode((widget.filters?.filter_mode as string) || "")
    }
  }, [open, widget])
```

Update `handleSave` to handle funnel:

```typescript
  const handleSave = () => {
    if (!title.trim()) return
    const filters: Record<string, unknown> = {}
    if (dateRange) filters.date_range = dateRange

    if (chartType === "funnel_chart") {
      if (pipelineId) filters.pipeline_id = pipelineId
      if (filterMode) filters.filter_mode = filterMode
      onSave({
        id: widget?.id || crypto.randomUUID(),
        type: "funnel_chart",
        title: title.trim(),
        source: "deals",
        metric: "count",
        group_by: null,
        filters,
        size: "large",
      })
      onOpenChange(false)
      return
    }

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
```

In the JSX, conditionally show pipeline/filterMode selects when `chartType === "funnel_chart"`. Replace the source/metric/groupBy grid section (lines 170-210) with a conditional:

```tsx
          {chartType === "funnel_chart" ? (
            <>
              <div className="space-y-1.5">
                <Label>Pipeline</Label>
                <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
                  <option value="">Selectionner...</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode de filtre</Label>
                  <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={selectClass}>
                    <option value="">Tous</option>
                    <option value="cohort">Cohorte</option>
                    <option value="activity">Activite</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Periode</Label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    {DATE_RANGES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* existing source/metric/groupBy grids unchanged */
          )}
```

**Step 4: Verify fetchPipelines exists in services**

Check that `frontend/services/deals.ts` exports a `fetchPipelines` function. If not, add:

```typescript
export async function fetchPipelines(): Promise<{ id: string; name: string }[]> {
  return apiFetch("/pipelines/")
}
```

**Step 5: Commit**

```bash
git add frontend/types/reports.ts frontend/components/reports/WidgetChart.tsx frontend/components/reports/WidgetEditor.tsx frontend/services/deals.ts
git commit -m "feat(frontend): add funnel_chart widget type to dashboard"
```

---

### Task 8: Dedicated funnel page

**Files:**
- Create: `frontend/app/(app)/pipeline/funnel/page.tsx`
- Modify: `frontend/components/Sidebar.tsx` (add navigation link)

**Step 1: Create the funnel page**

Create `frontend/app/(app)/pipeline/funnel/page.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { fetchFunnel } from "@/services/reports"
import { fetchPipelines } from "@/services/deals"
import { FunnelChart } from "@/components/reports/FunnelChart"
import type { FunnelResponse } from "@/types"

const DATE_RANGES = [
  { value: "", label: "Toutes les periodes" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "this_year", label: "Cette annee" },
]

export default function FunnelPage() {
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [pipelineId, setPipelineId] = useState("")
  const [filterMode, setFilterMode] = useState<"" | "cohort" | "activity">("")
  const [dateRange, setDateRange] = useState("")
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPipelines().then((p) => {
      setPipelines(p)
      if (p.length > 0) setPipelineId(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (!pipelineId) return
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchFunnel({
          pipeline_id: pipelineId,
          filter_mode: filterMode || undefined,
          date_range: dateRange || undefined,
        })
        setData(result)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [pipelineId, filterMode, dateRange])

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl tracking-tight">Entonnoir de conversion</h1>
        {data && (
          <div className="text-right">
            <div className="text-3xl font-light tracking-tight">{data.overall_conversion}%</div>
            <div className="text-xs text-muted-foreground">Conversion globale</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as "" | "cohort" | "activity")} className={selectClass}>
          <option value="">Tous les deals</option>
          <option value="cohort">Par cohorte d'entree</option>
          <option value="activity">Par activite</option>
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
          {DATE_RANGES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-border bg-card p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : data ? (
          <FunnelChart stages={data.stages} />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Selectionnez un pipeline
          </div>
        )}
      </div>

      {/* Summary table */}
      {data && data.stages.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Etape</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Entres</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Sortis vers suivant</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Conversion</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Duree moy.</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Montant</th>
              </tr>
            </thead>
            <tbody>
              {data.stages.map((stage) => (
                <tr key={stage.stage_id} className="border-b last:border-0">
                  <td className="py-3 px-4 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.stage_name}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">{stage.entered}</td>
                  <td className="py-3 px-4 text-right">{stage.exited_to_next}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={stage.conversion_rate >= 50 ? "text-emerald-600" : stage.conversion_rate >= 25 ? "text-amber-600" : "text-red-600"}>
                      {stage.conversion_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {stage.avg_duration ? formatDurationTable(stage.avg_duration) : "-"}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {stage.total_amount.toLocaleString("fr-FR")} EUR
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatDurationTable(iso: string): string {
  const match = iso.match(/P(\d+)DT(\d+)H/)
  if (!match) return iso
  const days = parseInt(match[1])
  const hours = parseInt(match[2])
  if (days > 0) return `${days}j ${hours}h`
  return `${hours}h`
}
```

**Step 2: Add sidebar link**

In `frontend/components/Sidebar.tsx`, add the funnel link after the existing Pipeline entry. Import `Filter` (or `GitBranch`) icon from lucide-react and add:

```typescript
  { name: "Entonnoir", href: "/pipeline/funnel", icon: Filter },
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/pipeline/funnel/page.tsx frontend/components/Sidebar.tsx
git commit -m "feat(frontend): add dedicated funnel page with filters and summary table"
```

---

### Task 9: Run all tests and verify

**Step 1: Run backend tests**

Run: `cd backend && python manage.py test -v2`
Expected: all tests pass

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: build succeeds without errors

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address test and build issues for funnel feature"
```
