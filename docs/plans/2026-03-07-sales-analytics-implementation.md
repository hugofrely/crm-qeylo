# Sales Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 sales analytics features: revenue forecasting, win/loss analysis, deal velocity, monthly quotas, team leaderboard, and hybrid next best action suggestions.

**Architecture:** 2 new models (`DealLossReason`, `SalesQuota`), new fields on `Deal` and `PipelineStage`, 6 new API endpoints under `/api/deals/`, 3 quota endpoints under `/api/quotas/`, 6 new dashboard widget types, 6 new AI chat tools, and a loss capture modal on the Kanban board.

**Tech Stack:** Django 5 + DRF (backend), Next.js 16 + shadcn/ui + Tailwind CSS 4 + Recharts (frontend), Pydantic AI (chat tools)

---

## Task 1: Add `is_won` / `is_lost` fields to PipelineStage + migration

**Files:**
- Modify: `backend/deals/models.py:88-103`
- Modify: `backend/deals/serializers.py:15-19`

**Step 1: Add fields to PipelineStage model**

In `backend/deals/models.py`, add two fields to `PipelineStage` after line 97 (`color`):

```python
class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name="stages",
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default="#6366F1")
    is_won = models.BooleanField(default=False)
    is_lost = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        Pipeline.create_defaults(organization)
```

**Step 2: Update DEFAULT_STAGES and PIPELINE_TEMPLATES**

Add `is_won` and `is_lost` to stage definitions in `models.py`. Update `DEFAULT_STAGES` (line 6):

```python
DEFAULT_STAGES = [
    {"name": "Premier contact", "color": "#6366F1", "order": 1},
    {"name": "En discussion", "color": "#F59E0B", "order": 2},
    {"name": "Devis envoyé", "color": "#3B82F6", "order": 3},
    {"name": "Négociation", "color": "#8B5CF6", "order": 4},
    {"name": "Gagné", "color": "#10B981", "order": 5, "is_won": True},
    {"name": "Perdu", "color": "#EF4444", "order": 6, "is_lost": True},
]
```

Similarly update all templates in `PIPELINE_TEMPLATES`: add `"is_won": True` to "Gagné"/"Signé" stages and `"is_lost": True` to "Perdu"/"Abandonné" stages.

**Step 3: Update PipelineStageSerializer**

In `backend/deals/serializers.py` line 15-19, add the new fields:

```python
class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color", "pipeline", "is_won", "is_lost"]
        read_only_fields = ["id"]
```

**Step 4: Create and run migration**

```bash
cd backend && python manage.py makemigrations deals -n add_stage_is_won_is_lost
```

**Step 5: Write data migration to set is_won/is_lost on existing stages**

Create `backend/deals/migrations/XXXX_set_existing_stage_flags.py`:

```python
from django.db import migrations


def set_stage_flags(apps, schema_editor):
    PipelineStage = apps.get_model("deals", "PipelineStage")
    PipelineStage.objects.filter(name__in=["Gagné", "Signé"]).update(is_won=True)
    PipelineStage.objects.filter(name__in=["Perdu", "Abandonné"]).update(is_lost=True)


class Migration(migrations.Migration):
    dependencies = [
        ("deals", "PREV_MIGRATION"),  # Replace with actual previous migration name
    ]

    operations = [
        migrations.RunPython(set_stage_flags, migrations.RunPython.noop),
    ]
```

**Step 6: Run migrations**

```bash
python manage.py migrate
```

**Step 7: Update frontend Stage type**

In `frontend/types/deals.ts` line 25-31, add:

```typescript
export interface Stage {
  id: string
  name: string
  order: number
  color: string
  pipeline?: string
  is_won?: boolean
  is_lost?: boolean
}
```

**Step 8: Run tests**

```bash
cd backend && python manage.py test deals
```

**Step 9: Commit**

```bash
git add -A && git commit -m "feat(deals): add is_won/is_lost flags to PipelineStage"
```

---

## Task 2: Add loss fields to Deal model + DealLossReason model

**Files:**
- Modify: `backend/deals/models.py:110-164` (Deal model)
- Modify: `backend/deals/serializers.py:22-43` (DealSerializer)
- Modify: `backend/deals/views.py:145-181` (DealViewSet.perform_update)

**Step 1: Add DealLossReason model**

In `backend/deals/models.py`, add before the `Deal` class (after line 108):

```python
class DealLossReason(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deal_loss_reasons",
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["organization", "name"], name="unique_loss_reason_per_org"),
        ]

    def __str__(self):
        return self.name

    DEFAULT_REASONS = [
        "Prix trop élevé",
        "Concurrent choisi",
        "Pas de budget",
        "Mauvais timing",
        "Pas de besoin réel",
        "Pas de réponse",
        "Autre",
    ]

    @classmethod
    def create_defaults(cls, organization):
        for i, name in enumerate(cls.DEFAULT_REASONS):
            cls.objects.get_or_create(
                organization=organization,
                name=name,
                defaults={"order": i, "is_default": True},
            )
```

**Step 2: Add loss/win fields to Deal**

In `backend/deals/models.py`, add to the Deal model after `closed_at` (line 139):

```python
    loss_reason = models.ForeignKey(
        DealLossReason, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="deals",
    )
    loss_comment = models.TextField(blank=True, default="")
    won_at = models.DateTimeField(null=True, blank=True)
    lost_at = models.DateTimeField(null=True, blank=True)
```

**Step 3: Update DealSerializer**

In `backend/deals/serializers.py`, update `DealSerializer`:

```python
class DealSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name", read_only=True, default=None
    )
    loss_reason_name = serializers.CharField(
        source="loss_reason.name", read_only=True, default=None
    )

    class Meta:
        model = Deal
        fields = [
            "id", "name", "amount", "stage", "contact", "company",
            "company_name", "probability", "expected_close", "notes",
            "created_at", "updated_at", "closed_at",
            "loss_reason", "loss_reason_name", "loss_comment",
            "won_at", "lost_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

**Step 4: Auto-set won_at/lost_at in DealViewSet.perform_update**

In `backend/deals/views.py`, update `perform_update` (line 166) to auto-set timestamps:

```python
    def perform_update(self, serializer):
        deal = self.get_object()
        old_stage = deal.stage
        updated_deal = serializer.save()
        if updated_deal.stage_id != old_stage.id:
            # Auto-set won_at / lost_at
            from django.utils import timezone
            now = timezone.now()
            new_stage = updated_deal.stage
            if new_stage.is_won and not old_stage.is_won:
                updated_deal.won_at = now
                updated_deal.closed_at = now
                updated_deal.save(update_fields=["won_at", "closed_at"])
            elif new_stage.is_lost and not old_stage.is_lost:
                updated_deal.lost_at = now
                updated_deal.closed_at = now
                updated_deal.save(update_fields=["lost_at", "closed_at"])
            elif not new_stage.is_won and not new_stage.is_lost:
                # Reopening a deal
                if old_stage.is_won or old_stage.is_lost:
                    updated_deal.won_at = None
                    updated_deal.lost_at = None
                    updated_deal.closed_at = None
                    updated_deal.loss_reason = None
                    updated_deal.loss_comment = ""
                    updated_deal.save(update_fields=["won_at", "lost_at", "closed_at", "loss_reason", "loss_comment"])

            last_transition = (
                DealStageTransition.objects.filter(deal=deal)
                .order_by("-transitioned_at")
                .first()
            )
            duration = None
            if last_transition:
                duration = now - last_transition.transitioned_at
            DealStageTransition.objects.create(
                deal=updated_deal,
                organization=updated_deal.organization,
                from_stage=old_stage,
                to_stage=updated_deal.stage,
                changed_by=self.request.user,
                duration_in_previous=duration,
            )
