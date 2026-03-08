"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Eye, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getConfig, getEntityLink } from "./config"
import type { EnrichedAction } from "@/types/chat"
import { Link } from "@/i18n/navigation"

interface CardShellProps {
  action: EnrichedAction
  children: React.ReactNode
  expandableContent?: React.ReactNode
  hideEyeButton?: boolean
  className?: string
}

export function CardShell({
  action,
  children,
  expandableContent,
  hideEyeButton = false,
  className,
}: CardShellProps) {
  const [expanded, setExpanded] = useState(false)
  const t = useTranslations("chat")
  const config = getConfig(action.entity_type, t)
  const Icon = config.icon
  const entityLink = hideEyeButton ? null : getEntityLink(action)

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/40 bg-white/80 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* Accent bar top */}
      <div className={cn("h-[3px] w-full bg-gradient-to-r", config.accentFrom, config.accentTo)} />

      <div className="px-4 pt-3 pb-3">
        {/* Header row: icon + badge + eye button */}
        <div className="flex items-center gap-3 mb-2">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.lightBg)}>
            <Icon className={cn("h-4 w-4", config.iconColor)} />
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]", config.badgeBg, config.badgeText)}>
            {config.label}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {entityLink && (
              <Link
                href={entityLink}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:text-primary hover:bg-primary/5"
                title={t("cards.viewDetails")}
              >
                <Eye className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Main content */}
        {children}

        {/* Expandable content */}
        {expandableContent && (
          <>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="pt-2 border-t border-border/30 mt-2">
                  {expandableContent}
                </div>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300",
                  expanded && "rotate-180"
                )}
              />
              {expanded ? t("cards.less") : t("cards.moreDetails")}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
