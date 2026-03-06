"use client"

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
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#0ea5e9",
]

export function DynamicChart({ config }: { config: ChartConfig }) {
  const { type, title, data, xKey, series } = config

  if (!data || data.length === 0) return null

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
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
            <Tooltip />
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
            <Tooltip />
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
              outerRadius={80}
              label={({
                name,
                value,
              }: {
                name: string
                value: number
              }) => `${name}: ${value}`}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )

      case "funnel":
        return (
          <FunnelChart>
            <Tooltip />
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
            <Tooltip />
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
            <Tooltip />
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

  return (
    <div className="w-full">
      {title && <p className="mb-2 text-sm font-medium">{title}</p>}
      <ResponsiveContainer width="100%" height={250}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
