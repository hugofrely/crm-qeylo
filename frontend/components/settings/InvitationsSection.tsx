"use client"

import { Badge } from "@/components/ui/badge"
import type { PendingInvitation } from "@/types"
import { useTranslations, useLocale } from "next-intl"

interface InvitationsSectionProps {
  invitations: PendingInvitation[]
}

export default function InvitationsSection({ invitations }: InvitationsSectionProps) {
  const t = useTranslations("notifications.invitations")
  const locale = useLocale()

  if (invitations.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <h2 className="text-xl tracking-tight">
          {t("pending", { count: invitations.length })}
        </h2>
      </div>
      <div className="p-6">
        <div className="space-y-2 font-[family-name:var(--font-body)]">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
              <div className="flex-1">
                <p className="text-sm font-medium">{inv.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("role", { role: inv.role })} · {t("sentOn")}{" "}
                  {new Date(inv.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">{t("status")}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
