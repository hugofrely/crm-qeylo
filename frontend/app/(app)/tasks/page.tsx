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
import { Loader2, Plus, Search, X, List, Calendar as CalendarIcon } from "lucide-react"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useMemberAutocomplete } from "@/hooks/useMemberAutocomplete"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { Pagination } from "@/components/shared/Pagination"
import type { Task, TaskFilterTab, TaskFilters } from "@/types"

const PAGE_SIZE = 20

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
  const [filterOpen, setFilterOpen] = useState(false)

  const activeFilterCount = [priority, dueDate, contactId, assignedTo].filter(Boolean).length

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
      <PageHeader
        title="Tâches"
        subtitle={`${todoCount} à faire, ${doneCount} terminée${doneCount !== 1 ? "s" : ""}`}
      >
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Vue liste">
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded-md transition-colors ${viewMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Vue calendrier">
            <CalendarIcon className="h-4 w-4" />
          </button>
        </div>
        <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
        <Button onClick={() => handleCreate()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </PageHeader>

      {/* Status tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({todoCount + doneCount})</TabsTrigger>
          <TabsTrigger value="todo">À faire ({todoCount})</TabsTrigger>
          <TabsTrigger value="done">Terminées ({doneCount})</TabsTrigger>
        </TabsList>
      </Tabs>

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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : (
        <CalendarView filters={calendarFilters} onTaskClick={handleEdit} onCreateTask={handleCreate} />
      )}

      <FilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onReset={() => { setPriority(null); setDueDate(null); setContactId(null); setContactLabel(null); contactAutocomplete.reset(); setAssignedTo(null); setAssignedLabel(null); memberAutocomplete.reset() }}
        activeFilterCount={activeFilterCount}
      >
        <FilterSection label="Priorité">
          <div className="flex flex-col gap-1">
            {priorityOptions.map((opt) => (
              <button key={opt.value} onClick={() => togglePriority(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left font-[family-name:var(--font-body)] ${
                  priority === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>
        {viewMode === "list" && (
          <FilterSection label="Échéance">
            <div className="flex flex-col gap-1">
              {dueDateOptions.map((opt) => (
                <button key={opt.value} onClick={() => toggleDueDate(opt.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left font-[family-name:var(--font-body)] ${
                    dueDate === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
        <FilterSection label="Contact">
          <div className="relative" ref={contactAutocomplete.wrapperRef}>
            {contactId ? (
              <button onClick={clearContact} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors">
                {contactLabel}
                <X className="h-3 w-3" />
              </button>
            ) : (
              <>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Filtrer par contact..." value={contactAutocomplete.query} onChange={(e) => contactAutocomplete.search(e.target.value)} className="pl-8 h-8 text-xs bg-secondary/30 border-border/60" />
                {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                    {contactAutocomplete.results.map((c) => (
                      <button key={c.id} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors" onClick={() => { setContactId(c.id); setContactLabel(`${c.first_name} ${c.last_name}`.trim()); contactAutocomplete.reset(); resetPage() }}>
                        {c.first_name} {c.last_name}
                        {c.email && <span className="text-muted-foreground ml-1">({c.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </FilterSection>
        <FilterSection label="Assigné">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { if (assignedTo === "me") { setAssignedTo(null); setAssignedLabel(null) } else { setAssignedTo("me"); setAssignedLabel("Mes tâches") }; resetPage() }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left font-[family-name:var(--font-body)] ${
                assignedTo === "me" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Mes tâches
            </button>
            <div className="relative" ref={memberAutocomplete.wrapperRef}>
              {assignedTo && assignedTo !== "me" ? (
                <button onClick={() => { setAssignedTo(null); setAssignedLabel(null); memberAutocomplete.reset(); resetPage() }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors">
                  {assignedLabel}
                  <X className="h-3 w-3" />
                </button>
              ) : assignedTo !== "me" ? (
                <>
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Filtrer par assigné..." value={memberAutocomplete.query} onChange={(e) => memberAutocomplete.search(e.target.value)} className="pl-8 h-8 text-xs bg-secondary/30 border-border/60" />
                  {memberAutocomplete.open && memberAutocomplete.results.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                      {memberAutocomplete.results.map((m) => (
                        <button key={m.user_id} className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors" onClick={() => { setAssignedTo(m.user_id); setAssignedLabel(`${m.first_name} ${m.last_name}`.trim()); memberAutocomplete.reset(); resetPage() }}>
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
        </FilterSection>
      </FilterPanel>

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
