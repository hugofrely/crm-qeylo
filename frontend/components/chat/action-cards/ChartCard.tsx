"use client"

import { CardShell } from "./CardShell"
import { DynamicChart } from "@/components/chat/DynamicChart"
import type { EnrichedAction } from "@/types/chat"

export function ChartCard({ action }: { action: EnrichedAction }) {
  if (!action.chart) return null
  return (
    <CardShell action={action} className="w-full">
      {action.chart.title && (
        <p className="text-base font-semibold mb-3">{action.chart.title}</p>
      )}
      <div className="min-h-[400px]">
        <DynamicChart config={action.chart} />
      </div>
    </CardShell>
  )
}
