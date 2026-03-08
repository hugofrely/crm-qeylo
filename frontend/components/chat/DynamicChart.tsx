"use client"

import { useState, useCallback, useRef } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts"
import type { ChartConfig } from "@/types/chat"

const FALLBACK_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ef4444",
  "#64748b",
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly any[]; label?: string | number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((entry: { value?: number; name?: string; color?: string }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          {entry.color && <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />}
          {entry.name && <span className="text-muted-foreground">{entry.name}</span>}
          <span>{entry.value ?? 0}</span>
        </div>
      ))}
    </div>
  )
}

export function DynamicChart({ config }: { config: ChartConfig }) {
  const { type, title, data, xKey, series } = config
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const handleLegendEnter = useCallback((i: number, e: React.MouseEvent<HTMLSpanElement>) => {
    setActiveIndex(i)
    if (legendRef.current) {
      const containerRect = legendRef.current.getBoundingClientRect()
      const itemRect = e.currentTarget.getBoundingClientRect()
      setTooltipPos({
        x: itemRect.left - containerRect.left + itemRect.width / 2,
        y: itemRect.top - containerRect.top,
      })
    }
  }, [])

  const handleLegendLeave = useCallback(() => {
    setActiveIndex(null)
    setTooltipPos(null)
  }, [])

  if (!data || data.length === 0) return null

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} isAnimationActive={false} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                name={s.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} isAnimationActive={false} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                name={s.label}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} isAnimationActive={false} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.2}
                name={s.label}
              />
            ))}
          </AreaChart>
        )

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={series[0]?.key || "value"}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                  name={String(entry[xKey] ?? "")}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== i ? 0.3 : 1,
                    transition: "opacity 150ms ease",
                  }}
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
                      <span>{entry.value ?? 0}</span>
                    </div>
                  </div>
                )
              }}
              isAnimationActive={false}
            />
          </PieChart>
        )

      case "donut":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={series[0]?.key || "value"}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                  name={String(entry[xKey] ?? "")}
                  style={{
                    opacity: activeIndex !== null && activeIndex !== i ? 0.3 : 1,
                    transition: "opacity 150ms ease",
                  }}
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
                      <span>{entry.value ?? 0}</span>
                    </div>
                  </div>
                )
              }}
              isAnimationActive={false}
            />
          </PieChart>
        )

      case "stacked_bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} isAnimationActive={false} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                name={s.label}
                stackId="a"
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case "funnel":
        return (
          <FunnelChart>
            <Tooltip content={({ active, payload }) => <ChartTooltip active={active} payload={payload} />} isAnimationActive={false} />
            <Funnel
              dataKey={series[0]?.key || "value"}
              data={data}
              nameKey={xKey}
            >
              <LabelList
                position="right"
                fill="#666"
                stroke="none"
                dataKey={xKey}
                fontSize={11}
              />
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                />
              ))}
            </Funnel>
          </FunnelChart>
        )

      case "radar":
        return (
          <RadarChart cx="50%" cy="50%" outerRadius={80} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload }) => <ChartTooltip active={active} payload={payload} />} isAnimationActive={false} />
            {series.map((s) => (
              <Radar
                key={s.key}
                name={s.label}
                dataKey={s.key}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.3}
              />
            ))}
          </RadarChart>
        )

      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload} label={label} />} isAnimationActive={false} />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={s.color}
                name={s.label}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )
    }
  }

  const isPie = type === "pie" || type === "donut"
  const activeItem = isPie && activeIndex !== null ? data[activeIndex] : null

  return (
    <div className="w-full">
      {title && <p className="mb-2 text-sm font-medium">{title}</p>}
      <ResponsiveContainer width="100%" height={isPie ? 220 : 250}>
        {renderChart()}
      </ResponsiveContainer>
      {isPie && (
        <div ref={legendRef} className="relative pt-2 px-2">
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
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: FALLBACK_COLORS[activeIndex! % FALLBACK_COLORS.length] }} />
                  <span className="font-medium">{String(activeItem[xKey] ?? "")}</span>
                  <span>{activeItem[series[0]?.key || "value"] as number ?? 0}</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {data.map((entry, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
                style={{
                  opacity: activeIndex !== null && activeIndex !== i ? 0.35 : 1,
                  transition: "opacity 150ms ease",
                }}
                onMouseEnter={(e) => handleLegendEnter(i, e)}
                onMouseLeave={handleLegendLeave}
              >
                <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
                {String(entry[xKey] ?? "")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
