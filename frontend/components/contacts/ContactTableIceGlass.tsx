"use client"

import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import type { Contact } from "@/types"

interface ContactTableIceGlassProps {
  contacts: Contact[]
  ordering?: string
  onOrderingChange?: (ordering: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

type SortField = "last_name" | "company" | "created_at"

function SortIcon({ field, ordering }: { field: SortField; ordering: string }) {
  const isAsc = ordering === field
  const isDesc = ordering === `-${field}`
  if (isAsc) return <ArrowUp className="h-3 w-3" />
  if (isDesc) return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-30" />
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function ContactTableIceGlass({
  contacts,
  ordering = "-created_at",
  onOrderingChange,
}: ContactTableIceGlassProps) {
  const router = useRouter()
  const t = useTranslations("contacts")

  const handleSort = (field: SortField) => {
    if (!onOrderingChange) return
    const isAsc = ordering === field
    const isDesc = ordering === `-${field}`
    if (isAsc) onOrderingChange(`-${field}`)
    else if (isDesc) onOrderingChange("-created_at")
    else onOrderingChange(field)
  }

  if (contacts.length === 0) {
    return (
      <div className="ig-empty">
        <p>{t("emptyState.noContacts")}</p>
      </div>
    )
  }

  return (
    <>
      {/* Column headers */}
      <div className="ig-table-head">
        <span className="ig-table-head-cell" onClick={() => handleSort("last_name")}>
          {t("table.name")}
          <SortIcon field="last_name" ordering={ordering} />
        </span>
        <span className="ig-table-head-cell" onClick={() => handleSort("company")}>
          {t("table.company")}
          <SortIcon field="company" ordering={ordering} />
        </span>
        <span>{t("filter.score")}</span>
        <span className="ig-table-head-cell" onClick={() => handleSort("created_at")}>
          {t("table.createdAt")}
          <SortIcon field="created_at" ordering={ordering} />
        </span>
      </div>

      {/* Rows */}
      <div className="ig-list">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="ig-row"
            onClick={() => router.push(`/contacts/${contact.id}`)}
          >
            {/* Name cell */}
            <div className="flex items-center gap-3">
              <div className="ig-avatar-ring">
                <div className="ig-avatar-ring-inner">
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-primary)" }}>
                  {contact.first_name} {contact.last_name}
                </div>
                {contact.job_title && (
                  <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-muted)" }}>
                    {contact.job_title}
                  </div>
                )}
              </div>
            </div>

            {/* Company cell */}
            <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-secondary)" }}>
              {contact.company || "\u2014"}
            </div>

            {/* Score cell */}
            <div className="flex items-center gap-1.5">
              {contact.lead_score && (
                <>
                  <span className={`ig-score-dot ${
                    contact.lead_score === "hot"
                      ? "ig-score-hot"
                      : contact.lead_score === "warm"
                        ? "ig-score-warm"
                        : "ig-score-cold"
                  }`} />
                  <span className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-secondary)" }}>
                    {t(`leadScore.${contact.lead_score}`)}
                  </span>
                </>
              )}
            </div>

            {/* Date cell */}
            <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-faint)" }}>
              {formatDate(contact.created_at)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
