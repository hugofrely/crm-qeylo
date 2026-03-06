# Dashboard Redesign — Design Document

## Goal

Replace the static 4-metric dashboard with a configurable, widget-based dashboard featuring temporal charts (revenue over time, contacts per week, deals won per month) and KPI cards with period-over-period comparison deltas.

## Architecture

**Dashboard = a special Report.** Add `is_dashboard` boolean + `user` FK to the existing `Report` model. Each user gets their own dashboard report, auto-created on first access with default widgets. Modifications go through the existing `PATCH /api/reports/{id}/` endpoint.

**Aggregation with comparison.** Extend `POST /api/reports/aggregate/` to accept `compare: true`. When enabled, the engine calculates the equivalent previous period and returns `previous_total` and `delta_percent` alongside the normal response.

**New date ranges.** Add `today` and `this_week` to `_resolve_date_range()` for daily KPI cards.

## Backend

### Report model changes

Add to `Report`:
- `is_dashboard: BooleanField(default=False)`
- `user: ForeignKey(User, null=True, blank=True)` — null for org-level reports, set for personal dashboards

### Aggregation engine — comparison mode

When `compare: true`:
1. Compute main period normally
2. Compute previous period using mapping:
   - `today` -> yesterday
   - `this_week` -> last week
   - `this_month` -> last month
   - `last_3_months` -> 3 months before that
   - `this_year` -> last year
3. Return enriched response:
   ```json
   {
     "data": [...],
     "total": 15000,
     "previous_total": 12000,
     "delta_percent": 25.0
   }
   ```

### Dashboard endpoint

Replace `GET /api/dashboard/stats/` with `GET /api/dashboard/`:
- Returns user's dashboard report (creates with default widgets if not found)
- Uses `ReportSerializer`

### Default widgets (8)

| # | Title | Type | Source | Metric | Group By | Date Range | Size |
|---|-------|------|--------|--------|----------|------------|------|
| 1 | Contacts aujourd'hui | kpi_card | contacts | count | - | today | small |
| 2 | Revenu ce mois | kpi_card | deals | sum:amount | - | this_month | small |
| 3 | Pipeline actif | kpi_card | deals | sum:amount | - | all (filter: exclude won/lost) | small |
| 4 | Taches du jour | kpi_card | tasks | count | - | today | small |
| 5 | CA mensuel | line_chart | deals | sum:amount | month | last_6_months | medium |
| 6 | Nouveaux contacts | bar_chart | contacts | count | week | last_3_months | medium |
| 7 | Deals gagnes / mois | bar_chart | deals | count | month | last_6_months | small |
| 8 | Deals par etape | bar_chart | deals | count | stage | all | large |

KPI cards (widgets 1-4) use `compare: true` to show delta vs previous period.

## Frontend

### Dashboard page (`/dashboard`)

1. Call `GET /api/dashboard/` to get the dashboard report
2. For each widget, call `POST /api/reports/aggregate/` (with `compare: true` for KPI cards)
3. Render in responsive CSS Grid

### Layout

```
Row 1: 4x KPI cards (small) with comparison deltas
Row 2: 2x temporal charts (medium) — CA mensuel + Contacts/semaine
Row 3: 1x small + 1x large chart — Deals gagnes + Deals par etape
```

### Components

**Reused from reports module:**
- `WidgetChart` — renders bar/line/pie/kpi/table
- `WidgetEditor` — dialog for configuring widget properties
- `ReportWidget` — container with title + dropdown menu

**New: enhanced KPI card rendering in `WidgetChart`**
- Large value display
- Delta badge: green up arrow for positive, red down arrow for negative
- Context text ("vs hier", "vs mois dernier")

**"Personnaliser" button** — toggles edit mode to add/remove/modify widgets (same UX as report detail page).

## Tests

### Backend
- `_resolve_date_range()` for `today` and `this_week`
- `aggregate()` with `compare: true` — returns `previous_total` and `delta_percent`
- `GET /api/dashboard/` — auto-creates dashboard on first call, returns same on second
- Default dashboard has 8 widgets

### Frontend
- TypeScript compiles (`npx tsc --noEmit`)
- Visual verification in browser
