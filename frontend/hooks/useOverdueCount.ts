"use client"

import { useState, useEffect, useCallback } from "react"
import { apiFetch } from "@/lib/api"

/** Dispatch this event after any task mutation to refresh the overdue badge. */
export const TASK_MUTATION_EVENT = "task-mutation"
export function emitTaskMutation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TASK_MUTATION_EVENT))
  }
}

export function useOverdueCount() {
  const [count, setCount] = useState(0)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1)
    window.addEventListener("task-mutation", handler)
    return () => window.removeEventListener("task-mutation", handler)
  }, [])

  const fetchCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ count: number }>("/tasks/?is_done=false&due_date=overdue&page=1")
      setCount(data.count ?? 0)
    } catch {
      // Silently fail — badge is non-critical UI
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [fetchCount, version])

  return count
}
