"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { fetchCompanies } from "@/services/companies"

interface CompanyOption {
  id: string
  name: string
  industry: string
}

export function useCompanyAutocomplete() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CompanyOption[]>([])
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
        const data = await fetchCompanies({ search: q })
        setResults(data.results.map((c) => ({ id: c.id, name: c.name, industry: c.industry })))
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
