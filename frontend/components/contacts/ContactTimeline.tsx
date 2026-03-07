"use client"

import type { TimelineEntry } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  Pencil,
  MessageSquare,
} from "lucide-react"
import { MarkdownContent } from "@/components/chat/MarkdownContent"

/* ── Helpers ── */

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTimelineIcon(entryType: string) {
  switch (entryType) {
    case "chat_action":
      return <MessageSquare className="h-3.5 w-3.5" />
    case "note_added":
      return <FileText className="h-3.5 w-3.5" />
    case "deal_created":
    case "deal_moved":
      return <DollarSign className="h-3.5 w-3.5" />
    case "call":
      return <Phone className="h-3.5 w-3.5" />
    case "email_sent":
    case "email_received":
      return <Mail className="h-3.5 w-3.5" />
    case "meeting":
      return <Calendar className="h-3.5 w-3.5" />
    case "contact_updated":
      return <Pencil className="h-3.5 w-3.5" />
    case "custom":
      return <Tag className="h-3.5 w-3.5" />
    default:
      return <Calendar className="h-3.5 w-3.5" />
  }
}

function getTimelineColor(entryType: string) {
  switch (entryType) {
    case "chat_action":
      return "bg-teal-light text-primary"
    case "note_added":
      return "bg-warm-light text-warm"
    case "deal_created":
    case "deal_moved":
      return "bg-green-50 text-green-700"
    case "call":
      return "bg-purple-50 text-purple-700"
    case "email_sent":
    case "email_received":
      return "bg-orange-50 text-orange-700"
    case "meeting":
      return "bg-blue-50 text-blue-700"
    case "contact_updated":
      return "bg-blue-50 text-blue-700"
    case "custom":
      return "bg-secondary text-muted-foreground"
    default:
      return "bg-secondary text-muted-foreground"
  }
}

function getEntryTypeLabel(entryType: string): string {
  const labels: Record<string, string> = {
    contact_created: "Contact cree",
    deal_created: "Deal cree",
    deal_moved: "Deal deplace",
    note_added: "Note",
    task_created: "Tache creee",
    chat_action: "Action chat",
    contact_updated: "Contact modifie",
    call: "Appel",
    email_sent: "Email envoye",
    email_received: "Email recu",
    meeting: "Reunion",
    custom: "Activite",
  }
  return labels[entryType] || entryType
}

/* ── ActivityMetadata ── */

function ActivityMetadata({ entry }: { entry: TimelineEntry }) {
  const meta = entry.metadata as Record<string, unknown>
  if (!meta || Object.keys(meta).length === 0) return null

  const badges: string[] = []

  switch (entry.entry_type) {
    case "call":
      if (meta.direction) badges.push(meta.direction === "inbound" ? "Entrant" : "Sortant")
      if (meta.outcome) {
        const outcomes: Record<string, string> = { answered: "Repondu", voicemail: "Messagerie", no_answer: "Pas de reponse", busy: "Occupe" }
        badges.push(outcomes[meta.outcome as string] || String(meta.outcome))
      }
      if (meta.duration_minutes) badges.push(`${meta.duration_minutes} min`)
      break
    case "email_sent":
    case "email_received":
      if (meta.subject) badges.push(String(meta.subject))
      break
    case "meeting":
      if (meta.scheduled_at) badges.push(formatDateTime(String(meta.scheduled_at)))
      if (meta.location) badges.push(String(meta.location))
      break
    case "custom":
      if (meta.custom_type_label) badges.push(String(meta.custom_type_label))
      break
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map((badge, i) => (
        <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {badge}
        </span>
      ))}
    </div>
  )
}

/* ── TimelineList (reusable internal component) ── */

function TimelineList({ entries, emptyMessage }: { entries: TimelineEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-card rounded-lg p-3 border border-border/50">
          <div className="flex gap-3">
            <div
              className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 ${getTimelineColor(entry.entry_type)}`}
            >
              {getTimelineIcon(entry.entry_type)}
            </div>
            <div className="flex-1 min-w-0 font-[family-name:var(--font-body)]">
              <div className="flex items-baseline justify-between gap-2">
                <Badge variant="outline" className="text-[10px] capitalize font-normal">
                  {getEntryTypeLabel(entry.entry_type)}
                </Badge>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              {entry.subject && (
                <p className="text-sm font-medium mt-1">{entry.subject}</p>
              )}
              {entry.content && (
                <div className="mt-1.5 text-sm">
                  <MarkdownContent content={entry.content} />
                </div>
              )}
              <ActivityMetadata entry={entry} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── ContactTimeline ── */

export interface ContactTimelineProps {
  entries: TimelineEntry[]
}

export function ContactTimeline({ entries }: ContactTimelineProps) {
  return <TimelineList entries={entries} emptyMessage="Aucune activite pour ce contact." />
}
