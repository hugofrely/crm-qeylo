"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchTasks as fetchTasksApi, updateTask } from "@/services/tasks"
import { TaskList } from "@/components/tasks/TaskList"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckSquare, Loader2 } from "lucide-react"
import type { Task, TaskFilterTab } from "@/types"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskFilterTab>("all")

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTasksApi()
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
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_done: isDone } : t))
    )

    try {
      await updateTask(taskId, { is_done: isDone })
    } catch (err) {
      console.error("Failed to update task:", err)
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_done: !isDone } : t))
      )
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "todo") return !task.is_done
    if (filter === "done") return task.is_done
    return true
  })

  const todoCount = tasks.filter((t) => !t.is_done).length
  const doneCount = tasks.filter((t) => t.is_done).length

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          T&acirc;ches
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {todoCount} &agrave; faire, {doneCount} termin&eacute;e{doneCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as TaskFilterTab)}>
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="todo">
            &Agrave; faire ({todoCount})
          </TabsTrigger>
          <TabsTrigger value="done">
            Termin&eacute;es ({doneCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <TaskList tasks={filteredTasks} onToggle={handleToggle} />
      )}
    </div>
  )
}
