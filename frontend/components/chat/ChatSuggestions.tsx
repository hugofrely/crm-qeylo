"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  UserPlus,
  Handshake,
  ListChecks,
  Mail,
  BarChart3,
  PenLine,
  StickyNote,
  ArrowRightLeft,
  Users,
  TrendingUp,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Suggestion {
  icon: React.ElementType
  textKey: string
}

const simpleSuggestions: Suggestion[] = [
  { icon: UserPlus, textKey: "suggestions.simple.createContact" },
  { icon: Handshake, textKey: "suggestions.simple.addDeal" },
  { icon: ListChecks, textKey: "suggestions.simple.showTasks" },
  { icon: Mail, textKey: "suggestions.simple.sendEmail" },
  { icon: BarChart3, textKey: "suggestions.simple.dealCount" },
]

const intermediateSuggestions: Suggestion[] = [
  { icon: UserPlus, textKey: "suggestions.intermediate.createContactDeal" },
  { icon: PenLine, textKey: "suggestions.intermediate.updatePhone" },
  { icon: StickyNote, textKey: "suggestions.intermediate.addNote" },
  { icon: ArrowRightLeft, textKey: "suggestions.intermediate.moveDeal" },
]

const advancedSuggestions: Suggestion[] = [
  { icon: UserPlus, textKey: "suggestions.advanced.createContactDealCall" },
  { icon: Users, textKey: "suggestions.advanced.inactiveContacts" },
  { icon: TrendingUp, textKey: "suggestions.advanced.pipelineSummary" },
  { icon: BarChart3, textKey: "suggestions.advanced.blockedDeals" },
]

interface ChatSuggestionsProps {
  onSelect: (text: string) => void
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  const [level, setLevel] = useState(0)
  const t = useTranslations("chat")

  return (
    <div className="mt-8 w-full max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
      {/* Simple suggestions */}
      <div className="grid gap-2">
        {simpleSuggestions.map((s, i) => {
          const text = t(s.textKey)
          return (
            <button
              key={s.textKey}
              onClick={() => onSelect(text)}
              className={cn(
                "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left text-sm transition-all duration-200",
                "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm hover:-translate-y-0.5",
                "active:translate-y-0 active:shadow-none",
                "animate-fade-in-up opacity-0 font-[family-name:var(--font-body)]"
              )}
              style={{ animationDelay: `${300 + i * 60}ms`, animationFillMode: "forwards" }}
            >
              <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
              <span className="text-muted-foreground transition-colors group-hover:text-foreground leading-relaxed">
                {text}
              </span>
            </button>
          )
        })}
      </div>

      {/* Intermediate suggestions */}
      {level >= 1 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 pl-1 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            {t("suggestions.intermediate.label")}
          </p>
          <div className="grid gap-2">
            {intermediateSuggestions.map((s, i) => {
              const text = t(s.textKey)
              return (
                <button
                  key={s.textKey}
                  onClick={() => onSelect(text)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left text-sm transition-all duration-200",
                    "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm hover:-translate-y-0.5",
                    "active:translate-y-0 active:shadow-none",
                    "animate-fade-in-up opacity-0 font-[family-name:var(--font-body)]"
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                >
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
                  <span className="text-muted-foreground transition-colors group-hover:text-foreground leading-relaxed">
                    {text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Advanced suggestions */}
      {level >= 2 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 pl-1 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            {t("suggestions.advanced.label")}
          </p>
          <div className="grid gap-2">
            {advancedSuggestions.map((s, i) => {
              const text = t(s.textKey)
              return (
                <button
                  key={s.textKey}
                  onClick={() => onSelect(text)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left text-sm transition-all duration-200",
                    "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm hover:-translate-y-0.5",
                    "active:translate-y-0 active:shadow-none",
                    "animate-fade-in-up opacity-0 font-[family-name:var(--font-body)]"
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
                >
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
                  <span className="text-muted-foreground transition-colors group-hover:text-foreground leading-relaxed">
                    {text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* "Voir plus" button */}
      {level < 2 && (
        <button
          onClick={() => setLevel((l) => l + 1)}
          className={cn(
            "mt-4 flex items-center gap-1.5 mx-auto text-xs text-muted-foreground/60 transition-all duration-200",
            "hover:text-primary/70 hover:gap-2",
            "animate-fade-in-up opacity-0"
          )}
          style={{ animationDelay: `${level === 0 ? "620" : "280"}ms`, animationFillMode: "forwards" }}
        >
          <span>{level === 0 ? t("suggestions.showMore") : t("suggestions.showEvenMore")}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
