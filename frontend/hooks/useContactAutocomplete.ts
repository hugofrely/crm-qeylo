"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { ContactSearchResult } from "@/types"
import { searchContacts } from "@/services/contacts"

export function useContactAutocomplete() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContactSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchContacts(q)
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const reset = useCallback(() => {
    setQuery("")
    setResults([])
    setOpen(false)
  }, [])

  return { query, results, searching, open, setOpen, search, reset, wrapperRef }
}