```

**Step 5: Add DealLossReason endpoints**

In `backend/deals/views.py`, add:

```python
from .serializers import DealLossReasonSerializer

class DealLossReasonViewSet(viewsets.ModelViewSet):
    serializer_class = DealLossReasonSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return DealLossReason.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)
```

In `backend/deals/serializers.py`, add:

```python
from .models import DealLossReason

class DealLossReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealLossReason
        fields = ["id", "name", "order", "is_default"]
        read_only_fields = ["id"]
```

In `backend/deals/urls.py`, add the loss-reasons route:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

loss_reason_router = DefaultRouter()
loss_reason_router.register("", views.DealLossReasonViewSet, basename="loss-reason")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("loss-reasons/", include(loss_reason_router.urls)),
    path("", include(router.urls)),
]
```

**Step 6: Create defaults on org creation**

Find where `Pipeline.create_defaults(organization)` is called (likely in accounts registration or organization creation) and add `DealLossReason.create_defaults(organization)` next to it.

**Step 7: Create and run migration**

```bash
cd backend && python manage.py makemigrations deals -n add_loss_reason_and_deal_fields && python manage.py migrate
```

**Step 8: Update frontend Deal type**

In `frontend/types/deals.ts`, update Deal interface:

```typescript
export interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
  probability?: number | null
  expected_close?: string | null
  notes?: string
  created_at?: string
  loss_reason?: string | null
  loss_reason_name?: string | null
  loss_comment?: string
  won_at?: string | null
  lost_at?: string | null
}

export interface DealLossReason {
  id: string
  name: string
  order: number
  is_default: boolean
}
```

**Step 9: Add loss-reason service functions**

In `frontend/services/deals.ts`, add:

```typescript
import type { DealLossReason } from "@/types"

export async function fetchLossReasons(): Promise<DealLossReason[]> {
  return apiFetch<DealLossReason[]>(`/deals/loss-reasons/`)
}
```

**Step 10: Write tests**

In `backend/deals/tests.py`, add a new test class:

```python
class DealLossReasonTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "loss@example.com",
                "password": "securepass123",
                "first_name": "Loss",
                "last_name": "Tester",
                "organization_name": "LossCorp",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_loss_reasons_created_on_org_creation(self):
        response = self.client.get("/api/deals/loss-reasons/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 7)

    def test_deal_won_sets_won_at(self):
        stages = self.client.get("/api/pipeline-stages/").data
        won_stage = next(s for s in stages if s.get("is_won"))
        deal = self.client.post(
            "/api/deals/",
            {"name": "Win Deal", "amount": "5000", "stage": stages[0]["id"]},
            format="json",
        ).data
        response = self.client.patch(
            f"/api/deals/{deal['id']}/",
            {"stage": won_stage["id"]},
            format="json",
        )
        self.assertIsNotNone(response.data["won_at"])

    def test_deal_lost_sets_lost_at(self):
        stages = self.client.get("/api/pipeline-stages/").data
        lost_stage = next(s for s in stages if s.get("is_lost"))
        deal = self.client.post(
            "/api/deals/",
            {"name": "Lost Deal", "amount": "3000", "stage": stages[0]["id"]},
            format="json",
        ).data
        loss_reasons = self.client.get("/api/deals/loss-reasons/").data
        response = self.client.patch(
            f"/api/deals/{deal['id']}/",
            {"stage": lost_stage["id"], "loss_reason": loss_reasons[0]["id"]},
            format="json",
        )
        self.assertIsNotNone(response.data["lost_at"])
        self.assertEqual(response.data["loss_reason"], loss_reasons[0]["id"])
```

**Step 11: Run tests**

```bash
cd backend && python manage.py test deals
```

**Step 12: Commit**

```bash
git add -A && git commit -m "feat(deals): add DealLossReason model and won_at/lost_at on Deal"
```

---

## Task 3: Add SalesQuota model + CRUD endpoints

**Files:**
- Create: `backend/deals/quota_models.py` (or add to `models.py`)
- Create: `backend/deals/quota_urls.py`
- Modify: `backend/config/urls.py:15` (add quota routes)

**Step 1: Add SalesQuota model**

In `backend/deals/models.py`, add after DealLossReason:

```python
class SalesQuota(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="sales_quotas",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales_quotas",
    )
    month = models.DateField(help_text="First day of the month")
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["month"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "user", "month"],
                name="unique_quota_per_user_month",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.month} - {self.target_amount}"
```

**Step 2: Add serializer**

In `backend/deals/serializers.py`, add:

```python
from .models import SalesQuota

class SalesQuotaSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = SalesQuota
        fields = ["id", "user", "user_name", "month", "target_amount", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
```

**Step 3: Add views**

In `backend/deals/views.py`, add:

```python
from .models import SalesQuota
from .serializers import SalesQuotaSerializer

class SalesQuotaViewSet(viewsets.ModelViewSet):
    serializer_class = SalesQuotaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = SalesQuota.objects.filter(organization=self.request.organization)
        month = self.request.query_params.get("month")
        if month:
            qs = qs.filter(month=month)
        return qs.select_related("user")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    def create(self, request, *args, **kwargs):
        # Upsert: if quota exists for user+month, update it
        user_id = request.data.get("user")
        month = request.data.get("month")
        target = request.data.get("target_amount")
        if user_id and month:
            existing = SalesQuota.objects.filter(
                organization=request.organization, user_id=user_id, month=month
            ).first()
            if existing:
                existing.target_amount = target
                existing.save(update_fields=["target_amount", "updated_at"])
                return Response(SalesQuotaSerializer(existing).data)
        return super().create(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quota_bulk_update(request):
    quotas_data = request.data.get("quotas", [])
    results = []
    for item in quotas_data:
        obj, created = SalesQuota.objects.update_or_create(
            organization=request.organization,
            user_id=item["user"],
            month=item["month"],
            defaults={"target_amount": item["target_amount"]},
        )
        results.append(SalesQuotaSerializer(obj).data)
    return Response(results)
```

**Step 4: Add URL config**

Create `backend/deals/quota_urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesQuotaViewSet, quota_bulk_update

router = DefaultRouter()
router.register("", SalesQuotaViewSet, basename="quota")

urlpatterns = [
    path("bulk/", quota_bulk_update),
    path("", include(router.urls)),
]
```

**Step 5: Register in config/urls.py**

In `backend/config/urls.py`, add after line 15 (`path("api/deals/"...`):

```python
    path("api/quotas/", include("deals.quota_urls")),
```

**Step 6: Create migration and run**

```bash
cd backend && python manage.py makemigrations deals -n add_sales_quota && python manage.py migrate
```

**Step 7: Add frontend types and service**

In `frontend/types/deals.ts`, add:

```typescript
export interface SalesQuota {
  id: string
  user: string
  user_name: string
  month: string
  target_amount: string | number
  created_at: string
  updated_at: string
}
```

In `frontend/services/deals.ts`, add:

```typescript
import type { SalesQuota } from "@/types"

export async function fetchQuotas(month?: string): Promise<SalesQuota[]> {
  const params = month ? `?month=${month}` : ""
  return apiFetch<SalesQuota[]>(`/quotas/${params}`)
}

export async function upsertQuota(data: { user: string; month: string; target_amount: number }): Promise<SalesQuota> {
  return apiFetch<SalesQuota>(`/quotas/`, { method: "POST", json: data })
}

export async function bulkUpdateQuotas(quotas: { user: string; month: string; target_amount: number }[]): Promise<SalesQuota[]> {
  return apiFetch<SalesQuota[]>(`/quotas/bulk/`, { method: "POST", json: { quotas } })
}
```

