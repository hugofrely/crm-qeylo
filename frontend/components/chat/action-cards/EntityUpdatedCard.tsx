"use client"

import { ArrowRight } from "lucide-react"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function EntityUpdatedCard({ action }: { action: EnrichedAction }) {
  const preview = action.entity_preview
  const changes = action.changes

  return (
    <CardShell action={action}>
      {preview?.name && <p className="truncate text-sm font-medium mb-1">{preview.name}</p>}
      {changes && changes.length > 0 && (
        <div className="space-y-0.5">
          {changes.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-muted-foreground">{c.field}</span>
              <span className="text-muted-foreground/60 truncate">{c.from}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
              <span className="font-medium text-foreground truncate">{c.to}</span>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  )
}
