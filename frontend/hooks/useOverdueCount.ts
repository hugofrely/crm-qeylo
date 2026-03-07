"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

export function useOverdueCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await apiFetch<{ count: number }>("/tasks/?is_done=false&due_date=overdue&page_size=1")
        setCount(data.count ?? 0)
      } catch {
        // Silently fail — badge is non-critical UI
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  return count
}
