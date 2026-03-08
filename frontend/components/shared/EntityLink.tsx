"use client"

import { Link } from "@/i18n/navigation"
import { ExternalLink } from "lucide-react"

const ROUTES: Record<string, string> = {
  contact: "/contacts",
  deal: "/deals",
  task: "/tasks",
}

interface EntityLinkProps {
  type: "contact" | "deal" | "task"
  id: string
  name: string
  className?: string
}

export function EntityLink({ type, id, name, className = "" }: EntityLinkProps) {
  const href = `${ROUTES[type]}/${id}`

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors ${className}`}
    >
      <span className="truncate">{name}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </Link>
  )
}
