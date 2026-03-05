"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Loader2, ChevronDown, ChevronRight } from "lucide-react"

interface ExecutionStep {
  id: string
  node_type: string
  node_subtype: string
  status: string
  output_data: Record<string, unknown>
  error: string
  started_at: string
  completed_at: string | null
}

interface Execution {
  id: string
  workflow_name: string
  trigger_event: string
  trigger_data: Record<string, unknown>
  status: string
  started_at: string
  completed_at: string | null
  error: string
  steps: ExecutionStep[]
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  skipped: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Terminé",
  failed: "Échoué",
  running: "En cours",
  cancelled: "Annulé",
  pending: "En attente",
  skipped: "Ignoré",
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}

interface ExecutionHistoryProps {
  workflowId: string
}

export default function ExecutionHistory({ workflowId }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<Execution[]>(`/workflows/${workflowId}/executions/`)
        setExecutions(data)
      } catch {
        console.error("Failed to fetch executions")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [workflowId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm font-[family-name:var(--font-body)]">
        Aucune exécution pour ce workflow.
      </div>
    )
  }

  return (
    <div className="space-y-2 font-[family-name:var(--font-body)]">
      {executions.map((exec) => (
        <div key={exec.id} className="rounded-lg border border-border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/20 transition-colors text-left"
          >
            {expandedId === exec.id ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[exec.status] || ""}`}>
              {STATUS_LABELS[exec.status] || exec.status}
            </span>
            <span className="text-xs text-muted-foreground flex-1 truncate">
              {exec.trigger_event}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {timeAgo(exec.started_at)}
            </span>
          </button>

          {expandedId === exec.id && (
            <div className="border-t border-border p-3 space-y-2 bg-secondary/5">
              {exec.error && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2">
                  {exec.error}
                </div>
              )}
              {exec.steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground/50 w-4 shrink-0 text-right">{i + 1}.</span>
                  <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[step.status] || ""}`}>
                    {STATUS_LABELS[step.status] || step.status}
                  </span>
                  <span className="text-muted-foreground">
                    {step.node_type}: {step.node_subtype}
                  </span>
                  {step.error && (
                    <span className="text-red-500 truncate">{step.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
