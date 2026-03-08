# Invitation Improvement & Charts Enrichment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the invitation flow (pre-fill email, hide org field, skip org creation) and massively enrich the charts system (13 new metrics, 3 new chart types, in both the AI tool and the widget editor).

**Architecture:** Two independent chantiers. Chantier 1 modifies the register backend + frontend to conditionally skip org creation when an invite token is present. Chantier 2 extends the aggregation engine, the AI generate_chart tool, and frontend chart components/editor with new metrics and chart types.

**Tech Stack:** Django REST Framework (backend), Next.js + React + Recharts (frontend), TypeScript.

---

## Chantier 1: Invitation améliorée

### Task 1: Backend — Make organization_name optional in RegisterSerializer

**Files:**
- Modify: `backend/accounts/serializers.py:12`

**Step 1: Make organization_name optional**

In `backend/accounts/serializers.py`, change line 12:

```python
organization_name = serializers.CharField(max_length=255, required=False, default="")
```

Add `invite_token` field:

```python
invite_token = serializers.CharField(max_length=255, required=False, default="")
```

**Step 2: Commit**

```bash
git add backend/accounts/serializers.py
git commit -m "feat(invite): make organization_name optional, add invite_token field"
```

---

### Task 2: Backend — Add GET handler to accept_invitation endpoint

**Files:**
- Modify: `backend/organizations/views.py:164-198`

**Step 1: Add GET method to accept_invitation**

Change the decorator from `@api_view(["POST"])` to `@api_view(["GET", "POST"])` on `accept_invitation`.

Add GET handling at the top of the function (before the POST logic):

```python
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def accept_invitation(request, token):
    try:
        invitation = Invitation.objects.get(token=token, status="pending")
    except Invitation.DoesNotExist:
        return Response({"detail": "Invalid or expired invitation"}, status=status.HTTP_404_NOT_FOUND)
    if invitation.expires_at < timezone.now():
        invitation.status = "expired"
        invitation.save(update_fields=["status"])
        return Response({"detail": "Invitation expired"}, status=status.HTTP_410_GONE)

    # GET — return invitation info without auth
    if request.method == "GET":
        return Response({
            "email": invitation.email,
            "organization_name": invitation.organization.name,
        })

    # POST — existing logic below...
    if not request.user.is_authenticated:
        # ... rest stays the same
```

**Step 2: Commit**

```bash
git add backend/organizations/views.py
git commit -m "feat(invite): add GET on accept_invitation to return invite info"
```

---

### Task 3: Backend — Conditional org creation in register view

**Files:**
- Modify: `backend/accounts/views.py:18-66`

**Step 1: Update register to handle invite_token**

After `user = User.objects.create_user(...)`, add conditional logic:

```python
invite_token = data.get("invite_token", "")
org = None

if invite_token:
    # Try to accept invitation directly — skip org creation
    try:
        invitation = Invitation.objects.get(token=invite_token, status="pending")
        if invitation.expires_at >= timezone.now():
            Membership.objects.create(
                organization=invitation.organization,
                user=user,
                role=invitation.role,
            )
            invitation.status = "accepted"
            invitation.save(update_fields=["status"])
            org = invitation.organization
    except Invitation.DoesNotExist:
        pass

if not org:
    # Default behavior — create personal org
    org_name = data.get("organization_name") or f"Organisation de {user.first_name}"
    org = Organization.objects.create(
        name=org_name,
        slug=f"user-{user.id.hex[:8]}",
    )
    Membership.objects.create(
        organization=org,
        user=user,
        role="owner",
    )
    Pipeline.create_defaults(org)
    from deals.models import DealLossReason
    DealLossReason.create_defaults(org)
    from organizations.models import OrganizationSettings
    OrganizationSettings.objects.create(organization=org)
    from contacts.scoring import create_default_scoring_rules
    create_default_scoring_rules(org)

# Auto-accept other pending invitations for this email (keep existing logic)
pending = Invitation.objects.filter(email=user.email, status="pending")
for invitation in pending:
    if invitation.expires_at >= timezone.now():
        Membership.objects.create(
            organization=invitation.organization,
            user=user,
            role=invitation.role,
        )
        invitation.status = "accepted"
        invitation.save(update_fields=["status"])
```

**Step 2: Commit**

```bash
git add backend/accounts/views.py
git commit -m "feat(invite): skip org creation when registering via invite token"
```

---

### Task 4: Frontend — Update register page to read invite params