**Step 8: Write tests**

In `backend/deals/tests.py`, add:

```python
class SalesQuotaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "quota@example.com",
                "password": "securepass123",
                "first_name": "Quota",
                "last_name": "User",
                "organization_name": "QuotaCorp",
            },
        )
        self.token = response.data["access"]
        self.user_id = response.data.get("user_id") or response.data.get("user", {}).get("id")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        from organizations.models import Membership
        self.membership = Membership.objects.get(user__email="quota@example.com")
        self.user_id = str(self.membership.user_id)

    def test_create_quota(self):
        response = self.client.post(
            "/api/quotas/",
            {"user": self.user_id, "month": "2026-03-01", "target_amount": "50000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_upsert_quota(self):
        self.client.post(
            "/api/quotas/",
            {"user": self.user_id, "month": "2026-03-01", "target_amount": "50000"},
            format="json",
        )
        response = self.client.post(
            "/api/quotas/",
            {"user": self.user_id, "month": "2026-03-01", "target_amount": "75000"},
            format="json",
        )
        self.assertEqual(response.data["target_amount"], "75000.00")

    def test_bulk_update(self):
        response = self.client.post(
            "/api/quotas/bulk/",
            {"quotas": [
                {"user": self.user_id, "month": "2026-03-01", "target_amount": "60000"},
                {"user": self.user_id, "month": "2026-04-01", "target_amount": "70000"},
            ]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
```

**Step 9: Run tests**

```bash
cd backend && python manage.py test deals
```

**Step 10: Commit**

```bash
git add -A && git commit -m "feat(deals): add SalesQuota model with CRUD and bulk update"
```

---

## Task 4: Backend analytics endpoints (forecast, win/loss, velocity, leaderboard)

**Files:**
- Create: `backend/deals/analytics.py`
- Modify: `backend/deals/urls.py`

**Step 1: Create analytics module**

Create `backend/deals/analytics.py`:

