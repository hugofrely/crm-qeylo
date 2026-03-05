"use client"

import {
  User,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle,
  StickyNote,
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolCallPart } from "@/types"

export type { ToolCallPart } from "@/types"

const toolConfig: Record<
  string,
  {
    icon: React.ElementType
    label: string
    accentColor: string
    bgColor: string
  }
> = {
  create_contact: {
    icon: User,
    label: "Création de contact",
    accentColor: "text-primary",
    bgColor: "bg-teal-light",
  },
  search_contacts: {
    icon: Search,
    label: "Recherche de contacts",
    accentColor: "text-primary",
    bgColor: "bg-teal-light",
  },
  create_deal: {
    icon: Briefcase,
    label: "Création de deal",
    accentColor: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  move_deal: {
    icon: ArrowRight,
    label: "Déplacement de deal",
    accentColor: "text-warm",
    bgColor: "bg-warm-light",
  },
  create_task: {
    icon: Clock,
    label: "Création de tâche",
    accentColor: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
  },
  complete_task: {
    icon: CheckCircle,
    label: "Complétion de tâche",
    accentColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
  },
  add_note: {
    icon: StickyNote,
    label: "Ajout de note",
    accentColor: "text-warm",
    bgColor: "bg-warm-light",
  },
  get_dashboard_summary: {
    icon: BarChart3,
    label: "Résumé du tableau de bord",
    accentColor: "text-primary",
    bgColor: "bg-teal-light",
  },
  search_all: {
    icon: Search,
    label: "Recherche globale",
    accentColor: "text-muted-foreground",
    bgColor: "bg-secondary",
  },
  send_contact_email: {
    icon: Mail,
    label: "Envoi d'email",
    accentColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
  },
}

const defaultConfig = {
  icon: CheckCircle,
  label: "Action",
  accentColor: "text-muted-foreground",
  bgColor: "bg-secondary",
}

function formatResult(result: Record<string, unknown>): string {
  const action = result.action as string | undefined
  if (!action) return ""

  switch (action) {
    case "contact_created":
      return `${result.name}${result.company ? ` — ${result.company}` : ""}`
    case "deal_created":
      return `${result.name} — ${result.amount} €`
    case "deal_moved":
      return `${result.name}: ${result.old_stage} → ${result.new_stage}`
    case "task_created":
      return String(result.description || "")
    case "task_completed":
      return String(result.description || "")
    case "note_added":
      return String(result.content || "").slice(0, 80)
    case "dashboard_summary":
      return `${result.active_deals} deals actifs · ${result.upcoming_tasks_7d} tâches`
    case "search_contacts":
      return `${result.count} résultat(s)`
    case "search_all":
      return "Recherche terminée"
    case "email_sent":
      return `${result.to} — ${result.subject}`
    default:
      return ""
  }
}

function formatArgs(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "create_contact":
      return [args.first_name, args.last_name].filter(Boolean).join(" ")
    case "search_contacts":
    case "search_all":
      return String(args.query || "")
    case "create_deal":
      return String(args.name || "")
    case "move_deal":
      return String(args.new_stage_name || "")
    case "create_task":
      return String(args.description || "").slice(0, 50)
    case "complete_task":
      return ""
    case "add_note":
      return String(args.content || "").slice(0, 50)
    case "get_dashboard_summary":
      return ""
    case "send_contact_email":
      return String(args.subject || "")
    default:
      return ""
  }
}

export function InlineToolCard({ part }: { part: ToolCallPart }) {
  const config = toolConfig[part.toolName] || defaultConfig
  const Icon = config.icon
  const argsText = formatArgs(part.toolName, part.args)
  const resultText =
    part.status === "completed" && part.result
      ? formatResult(part.result)
      : ""

  return (
    <div
      className={cn(
        "my-2.5 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all font-[family-name:var(--font-body)]",
        config.bgColor,
        part.status === "running" && "animate-pulse"
      )}
    >
      <div className={cn("shrink-0", config.accentColor)}>
        {part.status === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : part.status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium text-muted-foreground">
          {config.label}
        </span>
        {argsText && part.status === "running" && (
          <span className="ml-1.5 text-[11px] text-muted-foreground/60">
            {argsText}
          </span>
        )}
        {resultText && part.status === "completed" && (
          <span className="ml-1.5 text-[11px] text-foreground">
            — {resultText}
          </span>
        )}
      </div>

      {part.status === "completed" && (
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
    </div>
  )
}
