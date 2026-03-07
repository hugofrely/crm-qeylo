"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, ExternalLink, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { fetchCompanyDeals } from "@/services/companies"
import type { Deal } from "@/types"

function formatCurrency(value: string | number | null): string {
  if (!value) return "--"
  const num = typeof value === "number" ? value : parseFloat(value)
  if (isNaN(num)) return String(value)
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export interface CompanyDealsProps {
  companyId: string
}

export function CompanyDeals({ companyId }: CompanyDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchCompanyDeals(companyId)
      .then(setDeals)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Briefcase className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucun deal lie a cette entreprise.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <Link
          key={deal.id}
          href={`/deals/${deal.id}`}
          className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-[family-name:var(--font-body)] truncate">{deal.name}</p>
            <div className="flex items-center gap-2 mt-1">
              {deal.stage_name && (
                <Badge variant="secondary" className="text-[10px] font-normal font-[family-name:var(--font-body)]">
                  {deal.stage_name}
                </Badge>
              )}
              {deal.contact_name && (
                <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
                  {deal.contact_name}
                </span>
              )}
            </div>
          </div>
          {deal.amount && (
            <span className="text-sm font-semibold font-[family-name:var(--font-body)] ml-4 shrink-0">
              {formatCurrency(deal.amount)}
            </span>
          )}
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
        </Link>
      ))}
    </div>
  )
}
