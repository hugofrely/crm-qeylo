"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle } from "lucide-react"
import type { SubscriptionDetail } from "@/types/subscriptions"
import { useTranslations, useLocale } from "next-intl"

const planBadgeClasses: Record<string, string> = {
  solo: "bg-gray-100 text-gray-700 border-gray-200",
  pro: "bg-teal-50 text-teal-700 border-teal-200",
  team: "bg-amber-50 text-amber-700 border-amber-200",
}

interface PlanCardProps {
  subscription: SubscriptionDetail
  onUpgrade: (plan: string) => void
  onCancel: () => void
  onReactivate: () => void
}

export default function PlanCard({ subscription, onUpgrade, onCancel, onReactivate }: PlanCardProps) {
  const t = useTranslations("settings.billing")
  const locale = useLocale()
  const { plan, status, current_period_end, cancel_at_period_end } = subscription

  const planLabels: Record<string, string> = {
    solo: t("planSolo"),
    pro: t("planPro"),
    team: t("planTeam"),
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6 font-[family-name:var(--font-body)]">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold tracking-tight">
                {t("planLabel", { plan: planLabels[plan] ?? plan })}
              </h3>
              <Badge
                variant="outline"
                className={planBadgeClasses[plan] ?? ""}
              >
                {planLabels[plan] ?? plan}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {status === "active" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("active")}</span>
                </>
              )}
              {status === "past_due" && (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">{t("pastDue")}</span>
                </>
              )}
              {status !== "active" && status !== "past_due" && (
                <span className="capitalize">{status}</span>
              )}
            </div>

            {current_period_end && !cancel_at_period_end && (
              <p className="text-sm text-muted-foreground">
                {t("nextRenewal", { date: formatDate(current_period_end) })}
              </p>
            )}

            {cancel_at_period_end && current_period_end && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {t("cancelledAt", { date: formatDate(current_period_end) })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={onReactivate}
                >
                  {t("reactivate")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {!cancel_at_period_end && (
          <div className="mt-5 flex items-center gap-3">
            {plan === "solo" && (
              <>
                <Button
                  onClick={() => onUpgrade("pro")}
                  className="bg-[#0D4F4F] hover:bg-[#3D7A7A] text-white"
                >
                  {t("upgradeToPro")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onUpgrade("team")}
                >
                  {t("upgradeToTeam")}
                </Button>
              </>
            )}
            {plan === "pro" && (
              <>
                <Button
                  onClick={() => onUpgrade("team")}
                  className="bg-[#0D4F4F] hover:bg-[#3D7A7A] text-white"
                >
                  {t("upgradeToTeam")}
                </Button>
                <button
                  onClick={onCancel}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
                >
                  {t("cancelSubscription")}
                </button>
              </>
            )}
            {plan === "team" && (
              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-4"
              >
                {t("cancelSubscription")}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
