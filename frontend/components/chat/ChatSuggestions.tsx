"use client"

import { useState } from "react"
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
  text: string
}

const simpleSuggestions: Suggestion[] = [
  { icon: UserPlus, text: "Crée un contact pour Marie Dupont de chez Acme" },
  { icon: Handshake, text: "Ajoute un deal de 5000\u20AC pour le projet refonte site" },
  { icon: ListChecks, text: "Montre-moi mes tâches de la semaine" },
  { icon: Mail, text: "Envoie un email de suivi à Jean Martin" },
  { icon: BarChart3, text: "Combien de deals ai-je en cours ?" },
]

const intermediateSuggestions: Suggestion[] = [
  { icon: UserPlus, text: "Crée un contact pour Sophie Blanc et ajoute-lui un deal de 12000\u20AC" },
  { icon: PenLine, text: "Modifie le téléphone de Marie Dupont en 06 12 34 56 78" },
  { icon: StickyNote, text: "Ajoute une note de suivi au deal Refonte Site : réunion prévue vendredi" },
  { icon: ArrowRightLeft, text: "Déplace le deal Acme en phase de négociation" },
]

const advancedSuggestions: Suggestion[] = [
  { icon: UserPlus, text: "Crée un contact pour Pierre Noir chez TechCorp, ajoute un deal de 25000\u20AC et planifie un appel pour demain" },
  { icon: Users, text: "Montre-moi tous les contacts sans activité depuis 30 jours" },
  { icon: TrendingUp, text: "Donne-moi un résumé de mon pipeline avec un graphique par étape" },
  { icon: BarChart3, text: "Quels deals de plus de 10000\u20AC sont bloqués depuis plus de 2 semaines ?" },
]

interface ChatSuggestionsProps {
  onSelect: (text: string) => void
}

function SuggestionChip({
  suggestion,
  index,
  baseDelay,
}: {
  suggestion: Suggestion
  index: number
  baseDelay: number
}) {
  const Icon = suggestion.icon
  return (
    <button
      onClick={() => {}}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-left text-sm transition-all duration-200",
        "hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-none",
        "animate-fade-in-up opacity-0 font-[family-name:var(--font-body)]"
      )}
      style={{ animationDelay: `${baseDelay + index * 60}ms`, animationFillMode: "forwards" }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/60 transition-colors group-hover:text-primary" />
      <span className="text-muted-foreground transition-colors group-hover:text-foreground leading-relaxed">
        {suggestion.text}
      </span>
    </button>
  )
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  const [level, setLevel] = useState(0)

  return (
    <div className="mt-8 w-full max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
      {/* Simple suggestions */}
      <div className="grid gap-2">
        {simpleSuggestions.map((s, i) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
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
              {s.text}
            </span>
          </button>
        ))}
      </div>

      {/* Intermediate suggestions */}
      {level >= 1 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 pl-1 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            Aller plus loin
          </p>
          <div className="grid gap-2">
            {intermediateSuggestions.map((s, i) => (
              <button
                key={s.text}
                onClick={() => onSelect(s.text)}
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
                  {s.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Advanced suggestions */}
      {level >= 2 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 pl-1 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
            Requetes avancees
          </p>
          <div className="grid gap-2">
            {advancedSuggestions.map((s, i) => (
              <button
                key={s.text}
                onClick={() => onSelect(s.text)}
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
                  {s.text}
                </span>
              </button>
            ))}
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
          <span>{level === 0 ? "Suggestions avancees" : "Encore plus"}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
