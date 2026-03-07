# Sales Analytics Design — Forecasting, Win/Loss, Velocity, Quotas, Leaderboard, Next Best Action

**Date:** 2026-03-07
**Status:** Approved

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 sales analytics features to the CRM: revenue forecasting by category, structured win/loss analysis, deal velocity metrics, monthly sales quotas, team leaderboard, and hybrid next best action suggestions (heuristics + AI).

**Architecture:** All features built on existing data (`Deal`, `DealStageTransition`, `PipelineStage`) with 2 new models (`DealLossReason`, `SalesQuota`), new fields on `Deal` and `PipelineStage`, 6 new API endpoints, 6 new dashboard widget types, and 6 new AI chat tools.

**Tech Stack:** Django 5 + DRF (backend), Next.js 16 + shadcn/ui + Tailwind CSS 4 + Recharts (frontend), Pydantic AI (chat tools)

---

## Data Model Changes

### New Models

#### DealLossReason
- `id` UUIDField (primary key)
- `organization` FK to Organization
- `name` CharField (max 100)
- `order` IntegerField (default 0)
- `is_default` BooleanField (default False)
- Unique constraint: `(organization, name)`

Default reasons seeded per organization:
1. Prix trop eleve
2. Concurrent choisi
3. Pas de budget
4. Mauvais timing
5. Pas de besoin reel
6. Pas de reponse
7. Autre

#### SalesQuota
- `id` UUIDField (primary key)
- `organization` FK to Organization
- `user` FK to User (the sales rep)
- `month` DateField (first of the month)
- `target_amount` DecimalField(12, 2)
- `created_at` DateTimeField (auto)
- `updated_at` DateTimeField (auto)
- Unique constraint: `(organization, user, month)`

### Modified Models

#### Deal (add fields)
- `loss_reason` FK to DealLossReason (nullable)
- `loss_comment` TextField (nullable, blank)
- `won_at` DateTimeField (nullable)
- `lost_at` DateTimeField (nullable)

#### PipelineStage (add fields)
- `is_won` BooleanField (default False)
- `is_lost` BooleanField (default False)

---

## Feature 1: Forecasting (Category-Based)

### Logic

Three categories based on deal probability:
- **Commit**: probability >= 80% (quasi-certain deals)
- **Best Case**: probability >= 40% and < 80% (probable deals)
- **Pipeline**: probability < 40% (exploration deals)

Forecast = sum of `amount * probability / 100` per category, grouped by month. Only open deals (not in is_won/is_lost stages) with `expected_close` in the period.

### API

`GET /api/deals/forecast/`

Parameters:
- `pipeline` (optional)
- `period`: `this_month`, `this_quarter`, `next_quarter`, `this_year`
- `user` (optional)

Response:
```json
{
  "period": "this_quarter",
  "months": [
    {
      "month": "2026-03",
      "commit": { "count": 5, "total": 45000, "weighted": 38000 },
      "best_case": { "count": 8, "total": 62000, "weighted": 35000 },
      "pipeline": { "count": 12, "total": 95000, "weighted": 22000 },
      "total_weighted": 95000,
      "quota": 100000,
      "closed_won": 32000
    }
  ],
  "summary": {
    "commit": 120000,
    "best_case": 95000,
    "pipeline": 65000,
    "total_weighted": 280000,
    "total_quota": 300000,
    "total_closed_won": 88000
  }
}
```

### Widget

Type: `forecast_chart`
- Stacked bar chart by month (3 colors: commit, best case, pipeline)
- Overlay line for quota target
- Overlay line for closed won (actual)

---

## Feature 2: Win/Loss Analysis

### Loss Capture UX

When a deal is moved to a stage with `is_lost=true` (via Kanban drag or edit):
1. A modal dialog opens automatically
2. Select dropdown with organization's `DealLossReason` options
3. Optional textarea for free-form comment
4. Deal is only moved after form submission
5. `lost_at` is set automatically

