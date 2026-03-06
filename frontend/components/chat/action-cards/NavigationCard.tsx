"use client"

import { ExternalLink } from "lucide-react"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

export function NavigationCard({ action }: { action: EnrichedAction }) {
  return (
    <CardShell action={{ ...action, link: undefined }}>
      {action.link && (
        <Link href={action.link} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ExternalLink className="h-3.5 w-3.5" />
          {action.title || action.link}
        </Link>
      )}
      {action.description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
      )}
    </CardShell>
  )
}
