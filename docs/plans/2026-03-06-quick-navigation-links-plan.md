# Quick Navigation Links & Task Detail Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cross-entity navigation links throughout the CRM and create a task detail page (`/tasks/{id}`) that serves as a work hub.

**Architecture:** Create a reusable `EntityLink` component used everywhere entities reference each other. Build a new `/tasks/[id]` page that aggregates task info, linked contact details, linked deal info, contact notes, and contact timeline. Add a `fetchTask` service function.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react, Django REST Framework

---

### Task 1: Create `EntityLink` Component

**Files:**
- Create: `frontend/components/shared/EntityLink.tsx`

**Step 1: Create the EntityLink component**

```tsx
"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"

const ROUTES: Record<string, string> = {
  contact: "/contacts",
  deal: "/deals",
  task: "/tasks",
}

interface EntityLinkProps {
  type: "contact" | "deal" | "task"
  id: string
  name: string
  className?: string
}

export function EntityLink({ type, id, name, className = "" }: EntityLinkProps) {
  const href = `${ROUTES[type]}/${id}`

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors ${className}`}
    >
      <span className="truncate">{name}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </Link>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/EntityLink.tsx
git commit -m "feat: add reusable EntityLink component for cross-entity navigation"
```

---

### Task 2: Add EntityLink to TaskList

**Files:**
- Modify: `frontend/components/tasks/TaskList.tsx`

**Step 1: Add imports**

At line 5 of `TaskList.tsx`, add:
```tsx
import { EntityLink } from "@/components/shared/EntityLink"
```

**Step 2: Replace contact_name display (lines 110-115)**

Replace:
```tsx
{task.contact_name && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <User className="h-3 w-3" />
    {task.contact_name}
  </div>
)}
```

With:
```tsx
{task.contact_name && task.contact && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <User className="h-3 w-3" />
    <EntityLink type="contact" id={task.contact} name={task.contact_name} />
  </div>
)}
```

**Step 3: Replace deal_name display (lines 116-121)**

Replace:
```tsx
{task.deal_name && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <Briefcase className="h-3 w-3" />
    {task.deal_name}
  </div>
)}
```

With:
```tsx
{task.deal_name && task.deal && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <Briefcase className="h-3 w-3" />
    <EntityLink type="deal" id={task.deal} name={task.deal_name} />
  </div>
)}
```

**Step 4: Commit**

```bash
git add frontend/components/tasks/TaskList.tsx
git commit -m "feat: add EntityLink navigation to TaskList for contacts and deals"
```

---

### Task 3: Add EntityLink to ContactTasks

**Files:**
- Modify: `frontend/components/contacts/ContactTasks.tsx`

**Step 1: Add imports**

At line 3 of `ContactTasks.tsx`, add:
```tsx
import { EntityLink } from "@/components/shared/EntityLink"
```

**Step 2: Add task link**

After line 81 (`{task.description}`), add a link to the task detail page. Wrap the task description in an EntityLink:

Replace lines 79-81:
```tsx
<p className={`text-sm font-[family-name:var(--font-body)] ${task.is_done ? "line-through" : ""}`}>
  {task.description}
</p>
```

With:
```tsx
<div className="flex items-center gap-1.5">
  <p className={`text-sm font-[family-name:var(--font-body)] ${task.is_done ? "line-through" : ""} flex-1 min-w-0`}>
    {task.description}
  </p>
  <EntityLink type="task" id={task.id} name="Voir" className="shrink-0 text-[11px]" />