When a deal is moved to a stage with `is_won=true`:
- `won_at` is set automatically

### API

`GET /api/deals/win-loss/`

Parameters:
- `period`: `this_month`, `this_quarter`, `last_quarter`, `this_year`
- `pipeline` (optional)
- `user` (optional)

Response:
```json
{
  "period": "this_quarter",
  "summary": {
    "won": { "count": 15, "total_amount": 180000 },
    "lost": { "count": 8, "total_amount": 95000 },
    "win_rate": 65.2
  },
  "loss_reasons": [
    { "reason": "Prix trop eleve", "count": 3, "total_amount": 42000, "percentage": 37.5 },
    { "reason": "Concurrent choisi", "count": 2, "total_amount": 28000, "percentage": 25.0 }
  ],
  "trend": [
    { "month": "2026-01", "won": 4, "lost": 3, "win_rate": 57.1 },
    { "month": "2026-02", "won": 5, "lost": 2, "win_rate": 71.4 },
    { "month": "2026-03", "won": 6, "lost": 3, "win_rate": 66.7 }
  ]
}
```

### Widgets

- `win_loss_chart`: Bar chart won vs lost by month + win rate line
- `loss_reasons_chart`: Donut chart of loss reasons with amounts

---

## Feature 3: Deal Velocity

### Logic

Calculated from existing `DealStageTransition.duration_in_previous`:
- **Average time per stage**: mean of `duration_in_previous` for each stage
- **Average sales cycle**: time between deal `created_at` and `won_at` (won deals only)
- **Stagnant deals**: deals where current time in stage exceeds average + 1 standard deviation

### API

`GET /api/deals/velocity/`

Parameters:
- `period`: `last_3_months`, `last_6_months`, `this_year`
- `pipeline` (required)
- `user` (optional)

Response:
```json
{
  "pipeline": "Prospection",
  "period": "last_6_months",
  "avg_cycle_days": 34.5,
  "median_cycle_days": 28,
  "stages": [
    { "stage": "Premier contact", "avg_days": 5.2, "median_days": 4, "deal_count": 42 },
    { "stage": "En discussion", "avg_days": 8.7, "median_days": 7, "deal_count": 38 },
    { "stage": "Devis envoye", "avg_days": 6.1, "median_days": 5, "deal_count": 30 },
    { "stage": "Negociation", "avg_days": 12.3, "median_days": 10, "deal_count": 22 }
  ],
  "stagnant_deals": [
    {
      "id": "...",
      "name": "Deal X",
      "stage": "Negociation",
      "days_in_stage": 25,
      "avg_for_stage": 12.3,
      "amount": 15000
    }
  ]
}
```

### Widget

Type: `velocity_chart`
- Horizontal bar chart: average time per stage (visualizes bottlenecks)
- KPI card variant: average sales cycle in days

---

## Feature 4: Quotas

### Admin UI

In organization settings (`/settings`), new **Quotas** tab:
- Table: rows = team members, columns = months
- Inline-editable cells (amount in currency)
- "Apply to all" button to set same quota for entire team for a month
- "Copy previous month" button to duplicate quotas

### API

- `GET /api/quotas/?month=2026-03` — List quotas for the month
- `POST /api/quotas/` — Create/update a quota `{ user, month, target_amount }`
- `POST /api/quotas/bulk/` — Bulk update `{ quotas: [{ user, month, target_amount }] }`

---

## Feature 5: Leaderboard

### Logic

Computed view from deals with `won_at` in the period, joined with `SalesQuota`.

### API

`GET /api/deals/leaderboard/`

Parameters:
- `period`: `this_month`, `this_quarter`, `this_year`
- `pipeline` (optional)

Response:
```json
{
  "period": "this_month",
  "rankings": [
    {
      "user": { "id": "...", "first_name": "Alice", "last_name": "Martin" },
      "deals_won": 5,
      "revenue_closed": 62000,
      "quota": 80000,
      "quota_attainment": 77.5,
      "avg_deal_size": 12400,
      "win_rate": 71.4
    }
  ]
}
```

