"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchDashboardStats as fetchDashboardStatsApi } from "@/services/dashboard"
import { StatCard } from "@/components/dashboard/StatCard"
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  ListTodo,
  Loader2,
} from "lucide-react"
import type { DashboardStats } from "@/types"

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchDashboardStatsApi()
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Impossible de charger les statistiques.
          </p>
        </div>
      </div>
    )
  }

  const maxStageAmount = Math.max(
    ...stats.deals_by_stage.map((s) => s.total_amount),
    1
  )

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenu du mois"
          value={formatAmount(stats.revenue_this_month)}
          icon={DollarSign}
        />
        <StatCard
          title="Pipeline total"
          value={formatAmount(stats.total_pipeline)}
          icon={TrendingUp}
        />
        <StatCard
          title="Deals actifs"
          value={String(stats.active_deals_count)}
          icon={Briefcase}
        />
        <StatCard
          title="Tâches à venir"
          value={String(stats.upcoming_tasks)}
          icon={ListTodo}
        />
      </div>

      {/* Deals by stage */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">Deals par étape</h2>
        </div>
        <div className="p-6">
          {stats.deals_by_stage.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8 font-[family-name:var(--font-body)]">
              Aucun deal dans le pipeline.
            </p>
          ) : (
            <div className="space-y-5">
              {stats.deals_by_stage.map((stage) => (
                <div key={stage.stage_name} className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm font-[family-name:var(--font-body)]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: stage.stage_color || "#6b7280",
                        }}
                      />
                      <span className="font-medium text-foreground">{stage.stage_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {stage.count} deal{stage.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatAmount(stage.total_amount)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(stage.total_amount / maxStageAmount) * 100}%`,
                        backgroundColor: stage.stage_color || "#6b7280",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
