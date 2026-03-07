"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return ""
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function EntityCreatedCard({ action }: { action: EnrichedAction }) {
  const preview = action.entity_preview
  if (!preview) return <CardShell action={action}><p className="text-sm text-muted-foreground">Action effectuee</p></CardShell>

  const details: { label: string; value: string }[] = []
  if (preview.email) details.push({ label: "Email", value: preview.email })
  if (preview.phone) details.push({ label: "Telephone", value: preview.phone })
  if (preview.company) details.push({ label: "Entreprise", value: preview.company })
  if (preview.job_title) details.push({ label: "Poste", value: preview.job_title })
  if (preview.amount) details.push({ label: "Montant", value: formatCurrency(preview.amount) })
  if (preview.stage) details.push({ label: "Etape", value: preview.stage })
  if (preview.pipeline) details.push({ label: "Pipeline", value: preview.pipeline })
  if (preview.priority) details.push({ label: "Priorite", value: preview.priority })
  if (preview.due_date) details.push({ label: "Echeance", value: preview.due_date })
  if (preview.content) details.push({ label: "Contenu", value: preview.content })
  if (preview.subject) details.push({ label: "Sujet", value: preview.subject })

  const expandable = details.length > 0 ? (
    <div className="space-y-1">
      {details.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground w-20 shrink-0">{d.label}</span>
          <span className="truncate">{d.value}</span>
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      <div className="flex items-center gap-3">
        {preview.avatar_initials && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {preview.avatar_initials}
          </div>
        )}
        <p className="truncate text-sm font-medium">{preview.name || preview.description || ""}</p>
      </div>
    </CardShell>
  )
}
