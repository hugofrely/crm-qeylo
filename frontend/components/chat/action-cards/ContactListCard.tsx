"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardShell } from "./CardShell"
import { apiFetch } from "@/lib/api"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

export function ContactListCard({ action }: { action: EnrichedAction }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const results = action.results || []

  const handleSaveSegment = async () => {
    if (!action.rules) return
    setLoading(true)
    try {
      await apiFetch("/api/segments/", {
        method: "POST",
        json: {
          name: action.summary || "Segment depuis le chat",
          rules: action.rules,
        },
      })
      setSaved(true)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <CardShell action={action}>
      {results.length > 0 && (
        <div className="space-y-1 mb-2">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.id ? (
                <Link href={`/contacts/${r.id}`} className="font-medium text-primary hover:underline truncate">
                  {String(r.name || "")}
                </Link>
              ) : (
                <span className="font-medium truncate">{String(r.name || "")}</span>
              )}
              {r.email ? <span className="text-muted-foreground truncate">{String(r.email)}</span> : null}
              {r.company ? <span className="text-muted-foreground truncate">{String(r.company)}</span> : null}
            </div>
          ))}
          {results.length > 5 && (
            <p className="text-[11px] text-muted-foreground">+ {results.length - 5} autres</p>
          )}
        </div>
      )}
      {action.save_as_segment_available && !saved && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveSegment} disabled={loading}>
          <Save className="h-3 w-3" />
          Sauvegarder comme segment
        </Button>
      )}
      {saved && <span className="text-xs font-medium text-green-600">Segment sauvegarde</span>}
    </CardShell>
  )
}
