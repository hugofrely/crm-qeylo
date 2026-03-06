# Custom Reports — Design Document

**Goal:** Add customizable reports to the CRM — a configurable dashboard and a dedicated `/reports` module where users create custom reports with widgets, backed by a generic aggregation engine.

**Architecture:** Widget-based. A `Report` model stores a list of widget configurations (JSON). A single aggregation endpoint handles all data queries. Recharts (via shadcn/ui charts) for visualization. 5 pre-configured report templates provided out of the box.

**Tech Stack:** Django REST Framework, Next.js, TypeScript, Tailwind CSS, shadcn/ui, Recharts

---

## Data Model

### Report model

```python
class Report(models.Model):
    id = UUIDField(primary_key=True, default=uuid4)
    organization = ForeignKey(Organization, on_delete=CASCADE)
    created_by = ForeignKey(User, on_delete=CASCADE)
    name = CharField(max_length=200)
    description = TextField(blank=True)
    is_template = BooleanField(default=False)
    widgets = JSONField(default=list)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Widget configuration (JSON schema)

```json
{
  "id": "uuid",
  "type": "line_chart | bar_chart | pie_chart | kpi_card | table",
  "title": "Revenu mensuel",
  "source": "deals | contacts | tasks | activities | quotes",
  "metric": "count | sum:amount | avg:amount | sum:total_ttc",
  "group_by": "month | week | stage | priority | source | assigned_to | status | pipeline | lead_score | category | entry_type | is_done",
  "filters": {
    "stage__name__in": ["Gagné"],
    "date_field": "closed_at",
    "date_range": "last_6_months"
  },
  "size": "small | medium | large"
}
```

---

## Backend API

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/reports/` | List reports for the org (custom + templates) |
| `POST` | `/api/reports/` | Create a custom report |
| `GET` | `/api/reports/{id}/` | Report detail |
| `PATCH` | `/api/reports/{id}/` | Update report (name, widgets, etc.) |
| `DELETE` | `/api/reports/{id}/` | Delete a custom report |
| `POST` | `/api/reports/aggregate/` | Execute an aggregation query |

### Aggregation endpoint

`POST /api/reports/aggregate/`

Request:
```json
{
  "source": "deals",
  "metric": "sum:amount",
  "group_by": "month",
  "date_field": "closed_at",
  "date_range": "last_6_months",
  "filters": { "stage__name__in": ["Gagné"] }
}
```

Response:
```json
{
  "data": [
    { "label": "oct. 2025", "value": 12500 },
    { "label": "nov. 2025", "value": 18000 },
    { "label": "déc. 2025", "value": 9200 }
  ],
  "total": 39700
}
```

### Sources and available metrics

| Source | Metrics | Group by | Date fields |
|--------|---------|----------|-------------|
| `deals` | count, sum:amount, avg:amount | month, week, stage, pipeline, assigned_to | created_at, closed_at, updated_at |
| `contacts` | count | month, week, source, lead_score, category | created_at |
| `tasks` | count | month, week, priority, assigned_to, is_done | due_date, created_at |
| `activities` | count | month, week, entry_type, assigned_to | created_at |
| `quotes` | count, sum:total_ttc, avg:total_ttc | month, week, status | created_at |

### Supported date_range values

`this_month`, `last_month`, `last_3_months`, `last_6_months`, `last_12_months`, `this_year`, `custom` (with `date_from`/`date_to`)

### Security

- Always filter by the user's organization
- Filter fields are whitelisted per source — no arbitrary field access
- `group_by` maps server-side to Django `TruncMonth`/`TruncWeek`/`values()`

---

## Frontend

### Navigation

Add "Rapports" entry in the sidebar (`/reports`), between "Tâches" and settings.

### Pages

**`/reports`** — Report list
- Header "Rapports" + "Nouveau rapport" button
- "Templates" section: cards for pre-configured reports (icon + name + short description)
- "Mes rapports" section: user's custom reports
- Click a report → `/reports/{id}`

**`/reports/{id}`** — Report view
- Header: editable report name, global date range selector, "Ajouter un widget" button
- Responsive widget grid (CSS grid, 1-2-3 columns based on widget `size`: small/medium/large)
- Each widget: title, Recharts chart, ... menu (edit, duplicate, delete)

### Components

| Component | Role |
|-----------|------|
| `ReportCard` | Report card in the list (name, description, date) |
| `ReportView` | Report visualization page with widget grid |
| `ReportWidget` | Widget container (title, loading state, action menu) |
| `WidgetChart` | Dispatches to the right chart type (line, bar, pie, kpi, table) |
| `WidgetEditor` | Dialog for configuring a widget (source, metric, group_by, filters, chart type) |
| `DateRangeSelector` | Global date range selector for the report |

### Dashboard integration

The existing dashboard (`/dashboard`) becomes a special `is_template=True` report with the 4 KPI cards + deals-by-stage as widgets. Users can customize it by adding/removing widgets, saved to a report linked to their profile.

### Pre-configured templates (5)

1. **Performance commerciale** — Revenue by month (line), deals won vs lost (bar), average deal amount (KPI)
2. **Pipeline** — Deals by stage (bar), pipeline value by stage (pie), conversion rate (KPI)
3. **Activite equipe** — Activities by type (bar), tasks completed per member (bar), overdue tasks (KPI)
4. **Contacts & Sources** — New contacts by month (line), distribution by source (pie), by lead score (bar)
5. **Devis** — Quotes by status (pie), total amount by month (line), acceptance rate (KPI)

---

## Testing

### Backend
- Model: CRUD Report (create, list, update, delete), verify templates cannot be deleted by users
- Aggregation: Test each source (deals, contacts, tasks, activities, quotes) with different group_by and metric combinations. Verify date_range filtering and custom filters
- Security: User cannot access reports from another organization. Non-whitelisted filter fields are rejected

### Frontend
- TypeScript verification (`tsc --noEmit`)
- Visual test of all 5 pre-configured templates with existing data
