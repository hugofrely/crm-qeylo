# Tasks Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the tasks page with the design system of contacts/deals, and make all filters (status, priority, contact, due date) work server-side with proper pagination.

**Architecture:** Add query param filtering to the Django `TaskViewSet`, update the frontend service/hook layer to pass filters as URL params, and restyle the page to match the existing design conventions.

**Tech Stack:** Django REST Framework, Next.js, React, shadcn/ui, Tailwind CSS

---

### Task 1: Backend — Add filter query params to TaskViewSet

**Files:**
- Modify: `backend/tasks/views.py`

**Step 1: Write failing tests**

Add to `backend/tasks/tests.py`:

```python
def test_filter_tasks_by_is_done(self):
    self.client.post("/api/tasks/", {"description": "Done task", "due_date": "2026-03-10T10:00:00Z"})
    create2 = self.client.post("/api/tasks/", {"description": "Todo task", "due_date": "2026-03-11T10:00:00Z"})
    self.client.patch(f"/api/tasks/{create2.data['id']}/", {"is_done": True})

    response = self.client.get("/api/tasks/?is_done=false")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "Done task")

    response = self.client.get("/api/tasks/?is_done=true")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "Todo task")

def test_filter_tasks_by_priority(self):
    self.client.post("/api/tasks/", {"description": "High", "due_date": "2026-03-10T10:00:00Z", "priority": "high"})
    self.client.post("/api/tasks/", {"description": "Low", "due_date": "2026-03-11T10:00:00Z", "priority": "low"})

    response = self.client.get("/api/tasks/?priority=high")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "High")

def test_filter_tasks_by_due_date_overdue(self):
    self.client.post("/api/tasks/", {"description": "Overdue", "due_date": "2020-01-01T10:00:00Z"})
    self.client.post("/api/tasks/", {"description": "Future", "due_date": "2030-01-01T10:00:00Z"})

    response = self.client.get("/api/tasks/?due_date=overdue")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "Overdue")

def test_counters_stay_global_with_is_done_filter(self):
    self.client.post("/api/tasks/", {"description": "Todo", "due_date": "2026-03-10T10:00:00Z"})
    create2 = self.client.post("/api/tasks/", {"description": "Done", "due_date": "2026-03-11T10:00:00Z"})
    self.client.patch(f"/api/tasks/{create2.data['id']}/", {"is_done": True})

    response = self.client.get("/api/tasks/?is_done=false")
    self.assertEqual(response.data["todo_count"], 1)
    self.assertEqual(response.data["done_count"], 1)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: FAIL — filters not implemented yet

**Step 3: Implement filters in TaskViewSet**

Modify `backend/tasks/views.py`:

```python
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def _base_queryset(self):
        return Task.objects.filter(
            organization=self.request.organization
        ).select_related("contact", "deal")

    def get_queryset(self):
        qs = self._base_queryset()
        params = self.request.query_params

        contact_id = params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)

        is_done = params.get("is_done")
        if is_done == "true":
            qs = qs.filter(is_done=True)
        elif is_done == "false":
            qs = qs.filter(is_done=False)

        priority = params.get("priority")
        if priority in ("high", "normal", "low"):
            qs = qs.filter(priority=priority)

        due_date = params.get("due_date")
        if due_date:
            now = timezone.now()
            if due_date == "overdue":
                qs = qs.filter(due_date__lt=now, is_done=False)
            elif due_date == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)
            elif due_date == "this_week":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                start -= timedelta(days=start.weekday())
                end = start + timedelta(days=7)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        base_qs = self._base_queryset()
        response.data["todo_count"] = base_qs.filter(is_done=False).count()
        response.data["done_count"] = base_qs.filter(is_done=True).count()
        return response

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: All PASS

**Step 5: Commit**

```bash
git add backend/tasks/views.py backend/tasks/tests.py
git commit -m "feat(tasks): add server-side filters (is_done, priority, due_date) to task list API"
```

---

### Task 2: Frontend — Update service and hook to pass filters

**Files:**
- Modify: `frontend/types/tasks.ts`
- Modify: `frontend/services/tasks.ts`
- Modify: `frontend/hooks/useTasks.ts`

**Step 1: Update types**