</div>
```

**Step 3: Commit**

```bash
git add frontend/components/contacts/ContactTasks.tsx
git commit -m "feat: add EntityLink to ContactTasks for task detail navigation"
```

---

### Task 4: Fix ContactDeals EntityLink (bug fix)

**Files:**
- Modify: `frontend/components/contacts/ContactDeals.tsx`

**Step 1: Update import**

Replace line 3:
```tsx
import Link from "next/link"
```

With:
```tsx
import Link from "next/link"
import { ExternalLink } from "lucide-react"
```

**Step 2: Fix the deal link (line 56)**

Replace:
```tsx
href={`/deals`}
```

With:
```tsx
href={`/deals/${deal.id}`}
```

**Step 3: Add ExternalLink icon**

After line 72 (the amount span closing), before `</Link>`, add:
```tsx
<ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
```

**Step 4: Commit**

```bash
git add frontend/components/contacts/ContactDeals.tsx
git commit -m "fix: ContactDeals now links to specific deal detail page instead of /deals"
```

---

### Task 5: Add EntityLink to DealCard

**Files:**
- Modify: `frontend/components/deals/DealCard.tsx`

**Step 1: Add import**

At line 7, add:
```tsx
import { EntityLink } from "@/components/shared/EntityLink"
```

**Step 2: Replace contact_name display (lines 73-78)**

Replace:
```tsx
{deal.contact_name && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <User className="h-3 w-3" />
    <span className="truncate max-w-[100px]">{deal.contact_name}</span>
  </div>
)}
```

With:
```tsx
{deal.contact_name && deal.contact && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <User className="h-3 w-3" />
    <EntityLink type="contact" id={deal.contact} name={deal.contact_name} className="max-w-[100px]" />
  </div>
)}
```

**Step 3: Commit**

```bash
git add frontend/components/deals/DealCard.tsx
git commit -m "feat: add EntityLink to DealCard for contact navigation"
```

---

### Task 6: Add EntityLink to Deal Detail Page

**Files:**
- Modify: `frontend/app/(app)/deals/[id]/page.tsx`

**Step 1: Add import**

At line 27, add:
```tsx
import { EntityLink } from "@/components/shared/EntityLink"
```

**Step 2: Make contact name clickable (lines 257-262)**

Replace:
```tsx
{deal.contact_name && (
  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
    <User className="h-3.5 w-3.5" />
    {deal.contact_name}
  </div>
)}
```

With:
```tsx
{deal.contact_name && deal.contact && (
  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
    <User className="h-3.5 w-3.5" />
    <EntityLink type="contact" id={deal.contact} name={deal.contact_name} className="text-sm" />
  </div>
)}
```

**Step 3: Commit**

```bash
git add frontend/app/(app)/deals/[id]/page.tsx
git commit -m "feat: add EntityLink to deal detail page for contact navigation"
```

---

### Task 7: Add `fetchTask` service function

**Files:**
- Modify: `frontend/services/tasks.ts`

**Step 1: Add fetchTask function**

After line 16, add:
```tsx
export async function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/`)
}
```

**Step 2: Commit**

```bash
git add frontend/services/tasks.ts
git commit -m "feat: add fetchTask service function for task detail page"
```

---

### Task 8: Create Task Detail Page

**Files:**
- Create: `frontend/app/(app)/tasks/[id]/page.tsx`

**Context needed:**
- Backend already has `GET /tasks/{id}/` via DRF's `ModelViewSet` (router registration at `backend/tasks/urls.py:6`)
- Task type has: `id`, `description`, `due_date`, `contact` (UUID|null), `contact_name`, `deal` (UUID|null), `deal_name`, `priority`, `is_done`, `assignees`, `created_at`
- Reuse patterns from `frontend/app/(app)/deals/[id]/page.tsx` for layout (back button, 2-column, cards)
- Contact data fetched via `fetchContact(id)` from `frontend/services/contacts.ts:6`
- Deal data fetched via `fetchDeal(id)` from `frontend/services/deals.ts:42`
- Contact timeline fetched via `fetchContactTimeline(id, "interactions")` from `frontend/services/contacts.ts:58`
- Contact notes fetched via `fetchContactTimeline(id, "journal")` from `frontend/services/contacts.ts:58`
- Use `ContactNotes` component from `frontend/components/contacts/ContactNotes.tsx`
- Use `ContactTimeline` (actually named `TimelineList`) from `frontend/components/contacts/ContactTimeline.tsx`
- Task update via `updateTask(id, data)` from `frontend/services/tasks.ts:22`
- Task delete via `deleteTask(id)` from `frontend/services/tasks.ts:26`

