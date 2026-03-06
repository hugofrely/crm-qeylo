"use client"

import { Badge } from "@/components/ui/badge"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"
import { getConfig } from "./config"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return ""
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function EntityCreatedCard({ action }: { action: EnrichedAction }) {
  const preview = action.entity_preview
  const config = getConfig(action.entity_type)
  if (!preview) return <CardShell action={action}><p className="text-sm text-muted-foreground">Action effectuee</p></CardShell>

  return (
    <CardShell action={action}>
      <div className="flex items-center gap-3">
        {preview.avatar_initials && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {preview.avatar_initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{preview.name || preview.description || ""}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {preview.email && <span className="truncate">{preview.email}</span>}
            {preview.company && <span className="truncate">{preview.company}</span>}
            {preview.amount && <span>{formatCurrency(preview.amount)}</span>}
            {preview.stage && <Badge variant="outline" className="text-[10px] h-4">{preview.stage}</Badge>}
            {preview.priority && <Badge variant="secondary" className="text-[10px] h-4">{preview.priority}</Badge>}
            {preview.due_date && <span>{preview.due_date}</span>}
            {preview.subject && <span className="truncate">{preview.subject}</span>}
            {preview.content && <span className="truncate">{preview.content}</span>}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[10px]">{config.label}</Badge>
      </div>
    </CardShell>
  )
}
