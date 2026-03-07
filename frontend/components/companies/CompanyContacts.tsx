"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2, ExternalLink, Users } from "lucide-react"
import { fetchCompanyContacts } from "@/services/companies"
import type { Contact } from "@/types"

export interface CompanyContactsProps {
  companyId: string
}

export function CompanyContacts({ companyId }: CompanyContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchCompanyContacts(companyId)
      .then(setContacts)
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

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucun contact lie a cette entreprise.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/contacts/${contact.id}`}
          className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-[family-name:var(--font-body)] truncate">
              {contact.first_name} {contact.last_name}
            </p>
            <div className="flex items-center gap-3 mt-1">
              {contact.job_title && (
                <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
                  {contact.job_title}
                </span>
              )}
              {contact.email && (
                <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)] truncate">
                  {contact.email}
                </span>
              )}
              {contact.phone && (
                <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
                  {contact.phone}
                </span>
              )}
            </div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
        </Link>
      ))}
    </div>
  )
}
