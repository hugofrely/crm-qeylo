"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import {
  fetchUsageSummary,
  fetchUsageByUser,
  fetchUsageByType,
  fetchUsageTimeline,
  fetchTopConsumers,
} from "@/services/ai-usage"
import type {
  UsageSummary,
  UsageByType,
  UsageTimelinePoint,
  TopConsumers,
} from "@/types/ai-usage"
import { ShieldAlert, Loader2, TrendingDown, TrendingUp } from "lucide-react"

type PeriodKey = "7" | "30" | "90" | "custom"

interface Organization {
  id: string
  name: string
}

interface UserOption {
  id: string
  email: string
  first_name: string
  last_name: string
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7", label: "7j" },
  { key: "30", label: "30j" },
  { key: "90", label: "90j" },
]

const TYPE_LABELS: Record<string, string> = {
  chat: "Chat",
  contact_summary: "Resume contact",
  title_generation: "Generation titre",
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

function formatCost(value: number): string {
  return `$${value.toFixed(4)}`
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR")
}

function formatDateFr(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  } catch {
    return dateStr
  }
}

function computeDateRange(periodKey: PeriodKey): { start_date: string; end_date: string } {
  const end = new Date()
  const start = new Date()
  const days = parseInt(periodKey) || 30
  start.setDate(end.getDate() - days)
  return {
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
  }
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export default function AIUsagePage() {
  const { user } = useAuth()

  const [period, setPeriod] = useState<PeriodKey>("30")
  const [organizationId, setOrganizationId] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<UserOption[]>([])

  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [byType, setByType] = useState<UsageByType[]>([])
  const [timeline, setTimeline] = useState<UsageTimelinePoint[]>([])
  const [topConsumers, setTopConsumers] = useState<TopConsumers | null>(null)

  const [loading, setLoading] = useState(true)

  // Fetch filter options
  useEffect(() => {
    if (!user?.is_superuser) return
    apiFetch<Organization[]>("/organizations/").then(setOrganizations).catch(() => {})
    apiFetch<UserOption[]>("/auth/users/").then(setUsers).catch(() => {})
  }, [user?.is_superuser])

  // Fetch all data
  useEffect(() => {
    if (!user?.is_superuser) return

    const { start_date, end_date } = computeDateRange(period)
    const params = {
      start_date,
      end_date,
      organization_id: organizationId || undefined,
      user_id: userId || undefined,
    }

    setLoading(true)

    Promise.all([
      fetchUsageSummary(params),
      fetchUsageByType(params),
      fetchUsageTimeline({ ...params, granularity: period === "7" ? "day" : period === "30" ? "day" : "week" }),
      fetchTopConsumers({ ...params, limit: "5" }),
    ])
      .then(([summaryData, byTypeData, timelineData, topData]) => {
        setSummary(summaryData)
        setByType(byTypeData)
        setTimeline(timelineData)
        setTopConsumers(topData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.is_superuser, period, organizationId, userId])

  // KPI cards data
  const kpis = useMemo(() => {
    if (!summary) return []

    const costChange = summary.previous_period
      ? percentChange(summary.total_cost, summary.previous_period.total_cost)
      : null
    const callsChange = summary.previous_period
      ? percentChange(summary.total_calls, summary.previous_period.total_calls)
      : null

    return [
      {
        label: "Cout total",
        value: formatCost(summary.total_cost),
        change: costChange,
        invertColor: true, // increase in cost = bad
      },
      {
        label: "Total tokens",
        value: formatNumber(summary.total_input_tokens + summary.total_output_tokens),
        change: null,
        invertColor: false,
      },
      {
        label: "Nombre d'appels",
        value: formatNumber(summary.total_calls),
        change: callsChange,
        invertColor: true,
      },
      {
        label: "Cout moyen / appel",
        value: formatCost(summary.avg_cost_per_call),
        change: null,
        invertColor: true,
      },
    ]
  }, [summary])

  // Pie chart data
  const pieData = useMemo(() => {
    return byType.map((item) => ({
      name: TYPE_LABELS[item.call_type] || item.call_type,
      value: item.total_cost,
      calls: item.total_calls,
    }))
  }, [byType])

  // Timeline chart data
  const timelineData = useMemo(() => {
    return timeline.map((point) => ({
      ...point,
      label: formatDateFr(point.period),
    }))
  }, [timeline])

  // Access control
  if (!user?.is_superuser) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-medium tracking-tight mb-2">Acces refuse</h2>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            Cette page est reservee aux super administrateurs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader
        title="Utilisation IA"
        subtitle="Suivi de la consommation des services d'intelligence artificielle"
      />

      {/* Filters bar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 flex flex-wrap items-center gap-4 font-[family-name:var(--font-body)]">
          {/* Period toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Organization filter */}
          <Select value={organizationId} onValueChange={(v) => setOrganizationId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Toutes les organisations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les organisations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User filter */}
          <Select value={userId} onValueChange={(v) => setUserId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Tous les utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-border bg-card p-5 font-[family-name:var(--font-body)]"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {kpi.label}
                </p>
                <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
                {kpi.change !== null && (
                  <div
                    className={`flex items-center gap-1 mt-2 text-xs ${
                      kpi.invertColor
                        ? kpi.change > 0
                          ? "text-red-500"
                          : "text-green-500"
                        : kpi.change > 0
                          ? "text-green-500"
                          : "text-red-500"
                    }`}
                  >
                    {kpi.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(kpi.change).toFixed(1)}% vs periode precedente</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost over time */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-sm font-medium tracking-tight">Evolution du cout</h3>
              </div>
              <div className="p-6">
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCost(value), "Cout"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_cost"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucune donnee pour cette periode
                  </div>
                )}
              </div>
            </div>

            {/* By type pie chart */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-sm font-medium tracking-tight">Repartition par type</h3>
              </div>
              <div className="p-6">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCost(value), "Cout"]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        formatter={(value: string) => (
                          <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucune donnee pour cette periode
                  </div>
                )}
              </div>
            </div>

            {/* Top organizations */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-sm font-medium tracking-tight">Top organisations</h3>
              </div>
              <div className="p-6">
                {topConsumers && topConsumers.top_organizations.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topConsumers.top_organizations}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCost(value), "Cout"]}
                      />
                      <Bar
                        dataKey="total_cost"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucune donnee pour cette periode
                  </div>
                )}
              </div>
            </div>

            {/* Top users */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-sm font-medium tracking-tight">Top utilisateurs</h3>
              </div>
              <div className="p-6">
                {topConsumers && topConsumers.top_users.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={topConsumers.top_users}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [formatCost(value), "Cout"]}
                      />
                      <Bar
                        dataKey="total_cost"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucune donnee pour cette periode
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
