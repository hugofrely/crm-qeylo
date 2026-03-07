"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchCompanies, fetchCompany } from "@/services/companies"
import type { Company, CompanyListItem } from "@/types"

export function useCompanies(params?: {
  search?: string
  industry?: string
  owner?: string
  health_score?: string
  ordering?: string
  page?: number
}) {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchCompanies(params)
      setCompanies(res.results)
      setCount(res.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }, [
    params?.search,
    params?.industry,
    params?.owner,
    params?.health_score,
    params?.ordering,
    params?.page,
  ])

  useEffect(() => {
    load()
  }, [load])

  return { companies, count, loading, error, reload: load }
}

export function useCompany(id: string | null) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await fetchCompany(id)
      setCompany(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { company, loading, error, reload: load, setCompany }
}
