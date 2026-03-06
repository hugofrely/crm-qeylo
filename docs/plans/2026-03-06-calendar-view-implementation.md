# Calendar View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a custom calendar view (week + month) as an alternative to the task list in `/tasks`, with date range filtering on the backend.

**Architecture:** Backend gets `due_date_gte`/`due_date_lte` filters that bypass pagination for calendar use. Frontend adds a view toggle (list/calendar) and custom calendar components (MonthGrid, WeekGrid) built with Tailwind/shadcn. Reuses existing TaskDialog for create/edit.

**Tech Stack:** Django REST Framework, Next.js, TypeScript, Tailwind CSS, shadcn/ui

---

### Task 1: Backend — date range filter with unpaginated response

**Files:**
- Modify: `backend/tasks/views.py`
- Modify: `backend/tasks/tests.py`

**Step 1: Write the tests**

Add to `backend/tasks/tests.py` at the end of the `TaskTests` class:

```python
def test_filter_by_date_range(self):
    """Filter by due_date_gte and due_date_lte returns tasks in range."""
    self.client.post("/api/tasks/", {"description": "March 5", "due_date": "2026-03-05T10:00:00Z"})
    self.client.post("/api/tasks/", {"description": "March 10", "due_date": "2026-03-10T10:00:00Z"})
    self.client.post("/api/tasks/", {"description": "March 20", "due_date": "2026-03-20T10:00:00Z"})

    response = self.client.get("/api/tasks/?due_date_gte=2026-03-01T00:00:00Z&due_date_lte=2026-03-15T23:59:59Z")
    self.assertEqual(response.data["count"], 2)
    descriptions = [t["description"] for t in response.data["results"]]
    self.assertIn("March 5", descriptions)
    self.assertIn("March 10", descriptions)
    self.assertNotIn("March 20", descriptions)

def test_date_range_returns_unpaginated(self):
    """When due_date_gte + due_date_lte are set, all results are returned (no pagination)."""
    for i in range(25):
        self.client.post("/api/tasks/", {"description": f"Task {i}", "due_date": "2026-03-10T10:00:00Z"})

    response = self.client.get("/api/tasks/?due_date_gte=2026-03-01T00:00:00Z&due_date_lte=2026-03-31T23:59:59Z")
    self.assertEqual(response.data["count"], 25)
    self.assertEqual(len(response.data["results"]), 25)
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec -T backend python manage.py test tasks.tests.TaskTests.test_filter_by_date_range tasks.tests.TaskTests.test_date_range_returns_unpaginated -v 2`
Expected: FAIL — `test_filter_by_date_range` returns 3 tasks (no range filter), `test_date_range_returns_unpaginated` returns only 20 (paginated).

**Step 3: Implement the date range filter**

In `backend/tasks/views.py`, add the date range filter to `get_queryset()` after the `due_date` block (after line 49) and before the `assigned_to` block:

```python
        due_date_gte = params.get("due_date_gte")
        due_date_lte = params.get("due_date_lte")
        if due_date_gte:
            qs = qs.filter(due_date__gte=due_date_gte)
        if due_date_lte:
            qs = qs.filter(due_date__lte=due_date_lte)
```

Then override pagination in the `list` method. Replace the existing `list` method with:

```python
    def list(self, request, *args, **kwargs):
        params = request.query_params
        if params.get("due_date_gte") and params.get("due_date_lte"):
            qs = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(qs, many=True)
            base_qs = self._base_queryset()
            return Response({
                "count": len(serializer.data),
                "results": serializer.data,
                "todo_count": base_qs.filter(is_done=False).count(),
                "done_count": base_qs.filter(is_done=True).count(),
            })
        response = super().list(request, *args, **kwargs)
        base_qs = self._base_queryset()
        response.data["todo_count"] = base_qs.filter(is_done=False).count()
        response.data["done_count"] = base_qs.filter(is_done=True).count()
        return response
```

Add `Response` import at the top if not already present:

```python
from rest_framework.response import Response
```

**Step 4: Run tests to verify they pass**

