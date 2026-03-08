"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, AlertTriangle, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchNextActions, fetchAiNextActions } from "@/services/deals"
import { useTranslations } from "next-intl"
import type { NextAction, AiSuggestion } from "@/services/deals"

const PRIORITY_STYLES = {
  high: { icon: AlertTriangle, bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
  medium: { icon: AlertCircle, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  low: { icon: Info, bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
}

interface NextActionsProps {
  dealId: string
}

export function NextActions({ dealId }: NextActionsProps) {
  const t = useTranslations("deals")
  const [actions, setActions] = useState<NextAction[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRequested, setAiRequested] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchNextActions(dealId)
      .then((data) => setActions(data.heuristic_actions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dealId])

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiRequested(true)
    try {
      const data = await fetchAiNextActions(dealId)
      setAiSuggestions(data.suggestions)
    } catch {
      setAiSuggestions([{ action: t("aiUnavailable"), reasoning: t("aiError"), priority: "medium" }])
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (actions.length === 0 && !aiRequested) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t("recommendedActions")}</h3>
      <div className="space-y-2">
        {actions.map((action, i) => {
          const style = PRIORITY_STYLES[action.priority]
          const Icon = style.icon
          return (
            <div key={i} className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
              <p className="text-sm">{action.message}</p>
            </div>
          )
        })}
      </div>

      {!aiRequested && (
        <Button variant="outline" size="sm" onClick={handleAiAnalysis} className="gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          {t("aiAnalysis")}
        </Button>
      )}

      {aiLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("aiAnalysisLoading")}
        </div>
      )}

      {aiSuggestions.length > 0 && (
        <div className="space-y-2 mt-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("aiSuggestions")}</h4>
          {aiSuggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1">
              <p className="text-sm font-medium">{s.action}</p>
              <p className="text-xs text-muted-foreground">{s.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
