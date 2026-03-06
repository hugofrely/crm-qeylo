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
  Tags,
  Trash2,
  Layers,
  Zap,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolCallPart } from "@/types"
import { ActionCard } from "@/components/chat/ActionCard"
import type { EnrichedAction } from "@/types/chat"

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
  // Contact tools
  update_contact: { icon: User, label: "Mise à jour du contact", accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  update_contact_categories: { icon: Tags, label: "Mise à jour des catégories", accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  update_custom_field: { icon: User, label: "Mise à jour du champ", accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  delete_contact: { icon: Trash2, label: "Suppression du contact", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_contact: { icon: User, label: "Détails du contact", accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  list_contact_categories: { icon: Tags, label: "Liste des catégories", accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  create_contact_category: { icon: Tags, label: "Création de catégorie", accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  delete_contact_category: { icon: Trash2, label: "Suppression de catégorie", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  // Deal tools
  update_deal: { icon: Briefcase, label: "Mise à jour du deal", accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  delete_deal: { icon: Trash2, label: "Suppression du deal", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_deal: { icon: Briefcase, label: "Détails du deal", accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  search_deals: { icon: Search, label: "Recherche de deals", accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  list_pipeline_stages: { icon: ArrowRight, label: "Stages du pipeline", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  create_pipeline_stage: { icon: ArrowRight, label: "Création de stage", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  update_pipeline_stage: { icon: ArrowRight, label: "Mise à jour du stage", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  delete_pipeline_stage: { icon: Trash2, label: "Suppression du stage", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  // Task tools
  update_task: { icon: Clock, label: "Mise à jour de tâche", accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  delete_task: { icon: Trash2, label: "Suppression de tâche", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  search_tasks: { icon: Search, label: "Recherche de tâches", accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  // Segment tools
  list_segments: { icon: Layers, label: "Liste des segments", accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  update_segment: { icon: Layers, label: "Mise à jour du segment", accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  delete_segment: { icon: Trash2, label: "Suppression du segment", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_segment_contacts: { icon: Layers, label: "Contacts du segment", accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  // Workflow tools
  create_workflow: { icon: Zap, label: "Création de workflow", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  list_workflows: { icon: Zap, label: "Liste des workflows", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  toggle_workflow: { icon: Zap, label: "Activation du workflow", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  get_workflow_executions: { icon: Zap, label: "Exécutions du workflow", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  update_workflow: { icon: Zap, label: "Mise à jour du workflow", accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  delete_workflow: { icon: Trash2, label: "Suppression du workflow", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  // Email template tools
  create_email_template: { icon: Mail, label: "Création de template", accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  update_email_template: { icon: Mail, label: "Mise à jour du template", accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  delete_email_template: { icon: Trash2, label: "Suppression du template", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  list_email_templates: { icon: Mail, label: "Liste des templates", accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  send_email_from_template: { icon: Mail, label: "Envoi depuis template", accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  // Timeline tools
  log_interaction: { icon: StickyNote, label: "Enregistrement d'interaction", accentColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  update_note: { icon: StickyNote, label: "Mise à jour de note", accentColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  delete_note: { icon: Trash2, label: "Suppression de note", accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  list_timeline: { icon: StickyNote, label: "Timeline", accentColor: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30" },
  // Transversal tools
  navigate: { icon: Link2, label: "Navigation", accentColor: "text-primary", bgColor: "bg-teal-light" },
  query_contacts: { icon: Search, label: "Requête contacts", accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  generate_chart: { icon: BarChart3, label: "Génération de graphique", accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
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
    case "contact_deleted":
    case "deal_deleted":
    case "task_deleted":
    case "note_deleted":
    case "segment_deleted":
    case "workflow_deleted":
    case "email_template_deleted":
      return String(result.summary || "Supprimé")
    case "deal_updated":
    case "task_updated":
    case "contact_updated":
    case "segment_updated":
    case "workflow_updated":
    case "note_updated":
      return String(result.summary || "Mis à jour")
    default:
      // For enriched actions, use summary
      if (result.summary) return String(result.summary)
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
    case "delete_contact":
    case "get_contact":
    case "update_contact":
      return String(args.contact_id || "").slice(0, 8)
    case "update_deal":
    case "delete_deal":
    case "get_deal":
      return String(args.deal_id || "").slice(0, 8)
    case "search_deals":
      return String(args.query || "")
    case "update_task":
    case "delete_task":
      return String(args.task_id || "").slice(0, 8)
    case "search_tasks":
      return String(args.query || "")
    case "navigate":
      return String(args.destination || "")
    case "query_contacts":
      return "Filtrage..."
    case "generate_chart":
      return String(args.metric || "")
    default:
      return ""
  }
}

export function InlineToolCard({ part }: { part: ToolCallPart }) {
  const config = toolConfig[part.toolName] || defaultConfig
  const Icon = config.icon
  const argsText = formatArgs(part.toolName, part.args)
  const isEnriched = part.status === "completed" && !!part.result?.entity_type
  const resultText =
    part.status === "completed" && part.result && !isEnriched
      ? formatResult(part.result)
      : ""

  return (
    <div className="my-2.5">
      {/* Compact pill - always shown */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all font-[family-name:var(--font-body)]",
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
          {resultText && (
            <span className="ml-1.5 text-[11px] text-foreground">
              — {resultText}
            </span>
          )}
        </div>

        {part.status === "completed" && (
          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
      </div>

      {/* Rich action card - only for completed enriched results */}
      {isEnriched && part.result && (
        <div className="mt-2">
          <ActionCard action={part.result as EnrichedAction} />
        </div>
      )}
    </div>
  )
}
