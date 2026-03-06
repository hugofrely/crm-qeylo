"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { WidgetConfig, AggregateResponse } from "@/types"
import { fetchAggregate } from "@/services/reports"

const COLORS = [
  "#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#64748B",
]

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

interface WidgetChartProps {
  widget: WidgetConfig
  globalDateRange?: string
  compare?: boolean
}

export function WidgetChart({ widget, globalDateRange, compare }: WidgetChartProps) {
  const [data, setData] = useState<AggregateResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const filters = { ...widget.filters }
        if (globalDateRange && !filters.date_range) {
          filters.date_range = globalDateRange
        }
        const result = await fetchAggregate({
          source: widget.source,
          metric: widget.metric,
          group_by: widget.group_by,
          date_field: filters.date_field as string | undefined,
          date_range: filters.date_range as string | undefined,
          filters,
          compare,
        })
        setData(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [widget.source, widget.metric, widget.group_by, JSON.stringify(widget.filters), globalDateRange, compare])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Aucune donnee
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  }

  if (widget.type === "kpi_card") {
    const hasDelta = data.delta_percent !== undefined && data.delta_percent !== null
    const deltaPositive = (data.delta_percent ?? 0) >= 0

    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <span className="text-4xl font-light tracking-tight">
          {formatValue(data.total)}
        </span>
        {hasDelta && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                deltaPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {deltaPositive ? "\u2191" : "\u2193"}
              {Math.abs(data.delta_percent ?? 0)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  if (widget.type === "bar_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip formatter={(value?: number) => [formatValue(value ?? 0), ""]} contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "line_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip formatter={(value?: number) => [formatValue(value ?? 0), ""]} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={{ r: 4, fill: "#6366F1" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "pie_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data.data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value?: number) => [formatValue(value ?? 0), ""]} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "table") {
    return (
      <div className="overflow-auto max-h-[250px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Label</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 px-3">{row.label}</td>
                <td className="py-2 px-3 text-right font-medium">{formatValue(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}
