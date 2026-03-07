# AI Usage Tracking - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track AI token consumption per organization and user with a dashboard showing costs, breakdowns, and trends.

**Architecture:** New Django app `ai_usage` with a single `AIUsageLog` model. Utility function in the app logs each AI call. Existing AI call sites (chat, contact summary, title generation) instrumented to call the logger. New DRF API endpoints serve aggregated data to a Next.js dashboard page at `/settings/ai-usage`.

**Tech Stack:** Django/DRF (backend), Next.js/React/recharts/shadcn (frontend), pydantic-ai `RunUsage` for token counts.

---

### Task 1: Create the `ai_usage` Django app and model

**Files:**
- Create: `backend/ai_usage/__init__.py`
- Create: `backend/ai_usage/models.py`
- Create: `backend/ai_usage/admin.py`
- Create: `backend/ai_usage/apps.py`
- Modify: `backend/config/settings.py:49` (add to INSTALLED_APPS)

**Step 1: Create the app directory and files**

```bash
mkdir -p backend/ai_usage
touch backend/ai_usage/__init__.py
```

**Step 2: Create `apps.py`**

```python
# backend/ai_usage/apps.py
from django.apps import AppConfig

class AiUsageConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "ai_usage"
```

**Step 3: Create the model**

```python
# backend/ai_usage/models.py
import uuid
from django.db import models
from django.conf import settings


class AIUsageLog(models.Model):
    class CallType(models.TextChoices):
        CHAT = "chat", "Chat"
        CONTACT_SUMMARY = "contact_summary", "Contact Summary"
        TITLE_GENERATION = "title_generation", "Title Generation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    call_type = models.CharField(max_length=30, choices=CallType.choices)
    model_name = models.CharField(max_length=100)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    conversation = models.ForeignKey(
        "chat.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_usage_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["call_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.call_type} - {self.input_tokens}in/{self.output_tokens}out - {self.organization}"
```

**Step 4: Create admin registration**

```python
# backend/ai_usage/admin.py
from django.contrib import admin
from .models import AIUsageLog


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("call_type", "model_name", "input_tokens", "output_tokens", "estimated_cost", "organization", "user", "created_at")
    list_filter = ("call_type", "model_name", "organization")
    readonly_fields = ("id", "created_at")
```

**Step 5: Add to `INSTALLED_APPS` in `backend/config/settings.py`**

Add `"ai_usage",` after `"trash",` in the INSTALLED_APPS list (line 48).

**Step 6: Generate and run migration**

```bash
cd backend && python manage.py makemigrations ai_usage && python manage.py migrate
```

**Step 7: Commit**

```bash
git add backend/ai_usage/ backend/config/settings.py
git commit -m "feat: create ai_usage app with AIUsageLog model"
```

---

### Task 2: Create pricing constants and tracking utility

**Files:**
- Create: `backend/ai_usage/pricing.py`
- Create: `backend/ai_usage/tracking.py`

**Step 1: Create pricing constants**

```python
# backend/ai_usage/pricing.py
from decimal import Decimal

# Prices in USD per million tokens
AI_PRICING = {
    "claude-sonnet-4-20250514": {
        "input": Decimal("3.00"),
        "output": Decimal("15.00"),
    },
    "claude-opus-4-6": {
        "input": Decimal("15.00"),
        "output": Decimal("75.00"),
    },
}

MILLION = Decimal("1000000")


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    """Calculate estimated cost in USD for a given model and token counts."""
    pricing = AI_PRICING.get(model)
    if not pricing:
        return Decimal("0")
    input_cost = pricing["input"] * Decimal(input_tokens) / MILLION
    output_cost = pricing["output"] * Decimal(output_tokens) / MILLION
    return input_cost + output_cost
```

**Step 2: Create tracking utility**

```python
# backend/ai_usage/tracking.py
import logging
from django.conf import settings as django_settings
from .models import AIUsageLog
from .pricing import calculate_cost

logger = logging.getLogger(__name__)


def log_ai_usage(
    organization,
    user,
    call_type: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    conversation=None,
):
    """Log an AI API call with token usage and estimated cost."""
    try:
        cost = calculate_cost(model, input_tokens, output_tokens)
        AIUsageLog.objects.create(
            organization=organization,
            user=user,
            call_type=call_type,
            model_name=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost,
            conversation=conversation,
        )
    except Exception:
        logger.exception("Failed to log AI usage")


async def alog_ai_usage(
    organization,
    user,
    call_type: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    conversation=None,
):
    """Async version of log_ai_usage."""
    try:
        cost = calculate_cost(model, input_tokens, output_tokens)
        await AIUsageLog.objects.acreate(
            organization=organization,
            user=user,
            call_type=call_type,
            model_name=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost,
            conversation=conversation,
        )
    except Exception:
        logger.exception("Failed to log AI usage")
```

