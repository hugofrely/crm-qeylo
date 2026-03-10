"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlanGate, type QuotaKey } from "@/contexts/PlanContext"

interface QuotaBannerProps {
  quota: QuotaKey
  label: string
}

export function QuotaBanner({ quota, label }: QuotaBannerProps) {
  const t = useTranslations("plan")
  const { getQuotaStatus, getQuotaInfo, openUpgradeModal } = usePlanGate()

  const status = getQuotaStatus(quota)
  const { current, limit, percent } = getQuotaInfo(quota)

  if (status === "ok" || limit === null) return null

  const isLimit = status === "limit"

  const handleUpgrade = () => {
    openUpgradeModal({
      type: "quota",
      quota,
      current,
      limit: limit ?? undefined,
      requiredPlan: "pro",
    })
  }

  return (
    <div
      className={`rounded-lg border p-3.5 flex items-center gap-3.5 ${
        isLimit
          ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800"
          : "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isLimit
            ? "bg-red-100 dark:bg-red-900/50"
            : "bg-amber-100 dark:bg-amber-900/50"
        }`}
      >
        {isLimit ? (
          <XCircle className="h-[18px] w-[18px] text-red-600 dark:text-red-400" />
        ) : (
          <AlertTriangle className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] font-semibold ${
            isLimit
              ? "text-red-900 dark:text-red-200"
              : "text-amber-900 dark:text-amber-200"
          }`}
        >
          {isLimit
            ? t("quota.limit", { current, limit, label })
            : t("quota.warning", { current, limit, label })}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            isLimit
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {isLimit
            ? t("quota.limitSubtext", { label })
            : t("quota.warningSubtext")}
        </p>
      </div>

      {/* Mini progress bar */}
      <div className="w-20 shrink-0">
        <div
          className={`h-1.5 rounded-full overflow-hidden ${
            isLimit ? "bg-red-200 dark:bg-red-800" : "bg-amber-200 dark:bg-amber-800"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isLimit ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p
          className={`text-center text-[10px] mt-0.5 ${
            isLimit
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {Math.round(percent)}%
        </p>
      </div>

      {/* CTA */}
      <Button
        size="sm"
        onClick={handleUpgrade}
        className={`shrink-0 ${
          isLimit
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}
      >
        {isLimit ? t("quota.ctaLimit") : t("quota.ctaWarning")}
      </Button>
    </div>
  )
}