```python
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Avg, Q, F, ExpressionWrapper, DurationField
from django.utils import timezone

from .models import Deal, DealStageTransition, PipelineStage, SalesQuota


def _resolve_period(period):
    """Return (start, end) datetimes for the given period string."""
    now = timezone.now()
    if period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=now.year + 1, month=1)
        else:
            end = start.replace(month=now.month + 1)
        return start, end
    elif period == "this_quarter":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_month = q_month + 3
        if end_month > 12:
            end = start.replace(year=now.year + 1, month=end_month - 12)
        else:
            end = start.replace(month=end_month)
        return start, end
    elif period == "next_quarter":
        q_month = ((now.month - 1) // 3) * 3 + 4
        if q_month > 12:
            start = now.replace(year=now.year + 1, month=q_month - 12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_month = start.month + 3
        if end_month > 12:
            end = start.replace(year=start.year + 1, month=end_month - 12)
        else:
            end = start.replace(month=end_month)
        return start, end
    elif period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(year=now.year + 1)
        return start, end
    elif period == "last_3_months":
        return now - timedelta(days=90), now
    elif period == "last_6_months":
        return now - timedelta(days=180), now
    return None, None


def _months_in_range(start, end):
    """Yield (year, month) tuples for each month in the range."""
    current = start.replace(day=1)
    while current < end:
        yield current.year, current.month
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


def compute_forecast(organization, period="this_quarter", pipeline_id=None, user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    # Open deals with expected_close in the period
    qs = Deal.objects.filter(
        organization=organization,
        expected_close__gte=start.date(),
        expected_close__lt=end.date(),
    ).exclude(
        stage__is_won=True,
    ).exclude(
        stage__is_lost=True,
    )

    if pipeline_id:
        qs = qs.filter(stage__pipeline_id=pipeline_id)
    if user_id:
        qs = qs.filter(created_by_id=user_id)

    months = []
    for year, month in _months_in_range(start, end):
        from datetime import date
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        month_deals = qs.filter(expected_close__gte=month_start, expected_close__lt=month_end)

        categories = {}
        for cat_name, prob_min, prob_max in [("commit", 80, 101), ("best_case", 40, 80), ("pipeline", 0, 40)]:
            cat_deals = month_deals.filter(probability__gte=prob_min, probability__lt=prob_max)
            agg = cat_deals.aggregate(total=Sum("amount"), cnt=Count("id"))
            total = float(agg["total"] or 0)
            cnt = agg["cnt"]
            # Weighted = sum of amount * probability / 100
            weighted = float(
                cat_deals.aggregate(
                    w=Sum(F("amount") * F("probability") / 100)
                )["w"] or 0
            )
            categories[cat_name] = {"count": cnt, "total": round(total, 2), "weighted": round(weighted, 2)}

        # Quota for this month
        quota_qs = SalesQuota.objects.filter(
            organization=organization, month=month_start,
        )
        if user_id:
            quota_qs = quota_qs.filter(user_id=user_id)
        quota_total = float(quota_qs.aggregate(t=Sum("target_amount"))["t"] or 0)

        # Closed won this month
        closed_won_qs = Deal.objects.filter(
            organization=organization,
            stage__is_won=True,
            won_at__gte=timezone.make_aware(timezone.datetime(year, month, 1)),
            won_at__lt=timezone.make_aware(timezone.datetime(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)),
        )
        if pipeline_id:
            closed_won_qs = closed_won_qs.filter(stage__pipeline_id=pipeline_id)
        if user_id:
            closed_won_qs = closed_won_qs.filter(created_by_id=user_id)
        closed_won = float(closed_won_qs.aggregate(t=Sum("amount"))["t"] or 0)

        total_weighted = categories["commit"]["weighted"] + categories["best_case"]["weighted"] + categories["pipeline"]["weighted"]

        months.append({
            "month": f"{year}-{month:02d}",
            **categories,
            "total_weighted": round(total_weighted, 2),
            "quota": round(quota_total, 2),
            "closed_won": round(closed_won, 2),
        })

    summary = {
        "commit": round(sum(m["commit"]["weighted"] for m in months), 2),
        "best_case": round(sum(m["best_case"]["weighted"] for m in months), 2),
        "pipeline": round(sum(m["pipeline"]["weighted"] for m in months), 2),
        "total_weighted": round(sum(m["total_weighted"] for m in months), 2),
        "total_quota": round(sum(m["quota"] for m in months), 2),
        "total_closed_won": round(sum(m["closed_won"] for m in months), 2),
    }

    return {"period": period, "months": months, "summary": summary}


def compute_win_loss(organization, period="this_quarter", pipeline_id=None, user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    base_qs = Deal.objects.filter(organization=organization)
    if pipeline_id:
        base_qs = base_qs.filter(stage__pipeline_id=pipeline_id)
    if user_id:
        base_qs = base_qs.filter(created_by_id=user_id)

    won_qs = base_qs.filter(won_at__gte=start, won_at__lt=end)
    lost_qs = base_qs.filter(lost_at__gte=start, lost_at__lt=end)

    won_agg = won_qs.aggregate(count=Count("id"), total=Sum("amount"))
    lost_agg = lost_qs.aggregate(count=Count("id"), total=Sum("amount"))

    won_count = won_agg["count"]
    lost_count = lost_agg["count"]
    total_decided = won_count + lost_count
    win_rate = round((won_count / total_decided) * 100, 1) if total_decided > 0 else 0

    # Loss reasons breakdown
    loss_reasons = list(
        lost_qs.values("loss_reason__name")
        .annotate(count=Count("id"), total_amount=Sum("amount"))
        .order_by("-count")
    )
    loss_reason_list = []
    for lr in loss_reasons:
        name = lr["loss_reason__name"] or "Non renseigné"
        pct = round((lr["count"] / lost_count) * 100, 1) if lost_count > 0 else 0
        loss_reason_list.append({
            "reason": name,
            "count": lr["count"],
            "total_amount": float(lr["total_amount"] or 0),
            "percentage": pct,
        })

    # Monthly trend
    trend = []
    for year, month in _months_in_range(start, end):
        from datetime import datetime as dt
        m_start = timezone.make_aware(dt(year, month, 1))
        m_end_month = month + 1 if month < 12 else 1
        m_end_year = year if month < 12 else year + 1
        m_end = timezone.make_aware(dt(m_end_year, m_end_month, 1))

        m_won = base_qs.filter(won_at__gte=m_start, won_at__lt=m_end).count()
        m_lost = base_qs.filter(lost_at__gte=m_start, lost_at__lt=m_end).count()
        m_total = m_won + m_lost
        m_rate = round((m_won / m_total) * 100, 1) if m_total > 0 else 0

        trend.append({
            "month": f"{year}-{month:02d}",
            "won": m_won,
            "lost": m_lost,
            "win_rate": m_rate,
        })

    return {
        "period": period,
        "summary": {
            "won": {"count": won_count, "total_amount": float(won_agg["total"] or 0)},
            "lost": {"count": lost_count, "total_amount": float(lost_agg["total"] or 0)},
            "win_rate": win_rate,
        },
        "loss_reasons": loss_reason_list,
        "trend": trend,
    }


def compute_velocity(organization, pipeline_id, period="last_6_months", user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    try:
        from .models import Pipeline
        pipeline = Pipeline.objects.get(id=pipeline_id, organization=organization)
    except Pipeline.DoesNotExist:
        return {"error": "Pipeline not found"}

    stages = list(pipeline.stages.filter(is_won=False, is_lost=False).order_by("order"))

    # Average cycle for won deals
    won_deals = Deal.objects.filter(
        organization=organization,
        stage__pipeline=pipeline,
        stage__is_won=True,
        won_at__gte=start,
        won_at__lt=end,
    )
    if user_id:
        won_deals = won_deals.filter(created_by_id=user_id)

    cycles = []
    for deal in won_deals:
        if deal.won_at and deal.created_at:
            delta = (deal.won_at - deal.created_at).total_seconds() / 86400
            cycles.append(delta)

    avg_cycle = round(sum(cycles) / len(cycles), 1) if cycles else 0
    sorted_cycles = sorted(cycles)
    median_cycle = round(sorted_cycles[len(sorted_cycles) // 2], 0) if sorted_cycles else 0

    # Time per stage
    transitions = DealStageTransition.objects.filter(
        organization=organization,
        deal__stage__pipeline=pipeline,
        transitioned_at__gte=start,
        transitioned_at__lt=end,
    ).exclude(duration_in_previous__isnull=True)

    if user_id:
        transitions = transitions.filter(changed_by_id=user_id)

    stage_stats = []
    for stage in stages:
        stage_transitions = transitions.filter(from_stage=stage)
        durations = [t.duration_in_previous.total_seconds() / 86400 for t in stage_transitions if t.duration_in_previous]
        if durations:
            avg_days = round(sum(durations) / len(durations), 1)
            sorted_d = sorted(durations)
            median_days = round(sorted_d[len(sorted_d) // 2], 0)
        else:
            avg_days = 0
            median_days = 0
        stage_stats.append({
            "stage": stage.name,
            "stage_id": str(stage.id),
            "avg_days": avg_days,
            "median_days": int(median_days),
            "deal_count": len(durations),
        })

    # Stagnant deals
    import statistics
    stagnant = []
    now = timezone.now()
    open_deals = Deal.objects.filter(
        organization=organization,
        stage__pipeline=pipeline,
        stage__is_won=False,
        stage__is_lost=False,
    )
    if user_id:
        open_deals = open_deals.filter(created_by_id=user_id)

    for deal in open_deals.select_related("stage"):
        last_t = DealStageTransition.objects.filter(deal=deal).order_by("-transitioned_at").first()
        if not last_t:
            continue
        days_in_stage = (now - last_t.transitioned_at).total_seconds() / 86400
        stage_stat = next((s for s in stage_stats if s["stage_id"] == str(deal.stage_id)), None)
        if stage_stat and stage_stat["avg_days"] > 0 and days_in_stage > stage_stat["avg_days"] * 2:
            stagnant.append({
                "id": str(deal.id),
                "name": deal.name,
                "stage": deal.stage.name,
                "days_in_stage": round(days_in_stage, 1),
                "avg_for_stage": stage_stat["avg_days"],
                "amount": float(deal.amount),
            })

    return {
        "pipeline": pipeline.name,
        "period": period,
        "avg_cycle_days": avg_cycle,
        "median_cycle_days": int(median_cycle),
        "stages": stage_stats,
        "stagnant_deals": stagnant,
    }


def compute_leaderboard(organization, period="this_month", pipeline_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    from django.contrib.auth import get_user_model
    from organizations.models import Membership
    User = get_user_model()

    members = Membership.objects.filter(organization=organization).select_related("user")

    rankings = []
    for membership in members:
        user = membership.user
        base_qs = Deal.objects.filter(organization=organization, created_by=user)
        if pipeline_id:
            base_qs = base_qs.filter(stage__pipeline_id=pipeline_id)

        won = base_qs.filter(won_at__gte=start, won_at__lt=end)
        lost = base_qs.filter(lost_at__gte=start, lost_at__lt=end)

        won_agg = won.aggregate(count=Count("id"), total=Sum("amount"))
        lost_count = lost.count()

        deals_won = won_agg["count"]
        revenue = float(won_agg["total"] or 0)
        total_decided = deals_won + lost_count
        win_rate = round((deals_won / total_decided) * 100, 1) if total_decided > 0 else 0
        avg_deal_size = round(revenue / deals_won, 2) if deals_won > 0 else 0

        # Quota for this period
        quota_qs = SalesQuota.objects.filter(
            organization=organization, user=user,
            month__gte=start.date(), month__lt=end.date(),
        )
        quota = float(quota_qs.aggregate(t=Sum("target_amount"))["t"] or 0)
        attainment = round((revenue / quota) * 100, 1) if quota > 0 else 0

        rankings.append({
            "user": {
                "id": str(user.id),
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            "deals_won": deals_won,
            "revenue_closed": revenue,
            "quota": quota,
            "quota_attainment": attainment,
            "avg_deal_size": avg_deal_size,
            "win_rate": win_rate,
        })

    rankings.sort(key=lambda r: r["quota_attainment"], reverse=True)

    return {"period": period, "rankings": rankings}
```

**Step 2: Add view endpoints**

In `backend/deals/views.py`, add:

