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
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ToolCallPart } from "@/types"
import { ActionCard } from "@/components/chat/ActionCard"
import type { EnrichedAction } from "@/types/chat"

export type { ToolCallPart } from "@/types"

const toolIcons: Record<
  string,
  {
    icon: React.ElementType
    accentColor: string
    bgColor: string
  }
> = {
  create_contact: { icon: User, accentColor: "text-primary", bgColor: "bg-teal-light" },
  search_contacts: { icon: Search, accentColor: "text-primary", bgColor: "bg-teal-light" },
  create_deal: { icon: Briefcase, accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  move_deal: { icon: ArrowRight, accentColor: "text-warm", bgColor: "bg-warm-light" },
  create_task: { icon: Clock, accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  complete_task: { icon: CheckCircle, accentColor: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
  add_note: { icon: StickyNote, accentColor: "text-warm", bgColor: "bg-warm-light" },
  get_dashboard_summary: { icon: BarChart3, accentColor: "text-primary", bgColor: "bg-teal-light" },
  search_all: { icon: Search, accentColor: "text-muted-foreground", bgColor: "bg-secondary" },
  send_contact_email: { icon: Mail, accentColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  update_contact: { icon: User, accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  update_contact_categories: { icon: Tags, accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  update_custom_field: { icon: User, accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  delete_contact: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_contact: { icon: User, accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  list_contact_categories: { icon: Tags, accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  create_contact_category: { icon: Tags, accentColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
  delete_contact_category: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  update_deal: { icon: Briefcase, accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  delete_deal: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_deal: { icon: Briefcase, accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  search_deals: { icon: Search, accentColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30" },
  list_pipeline_stages: { icon: ArrowRight, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  create_pipeline_stage: { icon: ArrowRight, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  update_pipeline_stage: { icon: ArrowRight, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  delete_pipeline_stage: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  update_task: { icon: Clock, accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  delete_task: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  search_tasks: { icon: Search, accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  list_segments: { icon: Layers, accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  update_segment: { icon: Layers, accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  delete_segment: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  get_segment_contacts: { icon: Layers, accentColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  create_workflow: { icon: Zap, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  list_workflows: { icon: Zap, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  toggle_workflow: { icon: Zap, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  get_workflow_executions: { icon: Zap, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  update_workflow: { icon: Zap, accentColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  delete_workflow: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  create_email_template: { icon: Mail, accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  update_email_template: { icon: Mail, accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  delete_email_template: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  list_email_templates: { icon: Mail, accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  send_email_from_template: { icon: Mail, accentColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30" },
  log_interaction: { icon: StickyNote, accentColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  update_note: { icon: StickyNote, accentColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  delete_note: { icon: Trash2, accentColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
  list_timeline: { icon: StickyNote, accentColor: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30" },
  navigate: { icon: Link2, accentColor: "text-primary", bgColor: "bg-teal-light" },
  query_contacts: { icon: Search, accentColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  generate_chart: { icon: BarChart3, accentColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
}

const defaultIcons = {
  icon: CheckCircle,
  accentColor: "text-muted-foreground",
  bgColor: "bg-secondary",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatResult(result: Record<string, unknown>, t: (key: string, values?: any) => string): string {
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
      return t("results.activeDeals", { count: result.active_deals, tasks: result.upcoming_tasks_7d })
    case "search_contacts":
      return t("results.resultCount", { count: result.count })
    case "search_all":
      return t("results.searchDone")
    case "email_sent":
      return `${result.to} — ${result.subject}`
    case "contact_deleted":
    case "deal_deleted":
    case "task_deleted":
    case "note_deleted":
    case "segment_deleted":
    case "workflow_deleted":
    case "email_template_deleted":
      return String(result.summary || t("results.deleted"))
    case "deal_updated":
    case "task_updated":
    case "contact_updated":
    case "segment_updated":
    case "workflow_updated":
    case "note_updated":
      return String(result.summary || t("results.updated"))
    default:
      if (result.summary) return String(result.summary)
      return ""
  }
}

function formatArgs(toolName: string, args: Record<string, unknown>, t: (key: string) => string): string {
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
      return t("tools.filtering")
    case "generate_chart":
      return String(args.metric || "")
    default:
      return ""
  }
}

export function InlineToolCard({ part }: { part: ToolCallPart }) {
  const t = useTranslations("chat")
  const icons = toolIcons[part.toolName] || defaultIcons
  const Icon = icons.icon
  const label = t.has(`tools.${part.toolName}`) ? t(`tools.${part.toolName}`) : t("tools.defaultLabel")
  const argsText = formatArgs(part.toolName, part.args, t)
  const isEnriched = part.status === "completed" && !!part.result?.entity_type
  const resultText =
    part.status === "completed" && part.result && !isEnriched
      ? formatResult(part.result, t)
      : ""

  return (
    <div className="my-2.5">
      {/* Compact pill - always shown */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all font-[family-name:var(--font-body)]",
          icons.bgColor,
          part.status === "running" && "animate-pulse"
        )}
      >
        <div className={cn("shrink-0", icons.accentColor)}>
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
            {label}
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
