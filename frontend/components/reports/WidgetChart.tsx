"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import type { WidgetConfig, AggregateResponse, FunnelResponse } from "@/types"
import { fetchAggregate, fetchFunnel } from "@/services/reports"
import { FunnelChart } from "./FunnelChart"
import {
  ForecastWidget,
  WinLossWidget,
  LossReasonsWidget,
  VelocityWidget,
  LeaderboardWidget,
  QuotaProgressWidget,
} from "./AnalyticsWidgets"

const COLORS = [
  "#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#64748B",
]

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

function metricLabel(metric: string): string {
  if (metric === "sum:amount") return "Montant"
  if (metric === "avg:amount") return "Moyenne"
  return "Nombre"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, metric }: { active?: boolean; payload?: readonly any[]; label?: string | number; metric?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry: { value?: number; name?: string; color?: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span>{formatValue(entry.value ?? 0)}</span>
          {metric && <span className="text-muted-foreground">{metric}</span>}
        </div>
      ))}
    </div>
  )
}

interface WidgetChartProps {
  widget: WidgetConfig
  globalDateRange?: string
  compare?: boolean
}

export function WidgetChart({ widget, globalDateRange, compare }: WidgetChartProps) {
  const [data, setData] = useState<AggregateResponse | null>(null)
  const [funnelData, setFunnelData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const onLegendEnter = useCallback((i: number) => setActiveIndex(i), [])
  const onLegendLeave = useCallback(() => setActiveIndex(null), [])

  useEffect(() => {
    if (widget.type !== "funnel_chart") return
    const loadFunnel = async () => {
      setLoading(true)
      try {
        const pipelineId = widget.filters?.pipeline_id as string
        if (!pipelineId) return
        const result = await fetchFunnel({
          pipeline_id: pipelineId,
          filter_mode: (widget.filters?.filter_mode as "cohort" | "activity") || undefined,
          date_range: (widget.filters?.date_range as string) || undefined,
        })
        setFunnelData(result)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    loadFunnel()
  }, [widget.type, JSON.stringify(widget.filters)])

  useEffect(() => {
    const load = async () => {
      if (widget.type === "funnel_chart") return
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

  // Analytics widgets — delegate to specialized components
  const analyticsTypes = ["forecast_chart", "win_loss_chart", "loss_reasons_chart", "velocity_chart", "leaderboard_table", "quota_progress"]
  if (analyticsTypes.includes(widget.type)) {
    if (widget.type === "forecast_chart") return <ForecastWidget filters={widget.filters} />
    if (widget.type === "win_loss_chart") return <WinLossWidget filters={widget.filters} />
    if (widget.type === "loss_reasons_chart") return <LossReasonsWidget filters={widget.filters} />
    if (widget.type === "velocity_chart") return <VelocityWidget filters={widget.filters} />
    if (widget.type === "leaderboard_table") return <LeaderboardWidget filters={widget.filters} />
    if (widget.type === "quota_progress") return <QuotaProgressWidget filters={widget.filters} />
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Aucune donnee
      </div>
    )
  }

  if (widget.type === "funnel_chart") {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )
    }
    if (!funnelData || funnelData.stages.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Aucune donnee
        </div>
      )
    }
    return (
      <div>
        <FunnelChart stages={funnelData.stages} compact />
        <div className="mt-2 text-center">
          <span className="text-xs text-muted-foreground">
            Conversion globale: <span className="font-medium text-foreground">{funnelData.overall_conversion}%</span>
          </span>
        </div>
      </div>
    )
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

  const metric = metricLabel(widget.metric)

  if (widget.type === "bar_chart") {
    return (
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
            <Tooltip
              content={({ active, payload, label }) => (
                <CustomTooltip active={active} payload={payload} label={label} metric={metric} />
              )}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              isAnimationActive={false}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== i ? 0.3 : 1,
                    transition: "opacity 150ms ease",
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend
          items={data.data.map((d, i) => ({ label: d.label, value: formatValue(d.value), color: COLORS[i % COLORS.length] }))}
          activeIndex={activeIndex}
          onEnter={onLegendEnter}
          onLeave={onLegendLeave}
          metric={metric}
        />
      </div>
    )
  }

  if (widget.type === "line_chart") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={formatValue} />
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip active={active} payload={payload} label={label} metric={metric} />
            )}
            isAnimationActive={false}
          />
          <Line type="monotone" dataKey="value" stroke="#6366F1" strokeWidth={2} dot={{ r: 4, fill: "#6366F1" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (widget.type === "pie_chart") {
    return (
      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
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
              isAnimationActive={false}
            >
              {data.data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  name={data.data[i].label}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== i ? 0.3 : 1,
                    transition: "opacity 150ms ease",
                  }}
                  stroke={activeIndex === i ? COLORS[i % COLORS.length] : undefined}
                  strokeWidth={activeIndex === i ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.payload?.fill }} />
                      <span className="font-medium">{entry.name}</span>
                      <span>{formatValue(Number(entry.value) ?? 0)}</span>
                    </div>
                  </div>
                )
              }}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
        <ChartLegend
          items={data.data.map((d, i) => ({ label: d.label, value: formatValue(d.value), color: COLORS[i % COLORS.length] }))}
          activeIndex={activeIndex}
          onEnter={onLegendEnter}
          onLeave={onLegendLeave}
        />
      </div>
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

function ChartLegend({
  items,
  activeIndex,
  onEnter,
  onLeave,
  metric,
}: {
  items: { label: string; value: string; color: string }[]
  activeIndex: number | null
  onEnter: (i: number) => void
  onLeave: () => void
  metric?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const handleEnter = useCallback((i: number, e: React.MouseEvent<HTMLSpanElement>) => {
    onEnter(i)
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const itemRect = e.currentTarget.getBoundingClientRect()
      setTooltipPos({
        x: itemRect.left - containerRect.left + itemRect.width / 2,
        y: itemRect.top - containerRect.top,
      })
    }
  }, [onEnter])

  const handleLeave = useCallback(() => {
    onLeave()
    setTooltipPos(null)
  }, [onLeave])

  const activeItem = activeIndex !== null ? items[activeIndex] : null

  return (
    <div ref={containerRef} className="relative pt-2 px-2">
      {/* Tooltip positioned above the hovered legend item */}
      {activeItem && tooltipPos && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-lg border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md whitespace-nowrap mb-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: activeItem.color }} />
              <span className="font-medium">{activeItem.label}</span>
              <span>{activeItem.value}</span>
              {metric && <span className="text-muted-foreground">{metric}</span>}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
            style={{
              opacity: activeIndex !== null && activeIndex !== i ? 0.35 : 1,
              transition: "opacity 150ms ease",
            }}
            onMouseEnter={(e) => handleEnter(i, e)}
            onMouseLeave={handleLeave}
          >
            <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
