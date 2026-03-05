"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskDialog } from "@/components/tasks/TaskDialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"

interface Task {
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

interface TasksResponse {
  count: number
  results: Task[]
}

type FilterTab = "all" | "todo" | "done"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<TasksResponse>("/tasks/")
      setTasks(data.results)
    } catch (err) {
      console.error("Failed to fetch tasks:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleToggle = async (taskId: string, isDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_done: isDone } : t))
    )

    try {
      await apiFetch(`/tasks/${taskId}/`, {
        method: "PATCH",
        json: { is_done: isDone },
      })
    } catch (err) {
      console.error("Failed to update task:", err)
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

  const filteredTasks = tasks.filter((task) => {
    if (filter === "todo") return !task.is_done
    if (filter === "done") return task.is_done
    return true
  })

  const todoCount = tasks.filter((t) => !t.is_done).length
  const doneCount = tasks.filter((t) => t.is_done).length

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Tâches</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {todoCount} à faire, {doneCount} terminée{doneCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all" className="font-[family-name:var(--font-body)] text-xs">
            Toutes ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="todo" className="font-[family-name:var(--font-body)] text-xs">
            À faire ({todoCount})
          </TabsTrigger>
          <TabsTrigger value="done" className="font-[family-name:var(--font-body)] text-xs">
            Terminées ({doneCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TaskList tasks={filteredTasks} onToggle={handleToggle} onEdit={handleEdit} />
      )}

      {/* Task dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSuccess={fetchTasks}
      />
    </div>
  )
}
