"use client"

import { useState, useEffect } from "react"
import { Loader2, DollarSign, Briefcase, Users, TrendingUp } from "lucide-react"
import { fetchCompanyStats } from "@/services/companies"
import { useTranslations } from "next-intl"
import type { CompanyStats as CompanyStatsType } from "@/types"

function formatCurrency(value: string | null): string {
  if (!value) return "0 EUR"
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export interface CompanyStatsProps {
  companyId: string
}

export function CompanyStats({ companyId }: CompanyStatsProps) {
  const t = useTranslations('companies')
  const [stats, setStats] = useState<CompanyStatsType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchCompanyStats(companyId)
      .then(setStats)
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

  if (!stats) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
        {t('stats.unavailable')}
      </p>
    )
  }

  const cards = [
    {
      label: t('stats.wonRevenue'),
      value: formatCurrency(stats.won_deals_value),
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
    },
    {
      label: t('stats.openPipeline'),
      value: formatCurrency(stats.open_deals_value),
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: t('stats.contacts'),
      value: String(stats.contacts_count),
      icon: Users,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: t('stats.deals'),
      value: String(stats.total_deals),
      icon: Briefcase,
      color: "text-orange-600 bg-orange-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-card p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider font-[family-name:var(--font-body)]">
              {card.label}
            </span>
          </div>
          <p className="text-xl font-semibold font-[family-name:var(--font-body)]">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
