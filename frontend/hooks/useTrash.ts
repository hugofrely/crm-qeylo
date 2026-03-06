"use client"

import { useState, useCallback, useEffect } from "react"
import { useOrganization } from "@/lib/organization"
import { fetchTrash, fetchTrashCounts } from "@/services/trash"
import type { TrashItem, TrashCounts } from "@/types/trash"

export function useTrash(typeFilter?: string) {
  const { orgVersion } = useOrganization()
  const [items, setItems] = useState<TrashItem[]>([])
  const [counts, setCounts] = useState<TrashCounts>({ contact: 0, deal: 0, task: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const [trashItems, trashCounts] = await Promise.all([
        fetchTrash(typeFilter),
        fetchTrashCounts(),
      ])
      setItems(trashItems)
      setCounts(trashCounts)
    } finally {
      setLoading(false)
    }
  }, [orgVersion, typeFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, counts, loading, refresh }
}
