"use client"

import Link from "next/link"
import type { Deal, Stage } from "@/types"
import { Badge } from "@/components/ui/badge"

/* ── Helpers ── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatCurrency(value: string | null): string {
  if (!value) return ""
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/* ── Props ── */

export interface ContactDealsProps {
  deals: Deal[]
  stages: Stage[]
}

export function ContactDeals({ deals, stages }: ContactDealsProps) {
  const getStageName = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    return stage?.name || "\u2014"
  }

  if (deals.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
        Aucun deal pour ce contact.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <Link
          key={deal.id}
          href={`/deals`}
          className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-[family-name:var(--font-body)] truncate">{deal.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] font-normal font-[family-name:var(--font-body)]">
                {getStageName(deal.stage)}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
                {deal.created_at ? formatDate(deal.created_at) : "\u2014"}
              </span>
            </div>
          </div>
          {deal.amount && (
            <span className="text-sm font-semibold font-[family-name:var(--font-body)] ml-4 shrink-0">
              {formatCurrency(String(deal.amount))}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
