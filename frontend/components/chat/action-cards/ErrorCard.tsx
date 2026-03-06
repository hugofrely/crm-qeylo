"use client"

import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EnrichedAction } from "@/types/chat"

export function ErrorCard({ action }: { action: EnrichedAction }) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-lg border border-red-200 border-l-[3px] border-l-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2.5"
    )}>
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-red-600">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-red-600/70">Erreur</p>
        <p className="text-sm text-red-700 dark:text-red-400">{String(action.message || "Une erreur est survenue")}</p>
      </div>
    </div>
  )
}