```python
from .analytics import compute_forecast, compute_win_loss, compute_velocity, compute_leaderboard

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def forecast_view(request):
    result = compute_forecast(
        organization=request.organization,
        period=request.query_params.get("period", "this_quarter"),
        pipeline_id=request.query_params.get("pipeline"),
        user_id=request.query_params.get("user"),
    )
    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def win_loss_view(request):
    result = compute_win_loss(
        organization=request.organization,
        period=request.query_params.get("period", "this_quarter"),
        pipeline_id=request.query_params.get("pipeline"),
        user_id=request.query_params.get("user"),
    )
    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def velocity_view(request):
    pipeline_id = request.query_params.get("pipeline")
    if not pipeline_id:
        return Response({"detail": "pipeline is required"}, status=status.HTTP_400_BAD_REQUEST)
    result = compute_velocity(
        organization=request.organization,
        pipeline_id=pipeline_id,
        period=request.query_params.get("period", "last_6_months"),
        user_id=request.query_params.get("user"),
    )
    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def leaderboard_view(request):
    result = compute_leaderboard(
        organization=request.organization,
        period=request.query_params.get("period", "this_month"),
        pipeline_id=request.query_params.get("pipeline"),
    )
    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)
```

**Step 3: Register URL routes**

In `backend/deals/urls.py`, update:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.DealViewSet, basename="deal")

loss_reason_router = DefaultRouter()
loss_reason_router.register("", views.DealLossReasonViewSet, basename="loss-reason")

urlpatterns = [
    path("pipeline/", views.pipeline_view),
    path("forecast/", views.forecast_view),
    path("win-loss/", views.win_loss_view),
    path("velocity/", views.velocity_view),
    path("leaderboard/", views.leaderboard_view),
    path("loss-reasons/", include(loss_reason_router.urls)),
    path("", include(router.urls)),
]
```

**Step 4: Add frontend service functions**

In `frontend/services/deals.ts`, add:

```typescript
export async function fetchForecast(params?: {
  period?: string
  pipeline?: string
  user?: string
}): Promise<ForecastResponse> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set("period", params.period)
  if (params?.pipeline) searchParams.set("pipeline", params.pipeline)
  if (params?.user) searchParams.set("user", params.user)
  const qs = searchParams.toString()
  return apiFetch<ForecastResponse>(`/deals/forecast/${qs ? `?${qs}` : ""}`)
}

export async function fetchWinLoss(params?: {
  period?: string
  pipeline?: string
  user?: string
}): Promise<WinLossResponse> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set("period", params.period)
  if (params?.pipeline) searchParams.set("pipeline", params.pipeline)
  if (params?.user) searchParams.set("user", params.user)
  const qs = searchParams.toString()
  return apiFetch<WinLossResponse>(`/deals/win-loss/${qs ? `?${qs}` : ""}`)
}

export async function fetchVelocity(params: {
  pipeline: string
  period?: string
  user?: string
}): Promise<VelocityResponse> {
  const searchParams = new URLSearchParams({ pipeline: params.pipeline })
  if (params.period) searchParams.set("period", params.period)
  if (params.user) searchParams.set("user", params.user)
  return apiFetch<VelocityResponse>(`/deals/velocity/?${searchParams.toString()}`)
}

export async function fetchLeaderboard(params?: {
  period?: string
  pipeline?: string
}): Promise<LeaderboardResponse> {
  const searchParams = new URLSearchParams()
  if (params?.period) searchParams.set("period", params.period)
  if (params?.pipeline) searchParams.set("pipeline", params.pipeline)
  const qs = searchParams.toString()
  return apiFetch<LeaderboardResponse>(`/deals/leaderboard/${qs ? `?${qs}` : ""}`)
}
```

**Step 5: Add frontend types**

In `frontend/types/deals.ts`, add:

```typescript
export interface ForecastCategory {
  count: number
  total: number
  weighted: number
}

export interface ForecastMonth {
  month: string
  commit: ForecastCategory
  best_case: ForecastCategory
  pipeline: ForecastCategory
  total_weighted: number
  quota: number
  closed_won: number
}

export interface ForecastResponse {
  period: string
  months: ForecastMonth[]
  summary: {
    commit: number
    best_case: number
    pipeline: number
    total_weighted: number
    total_quota: number
    total_closed_won: number
  }
}

export interface WinLossResponse {
  period: string
  summary: {
    won: { count: number; total_amount: number }
    lost: { count: number; total_amount: number }
    win_rate: number
  }
  loss_reasons: { reason: string; count: number; total_amount: number; percentage: number }[]
  trend: { month: string; won: number; lost: number; win_rate: number }[]
}

export interface VelocityStage {
  stage: string
  stage_id: string
  avg_days: number
  median_days: number
  deal_count: number
}

export interface VelocityResponse {
  pipeline: string
  period: string
  avg_cycle_days: number
  median_cycle_days: number
  stages: VelocityStage[]
  stagnant_deals: {
    id: string
    name: string
    stage: string
    days_in_stage: number
    avg_for_stage: number
    amount: number
  }[]
}

export interface LeaderboardEntry {
  user: { id: string; first_name: string; last_name: string }
  deals_won: number
  revenue_closed: number
  quota: number
  quota_attainment: number
  avg_deal_size: number
  win_rate: number
}