**Files:**
- Modify: `frontend/app/(auth)/register/page.tsx`

**Step 1: Add useSearchParams and invite state**

Add imports and state:

```tsx
import { useState, useEffect, FormEvent, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
```

Wrap the component logic in an inner component to use `useSearchParams` (Next.js requires Suspense boundary).

Add state variables:

```tsx
const searchParams = useSearchParams()
const inviteToken = searchParams.get("invite") || ""
const inviteEmail = searchParams.get("email") || ""
const [organizationName, setOrganizationName] = useState("")
const [inviteOrgName, setInviteOrgName] = useState("")
```

**Step 2: Pre-fill email and fetch org name**

```tsx
useEffect(() => {
  if (inviteEmail) {
    setEmail(inviteEmail)
  }
}, [inviteEmail])

useEffect(() => {
  if (inviteToken) {
    apiFetch<{ email: string; organization_name: string }>(
      `/invite/accept/${inviteToken}/`,
      { method: "GET", noAuth: true }
    )
      .then((data) => setInviteOrgName(data.organization_name))
      .catch(() => {})
  }
}, [inviteToken])
```

**Step 3: Update the register call**

```tsx
await register({
  email,
  password,
  first_name: firstName,
  last_name: lastName,
  organization_name: inviteToken ? "" : organizationName,
  invite_token: inviteToken,
})
```

**Step 4: Update the auth context register type**

In `frontend/lib/auth.tsx:41-47`, update the formData type to include optional `invite_token`:

```tsx
async (formData: {
  email: string
  password: string
  first_name: string
  last_name: string
  organization_name: string
  invite_token?: string
}) => {
```

**Step 5: Conditionally render the form**

- If `inviteToken` is set: show a banner "Vous rejoignez l'organisation **{inviteOrgName}**", hide the organization name field, make email read-only
- If no invite: show the form as-is

```tsx
{inviteOrgName && (
  <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm font-[family-name:var(--font-body)]">
    Vous rejoignez l&apos;organisation <span className="font-semibold">{inviteOrgName}</span>
  </div>
)}

{!inviteToken && (
  <div className="space-y-2">
    <Label htmlFor="organizationName" ...>Nom de votre organisation</Label>
    <Input id="organizationName" ... />
  </div>
)}

{/* Email input: make readOnly if inviteEmail */}
<Input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  readOnly={!!inviteToken}
  className={`h-12 bg-secondary/50 border-border/60 focus:bg-background transition-colors ${inviteToken ? "opacity-60 cursor-not-allowed" : ""}`}
  ...
/>
```

**Step 6: Commit**

```bash
git add frontend/app/\(auth\)/register/page.tsx frontend/lib/auth.tsx
git commit -m "feat(invite): pre-fill email, hide org field, pass invite_token on register"
```

---

## Chantier 2: Charts enrichis

### Task 5: Backend — Enrich aggregation engine with new metrics and group_by options

**Files:**
- Modify: `backend/reports/aggregation.py:20-81`

**Step 1: Add new group_by and metrics**

Update `SOURCE_CONFIG`:

```python
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
            "outcome": "stage__is_won",  # NEW — groups by won/lost
        },
        "date_fields": ["created_at", "closed_at", "updated_at"],
        "allowed_filters": ["stage__name__in", "stage__pipeline__id", "stage__is_won", "stage__is_lost"],
    },
    "contacts": {
        "model": Contact,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "source": "source",
            "lead_score": "lead_score",
            "category": "categories__name",  # NEW
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["source", "lead_score", "categories__name"],
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
            "user": "created_by__email",  # NEW
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["entry_type", "created_by"],
    },
    "quotes": {
        "model": Quote,
        "metrics": {
            "count": Count("id"),
            "sum:amount": Sum("deal__amount"),  # NEW — use deal amount as proxy
            "avg:amount": Avg("deal__amount"),   # NEW
        },
        "group_by": {
            "status": "status",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["status"],
    },
}
```

**Step 2: Update _format_label for outcome**

Add handling for boolean outcome in `_format_label`:

```python
def _format_label(value, group_by):
    if value is None:
        return "N/A"
    if group_by == "outcome":
        return "Gagné" if value else "En cours / Perdu"
    # ... rest stays the same
```

**Step 3: Commit**

```bash
git add backend/reports/aggregation.py
git commit -m "feat(charts): enrich aggregation with outcome, category, user group_by and quote amounts"
```

---

### Task 6: Backend — Add 13 new metrics to generate_chart AI tool

