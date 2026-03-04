"use client"

import {
  User,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle,
  StickyNote,
  BarChart3,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ChatAction {
  action: string
  [key: string]: unknown
}

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return "0 \u20AC"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== "string") return ""
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr))
  } catch {
    return String(dateStr)
  }
}

const actionConfig: Record<
  string,
  {
    icon: React.ElementType
    borderColor: string
    iconColor: string
    bgColor: string
    label: string
  }
> = {
  contact_created: {
    icon: User,
    borderColor: "border-l-blue-500",
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    label: "Contact cr\u00e9\u00e9",
  },
  deal_created: {
    icon: Briefcase,
    borderColor: "border-l-emerald-500",
    iconColor: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    label: "Deal cr\u00e9\u00e9",
  },
  deal_moved: {
    icon: ArrowRight,
    borderColor: "border-l-amber-500",
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    label: "Deal d\u00e9plac\u00e9",
  },
  task_created: {
    icon: Clock,
    borderColor: "border-l-purple-500",
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    label: "T\u00e2che cr\u00e9\u00e9e",
  },
  task_completed: {
    icon: CheckCircle,
    borderColor: "border-l-green-500",
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    label: "T\u00e2che termin\u00e9e",
  },
  note_added: {
    icon: StickyNote,
    borderColor: "border-l-orange-500",
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    label: "Note ajout\u00e9e",
  },
  dashboard_summary: {
    icon: BarChart3,
    borderColor: "border-l-indigo-500",
    iconColor: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    label: "R\u00e9sum\u00e9",
  },
}

function ContactCreatedContent({ action }: { action: ChatAction }) {
  const company = action.company ? String(action.company) : null
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{String(action.name ?? "")}</p>
        {company && (
          <p className="truncate text-xs text-muted-foreground">
            {company}
          </p>
        )}
      </div>
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        Contact
      </Badge>
    </div>
  )
}

function DealCreatedContent({ action }: { action: ChatAction }) {
  const stage = action.stage ? String(action.stage) : null
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{String(action.name ?? "")}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(action.amount)}
        </p>
      </div>
      {stage && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {stage}
        </Badge>
      )}
    </div>
  )
}

function DealMovedContent({ action }: { action: ChatAction }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{String(action.name ?? "")}</p>
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{String(action.old_stage ?? "")}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span className="truncate font-medium text-foreground">
          {String(action.new_stage ?? "")}
        </span>
      </div>
    </div>
  )
}

function TaskCreatedContent({ action }: { action: ChatAction }) {
  const dueDate = action.due_date ? String(action.due_date) : null
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">
        {String(action.description ?? action.title ?? "")}
      </p>
      {dueDate && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {"\u00C9ch\u00e9ance"} : {formatDate(dueDate)}
        </p>
      )}
    </div>
  )
}

function TaskCompletedContent({ action }: { action: ChatAction }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium line-through text-muted-foreground">
        {String(action.description ?? action.title ?? "")}
      </p>
    </div>
  )
}

function NoteAddedContent({ action }: { action: ChatAction }) {
  const content = String(action.content ?? "")
  const excerpt = content.length > 100 ? content.slice(0, 100) + "\u2026" : content
  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
    </div>
  )
}

function DashboardSummaryContent({ action }: { action: ChatAction }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <p className="text-lg font-semibold">{formatCurrency(action.revenue)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Revenus
        </p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.active_deals ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Deals actifs
        </p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.pending_tasks ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
          T\u00e2ches
        </p>
      </div>
    </div>
  )
}

const contentRenderers: Record<
  string,
  (props: { action: ChatAction }) => React.ReactNode
> = {
  contact_created: ContactCreatedContent,
  deal_created: DealCreatedContent,
  deal_moved: DealMovedContent,
  task_created: TaskCreatedContent,
  task_completed: TaskCompletedContent,
  note_added: NoteAddedContent,
  dashboard_summary: DashboardSummaryContent,
}

export function ActionCard({ action }: { action: ChatAction }) {
  const config = actionConfig[action.action]
  if (!config) return null

  const Icon = config.icon
  const ContentRenderer = contentRenderers[action.action]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 border-l-[3px] px-3 py-2.5",
        config.borderColor,
        config.bgColor
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          config.iconColor
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {config.label}
        </p>
        {ContentRenderer && <ContentRenderer action={action} />}
      </div>
    </div>
  )
}
