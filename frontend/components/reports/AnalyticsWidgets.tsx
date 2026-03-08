"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart,
} from "recharts"
import { Loader2 } from "lucide-react"
import { fetchForecast, fetchWinLoss, fetchVelocity, fetchLeaderboard } from "@/services/deals"
import type { ForecastResponse, WinLossResponse, VelocityResponse, LeaderboardResponse } from "@/types"

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#64748B"]

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

function WidgetLoading() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function WidgetEmpty() {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
      Aucune donnée
    </div>
  )
}

// ---- ForecastWidget ----
// Stacked bar chart: commit (green), best_case (blue), pipeline (gray) + line for quota
export function ForecastWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchForecast({
      period: (filters.period as string) || "this_quarter",
      pipeline: filters.pipeline_id as string,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.months.length === 0) return <WidgetEmpty />

  const chartData = data.months.map((m) => ({
    month: m.month,
    Commit: m.commit.weighted,
    "Best Case": m.best_case.weighted,
    Pipeline: m.pipeline.weighted,
    Quota: m.quota,
    "Gagné": m.closed_won,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                <p className="mb-1 font-medium">{label}</p>
                {payload.map((entry: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}: {formatValue(entry.value ?? 0)}</span>
                  </div>
                ))}
              </div>
            )
          }}
          isAnimationActive={false}
        />
        <Bar dataKey="Commit" stackId="forecast" fill="#10B981" radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="Best Case" stackId="forecast" fill="#3B82F6" radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="Pipeline" stackId="forecast" fill="#94A3B8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Line type="monotone" dataKey="Quota" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="Gagné" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ---- WinLossWidget ----
// Grouped bar chart (won vs lost) + line for win rate
export function WinLossWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<WinLossResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWinLoss({
      period: (filters.period as string) || "this_quarter",
      pipeline: filters.pipeline_id as string,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.trend.length === 0) return <WidgetEmpty />

  const chartData = data.trend.map((t) => ({
    month: t.month,
    Gagnés: t.won,
    Perdus: t.lost,
    "Taux (%)": t.win_rate,
  }))

  return (
    <div>
      <div className="flex justify-center gap-6 mb-3 text-sm">
        <div className="text-center">
          <p className="text-2xl font-light text-green-600">{data.summary.won.count}</p>
          <p className="text-xs text-muted-foreground">Gagnés</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-light text-red-600">{data.summary.lost.count}</p>
          <p className="text-xs text-muted-foreground">Perdus</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-light">{data.summary.win_rate}%</p>
          <p className="text-xs text-muted-foreground">Win Rate</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 100]} />
          <Tooltip isAnimationActive={false} />
          <Bar yAxisId="left" dataKey="Gagnés" fill="#10B981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar yAxisId="left" dataKey="Perdus" fill="#EF4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Line yAxisId="right" type="monotone" dataKey="Taux (%)" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---- LossReasonsWidget ----
// Pie/donut chart of loss reasons
export function LossReasonsWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<WinLossResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWinLoss({
      period: (filters.period as string) || "this_quarter",
      pipeline: filters.pipeline_id as string,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.loss_reasons.length === 0) return <WidgetEmpty />

  const chartData = data.loss_reasons.map((r) => ({
    name: r.reason,
    value: r.count,
    amount: r.total_amount,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const entry = payload[0]
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium">{entry.name}</p>
                  <p>{entry.value} deals — {formatValue((entry.payload as any)?.amount ?? 0)} €</p>
                </div>
              )
            }}
            isAnimationActive={false}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-2">
        {chartData.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---- VelocityWidget ----
// Horizontal bar chart: avg days per stage
export function VelocityWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<VelocityResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const pipelineId = filters.pipeline_id as string
    if (!pipelineId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchVelocity({
      pipeline: pipelineId,
      period: (filters.period as string) || undefined,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.stages.length === 0) return <WidgetEmpty />

  const chartData = data.stages.map((s) => ({
    stage: s.stage,
    "Jours moy.": Math.round(s.avg_days * 10) / 10,
    deals: s.deal_count,
  }))

  return (
    <div>
      <div className="flex justify-center gap-6 mb-3">
        <div className="text-center">
          <p className="text-2xl font-light">{Math.round(data.avg_cycle_days)}</p>
          <p className="text-xs text-muted-foreground">Jours moy. cycle</p>
        </div>
        {data.stagnant_deals.length > 0 && (
          <div className="text-center">
            <p className="text-2xl font-light text-amber-600">{data.stagnant_deals.length}</p>
            <p className="text-xs text-muted-foreground">Deals stagnants</p>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} className="text-muted-foreground" width={75} />
          <Tooltip isAnimationActive={false} />
          <Bar dataKey="Jours moy." fill="#6366F1" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---- LeaderboardWidget ----
// Table with progress bars
export function LeaderboardWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard({
      period: (filters.period as string) || "this_quarter",
      pipeline: filters.pipeline_id as string,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.rankings.length === 0) return <WidgetEmpty />

  return (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">#</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Commercial</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Deals</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">CA</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Quota</th>
          </tr>
        </thead>
        <tbody>
          {data.rankings.map((entry, i) => (
            <tr key={entry.user.id} className="border-b last:border-0">
              <td className="py-2 px-3 font-medium">{i + 1}</td>
              <td className="py-2 px-3">
                <div>{entry.user.first_name} {entry.user.last_name}</div>
                {entry.quota > 0 && (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(entry.quota_attainment, 100)}%` }}
                    />
                  </div>
                )}
              </td>
              <td className="py-2 px-3 text-right">{entry.deals_won}</td>
              <td className="py-2 px-3 text-right font-medium">{formatValue(entry.revenue_closed)}</td>
              <td className="py-2 px-3 text-right">
                {entry.quota > 0 ? `${entry.quota_attainment}%` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---- QuotaProgressWidget ----
// KPI-style: big number showing overall quota attainment
export function QuotaProgressWidget({ filters }: { filters: Record<string, unknown> }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard({
      period: (filters.period as string) || "this_month",
      pipeline: filters.pipeline_id as string,
    })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  if (loading) return <WidgetLoading />
  if (!data || data.rankings.length === 0) return <WidgetEmpty />

  const totalRevenue = data.rankings.reduce((sum, r) => sum + r.revenue_closed, 0)
  const totalQuota = data.rankings.reduce((sum, r) => sum + r.quota, 0)
  const attainment = totalQuota > 0 ? Math.round((totalRevenue / totalQuota) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <span className="text-4xl font-light tracking-tight">
        {attainment}%
      </span>
      <p className="text-xs text-muted-foreground">Atteinte du quota</p>
      <p className="text-sm">
        {formatValue(totalRevenue)} / {formatValue(totalQuota)}
      </p>
      <div className="w-32 h-2 rounded-full bg-secondary mt-1">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(attainment, 100)}%` }}
        />
      </div>
    </div>
  )
}
