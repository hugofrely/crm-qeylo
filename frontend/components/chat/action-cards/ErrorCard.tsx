"use client"

import { useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import type { EnrichedAction } from "@/types/chat"

export function ErrorCard({ action }: { action: EnrichedAction }) {
  const t = useTranslations("chat")

  return (
    <div className="relative overflow-hidden rounded-xl border border-red-200/60 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="h-[3px] w-full bg-gradient-to-r from-red-400 to-red-500" />
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50/60">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] bg-red-100/80 text-red-700">
            {t("cards.error")}
          </span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400">{String(action.message || t("cards.errorDefault"))}</p>
      </div>
    </div>
  )
}