**Step 3: Commit**

```bash
git add backend/ai_usage/pricing.py backend/ai_usage/tracking.py
git commit -m "feat: add AI pricing constants and tracking utility"
```

---

### Task 3: Instrument chat `send_message` (sync endpoint)

**Files:**
- Modify: `backend/chat/views.py:339-354`

**Step 1: Add import at top of `chat/views.py`**

Add after the existing imports (around line 38):

```python
from ai_usage.tracking import log_ai_usage, alog_ai_usage
from ai_usage.models import AIUsageLog
```

**Step 2: Log usage after `agent.run_sync()` in `send_message`**

After line 353 (`ai_text = result.output`), before `actions = _extract_actions(...)`, add:

```python
        # Log AI usage
        usage = result.usage()
        log_ai_usage(
            organization=org,
            user=request.user,
            call_type=AIUsageLog.CallType.CHAT,
            model=settings.AI_MODEL,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            conversation=conv,
        )
```

**Step 3: Commit**

```bash
git add backend/chat/views.py
git commit -m "feat: instrument chat send_message with AI usage tracking"
```

---

### Task 4: Instrument chat `stream_message` (SSE endpoint)

**Files:**
- Modify: `backend/chat/views.py:480-577`

**Step 1: Pass a `usage` object to `run_stream_events`**

In the `event_generator` function inside `stream_message`, before the `try` block (around line 495), add:

```python
        from pydantic_ai.usage import RunUsage
        run_usage = RunUsage()
        run_kwargs["usage"] = run_usage
```

**Step 2: Log usage after stream completes**

After the assistant message is saved (after line 549 `assistant_msg = await ChatMessage.objects.acreate(...)`), add:

```python
            # Log AI usage
            await alog_ai_usage(
                organization=org,
                user=user,
                call_type=AIUsageLog.CallType.CHAT,
                model=settings.AI_MODEL,
                input_tokens=run_usage.input_tokens,
                output_tokens=run_usage.output_tokens,
                conversation=conv,
            )
```

**Step 3: Commit**

```bash
git add backend/chat/views.py
git commit -m "feat: instrument chat stream_message with AI usage tracking"
```

---

### Task 5: Instrument title generation

**Files:**
- Modify: `backend/chat/views.py:236-269`

**Step 1: Update `_generate_title_async` to accept org, user, and conv params**

Replace the function signature and add logging. The function currently has no access to org/user/conv, so we need to pass them. Update signature:

```python
async def _generate_title_async(user_message: str, assistant_message: str, org=None, user_obj=None, conv=None) -> str:
```

After `result = await agent.run(...)` (line 244), add:

```python
        if org and user_obj:
            usage = result.usage()
            await alog_ai_usage(
                organization=org,
                user=user_obj,
                call_type=AIUsageLog.CallType.TITLE_GENERATION,
                model=settings.AI_MODEL,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                conversation=conv,
            )
```

**Step 2: Update `_generate_title_sync` similarly**

```python
def _generate_title_sync(user_message: str, assistant_message: str, org=None, user_obj=None, conv=None) -> str:
```

After `result = agent.run_sync(...)`, add:

```python
        if org and user_obj:
            usage = result.usage()
            log_ai_usage(
                organization=org,
                user=user_obj,
                call_type=AIUsageLog.CallType.TITLE_GENERATION,
                model=settings.AI_MODEL,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                conversation=conv,
            )
```

**Step 3: Update call sites to pass the new params**

In `send_message` (line 372):
```python
        conv.title = _generate_title_sync(user_message, ai_text, org=org, user_obj=request.user, conv=conv)
```

In `stream_message` `event_generator` (line 554):
```python
                title = await _generate_title_async(user_message, full_text, org=org, user_obj=user, conv=conv)
```

**Step 4: Commit**

```bash
git add backend/chat/views.py
git commit -m "feat: instrument title generation with AI usage tracking"
```

---