### Widgets

- `leaderboard_table`: Table ranked by quota_attainment desc, with colored progress bars (green >80%, yellow 50-80%, red <50%)
- `quota_progress`: KPI card showing connected user's quota progress (circular gauge)

---

## Feature 6: Next Best Action (Hybrid)

### Heuristic Rules

Evaluated server-side, returned instantly:

| Rule | Condition | Suggestion | Priority |
|------|-----------|------------|----------|
| Deal dormant | No activity in 7 days | "Relancer le contact" | high |
| No quote in nego | Stage is_lost=false, is_won=false, stage order >= 3 and no quote | "Creer un devis" | high |
| Close date passed | expected_close < today, deal still open | "Mettre a jour la date ou cloturer" | high |
| No contact | contact is null | "Associer un contact" | medium |
| Low prob in late stage | Stage order >= 3 and probability < 30% | "Reevaluer la probabilite" | medium |
| Stagnant deal | Time in stage > 2x average | "Debloquer ou disqualifier" | medium |
| No next step | No future task linked | "Planifier une prochaine action" | low |

### API

`GET /api/deals/{id}/next-actions/`

Response:
```json
{
  "heuristic_actions": [
    {
      "type": "deal_dormant",
      "priority": "high",
      "message": "Aucune activite depuis 12 jours. Relancez le contact.",
      "suggested_action": "log_interaction",
      "days_since_activity": 12
    }
  ],
  "ai_analysis_available": true
}
```

`POST /api/deals/{id}/next-actions/ai/`

Sends deal context to LLM via Pydantic AI. Response:
```json
{
  "suggestions": [
    {
      "action": "Proposer une demo technique au CTO mentionne dans les notes",
      "reasoning": "Le deal stagne en phase de discussion. Les notes mentionnent un CTO hesitant.",
      "priority": "high"
    }
  ]
}
```

### UX

- "Actions recommandees" section at top of deal detail panel
- Heuristic suggestions displayed immediately (colored badges by priority)
- "Analyse IA approfondie" button calls `/ai/` endpoint and displays below
- Each heuristic suggestion has a clickable CTA (e.g., "Relancer" opens interaction form)

---

## AI Chat Tools (6 new)

| Tool | Description |
|------|-------------|
| `get_forecast` | Returns categorized forecast (commit/best case/pipeline) for a period |
| `get_win_loss_analysis` | Returns win rate, loss reasons, trend |
| `get_deal_velocity` | Returns avg cycle, time per stage, stagnant deals |
| `get_leaderboard` | Returns team ranking |
| `get_quota_progress` | Returns quota progress for a sales rep |
| `get_next_actions` | Returns recommended actions for a deal |

---

## Summary

| Feature | Backend | Frontend | AI |
|---------|---------|----------|----|
| Forecasting | 1 endpoint, computed from Deal | 1 widget `forecast_chart` | 1 tool |
| Win/Loss | 1 endpoint + DealLossReason model + Deal fields | 2 widgets + loss capture modal | 1 tool |
| Velocity | 1 endpoint, computed from DealStageTransition | 1 widget + stagnation alerts | 1 tool |
| Quotas | SalesQuota model + 3 endpoints | Settings tab + 1 widget | 1 tool |
| Leaderboard | 1 endpoint, computed | 1 widget (table) | 1 tool |
| Next Best Action | 1 heuristic endpoint + 1 AI endpoint | Deal detail section | 1 tool |

**New models:** DealLossReason, SalesQuota
**New fields on Deal:** loss_reason, loss_comment, won_at, lost_at
**New fields on PipelineStage:** is_won, is_lost
**New widget types:** 6 (forecast_chart, win_loss_chart, loss_reasons_chart, velocity_chart, leaderboard_table, quota_progress)
**New AI tools:** 6
