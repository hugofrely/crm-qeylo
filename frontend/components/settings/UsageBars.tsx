"use client"

import { Badge } from "@/components/ui/badge"
import type { UsageSummary, UsageItem } from "@/types/subscriptions"

const metricLabels: Record<string, string> = {
  contacts: "Contacts",
  pipelines: "Pipelines",
  users: "Utilisateurs",
  ai_messages: "Messages IA",
}

function getBarColor(percentage: number): string {
  if (percentage > 90) return "bg-red-500"
  if (percentage > 70) return "bg-amber-500"
  return "bg-[#0D4F4F]"
}

function UsageBar({ label, item }: { label: string; item: UsageItem }) {
  const percentage = item.limit ? Math.min((item.current / item.limit) * 100, 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        {item.limit !== null ? (
          <span className="text-muted-foreground tabular-nums">
            {item.current} / {item.limit}
          </span>
        ) : (
          <Badge variant="secondary" className="text-[10px] font-normal">
            Illimite
          </Badge>
        )}
      </div>
      {item.limit !== null ? (
        <div className="h-2 w-full rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${getBarColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <div className="h-2 w-full rounded-full bg-secondary/50" />
      )}
    </div>
  )
}

interface UsageBarsProps {
  usage: UsageSummary
}

export default function UsageBars({ usage }: UsageBarsProps) {
  const metrics = ["contacts", "pipelines", "users", "ai_messages"] as const

  return (
    <div className="space-y-4 font-[family-name:var(--font-body)]">
      <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Utilisation
      </h3>
      <div className="space-y-4">
        {metrics.map((key) => (
          <UsageBar
            key={key}
            label={metricLabels[key]}
            item={usage[key]}
          />
        ))}
      </div>
    </div>
  )
}