### Task 6: Instrument contact AI summary

**Files:**
- Modify: `backend/contacts/ai_summary.py:63-90`

**Step 1: Add import**

At top of file, add:

```python
from ai_usage.tracking import log_ai_usage
from ai_usage.models import AIUsageLog
```

**Step 2: Log usage after `agent.run_sync()` in `generate_ai_summary`**

After `result = agent.run_sync(prompt)` (line 85), before saving to contact, add:

```python
        usage = result.usage()
        log_ai_usage(
            organization=contact.organization,
            user=contact.organization.memberships.first().user,  # attribute to org owner
            call_type=AIUsageLog.CallType.CONTACT_SUMMARY,
            model=settings.AI_MODEL,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
        )
```

Note: Contact summary is triggered in a background thread, so we use the sync version. We attribute the usage to the first member of the organization (the owner) since there is no request user context.

**Step 3: Commit**

```bash
git add backend/contacts/ai_summary.py
git commit -m "feat: instrument contact AI summary with usage tracking"
```

---

### Task 7: Create API endpoints for AI usage data

**Files:**
- Create: `backend/ai_usage/views.py`
- Create: `backend/ai_usage/urls.py`
- Modify: `backend/config/urls.py:29`

**Step 1: Create the views**

```python
# backend/ai_usage/views.py
from datetime import timedelta

from django.db.models import Sum, Count, F, Avg
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIUsageLog


def _check_superuser(request):
    if not request.user.is_superuser:
        return Response(status=status.HTTP_403_FORBIDDEN)
    return None


def _get_filtered_qs(request):
    """Return a filtered queryset based on query params."""
    qs = AIUsageLog.objects.all()

    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    org_id = request.query_params.get("organization_id")
    user_id = request.query_params.get("user_id")

    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    if org_id:
        qs = qs.filter(organization_id=org_id)
    if user_id:
        qs = qs.filter(user_id=user_id)

    return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_summary(request):
    """Global summary with KPIs."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    agg = qs.aggregate(
        total_cost=Sum("estimated_cost"),
        total_input_tokens=Sum("input_tokens"),
        total_output_tokens=Sum("output_tokens"),
        total_calls=Count("id"),
        avg_cost=Avg("estimated_cost"),
    )

    # Previous period for comparison
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    prev_agg = None
    if start_date and end_date:
        from datetime import date
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        delta = end - start
        prev_start = start - delta - timedelta(days=1)
        prev_end = start - timedelta(days=1)
        prev_qs = AIUsageLog.objects.filter(
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end,
        )
        org_id = request.query_params.get("organization_id")
        user_id = request.query_params.get("user_id")
        if org_id:
            prev_qs = prev_qs.filter(organization_id=org_id)
        if user_id:
            prev_qs = prev_qs.filter(user_id=user_id)
        prev_agg = prev_qs.aggregate(
            total_cost=Sum("estimated_cost"),
            total_calls=Count("id"),
        )

    return Response({
        "total_cost": float(agg["total_cost"] or 0),
        "total_input_tokens": agg["total_input_tokens"] or 0,
        "total_output_tokens": agg["total_output_tokens"] or 0,
        "total_calls": agg["total_calls"],
        "avg_cost_per_call": float(agg["avg_cost"] or 0),
        "previous_period": {
            "total_cost": float(prev_agg["total_cost"] or 0),
            "total_calls": prev_agg["total_calls"],
        } if prev_agg else None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_by_user(request):
    """Breakdown by user."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    data = (
        qs.values(
            "user__id", "user__email", "user__first_name", "user__last_name",
        )
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("-total_cost")
    )

    return Response([
        {
            "user_id": str(row["user__id"]),
            "email": row["user__email"],
            "name": f"{row['user__first_name']} {row['user__last_name']}".strip(),
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_by_type(request):
    """Breakdown by call type."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    data = (
        qs.values("call_type")
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("-total_cost")
    )

    return Response([
        {
            "call_type": row["call_type"],
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_timeline(request):
    """Time series data for charts."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    granularity = request.query_params.get("granularity", "day")

    trunc_fn = {"day": TruncDate, "week": TruncWeek, "month": TruncMonth}.get(
        granularity, TruncDate
    )

    data = (
        qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("period")
    )

    return Response([
        {
            "period": str(row["period"]),
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_top_consumers(request):
    """Top organizations and users by cost."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    limit = int(request.query_params.get("limit", 5))

    top_orgs = (
        qs.values("organization__id", "organization__name")
        .annotate(total_cost=Sum("estimated_cost"), total_calls=Count("id"))
        .order_by("-total_cost")[:limit]
    )

    top_users = (
        qs.values("user__id", "user__email", "user__first_name", "user__last_name")
        .annotate(total_cost=Sum("estimated_cost"), total_calls=Count("id"))
        .order_by("-total_cost")[:limit]
    )

    return Response({
        "top_organizations": [
            {
                "organization_id": str(row["organization__id"]),
                "name": row["organization__name"],
                "total_cost": float(row["total_cost"] or 0),
                "total_calls": row["total_calls"],
            }
            for row in top_orgs
        ],
        "top_users": [
            {
                "user_id": str(row["user__id"]),
                "email": row["user__email"],
                "name": f"{row['user__first_name']} {row['user__last_name']}".strip(),
                "total_cost": float(row["total_cost"] or 0),
                "total_calls": row["total_calls"],
            }
            for row in top_users
        ],
    })
```

