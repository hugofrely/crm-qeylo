"use client"

import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Contact } from "@/types"

interface ContactTableProps {
  contacts: Contact[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export function ContactTable({ contacts }: ContactTableProps) {
  const router = useRouter()

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucun contact trouvé.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-table-header-bg hover:bg-table-header-bg">
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Nom</TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Entreprise</TableHead>
            <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Email</TableHead>
            <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Téléphone</TableHead>
            <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Créé le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
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
                        {contact.lead_score === "hot" ? "Chaud" : contact.lead_score === "warm" ? "Tiède" : "Froid"}
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
