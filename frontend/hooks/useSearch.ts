"use client"

import { useState, useRef, useCallback } from "react"
import type { SearchResults } from "@/types"
import { globalSearch } from "@/services/search"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(q)
        setResults(data)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults(null)
  }, [])

  return { query, results, loading, open, setOpen, search, close }
}