**Step 2: Create the URL configuration**

```python
# backend/ai_usage/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("summary/", views.usage_summary),
    path("by-user/", views.usage_by_user),
    path("by-type/", views.usage_by_type),
    path("timeline/", views.usage_timeline),
    path("top-consumers/", views.usage_top_consumers),
]
```

**Step 3: Register in main URL config**

In `backend/config/urls.py`, add after the trash line (line 28):

```python
    path("api/ai-usage/", include("ai_usage.urls")),
```

**Step 4: Commit**

```bash
git add backend/ai_usage/views.py backend/ai_usage/urls.py backend/config/urls.py
git commit -m "feat: add AI usage API endpoints"
```

---

### Task 8: Create frontend service for AI usage API

**Files:**
- Create: `frontend/services/ai-usage.ts`
- Create: `frontend/types/ai-usage.ts`

**Step 1: Create TypeScript types**

```typescript
// frontend/types/ai-usage.ts
export interface UsageSummary {
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
  avg_cost_per_call: number
  previous_period: {
    total_cost: number
    total_calls: number
  } | null
}

export interface UsageByUser {
  user_id: string
  email: string
  name: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface UsageByType {
  call_type: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface UsageTimelinePoint {
  period: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface TopConsumers {
  top_organizations: {
    organization_id: string
    name: string
    total_cost: number
    total_calls: number
  }[]
  top_users: {
    user_id: string
    email: string
    name: string
    total_cost: number
    total_calls: number
  }[]
}
```

**Step 2: Create the service**

```typescript
// frontend/services/ai-usage.ts
import { apiFetch } from "@/lib/api"
import type {
  UsageSummary,
  UsageByUser,
  UsageByType,
  UsageTimelinePoint,
  TopConsumers,
} from "@/types/ai-usage"

interface UsageParams {
  start_date?: string
  end_date?: string
  organization_id?: string
  user_id?: string
}

function buildQuery(params: UsageParams & Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return ""
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")
}

export async function fetchUsageSummary(params: UsageParams = {}): Promise<UsageSummary> {
  return apiFetch<UsageSummary>(`/ai-usage/summary/${buildQuery(params)}`)
}

export async function fetchUsageByUser(params: UsageParams = {}): Promise<UsageByUser[]> {
  return apiFetch<UsageByUser[]>(`/ai-usage/by-user/${buildQuery(params)}`)
}

export async function fetchUsageByType(params: UsageParams = {}): Promise<UsageByType[]> {
  return apiFetch<UsageByType[]>(`/ai-usage/by-type/${buildQuery(params)}`)
}

export async function fetchUsageTimeline(
  params: UsageParams & { granularity?: string } = {}
): Promise<UsageTimelinePoint[]> {
  return apiFetch<UsageTimelinePoint[]>(`/ai-usage/timeline/${buildQuery(params)}`)
}

export async function fetchTopConsumers(
  params: UsageParams & { limit?: string } = {}
): Promise<TopConsumers> {
  return apiFetch<TopConsumers>(`/ai-usage/top-consumers/${buildQuery(params)}`)
}
```

**Step 3: Commit**

```bash
git add frontend/services/ai-usage.ts frontend/types/ai-usage.ts
git commit -m "feat: add frontend service and types for AI usage API"
```

---

