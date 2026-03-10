"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Lock, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createCheckoutSession } from "@/services/subscriptions"
import type { UpgradeModalContext } from "@/lib/quota-error"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: UpgradeModalContext | null
}

const PLAN_BENEFITS: Record<string, string[]> = {
  pro: ["contacts", "pipelines", "ai", "products", "workflows", "csv", "reports"],
  team: ["users", "api", "assignment", "onboarding", "all"],
}

export function UpgradeModal({ open, onOpenChange, context }: UpgradeModalProps) {
  const t = useTranslations("plan")
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!context) return null

  const { type, feature, current, limit, requiredPlan } = context
  const planName = t(`plans.${requiredPlan}.name`)
  const planPrice = t(`plans.${requiredPlan}.price`)
  const planPeriod = t(`plans.${requiredPlan}.period`)
  const benefits = PLAN_BENEFITS[requiredPlan] ?? PLAN_BENEFITS.pro

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSession(requiredPlan)
      window.location.href = url
    } catch (err) {
      console.error("Failed to create checkout session:", err)
      setLoading(false)
    }
  }

  const handleCompare = () => {
    onOpenChange(false)
    router.push("/settings")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <div className="p-6 pb-0 text-center">
          {/* Icon */}
          {type === "feature" ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
          )}

          {/* Title & Description */}
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-bold">
              {type === "feature" && feature
                ? t(`features.${feature}.label`)
                : t("upgrade.quotaTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {type === "feature" && feature
                ? t(`features.${feature}.description`)
                : t("quota.limitSubtext", { label: context.quota ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {/* Quota progress bar (quota mode only) */}
          {type === "quota" && limit != null && (
            <div className="mt-4 mb-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-destructive transition-all"
                  style={{ width: `${Math.min(((current ?? 0) / limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {current}/{limit}
              </p>
            </div>
          )}
        </div>

        {/* Plan card */}
        <div className="px-6 pt-4">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-base">{planName}</span>
              <span className="text-sm">
                {planPrice}
                <span className="text-xs opacity-70">{planPeriod}</span>
              </span>
            </div>
            <div className="text-xs opacity-85 leading-relaxed space-y-1">
              {benefits.map((key) => (
                <div key={key}>✓ {t(`plans.${requiredPlan}.benefits.${key}`)}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 space-y-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("upgrade.loading")}
              </>
            ) : (
              t("upgrade.cta", { plan: planName })
            )}
          </Button>
          <button
            onClick={handleCompare}
            className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t("upgrade.compareLink")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
