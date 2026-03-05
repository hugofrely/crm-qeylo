"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task } from "@/types"
import { fetchTasks } from "@/services/tasks"

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchTasks()
      setTasks(data.results)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { tasks, setTasks, loading, refresh }
}
