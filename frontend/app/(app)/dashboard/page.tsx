"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { StatCard } from "@/components/dashboard/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Briefcase,
  ListTodo,
  Loader2,
} from "lucide-react"

interface DealsByStage {
  stage_name: string
  stage_color: string
  count: number
  total_amount: number
}

interface DashboardStats {
  revenue_this_month: number
  total_pipeline: number
  deals_by_stage: DealsByStage[]
  upcoming_tasks: number
  active_deals_count: number
}

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
      const data = await apiFetch<DashboardStats>("/dashboard/stats/")
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
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-sm">
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Tableau de bord
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d&apos;ensemble de votre activit&eacute;
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
          title="T&acirc;ches &agrave; venir"
          value={String(stats.upcoming_tasks)}
          icon={ListTodo}
        />
      </div>

      {/* Deals by stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deals par &eacute;tape</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.deals_by_stage.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucun deal dans le pipeline.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.deals_by_stage.map((stage) => (
                <div key={stage.stage_name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: stage.stage_color || "#6b7280",
                        }}
                      />
                      <span className="font-medium">{stage.stage_name}</span>
                      <span className="text-muted-foreground">
                        ({stage.count} deal{stage.count !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <span className="font-semibold">
                      {formatAmount(stage.total_amount)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
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
        </CardContent>
      </Card>
    </div>
  )
}
