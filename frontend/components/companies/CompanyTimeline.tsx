"use client"

import { useState, useEffect } from "react"
import { Loader2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { fetchCompanyTimeline } from "@/services/companies"
import { useTranslations } from "next-intl"
import type { TimelineEntry } from "@/types"
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

/* -- Helpers -- */

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
    default:
      return "bg-secondary text-muted-foreground"
  }
}

export interface CompanyTimelineProps {
  companyId: string
}

export function CompanyTimeline({ companyId }: CompanyTimelineProps) {
  const t = useTranslations('companies')
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  function getEntryTypeLabel(entryType: string): string {
    const key = `timeline.entryTypes.${entryType}` as const
    return t.has(key) ? t(key) : entryType
  }

  useEffect(() => {
    setLoading(true)
    fetchCompanyTimeline(companyId)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          {t('timeline.empty')}
        </p>
      </div>
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
                <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">
                  {entry.content}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