**Step 1: Create the task detail page**

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { EntityLink } from "@/components/shared/EntityLink"
import { ContactNotes } from "@/components/contacts/ContactNotes"
import { fetchTask, updateTask, deleteTask } from "@/services/tasks"
import { fetchContact, fetchContactTimeline } from "@/services/contacts"
import { fetchDeal, fetchPipelineStages } from "@/services/deals"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Calendar,
  User,
  Briefcase,
  Mail,
  Phone,
  Building2,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import type { Task, Contact, Deal, Stage, TimelineEntry } from "@/types"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "high":
      return { label: "Haute", className: "bg-red-100 text-red-700" }
    case "normal":
      return { label: "Normale", className: "bg-blue-100 text-blue-700" }
    case "low":
      return { label: "Basse", className: "bg-gray-100 text-gray-600" }
    default:
      return { label: priority, className: "bg-gray-100 text-gray-600" }
  }
}

function getSegmentConfig(segment: string) {
  switch (segment) {
    case "hot":
      return { label: "Hot", className: "bg-red-100 text-red-700" }
    case "warm":
      return { label: "Warm", className: "bg-amber-100 text-amber-700" }
    case "cold":
      return { label: "Cold", className: "bg-blue-100 text-blue-700" }
    default:
      return { label: segment, className: "bg-gray-100 text-gray-600" }
  }
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [notes, setNotes] = useState<TimelineEntry[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const loadTask = useCallback(async () => {
    try {
      const t = await fetchTask(id)
      setTask(t)
      return t
    } catch (err) {
      console.error("Failed to load task:", err)
      return null
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const t = await loadTask()
      if (!t) {
        setLoading(false)
        return
      }

      const promises: Promise<void>[] = []

      if (t.contact) {
        promises.push(
          fetchContact(t.contact).then((c) => setContact(c)).catch(console.error),
          fetchContactTimeline(t.contact, "journal").then((n) => setNotes(n)).catch(console.error),
          fetchContactTimeline(t.contact, "interactions").then((tl) => setTimeline(tl)).catch(console.error),
        )
      }

      if (t.deal) {
        promises.push(
          fetchDeal(t.deal).then((d) => setDeal(d)).catch(console.error),
          fetchPipelineStages().then((s) => setStages(s)).catch(console.error),
        )
      }

      await Promise.all(promises)
      setLoading(false)
    }
    init()
  }, [loadTask])

  const handleToggle = async () => {
    if (!task) return
    try {
      await updateTask(id, { is_done: !task.is_done })
      await loadTask()
    } catch (err) {
      console.error("Failed to toggle task:", err)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette tache ?")) return
    setDeleting(true)
    try {
      await deleteTask(id)
      toast("Tache supprimee", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreItems("task", [id])
              toast.success("Tache restauree")
            } catch {
              toast.error("Erreur lors de la restauration")
            }
          },
        },
        duration: 5000,
      })
      router.push("/tasks")
    } catch (err) {
      console.error("Failed to delete task:", err)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Tache introuvable.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/tasks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux taches
        </Button>
      </div>
    )
  }

  const priorityConfig = getPriorityConfig(task.priority)
  const stageName = deal ? stages.find((s) => s.id === deal.stage)?.name : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up font-[family-name:var(--font-body)]">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/tasks")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Retour aux taches</span>
      </Button>

      {/* Task Header */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.is_done}
            onCheckedChange={handleToggle}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-semibold ${task.is_done ? "line-through text-muted-foreground" : ""}`}>
              {task.description}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={priorityConfig.className}>{priorityConfig.label}</Badge>
              <Badge className={task.is_done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {task.is_done ? "Terminee" : "A faire"}
              </Badge>
              {task.due_date && (
                <div className={`flex items-center gap-1 text-sm ${!task.is_done && isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(task.due_date)}
                </div>
              )}
            </div>
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                {task.assignees.map((a) => (
                  <span
                    key={a.user_id}
                    title={`${a.first_name} ${a.last_name}`}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {a.first_name[0]}{a.last_name[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column — Contact & Deal cards */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-6">
          {/* Contact card */}
          {contact && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Contact
                </h2>
                <EntityLink type="contact" id={contact.id} name="Voir le contact" className="text-[11px]" />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-sm">{contact.first_name} {contact.last_name}</p>
                {contact.job_title && (
                  <p className="text-xs text-muted-foreground">{contact.job_title}</p>
                )}
                {contact.company && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {contact.company}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </div>
                )}
                {contact.lead_score && (
                  <Badge className={getSegmentConfig(contact.lead_score).className}>
                    {getSegmentConfig(contact.lead_score).label}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Deal card */}
          {deal && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  Deal
                </h2>
                <EntityLink type="deal" id={deal.id} name="Voir le deal" className="text-[11px]" />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-sm">{deal.name}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatAmount(deal.amount)}
                </div>
                {stageName && (
                  <Badge variant="secondary" className="text-xs">{stageName}</Badge>
                )}
                {deal.probability != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {deal.probability}% de probabilite
                  </div>
                )}
                {deal.expected_close && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Cloture prevue: {formatDate(deal.expected_close)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No linked entities */}
          {!contact && !deal && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun contact ou deal associe a cette tache.</p>
            </div>
          )}
        </div>

        {/* Right column — Notes & Timeline */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {contact && (
            <>
              {/* Notes */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Notes du contact</h2>
                </div>
                <div className="p-4">
                  <ContactNotes
                    notes={notes}
                    contactId={contact.id}
                    onNoteAdded={async () => {
                      const n = await fetchContactTimeline(contact.id, "journal")
                      setNotes(n)
                    }}
                  />
                </div>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm font-semibold">Activites recentes</h2>
                  </div>
                  <div className="p-4">
                    <TimelineList entries={timeline} />
                  </div>
                </div>
              )}
            </>
          )}

          {!contact && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun contact associe — les notes et l'historique s'afficheront ici quand un contact sera lie.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Important:** The `TimelineList` component needs to be imported from `ContactTimeline.tsx`. Check if it's exported — if not, add `export` to its declaration at line 143 of that file.

**Step 2: Check and export TimelineList if needed**

Read `frontend/components/contacts/ContactTimeline.tsx` and verify `TimelineList` is exported. If not, add `export` keyword.

Add the import to the task detail page:
```tsx
import { TimelineList } from "@/components/contacts/ContactTimeline"
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/tasks/\[id\]/page.tsx
git add frontend/components/contacts/ContactTimeline.tsx  # if modified
git commit -m "feat: add task detail page with contact info, deal info, notes, and timeline"
```

---

### Task 9: Update Tasks Page to Navigate to Task Detail

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Context:** Currently, clicking a task in the list calls `onEdit(task)` which opens a modal dialog. We want clicking to navigate to `/tasks/{id}` instead. The edit functionality will be accessible from the task detail page.

**Step 1: Update TaskList usage**

In `frontend/app/(app)/tasks/page.tsx`, find the `TaskList` usage (around line 164):

Replace `onEdit={handleEdit}` behavior: Change the `onEdit` callback to navigate to the task detail page.

In the `handleEdit` function (around line 90), change:
```tsx
const handleEdit = (task: Task) => {
  setEditingTask(task)
  setDialogOpen(true)
}
```

To:
```tsx
const handleEdit = (task: Task) => {
  router.push(`/tasks/${task.id}`)
}
```

Make sure `useRouter` is imported (it should already be from `next/navigation`). Check the imports at the top. If `useRouter` is not imported, add it.

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/tasks/page.tsx
git commit -m "feat: clicking a task now navigates to task detail page"
```

---

### Task 10: Verify and Test

**Step 1: Run the development server**

```bash
cd frontend && npm run dev
```

**Step 2: Manual verification checklist**

1. `/tasks` — Click a task row → navigates to `/tasks/{id}`
2. `/tasks/{id}` — Shows task header, contact card, deal card, notes, timeline
3. `/tasks/{id}` — "Retour aux taches" button works
4. `/tasks/{id}` — Toggle done/undone works
5. `/tasks/{id}` — Delete task works (with undo toast)
6. `/tasks/{id}` — EntityLink on contact card → navigates to `/contacts/{id}`
7. `/tasks/{id}` — EntityLink on deal card → navigates to `/deals/{id}`
8. `/tasks` — EntityLink on contact name in task list → navigates to `/contacts/{id}`
9. `/tasks` — EntityLink on deal name in task list → navigates to `/deals/{id}`
10. `/contacts/{id}` (Tasks tab) — "Voir" link → navigates to `/tasks/{id}`
11. `/contacts/{id}` (Deals tab) — Click deal → navigates to `/deals/{id}` (not `/deals`)
12. `/deals` — DealCard contact name → navigates to `/contacts/{id}`
13. `/deals/{id}` — Contact name → navigates to `/contacts/{id}`

**Step 3: Fix any TypeScript errors**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```
