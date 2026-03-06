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
