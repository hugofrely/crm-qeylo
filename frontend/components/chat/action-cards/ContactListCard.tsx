"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardShell } from "./CardShell"
import { apiFetch } from "@/lib/api"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

function ContactRow({ r }: { r: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2 text-xs">
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
  )
}

export function ContactListCard({ action }: { action: EnrichedAction }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const results = action.results || []
  const VISIBLE_COUNT = 3

  const handleSaveSegment = async () => {
    if (!action.rules) return
    setLoading(true)
    try {
      await apiFetch("/segments/", {
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

  const expandable = results.length > VISIBLE_COUNT ? (
    <div className="space-y-1">
      {results.slice(VISIBLE_COUNT).map((r, i) => (
        <ContactRow key={i} r={r} />
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      {results.length > 0 && (
        <div className="space-y-1 mb-2">
          <p className="text-xs text-muted-foreground mb-1">{action.count ?? results.length} contact{(action.count ?? results.length) > 1 ? "s" : ""} trouve{(action.count ?? results.length) > 1 ? "s" : ""}</p>
          {results.slice(0, VISIBLE_COUNT).map((r, i) => (
            <ContactRow key={i} r={r} />
          ))}
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