export interface LeaderboardResponse {
  period: string
  rankings: LeaderboardEntry[]
}
```

**Step 6: Write backend tests**

In `backend/deals/tests.py`, add:

```python
class AnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "analytics@example.com",
                "password": "securepass123",
                "first_name": "Analytics",
                "last_name": "User",
                "organization_name": "AnalyticsCorp",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_forecast_endpoint(self):
        response = self.client.get("/api/deals/forecast/?period=this_quarter")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("months", response.data)
        self.assertIn("summary", response.data)

    def test_win_loss_endpoint(self):
        response = self.client.get("/api/deals/win-loss/?period=this_quarter")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summary", response.data)
        self.assertIn("loss_reasons", response.data)

    def test_velocity_requires_pipeline(self):
        response = self.client.get("/api/deals/velocity/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_velocity_endpoint(self):
        pipelines = self.client.get("/api/pipelines/").data
        response = self.client.get(f"/api/deals/velocity/?pipeline={pipelines[0]['id']}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("stages", response.data)

    def test_leaderboard_endpoint(self):
        response = self.client.get("/api/deals/leaderboard/?period=this_month")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("rankings", response.data)
```

**Step 7: Run tests**

```bash
cd backend && python manage.py test deals
```

**Step 8: Commit**

```bash
git add -A && git commit -m "feat(deals): add forecast, win/loss, velocity, and leaderboard endpoints"
```

---

## Task 5: Next Best Action endpoint

**Files:**
- Create: `backend/deals/next_actions.py`
- Modify: `backend/deals/urls.py`

**Step 1: Create next actions module**

Create `backend/deals/next_actions.py`:

```python
from django.utils import timezone
from django.db.models import Q

from .models import Deal, DealStageTransition
from tasks.models import Task
from notes.models import TimelineEntry


def compute_heuristic_actions(deal, organization):
    """Return a list of heuristic next-best-action suggestions for a deal."""
    actions = []
    now = timezone.now()

    if deal.stage.is_won or deal.stage.is_lost:
        return actions

    # 1. Deal dormant — no activity in 7 days
    last_activity = TimelineEntry.objects.filter(
        organization=organization,
        deal=deal,
    ).order_by("-created_at").first()

    last_transition = DealStageTransition.objects.filter(
        deal=deal
    ).order_by("-transitioned_at").first()

    last_event = max(
        last_activity.created_at if last_activity else deal.created_at,
        last_transition.transitioned_at if last_transition else deal.created_at,
    )
    days_since = (now - last_event).total_seconds() / 86400
    if days_since >= 7:
        actions.append({
            "type": "deal_dormant",
            "priority": "high",
            "message": f"Aucune activité depuis {int(days_since)} jours. Relancez le contact.",
            "suggested_action": "log_interaction",
            "days_since_activity": int(days_since),
        })

    # 2. No quote in late stage
    if deal.stage.order >= 3 and not deal.quotes.exists():
        actions.append({
            "type": "no_quote",
            "priority": "high",
            "message": "Ce deal est en stage avancé sans devis. Créez un devis.",
            "suggested_action": "create_quote",
        })

    # 3. Close date passed
    if deal.expected_close and deal.expected_close < now.date():
        days_overdue = (now.date() - deal.expected_close).days
        actions.append({
            "type": "close_date_passed",
            "priority": "high",
            "message": f"Date de clôture dépassée de {days_overdue} jours. Mettez à jour ou clôturez.",
            "suggested_action": "update_deal",
        })

    # 4. No contact
    if not deal.contact:
        actions.append({
            "type": "no_contact",
            "priority": "medium",
            "message": "Aucun contact associé. Associez un contact à ce deal.",
            "suggested_action": "update_deal",
        })

    # 5. Low probability in late stage
    if deal.stage.order >= 3 and deal.probability is not None and deal.probability < 30:
        actions.append({
            "type": "low_probability_late_stage",
            "priority": "medium",
            "message": f"Probabilité de {deal.probability}% en stage avancé. Réévaluez.",
            "suggested_action": "update_deal",
        })

    # 6. Stagnant deal
    if last_transition:
        days_in_stage = (now - last_transition.transitioned_at).total_seconds() / 86400
        # Get average for this stage
        from .analytics import compute_velocity
        velocity = compute_velocity(organization, str(deal.stage.pipeline_id), period="last_6_months")
        if not isinstance(velocity, dict) or "error" not in velocity:
            stage_stat = next((s for s in velocity.get("stages", []) if s["stage_id"] == str(deal.stage_id)), None)
            if stage_stat and stage_stat["avg_days"] > 0 and days_in_stage > stage_stat["avg_days"] * 2:
                actions.append({
                    "type": "stagnant_deal",
                    "priority": "medium",
                    "message": f"Ce deal est dans ce stage depuis {int(days_in_stage)} jours (moyenne: {stage_stat['avg_days']}). Débloquez ou disqualifiez.",
                    "suggested_action": "update_deal",
                })

    # 7. No next step
    future_tasks = Task.objects.filter(
        deal=deal, is_done=False, due_date__gte=now,
    ).exists()
    if not future_tasks:
        actions.append({
            "type": "no_next_step",
            "priority": "low",
            "message": "Aucune tâche future planifiée. Planifiez une prochaine action.",
            "suggested_action": "create_task",
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    actions.sort(key=lambda a: priority_order.get(a["priority"], 3))

    return actions
```

**Step 2: Add view endpoints**

In `backend/deals/views.py`, add:

```python
from .next_actions import compute_heuristic_actions

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def next_actions_view(request, pk):
    try:
        deal = Deal.objects.select_related("stage", "contact").get(
            pk=pk, organization=request.organization
        )
    except Deal.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    actions = compute_heuristic_actions(deal, request.organization)
    return Response({
        "heuristic_actions": actions,
        "ai_analysis_available": True,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def next_actions_ai_view(request, pk):
    try:
        deal = Deal.objects.select_related("stage", "contact", "company").prefetch_related(
            "quotes", "transitions"
        ).get(pk=pk, organization=request.organization)
    except Deal.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Build context for LLM
    from notes.models import TimelineEntry
    recent_activities = TimelineEntry.objects.filter(
        organization=request.organization, deal=deal
    ).order_by("-created_at")[:10]

    from tasks.models import Task
    tasks = Task.objects.filter(deal=deal).order_by("-created_at")[:5]

    context = {
        "deal_name": deal.name,
        "amount": float(deal.amount),
        "stage": deal.stage.name,
        "probability": deal.probability,
        "expected_close": str(deal.expected_close) if deal.expected_close else None,
        "contact": f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
        "company": deal.company.name if deal.company else None,
        "notes": deal.notes[:500] if deal.notes else None,
        "recent_activities": [
            {"type": a.entry_type, "content": a.content[:200], "date": str(a.created_at.date())}
            for a in recent_activities
        ],
        "tasks": [
            {"title": t.title, "is_done": t.is_done, "due_date": str(t.due_date) if t.due_date else None}
            for t in tasks
        ],
        "quotes_count": deal.quotes.count(),
    }

    # Call LLM
    from django.conf import settings
    from pydantic_ai import Agent

    agent = Agent(model=settings.AI_MODEL)
    prompt = f"""Analyse ce deal CRM et suggère 2-3 prochaines actions concrètes pour le faire avancer.

Contexte du deal:
{context}

Réponds en JSON avec ce format:
[{{"action": "description concrète", "reasoning": "pourquoi cette action", "priority": "high|medium|low"}}]

Sois concis et actionnable."""

    try:
        result = agent.run_sync(prompt)
        import json
        suggestions = json.loads(result.data)
    except Exception:
        suggestions = [{"action": "Analyse non disponible", "reasoning": "Erreur lors de l'analyse IA", "priority": "medium"}]

    return Response({"suggestions": suggestions})
```

**Step 3: Register routes**

In `backend/deals/urls.py`, add before the router include:

```python
    path("<uuid:pk>/next-actions/", views.next_actions_view),
    path("<uuid:pk>/next-actions/ai/", views.next_actions_ai_view),
```

**Step 4: Add frontend service**

In `frontend/services/deals.ts`, add:

```typescript
export interface NextAction {
  type: string
  priority: "high" | "medium" | "low"
  message: string
  suggested_action: string
  days_since_activity?: number
}

export interface NextActionsResponse {
  heuristic_actions: NextAction[]
  ai_analysis_available: boolean
}

export interface AiSuggestion {
  action: string
  reasoning: string
  priority: "high" | "medium" | "low"
}

export async function fetchNextActions(dealId: string): Promise<NextActionsResponse> {
  return apiFetch<NextActionsResponse>(`/deals/${dealId}/next-actions/`)
}

export async function fetchAiNextActions(dealId: string): Promise<{ suggestions: AiSuggestion[] }> {
  return apiFetch<{ suggestions: AiSuggestion[] }>(`/deals/${dealId}/next-actions/ai/`, { method: "POST" })
}
```

**Step 5: Write tests**

In `backend/deals/tests.py`, add:

```python
class NextActionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "nextaction@example.com",
                "password": "securepass123",
                "first_name": "Next",
                "last_name": "Action",
                "organization_name": "ActionCorp",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        stages = self.client.get("/api/pipeline-stages/").data
        self.deal = self.client.post(
            "/api/deals/",
            {"name": "Test Deal", "amount": "5000", "stage": stages[0]["id"]},
            format="json",
        ).data

    def test_next_actions_returns_suggestions(self):
        response = self.client.get(f"/api/deals/{self.deal['id']}/next-actions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("heuristic_actions", response.data)
        self.assertTrue(response.data["ai_analysis_available"])

    def test_deal_without_contact_gets_suggestion(self):
        response = self.client.get(f"/api/deals/{self.deal['id']}/next-actions/")
        actions = response.data["heuristic_actions"]
        types = [a["type"] for a in actions]
        self.assertIn("no_contact", types)
```

**Step 6: Run tests**

```bash
cd backend && python manage.py test deals
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(deals): add next best action endpoints (heuristic + AI)"
```

---

## Task 6: Loss capture modal on Kanban (frontend)

**Files:**
- Create: `frontend/components/deals/LossReasonDialog.tsx`
- Modify: `frontend/components/deals/KanbanBoard.tsx:171-190` (handleDragEnd)

**Step 1: Create LossReasonDialog component**

Create `frontend/components/deals/LossReasonDialog.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { fetchLossReasons, updateDeal } from "@/services/deals"
import type { DealLossReason } from "@/types"

interface LossReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  newStageId: string
  onConfirm: () => void
  onCancel: () => void
}

export function LossReasonDialog({
  open,
  onOpenChange,
  dealId,
  newStageId,
  onConfirm,
  onCancel,
}: LossReasonDialogProps) {
  const [reasons, setReasons] = useState<DealLossReason[]>([])
  const [selectedReason, setSelectedReason] = useState("")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLossReasons().then(setReasons).catch(() => {})
      setSelectedReason("")
      setComment("")
    }
  }, [open])

  const handleConfirm = async () => {
    if (!selectedReason) return
    setSaving(true)
    try {
      await updateDeal(dealId, {
        stage: newStageId,
        loss_reason: selectedReason,
        loss_comment: comment,
      })
      onConfirm()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save loss reason:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raison de la perte</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-[family-name:var(--font-body)]">
          <div className="space-y-1.5">
            <Label>Raison</Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className={selectClass}
            >
              <option value="">Sélectionner une raison...</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Commentaire (optionnel)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Détails supplémentaires..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!selectedReason || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Integrate into KanbanBoard**

In `frontend/components/deals/KanbanBoard.tsx`, modify `handleDragEnd` to detect lost stage and show dialog:

1. Import `LossReasonDialog` and the Stage type
2. Add state for pending loss: `const [pendingLoss, setPendingLoss] = useState<{dealId: string; stageId: string} | null>(null)`
3. In `handleDragEnd`, before calling `updateDeal`, check if the target stage has `is_lost=true`:

```tsx
const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event
    setActiveDeal(null)

    const dealId = String(active.id).replace("deal-", "")
    const newStageId = findStageByDealId(dealId)
    if (!newStageId) return

    const targetStageData = pipeline.find((s) => s.stage.id === newStageId)
    if (targetStageData?.stage.is_lost) {
      // Show loss reason dialog instead of saving directly
      setPendingLoss({ dealId, stageId: newStageId })
      return
    }

    try {
      await updateDeal(dealId, { stage: newStageId })
      const stageName = targetStageData?.stage.name
      posthog.capture("deal_stage_changed", { stage: stageName })
    } catch (err) {
      console.error("Failed to update deal stage:", err)
      refresh()
    }
}
```

4. Add the dialog in the JSX and handlers:

```tsx
<LossReasonDialog
  open={!!pendingLoss}
  onOpenChange={(open) => { if (!open) setPendingLoss(null) }}
  dealId={pendingLoss?.dealId ?? ""}
  newStageId={pendingLoss?.stageId ?? ""}
  onConfirm={() => {
    setPendingLoss(null)
    refresh()
  }}
  onCancel={() => {
    setPendingLoss(null)
    refresh() // Re-fetch to restore correct position
  }}
/>
```

**Step 3: Run frontend dev to verify**

```bash
cd frontend && npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(deals): add loss reason capture dialog on Kanban"
```

---

## Task 7: Dashboard widgets (forecast, win/loss, velocity, leaderboard, quota)

**Files:**
- Modify: `frontend/types/reports.ts:1-10` (WidgetConfig type)
- Modify: `frontend/components/reports/WidgetChart.tsx` (add new chart types)
- Modify: `frontend/components/reports/WidgetEditor.tsx` (add new widget options)

**Step 1: Update WidgetConfig type**

In `frontend/types/reports.ts`, update the type union:

```typescript
export interface WidgetConfig {
  id: string
  type: "line_chart" | "bar_chart" | "pie_chart" | "kpi_card" | "table" | "funnel_chart" | "forecast_chart" | "win_loss_chart" | "loss_reasons_chart" | "velocity_chart" | "leaderboard_table" | "quota_progress"
  title: string
  source: "deals" | "contacts" | "tasks" | "activities" | "quotes"
  metric: string
  group_by: string | null
  filters: Record<string, unknown>
  size: "small" | "medium" | "large"
}
```

**Step 2: Add new widget renderers in WidgetChart.tsx**

In `frontend/components/reports/WidgetChart.tsx`, add new chart types. This involves:

1. Import the new fetch functions from `@/services/deals`
2. Add state and effect for each new widget type
3. Add rendering blocks for `forecast_chart`, `win_loss_chart`, `loss_reasons_chart`, `velocity_chart`, `leaderboard_table`, `quota_progress`

The forecast chart uses a stacked BarChart with 3 series + 2 Line overlays. The win/loss chart uses a grouped BarChart + Line for win rate. The velocity chart uses a horizontal BarChart. The leaderboard is a table with progress bars. The quota progress is a circular gauge (KPI card variant).

This is a large component. Create a separate file for the new widget renderers:

Create `frontend/components/reports/AnalyticsWidgets.tsx` with individual components:
- `ForecastWidget` — stacked bar + lines
- `WinLossWidget` — grouped bar + trend line
- `LossReasonsWidget` — donut/pie chart
- `VelocityWidget` — horizontal bars
- `LeaderboardWidget` — styled table
- `QuotaProgressWidget` — circular progress KPI

Then in `WidgetChart.tsx`, import and delegate to these components based on widget type.

Each widget component fetches its own data using the services from Task 4, with period/pipeline from `widget.filters`.

**Step 3: Update WidgetEditor to include new types**

In `frontend/components/reports/WidgetEditor.tsx`, add the new chart types to `CHART_TYPES`:

```typescript
const CHART_TYPES = [
  { value: "bar_chart", label: "Barres" },
  { value: "line_chart", label: "Lignes" },
  { value: "pie_chart", label: "Camembert" },
  { value: "kpi_card", label: "KPI" },
  { value: "table", label: "Tableau" },
  { value: "funnel_chart", label: "Entonnoir" },
  { value: "forecast_chart", label: "Forecast" },
  { value: "win_loss_chart", label: "Win/Loss" },
  { value: "loss_reasons_chart", label: "Raisons de perte" },
  { value: "velocity_chart", label: "Vélocité" },
  { value: "leaderboard_table", label: "Leaderboard" },
  { value: "quota_progress", label: "Progression quota" },
] as const
```

For these analytics chart types, the editor should show a simplified config: just period selector and optional pipeline selector (similar to funnel_chart handling).

**Step 4: Build and verify**

```bash
cd frontend && npm run build
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(dashboard): add forecast, win/loss, velocity, leaderboard, and quota widgets"
```

---

## Task 8: Quotas admin page in settings

**Files:**
- Create: `frontend/app/(app)/settings/quotas/page.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx:327-344` (add link)

**Step 1: Create the quotas settings page**

Create `frontend/app/(app)/settings/quotas/page.tsx`:

A page with:
- Month selector (current month by default, can navigate forward/backward)
- Table with rows = team members, columns = target amount
- Inline-editable cells
- "Appliquer à tous" button
- "Copier le mois précédent" button
- Uses `fetchQuotas`, `bulkUpdateQuotas`, `fetchMembers`

**Step 2: Add link from settings page**

In `frontend/app/(app)/settings/page.tsx`, add a new card link (similar to the email templates link at line 327) for Quotas, with a `Target` or `TrendingUp` Lucide icon.

**Step 3: Build and verify**

```bash
cd frontend && npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(settings): add quotas management page"
```

---

## Task 9: Next Best Action section in deal detail page

**Files:**
- Create: `frontend/components/deals/NextActions.tsx`
- Modify: deal detail page to include the component

**Step 1: Create NextActions component**

Create `frontend/components/deals/NextActions.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchNextActions, fetchAiNextActions } from "@/services/deals"
import type { NextAction, AiSuggestion } from "@/services/deals"

const PRIORITY_STYLES = {
  high: { icon: AlertTriangle, bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  medium: { icon: AlertCircle, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  low: { icon: Info, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
}

interface NextActionsProps {
  dealId: string
}

export function NextActions({ dealId }: NextActionsProps) {
  const [actions, setActions] = useState<NextAction[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRequested, setAiRequested] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchNextActions(dealId)
      .then((data) => setActions(data.heuristic_actions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dealId])

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiRequested(true)
    try {
      const data = await fetchAiNextActions(dealId)
      setAiSuggestions(data.suggestions)
    } catch {
      setAiSuggestions([{ action: "Analyse non disponible", reasoning: "Erreur", priority: "medium" }])
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (actions.length === 0 && !aiRequested) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Actions recommandées</h3>
      <div className="space-y-2">
        {actions.map((action, i) => {
          const style = PRIORITY_STYLES[action.priority]
          const Icon = style.icon
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
              <p className="text-sm">{action.message}</p>
            </div>
          )
        })}
      </div>

      {!aiRequested && (
        <Button variant="outline" size="sm" onClick={handleAiAnalysis} className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Analyse IA approfondie
        </Button>
      )}

      {aiLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyse en cours...
        </div>
      )}

      {aiSuggestions.length > 0 && (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggestions IA</h4>
          {aiSuggestions.map((s, i) => {
            const style = PRIORITY_STYLES[s.priority]
            return (
              <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1">
                <p className="text-sm font-medium">{s.action}</p>
                <p className="text-xs text-muted-foreground">{s.reasoning}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add to deal detail page**

Find the deal detail page (likely `frontend/app/(app)/deals/[id]/page.tsx`) and add the `<NextActions dealId={dealId} />` component at the top of the detail panel.

**Step 3: Build and verify**

```bash
cd frontend && npm run build
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(deals): add next best action section in deal detail"
```

---

## Task 10: AI Chat tools (6 new tools)

**Files:**
- Modify: `backend/chat/tools.py` (add 6 functions + register in ALL_TOOLS)

**Step 1: Add the 6 tool functions**

In `backend/chat/tools.py`, add before `ALL_TOOLS` (around line 3044):

```python
# ---------------------------------------------------------------------------
# Sales Analytics Tools
# ---------------------------------------------------------------------------

def get_forecast(
    ctx: RunContext[ChatDeps],
    period: str = "this_quarter",
    pipeline_name: str = "",
) -> dict:
    """Get revenue forecast categorized by commit/best case/pipeline for a period.
    Period options: this_month, this_quarter, next_quarter, this_year."""
    from deals.analytics import compute_forecast
    org_id = ctx.deps.organization_id
    pipeline_id = None
    if pipeline_name:
        p = Pipeline.objects.filter(organization_id=org_id, name__icontains=pipeline_name).first()
        if p:
            pipeline_id = str(p.id)
    result = compute_forecast(
        Organization.objects.get(id=org_id),
        period=period,
        pipeline_id=pipeline_id,
        user_id=None,
    )
    return result


def get_win_loss_analysis(
    ctx: RunContext[ChatDeps],
    period: str = "this_quarter",
) -> dict:
    """Get win/loss analysis with win rate, loss reasons breakdown, and monthly trend.
    Period options: this_month, this_quarter, last_quarter, this_year."""
    from deals.analytics import compute_win_loss
    org_id = ctx.deps.organization_id
    return compute_win_loss(Organization.objects.get(id=org_id), period=period)


def get_deal_velocity(
    ctx: RunContext[ChatDeps],
    pipeline_name: str = "",
    period: str = "last_6_months",
) -> dict:
    """Get deal velocity: average cycle time, time per stage, stagnant deals.
    Period options: last_3_months, last_6_months, this_year."""
    from deals.analytics import compute_velocity
    org_id = ctx.deps.organization_id
    pipeline = Pipeline.objects.filter(organization_id=org_id)
    if pipeline_name:
        pipeline = pipeline.filter(name__icontains=pipeline_name)
    p = pipeline.first()
    if not p:
        return {"error": "No pipeline found"}
    return compute_velocity(Organization.objects.get(id=org_id), str(p.id), period=period)


def get_leaderboard(
    ctx: RunContext[ChatDeps],
    period: str = "this_month",
) -> dict:
    """Get team leaderboard ranked by quota attainment.
    Period options: this_month, this_quarter, this_year."""
    from deals.analytics import compute_leaderboard
    org_id = ctx.deps.organization_id
    return compute_leaderboard(Organization.objects.get(id=org_id), period=period)


def get_quota_progress(
    ctx: RunContext[ChatDeps],
    user_name: str = "",
    period: str = "this_month",
) -> dict:
    """Get quota progress for a specific sales rep or the current user.
    Returns quota target, revenue closed, and attainment percentage."""
    from deals.analytics import compute_leaderboard
    org_id = ctx.deps.organization_id
    result = compute_leaderboard(Organization.objects.get(id=org_id), period=period)
    if user_name:
        for r in result.get("rankings", []):
            full_name = f"{r['user']['first_name']} {r['user']['last_name']}".lower()
            if user_name.lower() in full_name:
                return r
        return {"error": f"User '{user_name}' not found in leaderboard"}
    # Return current user's progress
    user_id = ctx.deps.user_id
    for r in result.get("rankings", []):
        if r["user"]["id"] == user_id:
            return r
    return {"error": "User not found in leaderboard"}


def get_next_actions(
    ctx: RunContext[ChatDeps],
    deal_name_or_id: str = "",
) -> dict:
    """Get recommended next actions for a deal (heuristic-based suggestions).
    Pass the deal name or ID."""
    org_id = ctx.deps.organization_id
    deal_id = _resolve_deal_id(org_id, deal_name_or_id)
    if not deal_id:
        # Try by name
        deal = Deal.objects.filter(
            organization_id=org_id, name__icontains=deal_name_or_id
        ).first()
        if not deal:
            return {"error": f"Deal '{deal_name_or_id}' not found"}
        deal_id = str(deal.id)
    else:
        deal = Deal.objects.filter(id=deal_id, organization_id=org_id).select_related("stage").first()
        if not deal:
            return {"error": "Deal not found"}

    from deals.next_actions import compute_heuristic_actions
    actions = compute_heuristic_actions(deal, Organization.objects.get(id=org_id))
    return {
        "deal": deal.name,
        "actions": actions,
    }
```

**Step 2: Register in ALL_TOOLS**

In `backend/chat/tools.py`, add to the `ALL_TOOLS` list (around line 3119):

```python
    # Sales Analytics
    get_forecast,
    get_win_loss_analysis,
    get_deal_velocity,
    get_leaderboard,
    get_quota_progress,
    get_next_actions,
```

**Step 3: Update system prompt**

In the chat system prompt (likely in `backend/chat/views.py` or a prompt file), add documentation about the new tools so the LLM knows when to use them.

**Step 4: Run tests**

```bash
cd backend && python manage.py test chat
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(chat): add 6 sales analytics AI tools"
```

---

## Task 11: Final integration test + build verification

**Step 1: Run all backend tests**

```bash
cd backend && python manage.py test
```

**Step 2: Run frontend build**

```bash
cd frontend && npm run build
```

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A && git commit -m "test: verify sales analytics integration"
```