In `frontend/types/tasks.ts`, add filter params interface:

```typescript
export interface Task {
  id: string
  description: string
  due_date: string | null
  contact: string | null
  contact_name?: string
  deal: string | null
  deal_name?: string
  priority: string
  is_done: boolean
  created_at: string
}

export interface TasksResponse {
  count: number
  todo_count: number
  done_count: number
  results: Task[]
}

export type TaskFilterTab = "all" | "todo" | "done"

export interface TaskFilters {
  is_done?: "true" | "false"
  priority?: "high" | "normal" | "low"
  contact?: string
  due_date?: "overdue" | "today" | "this_week"
  page?: number
}
```

**Step 2: Update fetchTasks to accept filters**

Rewrite `frontend/services/tasks.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { Task, TasksResponse, TaskFilters } from "@/types"

export async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
  const params = new URLSearchParams()
  if (filters.page) params.set("page", String(filters.page))
  if (filters.is_done) params.set("is_done", filters.is_done)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.contact) params.set("contact", filters.contact)
  if (filters.due_date) params.set("due_date", filters.due_date)
  const qs = params.toString()
  return apiFetch<TasksResponse>(`/tasks/${qs ? `?${qs}` : ""}`)
}

export async function createTask(data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/`, { method: "POST", json: data })
}

export async function updateTask(id: string, data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/`, { method: "PATCH", json: data })
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}/`, { method: "DELETE" })
}
```

**Step 3: Update useTasks to accept and pass filters**

Rewrite `frontend/hooks/useTasks.ts`:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, TaskFilters } from "@/types"
import { fetchTasks } from "@/services/tasks"

export function useTasks(filters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [todoCount, setTodoCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchTasks(filters)
      setTasks(data.results)
      setTotalCount(data.count)
      setTodoCount(data.todo_count)
      setDoneCount(data.done_count)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { refresh() }, [refresh])

  return { tasks, setTasks, loading, totalCount, todoCount, doneCount, refresh }
}
```

**Step 4: Commit**

```bash
git add frontend/types/tasks.ts frontend/services/tasks.ts frontend/hooks/useTasks.ts
git commit -m "feat(tasks): update service and hook to pass filter query params to API"
```

---

### Task 3: Frontend — Restyle the tasks page and wire up filters

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Step 1: Rewrite the tasks page**

Replace `frontend/app/(app)/tasks/page.tsx` with:

```tsx
"use client"

import { useState } from "react"
import { updateTask } from "@/services/tasks"
import { useTasks } from "@/hooks/useTasks"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskDialog } from "@/components/tasks/TaskDialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
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
  const [tab, setTab] = useState<TaskFilterTab>("all")
  const [priority, setPriority] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [contactId, setContactId] = useState<string | null>(null)
  const [contactLabel, setContactLabel] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const contactAutocomplete = useContactAutocomplete()

  const filters: TaskFilters = { page }
  if (tab === "todo") filters.is_done = "false"
  if (tab === "done") filters.is_done = "true"
  if (priority) filters.priority = priority as TaskFilters["priority"]
  if (dueDate) filters.due_date = dueDate as TaskFilters["due_date"]
  if (contactId) filters.contact = contactId

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
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingTask(null)
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
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
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

        <div className="w-px h-5 bg-border" />

        {/* Due date pills */}
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
      </div>

      {/* Task list */}
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

      {/* Task dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} onSuccess={refresh} />
    </div>
  )
}
```

**Step 2: Verify the app builds**

Run: `cd frontend && npx next build` (or `npm run build`)
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/tasks/page.tsx
git commit -m "feat(tasks): restyle tasks page and wire up server-side filters"
```

---

### Task 4: Manual smoke test

**Step 1: Run backend tests**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: All pass

**Step 2: Start dev servers and verify**

- Visit `/tasks` — layout matches contacts/deals style
- Click "À faire" tab → only todo tasks shown, pagination correct
- Click priority pill → filters combine with tab
- Click due date pill → filters combine
- Search contact → select → tasks filtered by contact, pill shows name
- Clear contact filter → back to all
- Change any filter → page resets to 1
- Counters in tabs stay global regardless of filters

**Step 3: Final commit if any tweaks needed**