Run: `docker compose exec -T backend python manage.py test tasks -v 2`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add backend/tasks/views.py backend/tasks/tests.py
git commit -m "feat(tasks): add due_date_gte/due_date_lte filters with unpaginated response"
```

---

### Task 2: Frontend — add date range params to services and types

**Files:**
- Modify: `frontend/types/tasks.ts`
- Modify: `frontend/services/tasks.ts`

**Step 1: Update TaskFilters type**

In `frontend/types/tasks.ts`, add to the `TaskFilters` interface:

```typescript
export interface TaskFilters {
  is_done?: "true" | "false"
  priority?: "high" | "normal" | "low"
  contact?: string
  due_date?: "overdue" | "today" | "this_week"
  assigned_to?: string
  page?: number
  due_date_gte?: string
  due_date_lte?: string
}
```

**Step 2: Update fetchTasks to pass date range params**

In `frontend/services/tasks.ts`, add after the `assigned_to` param line (line 11):

```typescript
  if (filters.due_date_gte) params.set("due_date_gte", filters.due_date_gte)
  if (filters.due_date_lte) params.set("due_date_lte", filters.due_date_lte)
```

**Step 3: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add frontend/types/tasks.ts frontend/services/tasks.ts
git commit -m "feat(frontend): add date range filter params to task types and services"
```

---

### Task 3: Frontend — CalendarTaskItem component

**Files:**
- Create: `frontend/components/tasks/CalendarTaskItem.tsx`

**Step 1: Create the component**

Create `frontend/components/tasks/CalendarTaskItem.tsx`:

```tsx
"use client"

import type { Task } from "@/types"

interface CalendarTaskItemProps {
  task: Task
  onClick: (task: Task) => void
  compact?: boolean
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  normal: "bg-blue-500",
  low: "bg-gray-400",
}

export function CalendarTaskItem({ task, onClick, compact = false }: CalendarTaskItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(task)
      }}
      className={`w-full text-left rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-muted/80 group flex items-center gap-1.5 ${
        task.is_done ? "opacity-50" : ""
      }`}
      title={task.description}
    >
      <span
        className={`inline-block shrink-0 h-1.5 w-1.5 rounded-full ${
          priorityColors[task.priority] || "bg-gray-400"
        }`}
      />
      <span className={`truncate ${task.is_done ? "line-through" : ""} ${compact ? "max-w-[80px]" : ""}`}>
        {!compact && task.due_date && (() => {
          const d = new Date(task.due_date)
          const h = d.getHours()
          const m = d.getMinutes()
          if (h === 23 && m === 59) return null
          return (
            <span className="text-muted-foreground font-medium mr-1">
              {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
            </span>
          )
        })()}
        {task.description}
      </span>
    </button>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/tasks/CalendarTaskItem.tsx
git commit -m "feat(frontend): add CalendarTaskItem component"
```

---

### Task 4: Frontend — MonthGrid component

**Files:**
- Create: `frontend/components/tasks/MonthGrid.tsx`

**Step 1: Create the component**

Create `frontend/components/tasks/MonthGrid.tsx`:

