"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return "0 EUR"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function DashboardCard({ action }: { action: EnrichedAction }) {
  return (
    <CardShell action={action}>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold">{formatCurrency(action.pipeline_total)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pipeline</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{String(action.active_deals ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deals actifs</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{String(action.overdue_tasks ?? 0)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En retard</p>
        </div>
      </div>
    </CardShell>
  )
}