### Task 9: Create the AI Usage dashboard page

**Files:**
- Create: `frontend/app/(app)/settings/ai-usage/page.tsx`

**Step 1: Create the dashboard page**

This is a large component. Use the `frontend-design` skill for implementation.

The page should include:
- Period selector (7d/30d/90d/custom) as toggle buttons
- Organization and user filter dropdowns
- 4 KPI cards: Total Cost, Total Tokens, Total Calls, Avg Cost/Call
- Each KPI card shows percentage change vs previous period
- Line chart (recharts `LineChart`) for cost evolution over time with optional previous period overlay
- Pie chart (recharts `PieChart`) for breakdown by call type
- Two horizontal bar charts (recharts `BarChart`) for top 5 organizations and top 5 users
- Data table at the bottom with pagination

Key implementation details:
- Use `useEffect` to fetch data when filters change
- Format costs as `$X.XXXX` (4 decimal places for small amounts)
- Format token counts with thousand separators
- Call type labels: `chat` -> "Chat", `contact_summary` -> "Resume contact", `title_generation` -> "Generation titre"
- Use existing shadcn components: `Card`, `Badge`, `Select`, `Button`, `Table`
- Use `recharts` (already in dependencies) for all charts
- Responsive layout with CSS grid
- Follow existing design patterns from `frontend/app/(app)/settings/page.tsx`
- Gate access: if `user.is_superuser` is false, redirect or show "Access denied"

The page fetches all 5 endpoints in parallel on mount and when filters change.

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/settings/ai-usage/page.tsx
git commit -m "feat: add AI usage dashboard page"
```

---

### Task 10: Add navigation link for superusers

**Files:**
- Modify: `frontend/app/(app)/settings/page.tsx`

**Step 1: Add AI Usage link in the settings page**

After the "Organisation" link section (around line 363), add a new link card visible only to superusers:

```tsx
{user?.is_superuser && (
  <Link href="/settings/ai-usage" className="block">
    <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div className="font-[family-name:var(--font-body)]">
            <p className="text-sm font-medium">Consommation IA</p>
            <p className="text-xs text-muted-foreground">
              Suivre les couts et tokens par organisation et utilisateur
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  </Link>
)}
```

Add `Activity` to the lucide-react imports at the top of the file.

**Step 2: Ensure `is_superuser` is available in the auth context**

Check `frontend/lib/auth.ts` and the `/api/auth/me/` endpoint — the user object needs to include `is_superuser`. If not already present, add it to the serializer and the frontend User type.

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/settings/page.tsx
git commit -m "feat: add AI usage link in settings for superusers"
```

---

### Task 11: Verify `is_superuser` is exposed in auth API

**Files:**
- Potentially modify: `backend/accounts/serializers.py` (add `is_superuser` field)
- Potentially modify: `frontend/types/index.ts` or equivalent (add `is_superuser` to User type)

**Step 1: Check the accounts serializer**

Read `backend/accounts/serializers.py` and verify `is_superuser` is in the `me` endpoint response. If not, add it.

**Step 2: Check the frontend User type**

Verify the User type in the frontend includes `is_superuser: boolean`. If not, add it.

**Step 3: Commit if changes were needed**

```bash
git add backend/accounts/ frontend/types/ frontend/lib/
git commit -m "feat: expose is_superuser in auth API"
```

---

### Task 12: End-to-end testing

**Step 1: Start the backend and frontend**

```bash
docker compose up -d
```

**Step 2: Verify the migration ran**

```bash
docker compose exec backend python manage.py showmigrations ai_usage
```

**Step 3: Test the API endpoints**

Use the browser or curl to hit each endpoint as a superuser:
- `GET /api/ai-usage/summary/?start_date=2026-01-01&end_date=2026-03-07`
- `GET /api/ai-usage/by-user/`
- `GET /api/ai-usage/by-type/`
- `GET /api/ai-usage/timeline/?granularity=day`
- `GET /api/ai-usage/top-consumers/`

**Step 4: Trigger AI calls and verify logging**

- Send a chat message via the CRM
- View a contact to trigger summary generation
- Check the `ai_usage_aiusagelog` table for new entries

**Step 5: Verify the dashboard renders**

- Navigate to `/settings/ai-usage` as a superuser
- Verify all charts and KPIs display correctly
- Verify non-superuser cannot see the link or access the page

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: AI usage tracking - complete implementation"
```
