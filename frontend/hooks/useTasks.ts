"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task, TaskFilters } from "@/types"
import { fetchTasks } from "@/services/tasks"
import { useOrganization } from "@/lib/organization"

export function useTasks(filters: TaskFilters = {}) {
  const { orgVersion } = useOrganization()
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
  }, [JSON.stringify(filters), orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { tasks, setTasks, loading, totalCount, todoCount, doneCount, refresh }
}
