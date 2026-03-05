# Tasks Page Redesign — Design

## Problem
1. Style inconsistency: tasks page uses different padding, typography, and layout than contacts/deals pages
2. Filtering is client-side on paginated results, causing incorrect counts and broken pagination
3. No filters for priority, contact, or due date

## Design

### Backend — New Query Params on `GET /tasks/`

| Param | Values | Behavior |
|-------|--------|----------|
| `is_done` | `true` / `false` | Filter by completion status |
| `priority` | `high` / `normal` / `low` | Filter by priority |
| `contact` | UUID (already exists) | Filter by contact |
| `due_date` | `overdue` / `today` / `this_week` | Filter by due date range |

- `todo_count` and `done_count` are always computed on the **unfiltered** queryset (before `is_done` filter) so tab counters stay global
- Pagination applies after all filters

### Frontend — Style Alignment

- Layout: `p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up`
- Header: `text-3xl tracking-tight`, no icon, subtitle with `font-[family-name:var(--font-body)]`
- Button: "Nouvelle tache" aligned right

### Frontend — Filters

- **Tabs (shadcn)** for all/todo/done — sends `is_done` query param to API
- **Secondary filter row** below tabs:
  - Priority pills (Haute / Normale / Basse) — toggle style like contact categories
  - Due date pills (En retard / Aujourd'hui / Cette semaine)
  - Contact select/search dropdown
- Changing any filter resets page to 1
- All filtering is server-side — no client-side filtering

### Frontend — Data Layer

- `fetchTasks(params)` builds URL with all query params
- `useTasks(filters)` accepts filter state and passes to `fetchTasks`
- Removes client-side `filteredTasks` logic