```tsx
"use client"

import type { Task } from "@/types"
import { CalendarTaskItem } from "./CalendarTaskItem"

interface MonthGridProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDateClick: (date: Date) => void
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MAX_VISIBLE = 3

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: Date[] = []

  // Days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Fill remaining to complete 6 rows (42 cells)
  while (days.length < 42) {
    const nextDay = new Date(year, month + 1, days.length - lastDay.getDate() - startOffset + 1)
    days.push(nextDay)
  }

  return days
}

export function MonthGrid({ currentDate, tasks, onTaskClick, onDateClick }: MonthGridProps) {
  const days = getMonthDays(currentDate)
  const today = new Date()

  const tasksByDate = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.due_date) continue
    const d = new Date(task.due_date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!tasksByDate.has(key)) tasksByDate.set(key, [])
    tasksByDate.get(key)!.push(task)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_NAMES.map((name) => (
          <div key={name} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
            {name}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, today)
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
          const dayTasks = tasksByDate.get(key) || []

          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${
                !isCurrentMonth ? "bg-muted/10" : ""
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <div className={`text-xs mb-1 ${
                isToday
                  ? "inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold"
                  : isCurrentMonth
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/50"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, MAX_VISIBLE).map((task) => (
                  <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} compact />
                ))}
                {dayTasks.length > MAX_VISIBLE && (
                  <div className="text-[10px] text-muted-foreground pl-1.5">
                    +{dayTasks.length - MAX_VISIBLE} autre{dayTasks.length - MAX_VISIBLE > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/tasks/MonthGrid.tsx
git commit -m "feat(frontend): add MonthGrid calendar component"
```

---

### Task 5: Frontend — WeekGrid component

**Files:**
- Create: `frontend/components/tasks/WeekGrid.tsx`

**Step 1: Create the component**

Create `frontend/components/tasks/WeekGrid.tsx`:

```tsx
"use client"

import type { Task } from "@/types"
import { CalendarTaskItem } from "./CalendarTaskItem"

interface WeekGridProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onSlotClick: (date: Date, hour?: number) => void
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const START_HOUR = 8
const END_HOUR = 20

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  // Monday = 0
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6

  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

function isAllDay(task: Task): boolean {
  if (!task.due_date) return true
  const d = new Date(task.due_date)
  return d.getHours() === 23 && d.getMinutes() === 59
}

function formatDayHeader(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}

export function WeekGrid({ currentDate, tasks, onTaskClick, onSlotClick }: WeekGridProps) {
  const weekDays = getWeekDays(currentDate)
  const today = new Date()
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  // Group tasks by day
  const tasksByDay = new Map<number, { allDay: Task[]; timed: Map<number, Task[]> }>()
  for (let i = 0; i < 7; i++) {
    tasksByDay.set(i, { allDay: [], timed: new Map() })
  }

  for (const task of tasks) {
    if (!task.due_date) continue
    const d = new Date(task.due_date)
    const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, d))
    if (dayIndex === -1) continue

    const dayData = tasksByDay.get(dayIndex)!
    if (isAllDay(task)) {
      dayData.allDay.push(task)
    } else {
      const hour = d.getHours()
      if (!dayData.timed.has(hour)) dayData.timed.set(hour, [])
      dayData.timed.get(hour)!.push(task)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className="px-2 py-2 text-center border-l">
              <div className="text-xs text-muted-foreground">{DAY_NAMES[i]}</div>
              <div className={`text-sm font-medium ${
                isToday
                  ? "inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground"
                  : ""
              }`}>
                {formatDayHeader(day)}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/10">
        <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-start justify-end pr-3 pt-2">
          Journée
        </div>
        {weekDays.map((day, i) => {
          const dayData = tasksByDay.get(i)!
          return (
            <div
              key={i}
              onClick={() => onSlotClick(day)}
              className="border-l p-1 min-h-[36px] cursor-pointer hover:bg-muted/30 transition-colors"
            >
              {dayData.allDay.map((task) => (
                <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} compact />
              ))}
            </div>
          )
        })}
      </div>

      {/* Hour slots */}
      {hours.map((hour) => (
        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
          <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-start justify-end pr-3 pt-1">
            {String(hour).padStart(2, "0")}:00
          </div>
          {weekDays.map((day, i) => {
            const dayData = tasksByDay.get(i)!
            const hourTasks = dayData.timed.get(hour) || []
            return (
              <div
                key={i}
                onClick={() => onSlotClick(day, hour)}
                className="border-l p-0.5 min-h-[48px] cursor-pointer hover:bg-muted/30 transition-colors"
              >
                {hourTasks.map((task) => (
                  <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/tasks/WeekGrid.tsx
git commit -m "feat(frontend): add WeekGrid calendar component"
```

---

### Task 6: Frontend — CalendarView container component

**Files:**
- Create: `frontend/components/tasks/CalendarView.tsx`

**Step 1: Create the component**

Create `frontend/components/tasks/CalendarView.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task, TaskFilters } from "@/types"
import { fetchTasks } from "@/services/tasks"
import { useOrganization } from "@/lib/organization"
import { MonthGrid } from "./MonthGrid"
import { WeekGrid } from "./WeekGrid"

type CalendarMode = "week" | "month"

interface CalendarViewProps {
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  onCreateTask: (prefilledDate?: string, prefilledTime?: string) => void
}

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  // Include days from previous/next month visible in grid
  const firstDay = new Date(year, month, 1)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const start = new Date(year, month, 1 - startOffset)
  const end = new Date(year, month + 1, 0)
  end.setDate(end.getDate() + (42 - (startOffset + end.getDate())))
  return {
    start: start.toISOString(),
    end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
  }
}

function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay()
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday.toISOString(), end: sunday.toISOString() }
}

function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date)
}

function formatWeekRange(date: Date): string {
  const day = date.getDay()
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })
  return `${fmt.format(monday)} - ${fmt.format(sunday)}`
}

export function CalendarView({ filters, onTaskClick, onCreateTask }: CalendarViewProps) {
  const { orgVersion } = useOrganization()
  const [mode, setMode] = useState<CalendarMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const range = mode === "month" ? getMonthRange(currentDate) : getWeekRange(currentDate)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const calendarFilters: TaskFilters = {
        ...filters,
        due_date_gte: range.start,
        due_date_lte: range.end,
      }
      // Remove list-specific filters
      delete calendarFilters.page
      delete calendarFilters.due_date
      const data = await fetchTasks(calendarFilters)
      setTasks(data.results)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters), range.start, range.end, orgVersion])

  useEffect(() => { loadTasks() }, [loadTasks])

  const navigate = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (mode === "month") {
        next.setMonth(next.getMonth() + direction)
      } else {
        next.setDate(next.getDate() + direction * 7)
      }
      return next
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const handleDateClick = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    onCreateTask(dateStr)
  }

  const handleSlotClick = (date: Date, hour?: number) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const timeStr = hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : undefined
    onCreateTask(dateStr, timeStr)
  }

  return (
    <div className="space-y-4">
      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold tracking-tight capitalize ml-2">
            {mode === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMode("week")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "week" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "month" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : mode === "month" ? (
        <MonthGrid currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onDateClick={handleDateClick} />
      ) : (
        <WeekGrid currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onSlotClick={handleSlotClick} />
      )}
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/tasks/CalendarView.tsx
git commit -m "feat(frontend): add CalendarView container component"
```

---

### Task 7: Frontend — integrate calendar view into tasks page

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`
- Modify: `frontend/components/tasks/TaskDialog.tsx`

**Step 1: Add prefilledDate/prefilledTime props to TaskDialog**

In `frontend/components/tasks/TaskDialog.tsx`, add optional props to the interface:

```typescript
interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSuccess: () => void
  prefilledDate?: string
  prefilledTime?: string
}
```

Update the component signature to accept these new props:

```typescript
export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
  prefilledDate,
  prefilledTime,
}: TaskDialogProps) {
```

Then in the `useEffect`, in the `else` block (creating new task), replace `setDueDate("")` and `setDueTime("")` with:

```typescript
setDueDate(prefilledDate || "")
setDueTime(prefilledTime || "")
```

**Step 2: Update tasks page with view toggle**

Replace `frontend/app/(app)/tasks/page.tsx` with the version that adds the list/calendar toggle. The key changes:

1. Add `viewMode` state: `const [viewMode, setViewMode] = useState<"list" | "calendar">("list")`
2. Add `prefilledDate` and `prefilledTime` state for calendar create
3. Add import for `CalendarView` and `List, Calendar as CalendarIcon` from lucide-react
4. Add view toggle icons in the header next to "Nouvelle tâche" button
5. Hide due date filter pills when in calendar mode
6. Hide pagination when in calendar mode
7. Show `CalendarView` or `TaskList` based on `viewMode`
8. Pass `prefilledDate` and `prefilledTime` to `TaskDialog`
9. Update `handleCreate` to accept optional date/time params from calendar clicks

Here is the full replacement for the page component (replace entire file):

```tsx
"use client"

import { useState } from "react"
import { updateTask } from "@/services/tasks"
import { useTasks } from "@/hooks/useTasks"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskDialog } from "@/components/tasks/TaskDialog"
import { CalendarView } from "@/components/tasks/CalendarView"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ChevronLeft, ChevronRight, Search, X, List, Calendar as CalendarIcon } from "lucide-react"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useMemberAutocomplete } from "@/hooks/useMemberAutocomplete"
import type { Task, TaskFilterTab, TaskFilters } from "@/types"

const PAGE_SIZE = 20

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = []
  pages.push(1)
  if (current > 3) pages.push("...")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function TasksPage() {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<TaskFilterTab>("todo")
  const [priority, setPriority] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [contactId, setContactId] = useState<string | null>(null)
  const [contactLabel, setContactLabel] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [assignedLabel, setAssignedLabel] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>()
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>()

  const contactAutocomplete = useContactAutocomplete()
  const memberAutocomplete = useMemberAutocomplete()

  const filters: TaskFilters = { page }
  if (tab === "todo") filters.is_done = "false"
  if (tab === "done") filters.is_done = "true"
  if (priority) filters.priority = priority as TaskFilters["priority"]
  if (dueDate) filters.due_date = dueDate as TaskFilters["due_date"]
  if (contactId) filters.contact = contactId
  if (assignedTo) filters.assigned_to = assignedTo

  const { tasks, setTasks, loading, totalCount, todoCount, doneCount, refresh } = useTasks(filters)

  const resetPage = () => setPage(1)

  const handleTabChange = (v: string) => {
    setTab(v as TaskFilterTab)
    resetPage()
  }

  const togglePriority = (p: string) => {
    setPriority(priority === p ? null : p)
    resetPage()
  }

  const toggleDueDate = (d: string) => {
    setDueDate(dueDate === d ? null : d)
    resetPage()
  }

  const clearContact = () => {
    setContactId(null)
    setContactLabel(null)
    contactAutocomplete.reset()
    resetPage()
  }

  const handleToggle = async (taskId: string, isDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_done: isDone } : t))
    )
    try {
      await updateTask(taskId, { is_done: isDone })
      refresh()
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_done: !isDone } : t))
      )
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setPrefilledDate(undefined)
    setPrefilledTime(undefined)
    setDialogOpen(true)
  }

  const handleCreate = (date?: string, time?: string) => {
    setEditingTask(null)
    setPrefilledDate(date)
    setPrefilledTime(time)
    setDialogOpen(true)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const priorityOptions = [
    { value: "high", label: "Haute" },
    { value: "normal", label: "Normale" },
    { value: "low", label: "Basse" },
  ]

  const dueDateOptions = [
    { value: "overdue", label: "En retard" },
    { value: "today", label: "Aujourd'hui" },
    { value: "this_week", label: "Cette semaine" },
  ]

  // Calendar filters: same as list but without page/due_date
  const calendarFilters: TaskFilters = {}
  if (tab === "todo") calendarFilters.is_done = "false"
  if (tab === "done") calendarFilters.is_done = "true"
  if (priority) calendarFilters.priority = priority as TaskFilters["priority"]
  if (contactId) calendarFilters.contact = contactId
  if (assignedTo) calendarFilters.assigned_to = assignedTo

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Tâches</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {todoCount} à faire, {doneCount} terminée{doneCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vue calendrier"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => handleCreate()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({todoCount + doneCount})</TabsTrigger>
          <TabsTrigger value="todo">À faire ({todoCount})</TabsTrigger>
          <TabsTrigger value="done">Terminées ({doneCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Secondary filters */}
      <div className="flex flex-wrap items-center gap-3 font-[family-name:var(--font-body)]">
        {/* Priority pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Priorité</span>
          {priorityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => togglePriority(opt.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                priority === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Due date pills — hidden in calendar mode */}
        {viewMode === "list" && (
          <>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Échéance</span>
              {dueDateOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleDueDate(opt.value)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    dueDate === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="w-px h-5 bg-border" />

        {/* Contact search */}
        <div className="relative" ref={contactAutocomplete.wrapperRef}>
          {contactId ? (
            <button
              onClick={clearContact}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors"
            >
              {contactLabel}
              <X className="h-3 w-3" />
            </button>
          ) : (
            <>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrer par contact..."
                value={contactAutocomplete.query}
                onChange={(e) => contactAutocomplete.search(e.target.value)}
                className="pl-8 h-8 w-48 text-xs bg-secondary/30 border-border/60"
              />
              {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                  {contactAutocomplete.results.map((c) => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                      onClick={() => {
                        setContactId(c.id)
                        setContactLabel(`${c.first_name} ${c.last_name}`.trim())
                        contactAutocomplete.reset()
                        resetPage()
                      }}
                    >
                      {c.first_name} {c.last_name}
                      {c.email && <span className="text-muted-foreground ml-1">({c.email})</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Assigned to filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (assignedTo === "me") {
                setAssignedTo(null)
                setAssignedLabel(null)
              } else {
                setAssignedTo("me")
                setAssignedLabel("Mes tâches")
              }
              resetPage()
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              assignedTo === "me"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            Mes tâches
          </button>

          <div className="relative" ref={memberAutocomplete.wrapperRef}>
            {assignedTo && assignedTo !== "me" ? (
              <button
                onClick={() => {
                  setAssignedTo(null)
                  setAssignedLabel(null)
                  memberAutocomplete.reset()
                  resetPage()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors"
              >
                {assignedLabel}
                <X className="h-3 w-3" />
              </button>
            ) : assignedTo !== "me" ? (
              <>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrer par assigné..."
                  value={memberAutocomplete.query}
                  onChange={(e) => memberAutocomplete.search(e.target.value)}
                  className="pl-8 h-8 w-48 text-xs bg-secondary/30 border-border/60"
                />
                {memberAutocomplete.open && memberAutocomplete.results.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                    {memberAutocomplete.results.map((m) => (
                      <button
                        key={m.user_id}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                        onClick={() => {
                          setAssignedTo(m.user_id)
                          setAssignedLabel(`${m.first_name} ${m.last_name}`.trim())
                          memberAutocomplete.reset()
                          resetPage()
                        }}
                      >
                        {m.first_name} {m.last_name}
                        {m.email && <span className="text-muted-foreground ml-1">({m.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content: List or Calendar */}
      {viewMode === "list" ? (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TaskList tasks={tasks} onToggle={handleToggle} onEdit={handleEdit} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between font-[family-name:var(--font-body)]">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers(page, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
                  ) : (
                    <Button key={p} variant={page === p ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p as number)}>
                      {p}
                    </Button>
                  )
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <CalendarView
          filters={calendarFilters}
          onTaskClick={handleEdit}
          onCreateTask={handleCreate}
        />
      )}

      {/* Task dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSuccess={refresh}
        prefilledDate={prefilledDate}
        prefilledTime={prefilledTime}
      />
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/tasks/page.tsx frontend/components/tasks/TaskDialog.tsx frontend/components/tasks/CalendarView.tsx
git commit -m "feat(frontend): integrate calendar view into tasks page with list/calendar toggle"
```

---

### Task 8: Full test suite + build verification

**Step 1: Run all backend tests**

Run: `docker compose exec -T backend python manage.py test tasks -v 2`
Expected: All tests PASS (including the 2 new date range filter tests).

**Step 2: Run frontend build check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

**Step 3: Verify in browser**

1. Go to `/tasks`
2. Click the calendar icon in the header — should switch to month view
3. Click "Semaine" — should switch to week view
4. Navigate with prev/next buttons
5. Click a day cell — should open TaskDialog with date pre-filled
6. Click a task — should open TaskDialog in edit mode
7. Click "Aujourd'hui" — should jump to current date
8. Toggle back to list view — should show normal task list
9. Priority/assignee filters should work in both views
