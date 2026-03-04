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

interface Contact {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  source: string
  tags: string[]
  notes: string
  created_at: string
  updated_at: string
  job_title?: string
  lead_score?: "hot" | "warm" | "cold"
}

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
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
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
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm font-[family-name:var(--font-body)]">
                    {contact.first_name} {contact.last_name}
                  </span>
                  {contact.lead_score && (
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                        contact.lead_score === "hot"
                          ? "bg-rose-500"
                          : contact.lead_score === "warm"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                      title={`Lead score: ${contact.lead_score}`}
                    />
                  )}
                </div>
                {contact.job_title && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-[family-name:var(--font-body)]">
                    {contact.job_title}
                  </p>
                )}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags.length > 2 && (
                      <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                        +{contact.tags.length - 2}
                      </Badge>
                    )}
                  </div>
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
