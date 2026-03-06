"use client"

import { CardShell } from "./CardShell"
import { DynamicChart } from "@/components/chat/DynamicChart"
import type { EnrichedAction } from "@/types/chat"

export function ChartCard({ action }: { action: EnrichedAction }) {
  if (!action.chart) return null
  return (
    <CardShell action={action}>
      <DynamicChart config={action.chart} />
    </CardShell>
  )
}
