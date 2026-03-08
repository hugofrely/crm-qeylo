"use client"

import { useTranslations } from "next-intl"
import type { FunnelStage } from "@/types"

interface FunnelChartProps {
  stages: FunnelStage[]
  compact?: boolean
}

function formatValue(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toLocaleString("fr-FR")
}

function formatDuration(iso: string | null): string | null {
  if (!iso) return null
  const match = iso.match(/P(\d+)DT(\d+)H/)
  if (!match) return null
  const days = parseInt(match[1])
  const hours = parseInt(match[2])
  if (days > 0) return `~${days}j`
  return `~${hours}h`
}

export function FunnelChart({ stages, compact = false }: FunnelChartProps) {
  const t = useTranslations("dashboard.chart")

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        {t("noData")}
      </div>
    )
  }

  const maxEntered = Math.max(...stages.map((s) => s.entered), 1)
  const stageHeight = compact ? 36 : 52
  const gapHeight = compact ? 20 : 32
  const totalHeight = stages.length * stageHeight + (stages.length - 1) * gapHeight
  const chartWidth = 500
  const labelLeftWidth = compact ? 100 : 140
  const barAreaWidth = chartWidth - labelLeftWidth - (compact ? 60 : 120)
  const minBarWidth = 40

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${totalHeight}`}
      className="w-full"
      style={{ maxHeight: compact ? 300 : undefined }}
    >
      {stages.map((stage, i) => {
        const y = i * (stageHeight + gapHeight)
        const widthRatio = maxEntered > 0 ? stage.entered / maxEntered : 0
        const barWidth = Math.max(widthRatio * barAreaWidth, minBarWidth)
        const barX = labelLeftWidth + (barAreaWidth - barWidth) / 2

        const nextStage = stages[i + 1]
        const nextWidthRatio = nextStage
          ? Math.max(nextStage.entered / maxEntered, minBarWidth / barAreaWidth)
          : 0
        const nextBarWidth = nextStage
          ? Math.max(nextWidthRatio * barAreaWidth, minBarWidth)
          : 0
        const nextBarX = nextStage
          ? labelLeftWidth + (barAreaWidth - nextBarWidth) / 2
          : 0

        return (
          <g key={stage.stage_id}>
            {/* Trapezoid bar */}
            <polygon
              points={`${barX},${y} ${barX + barWidth},${y} ${barX + barWidth},${y + stageHeight} ${barX},${y + stageHeight}`}
              fill={stage.color}
              opacity={0.85}
              rx={4}
            />

            {/* Stage name (left) */}
            <text
              x={labelLeftWidth - 8}
              y={y + stageHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-foreground"
              fontSize={compact ? 11 : 13}
              fontWeight={500}
            >
              {stage.stage_name}
            </text>

            {/* Deal count (center of bar) */}
            <text
              x={barX + barWidth / 2}
              y={y + stageHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={compact ? 11 : 13}
              fontWeight={600}
            >
              {stage.entered}
            </text>

            {/* Right side info */}
            {!compact && (
              <>
                <text
                  x={barX + barWidth + 10}
                  y={y + stageHeight / 2 - 7}
                  className="fill-muted-foreground"
                  fontSize={11}
                  dominantBaseline="central"
                >
                  {formatValue(stage.total_amount)} EUR
                </text>
                {stage.avg_duration && (
                  <text
                    x={barX + barWidth + 10}
                    y={y + stageHeight / 2 + 9}
                    className="fill-muted-foreground"
                    fontSize={10}
                    dominantBaseline="central"
                  >
                    {formatDuration(stage.avg_duration)}
                  </text>
                )}
              </>
            )}

            {/* Conversion arrow between stages */}
            {nextStage && (
              <g>
                {/* Connector trapezoid shape */}
                <polygon
                  points={`${barX},${y + stageHeight} ${barX + barWidth},${y + stageHeight} ${nextBarX + nextBarWidth},${y + stageHeight + gapHeight} ${nextBarX},${y + stageHeight + gapHeight}`}
                  fill={stage.color}
                  opacity={0.15}
                />
                {/* Conversion rate label */}
                <text
                  x={labelLeftWidth + barAreaWidth / 2}
                  y={y + stageHeight + gapHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-muted-foreground"
                  fontSize={11}
                  fontWeight={500}
                >
                  {stage.conversion_rate}%
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