**Files:**
- Modify: `backend/chat/tools.py:2328-2610`

**Step 1: Update the docstring with new metrics**

Update the docstring of `generate_chart` to include:

```
metric: one of deals_count, deals_amount, deals_by_stage, deals_amount_by_stage,
deals_avg_amount_by_stage, deals_won_vs_lost, deals_amount_won_vs_lost,
deals_conversion_rate, deals_duration_by_stage, deals_amount_by_pipeline,
contacts_count, contacts_by_source, contacts_by_category, contacts_by_lead_score,
tasks_count, tasks_by_priority, tasks_completion_rate,
activities_by_type, activities_by_user,
revenue_over_time, pipeline_funnel, emails_sent, workflow_executions,
quotes_amount_by_status, quotes_acceptance_rate.

chart_type: bar, line, pie, donut, stacked_bar, area, funnel (default bar).
```

**Step 2: Add new metric implementations**

After the `deals_by_stage` metric block (line ~2421), add:

```python
elif metric == "deals_amount_by_stage":
    title = "Montant total par étape"
    series_label = "Montant"
    color = "#10b981"
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("stage__name")
        .annotate(value=Sum("amount"))
        .order_by("stage__position")
    )
    data = [{"label": r["stage__name"] or "Sans étape", "value": float(r["value"] or 0)} for r in data]

elif metric == "deals_avg_amount_by_stage":
    title = "Montant moyen par étape"
    series_label = "Montant moyen"
    color = "#6366f1"
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("stage__name")
        .annotate(value=Avg("amount"))
        .order_by("stage__position")
    )
    data = [{"label": r["stage__name"] or "Sans étape", "value": round(float(r["value"] or 0), 2)} for r in data]

elif metric == "deals_won_vs_lost":
    title = "Deals gagnés vs perdus"
    series_label = "Deals"
    color = "#22c55e"
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    won = qs.filter(stage__is_won=True).count()
    lost = qs.filter(stage__is_lost=True).count()
    data = [
        {"label": "Gagné", "value": won},
        {"label": "Perdu", "value": lost},
    ]

elif metric == "deals_amount_won_vs_lost":
    title = "Montant gagné vs perdu"
    series_label = "Montant"
    color = "#10b981"
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    won_amount = qs.filter(stage__is_won=True).aggregate(v=Sum("amount"))["v"] or 0
    lost_amount = qs.filter(stage__is_lost=True).aggregate(v=Sum("amount"))["v"] or 0
    data = [
        {"label": "Gagné", "value": float(won_amount)},
        {"label": "Perdu", "value": float(lost_amount)},
    ]

elif metric == "deals_conversion_rate":
    title = "Taux de conversion par étape"
    series_label = "% conversion"
    color = "#3b82f6"
    stages = PipelineStage.objects.filter(
        pipeline__organization_id=org_id,
    ).order_by("position")
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    total = qs.count() or 1
    data = []
    for stage in stages:
        count = qs.filter(stage=stage).count()
        data.append({"label": stage.name, "value": round(count / total * 100, 1)})

elif metric == "deals_duration_by_stage":
    title = "Durée moyenne par étape (jours)"
    series_label = "Jours"
    color = "#f59e0b"
    from deals.models import DealStageTransition
    stages = PipelineStage.objects.filter(
        pipeline__organization_id=org_id,
    ).order_by("position")
    data = []
    for stage in stages:
        transitions = DealStageTransition.objects.filter(
            deal__organization_id=org_id,
            to_stage=stage,
        )
        if date_from:
            transitions = transitions.filter(transitioned_at__gte=date_from)
        durations = []
        for t in transitions:
            next_t = DealStageTransition.objects.filter(
                deal=t.deal,
                transitioned_at__gt=t.transitioned_at,
            ).order_by("transitioned_at").first()
            if next_t:
                durations.append((next_t.transitioned_at - t.transitioned_at).total_seconds() / 86400)
        avg_days = round(sum(durations) / len(durations), 1) if durations else 0
        data.append({"label": stage.name, "value": avg_days})

elif metric == "deals_amount_by_pipeline":
    title = "Montant par pipeline"
    series_label = "Montant"
    color = "#8b5cf6"
    qs = Deal.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("stage__pipeline__name")
        .annotate(value=Sum("amount"))
        .order_by("-value")
    )
    data = [{"label": r["stage__pipeline__name"] or "Sans pipeline", "value": float(r["value"] or 0)} for r in data]

elif metric == "contacts_by_lead_score":
    title = "Contacts par score de lead"
    series_label = "Contacts"
    color = "#f97316"
    qs = Contact.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    from django.db.models import Case, When, CharField, Value
    qs = qs.annotate(
        score_bucket=Case(
            When(lead_score__gte=80, then=Value("Chaud (80+)")),
            When(lead_score__gte=50, then=Value("Tiède (50-79)")),
            When(lead_score__gte=20, then=Value("Froid (20-49)")),
            default=Value("Très froid (0-19)"),
            output_field=CharField(),
        )
    )
    data = list(
        qs.values("score_bucket")
        .annotate(value=Count("id"))
        .order_by("-value")
    )
    data = [{"label": r["score_bucket"], "value": r["value"]} for r in data]

elif metric == "activities_by_type":
    title = "Activités par type"
    series_label = "Activités"
    color = "#a855f7"
    qs = TimelineEntry.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("entry_type")
        .annotate(value=Count("id"))
        .order_by("-value")
    )
    data = [{"label": r["entry_type"] or "Autre", "value": r["value"]} for r in data]

elif metric == "activities_by_user":
    title = "Activités par membre"
    series_label = "Activités"
    color = "#14b8a6"
    qs = TimelineEntry.objects.filter(organization_id=org_id).exclude(created_by=None)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("created_by__first_name", "created_by__last_name")
        .annotate(value=Count("id"))
        .order_by("-value")
    )
    data = [
        {"label": f"{r['created_by__first_name']} {r['created_by__last_name']}".strip() or "Inconnu", "value": r["value"]}
        for r in data
    ]

elif metric == "quotes_amount_by_status":
    title = "Montant des devis par statut"
    series_label = "Montant"
    color = "#0ea5e9"
    qs = Quote.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    data = list(
        qs.values("status")
        .annotate(value=Sum("deal__amount"))
        .order_by("-value")
    )
    data = [{"label": r["status"] or "Autre", "value": float(r["value"] or 0)} for r in data]

elif metric == "quotes_acceptance_rate":
    title = "Taux d'acceptation des devis"
    series_label = "% accepté"
    color = "#22c55e"
    qs = Quote.objects.filter(organization_id=org_id)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    total = qs.count() or 1
    accepted = qs.filter(status="accepted").count()
    rejected = qs.filter(status="rejected").count()
    pending = qs.filter(status__in=["draft", "sent"]).count()
    data = [
        {"label": "Accepté", "value": accepted},
        {"label": "Rejeté", "value": rejected},
        {"label": "En attente", "value": pending},
    ]
```

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(charts): add 13 new metrics to generate_chart AI tool"
```

---

### Task 7: Frontend — Add donut, stacked_bar, area chart types to WidgetChart

**Files:**
- Modify: `frontend/types/reports.ts:2`
- Modify: `frontend/components/reports/WidgetChart.tsx`

**Step 1: Update WidgetConfig type**

In `frontend/types/reports.ts`, update line 2:

```typescript
type: "line_chart" | "bar_chart" | "pie_chart" | "donut_chart" | "stacked_bar_chart" | "area_chart" | "kpi_card" | "table" | "funnel_chart" | "forecast_chart" | "win_loss_chart" | "loss_reasons_chart" | "velocity_chart" | "leaderboard_table" | "quota_progress"
```

**Step 2: Add imports in WidgetChart.tsx**

Add `AreaChart, Area` to the Recharts import:

```tsx
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts"
```

**Step 3: Add donut_chart rendering**

After the `pie_chart` block (after line 326), add:

```tsx
if (widget.type === "donut_chart") {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data.data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.data.map((_, i) => (
              <Cell
                key={i}
                fill={COLORS[i % COLORS.length]}
                style={{
                  opacity: activeIndex !== null && activeIndex !== i ? 0.3 : 1,
                  transition: "opacity 150ms ease",
                }}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const entry = payload[0]
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.payload?.fill }} />
                    <span className="font-medium">{entry.name}</span>
                    <span>{formatValue(Number(entry.value) ?? 0)}</span>
                  </div>
                </div>
              )
            }}
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 20 }}>
        <div className="text-center">
          <div className="text-2xl font-light">{formatValue(data.total)}</div>
          <div className="text-[10px] text-muted-foreground">{metric}</div>
        </div>
      </div>
      <ChartLegend
        items={data.data.map((d, i) => ({ label: d.label, value: formatValue(d.value), color: COLORS[i % COLORS.length] }))}
        activeIndex={activeIndex}
        onEnter={onLegendEnter}
        onLeave={onLegendLeave}
      />
    </div>
  )
}
```

**Step 4: Add stacked_bar_chart rendering**

```tsx
if (widget.type === "stacked_bar_chart") {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip active={active} payload={payload} label={label} metric={metric} />
            )}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
            isAnimationActive={false}
          />
          <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={data.data.map((d, i) => ({ label: d.label, value: formatValue(d.value), color: COLORS[i % COLORS.length] }))}
        activeIndex={activeIndex}
        onEnter={onLegendEnter}
        onLeave={onLegendLeave}
        metric={metric}
      />
    </div>
  )
}
```

**Step 5: Add area_chart rendering**

```tsx
if (widget.type === "area_chart") {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip active={active} payload={payload} label={label} metric={metric} />
          )}
          isAnimationActive={false}
        />
        <Area type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} fill="url(#areaGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

