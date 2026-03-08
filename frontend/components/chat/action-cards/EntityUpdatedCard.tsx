"use client"

import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function EntityUpdatedCard({ action }: { action: EnrichedAction }) {
  const t = useTranslations("chat")
  const preview = action.entity_preview
  const changes = action.changes

  const expandable = changes && changes.length > 0 ? (
    <div className="space-y-1">
      {changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-muted-foreground">{c.field}</span>
          <span className="text-muted-foreground/60 truncate">{c.from}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="font-medium text-foreground truncate">{c.to}</span>
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      <p className="truncate text-sm font-medium">
        {preview?.name || t("cards.entityUpdated")}
      </p>
      {changes && changes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("cards.fieldsModified", { count: changes.length })}
        </p>
      )}
    </CardShell>
  )
}
