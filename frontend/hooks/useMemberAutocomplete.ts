"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Member } from "@/types"
import { fetchMembers } from "@/services/organizations"
import { useOrganization } from "@/lib/organization"

export function useMemberAutocomplete() {
  const { currentOrganization } = useOrganization()
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Member[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentOrganization) return
    setLoading(true)
    fetchMembers(currentOrganization.id)
      .then((data) => setAllMembers(data.members))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentOrganization?.id])

  const search = useCallback(
    (q: string) => {
      setQuery(q)
      if (q.length < 1) {
        setResults(allMembers)
        setOpen(allMembers.length > 0)
        return
      }
      const lower = q.toLowerCase()
      const filtered = allMembers.filter(
        (m) =>
          m.first_name.toLowerCase().includes(lower) ||
          m.last_name.toLowerCase().includes(lower) ||
          m.email.toLowerCase().includes(lower)
      )
      setResults(filtered)
      setOpen(filtered.length > 0)
    },
    [allMembers]
  )

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

  return { query, results, allMembers, loading, open, setOpen, search, reset, wrapperRef }
}
