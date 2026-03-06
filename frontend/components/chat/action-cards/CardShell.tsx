"use client"

import { cn } from "@/lib/utils"
import { getConfig } from "./config"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

export function CardShell({
  action,
  children,
}: {
  action: EnrichedAction
  children: React.ReactNode
}) {
  const config = getConfig(action.entity_type)
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 border-l-[3px] px-3 py-2.5",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", config.iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {action.summary || config.label}
        </p>
        {children}
        {action.link && (
          <Link href={action.link} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            Voir →
          </Link>
        )}
      </div>
    </div>
  )
}
