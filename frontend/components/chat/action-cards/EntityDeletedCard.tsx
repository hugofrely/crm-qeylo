"use client"

import { useState } from "react"
import { Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardShell } from "./CardShell"
import { apiFetch } from "@/lib/api"
import type { EnrichedAction } from "@/types/chat"

export function EntityDeletedCard({ action }: { action: EnrichedAction }) {
  const [restored, setRestored] = useState(false)
  const [loading, setLoading] = useState(false)
  const preview = action.entity_preview

  const handleRestore = async () => {
    if (!action.entity_id) return
    setLoading(true)
    try {
      await apiFetch(`/api/trash/${action.entity_id}/restore/`, { method: "POST" })
      setRestored(true)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <CardShell action={action}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 opacity-60">
          <p className="truncate text-sm font-medium line-through">{preview?.name || preview?.description || ""}</p>
          {preview?.email && <p className="truncate text-xs text-muted-foreground">{preview.email}</p>}
        </div>
        {action.undo_available && !restored && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleRestore} disabled={loading}>
            <Undo2 className="h-3 w-3" />
            Annuler
          </Button>
        )}
        {restored && (
          <span className="text-xs font-medium text-green-600">Restaure</span>
        )}
      </div>
    </CardShell>
  )
}