**Step 6: Commit**

```bash
git add frontend/types/reports.ts frontend/components/reports/WidgetChart.tsx
git commit -m "feat(charts): add donut, stacked_bar, area chart types"
```

---

### Task 8: Frontend — Enrich WidgetEditor with new metrics, group_by, and chart types

**Files:**
- Modify: `frontend/components/reports/WidgetEditor.tsx:23-89`

**Step 1: Add new chart types**

Update `CHART_TYPES` array:

```typescript
const CHART_TYPES = [
  { value: "bar_chart", label: "Barres" },
  { value: "line_chart", label: "Lignes" },
  { value: "pie_chart", label: "Camembert" },
  { value: "donut_chart", label: "Donut" },
  { value: "stacked_bar_chart", label: "Barres empilées" },
  { value: "area_chart", label: "Aire" },
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

**Step 2: Add new metrics by source**

```typescript
const METRICS_BY_SOURCE: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "count", label: "Nombre" },
    { value: "sum:amount", label: "Somme des montants" },
    { value: "avg:amount", label: "Montant moyen" },
  ],
  contacts: [{ value: "count", label: "Nombre" }],
  tasks: [{ value: "count", label: "Nombre" }],
  activities: [{ value: "count", label: "Nombre" }],
  quotes: [
    { value: "count", label: "Nombre" },
    { value: "sum:amount", label: "Somme des montants" },
    { value: "avg:amount", label: "Montant moyen" },
  ],
}
```

**Step 3: Add new group_by options**

```typescript
const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "stage", label: "Par étape" },
    { value: "pipeline", label: "Par pipeline" },
    { value: "outcome", label: "Par résultat (gagné/perdu)" },
  ],
  contacts: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "source", label: "Par source" },
    { value: "lead_score", label: "Par score" },
    { value: "category", label: "Par catégorie" },
  ],
  tasks: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "priority", label: "Par priorité" },
    { value: "is_done", label: "Par statut" },
  ],
  activities: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "entry_type", label: "Par type" },
    { value: "user", label: "Par membre" },
  ],
  quotes: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "status", label: "Par statut" },
  ],
}
```

**Step 4: Commit**

```bash
git add frontend/components/reports/WidgetEditor.tsx
git commit -m "feat(charts): enrich widget editor with new metrics, group_by, and chart types"
```

---

### Task 9: Frontend — Handle new chart types from AI tool in chat

**Files:**
- Search for: chat component that renders AI-generated charts
- Likely: `frontend/components/chat/ChatMessage.tsx` or similar

**Step 1: Find and update the chart rendering in chat**

The AI tool returns `chart.type` as `bar`, `line`, `pie`, `donut`, `stacked_bar`, `area`, `funnel`. The chat component likely maps these to widget types. Ensure the mapping includes:

```typescript
const chartTypeMap: Record<string, string> = {
  bar: "bar_chart",
  line: "line_chart",
  pie: "pie_chart",
  donut: "donut_chart",
  stacked_bar: "stacked_bar_chart",
  area: "area_chart",
  funnel: "funnel_chart",
}
```

**Step 2: Commit**

```bash
git add <files>
git commit -m "feat(charts): map new AI chart types to widget renderers in chat"
```

---

### Task 10: Final verification and cleanup

**Step 1: Run backend tests**

```bash
cd backend && python manage.py test --parallel
```

**Step 2: Run frontend build**

```bash
cd frontend && npm run build
```

**Step 3: Fix any TypeScript or Python errors**

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix any remaining issues from invitation + charts enrichment"
```
