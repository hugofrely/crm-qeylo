"use client"

import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import type { Contact } from "@/types"

interface ContactTableProps {
  contacts: Contact[]
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
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

function SortableHeader({
  label,
  field,
  ordering,
  onOrderingChange,
  className,
}: {
  label: string
  field: SortField
  ordering: string
  onOrderingChange: (ordering: string) => void
  className?: string
}) {
  const isAsc = ordering === field
  const isDesc = ordering === `-${field}`

  const handleClick = () => {
    if (isAsc) {
      onOrderingChange(`-${field}`)
    } else if (isDesc) {
      onOrderingChange("-created_at")
    } else {
      onOrderingChange(field)
    }
  }

  return (
    <TableHead
      className={`text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isAsc ? (
          <ArrowUp className="h-3 w-3" />
        ) : isDesc ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}

export function ContactTable({
  contacts,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  ordering = "-created_at",
  onOrderingChange,
}: ContactTableProps) {
  const router = useRouter()
  const t = useTranslations("contacts")

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          {t("emptyState.noContacts")}
        </p>
      </div>
    )
  }

  const handleOrderingChange = onOrderingChange ?? (() => {})

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-table-header-bg hover:bg-table-header-bg">
            {onToggleSelect && (
              <TableHead className="w-10">
                <Checkbox
                  checked={contacts.length > 0 && selectedIds?.size === contacts.length}
                  onCheckedChange={() => onToggleAll?.()}
                />
              </TableHead>
            )}
            <SortableHeader label={t("table.name")} field="last_name" ordering={ordering} onOrderingChange={handleOrderingChange} />
            <SortableHeader label={t("table.company")} field="company" ordering={ordering} onOrderingChange={handleOrderingChange} />
            <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("table.email")}</TableHead>
            <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("table.phone")}</TableHead>
            <SortableHeader label={t("table.createdAt")} field="created_at" ordering={ordering} onOrderingChange={handleOrderingChange} className="hidden lg:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              {onToggleSelect && (
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds?.has(contact.id) ?? false}
                    onCheckedChange={() => onToggleSelect(contact.id)}
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm font-[family-name:var(--font-body)]">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.lead_score && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                            contact.lead_score === "hot"
                              ? "bg-rose-500"
                              : contact.lead_score === "warm"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }`}
                        />
                        {t(`leadScore.${contact.lead_score}`)}
                      </span>
                    )}
                  </div>
                  {contact.categories && contact.categories.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1">
                      {contact.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: cat.color + "20", color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      ))}
                      {contact.categories.length > 2 && (
                        <span className="text-[10px] text-muted-foreground" title={contact.categories.slice(2).map(c => c.name).join(", ")}>
                          +{contact.categories.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {contact.job_title && (
                  <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                    {contact.job_title}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.company || "\u2014"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.email || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.phone || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {formatDate(contact.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
