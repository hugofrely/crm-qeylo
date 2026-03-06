# Calendar View for Tasks — Design Document

## Goal

Add a calendar view (week + month) as an alternative to the existing task list in `/tasks`, with custom Tailwind/shadcn components (no external calendar library).

## Decisions

- **Location**: Toggle Liste/Calendrier within the existing `/tasks` page (not a separate route)
- **Views**: Week + Month (no day-only view)
- **Interactions**: Click to create/edit (no drag & drop)
- **Tech**: Custom components with Tailwind/shadcn, zero external dependencies

## Architecture

### Backend

One addition: `due_date_gte` + `due_date_lte` query filters on `GET /api/tasks/`. When both are present, return all matching tasks without pagination (the calendar needs the full set for a date range, not paginated results).

### Frontend Components

| Component | Role |
|-----------|------|
| `CalendarView` | Container: manages `currentDate`, `viewType` (week/month), navigation (prev/next/today), fetches tasks for visible range |
| `MonthGrid` | 7-column grid (Mon-Sun) x 5-6 rows, displays days with task pills |
| `WeekGrid` | 7-column grid with hourly slots (8h-20h), positions timed tasks on slots |
| `CalendarTaskItem` | Clickable pill: truncated description + priority color dot |

### View Toggle

Added to the existing tasks page header, right side:

```
[< Prev] [Today] [Next >]   Mars 2026   [Week | Month]   [List | Calendar]
```

### Month View

- Classic Mon-Sun grid, 6 rows max
- Each cell: day number + task list (max 3 visible, "+N autres" overflow)
- Completed tasks: reduced opacity + strikethrough
- Priority color: red (high), blue (normal), gray (low)
- Click empty cell -> open TaskDialog with date pre-filled
- Click task -> open TaskDialog in edit mode
- Today highlighted (bg-primary/5)

### Week View

- 7 columns (Mon-Sun) with date header
- Vertical axis: 8h-20h hourly slots
- Timed tasks -> positioned on correct slot
- All-day tasks (no time / 23:59) -> banner at top of column
- Click empty slot -> TaskDialog with date + time pre-filled
- Click task -> TaskDialog edit mode

### Filters

Existing filters (priority, assignee, contact) remain active in calendar view. Date-range pills (overdue, today, this week) are hidden in calendar mode since navigation replaces them.

### Data Flow

1. `CalendarView` computes visible date range from `currentDate` + `viewType`
2. Calls `fetchTasks({ due_date_gte, due_date_lte, ...activeFilters })` (no pagination)
3. Groups tasks by date (and hour for week view)
4. Passes grouped tasks to `MonthGrid` or `WeekGrid`
5. Grid components render `CalendarTaskItem` for each task
6. On create/edit success, refetch tasks for current range
