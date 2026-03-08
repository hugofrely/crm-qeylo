"use client"

import { useTranslations } from "next-intl"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return "0 EUR"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function DashboardCard({ action }: { action: EnrichedAction }) {
  const t = useTranslations("chat")

  const expandable = (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <p className="text-lg font-semibold">{formatCurrency(action.pipeline_total)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("cards.pipeline")}</p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.active_deals ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("cards.activeDeals")}</p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.overdue_tasks ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("cards.overdue")}</p>
      </div>
    </div>
  )

  return (
    <CardShell action={action} expandableContent={expandable}>
      <p className="text-sm font-medium">
        {t("cards.pipelineSummary", { amount: formatCurrency(action.pipeline_total), deals: String(action.active_deals ?? 0) })}
      </p>
    </CardShell>
  )
}
