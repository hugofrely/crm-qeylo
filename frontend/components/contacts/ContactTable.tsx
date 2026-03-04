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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">
          Aucun contact trouv&eacute;.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">T&eacute;l&eacute;phone</TableHead>
            <TableHead className="hidden lg:table-cell">Cr&eacute;&eacute; le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              <TableCell className="font-medium">
                {contact.first_name} {contact.last_name}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {contact.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{contact.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {contact.company || "\u2014"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {contact.email || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {contact.phone || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {formatDate(contact.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
