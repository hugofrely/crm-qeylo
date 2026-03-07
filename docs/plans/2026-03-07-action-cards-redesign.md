# Action Cards Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign AI chat action cards with glassmorphism style (adapted to light theme), expand/collapse chevron, eye button for navigation, and larger chart cards.

**Architecture:** Refactor the shared `CardShell` component to provide the new glass styling, accent bar, eye button, and expand/collapse mechanism. Each card component then opts into expandable content by splitting its render into "summary" and "details" sections passed to CardShell. Config is enriched with gradient/color data.

**Tech Stack:** React, Tailwind CSS, Lucide icons, Next.js Link

---

### Task 1: Enrich config with new color properties

**Files:**
- Modify: `frontend/components/chat/action-cards/config.ts`

**Step 1: Update EntityConfig and all entries**

Add `accentFrom`, `accentTo`, `lightBg`, `badgeBg`, `badgeText` to each entity config entry.

```ts
import {
  User, Briefcase, CheckSquare, StickyNote, Mail,
  BarChart3, Layers, Zap, ArrowRight, Tags, Link2,
  AlertCircle, List, Trash2, Search, type LucideIcon,
} from "lucide-react"

export interface EntityConfig {
  icon: LucideIcon
  borderColor: string
  iconColor: string
  bgColor: string
  label: string
  accentFrom: string
  accentTo: string
  lightBg: string
  badgeBg: string
  badgeText: string
}

const c = (
  icon: LucideIcon,
  borderColor: string,
  iconColor: string,
  bgColor: string,
  label: string,
  accentFrom: string,
  accentTo: string,
  lightBg: string,
  badgeBg: string,
  badgeText: string
): EntityConfig => ({ icon, borderColor, iconColor, bgColor, label, accentFrom, accentTo, lightBg, badgeBg, badgeText })

export const entityConfig: Record<string, EntityConfig> = {
  contact:              c(User,        "border-l-blue-500",    "text-blue-600",    "bg-blue-50 dark:bg-blue-950/30",    "Contact",     "from-blue-400",    "to-blue-500",    "bg-blue-50/60",    "bg-blue-100/80",    "text-blue-700"),
  contact_category:     c(Tags,        "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Categorie",   "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
  deal:                 c(Briefcase,   "border-l-emerald-500", "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30","Deal",       "from-emerald-400", "to-emerald-500", "bg-emerald-50/60", "bg-emerald-100/80", "text-emerald-700"),
  task:                 c(CheckSquare, "border-l-purple-500",  "text-purple-600",  "bg-purple-50 dark:bg-purple-950/30","Tache",       "from-purple-400",  "to-purple-500",  "bg-purple-50/60",  "bg-purple-100/80",  "text-purple-700"),
  note:                 c(StickyNote,  "border-l-orange-500",  "text-orange-600",  "bg-orange-50 dark:bg-orange-950/30","Note",        "from-orange-400",  "to-orange-500",  "bg-orange-50/60",  "bg-orange-100/80",  "text-orange-700"),
  interaction:          c(StickyNote,  "border-l-orange-500",  "text-orange-600",  "bg-orange-50 dark:bg-orange-950/30","Interaction", "from-orange-400",  "to-orange-500",  "bg-orange-50/60",  "bg-orange-100/80",  "text-orange-700"),
  email:                c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Email",       "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  email_template:       c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Template",    "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  segment:              c(Layers,      "border-l-pink-500",    "text-pink-600",    "bg-pink-50 dark:bg-pink-950/30",    "Segment",     "from-pink-400",    "to-pink-500",    "bg-pink-50/60",    "bg-pink-100/80",    "text-pink-700"),
  workflow:             c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Workflow",    "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  stage:                c(ArrowRight,  "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Stage",       "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  dashboard:            c(BarChart3,   "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Dashboard",   "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
  chart:                c(BarChart3,   "border-l-violet-500",  "text-violet-600",  "bg-violet-50 dark:bg-violet-950/30","Graphique",   "from-violet-400",  "to-violet-500",  "bg-violet-50/60",  "bg-violet-100/80",  "text-violet-700"),
  contact_list:         c(List,        "border-l-blue-500",    "text-blue-600",    "bg-blue-50 dark:bg-blue-950/30",    "Contacts",    "from-blue-400",    "to-blue-500",    "bg-blue-50/60",    "bg-blue-100/80",    "text-blue-700"),
  deal_list:            c(List,        "border-l-emerald-500", "text-emerald-600", "bg-emerald-50 dark:bg-emerald-950/30","Deals",      "from-emerald-400", "to-emerald-500", "bg-emerald-50/60", "bg-emerald-100/80", "text-emerald-700"),
  task_list:            c(List,        "border-l-purple-500",  "text-purple-600",  "bg-purple-50 dark:bg-purple-950/30","Taches",      "from-purple-400",  "to-purple-500",  "bg-purple-50/60",  "bg-purple-100/80",  "text-purple-700"),
  search_results:       c(Search,      "border-l-gray-500",    "text-gray-600",    "bg-gray-50 dark:bg-gray-950/30",    "Recherche",   "from-gray-400",    "to-gray-500",    "bg-gray-50/60",    "bg-gray-100/80",    "text-gray-700"),
  workflow_list:        c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Workflows",   "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  workflow_executions:  c(Zap,         "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Executions",  "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  email_template_list:  c(Mail,        "border-l-cyan-500",    "text-cyan-600",    "bg-cyan-50 dark:bg-cyan-950/30",    "Templates",   "from-cyan-400",    "to-cyan-500",    "bg-cyan-50/60",    "bg-cyan-100/80",    "text-cyan-700"),
  segment_list:         c(Layers,      "border-l-pink-500",    "text-pink-600",    "bg-pink-50 dark:bg-pink-950/30",    "Segments",    "from-pink-400",    "to-pink-500",    "bg-pink-50/60",    "bg-pink-100/80",    "text-pink-700"),
  stage_list:           c(ArrowRight,  "border-l-amber-500",   "text-amber-600",   "bg-amber-50 dark:bg-amber-950/30",  "Stages",      "from-amber-400",   "to-amber-500",   "bg-amber-50/60",   "bg-amber-100/80",   "text-amber-700"),
  timeline:             c(List,        "border-l-gray-500",    "text-gray-600",    "bg-gray-50 dark:bg-gray-950/30",    "Timeline",    "from-gray-400",    "to-gray-500",    "bg-gray-50/60",    "bg-gray-100/80",    "text-gray-700"),
  category_list:        c(Tags,        "border-l-indigo-500",  "text-indigo-600",  "bg-indigo-50 dark:bg-indigo-950/30","Categories",  "from-indigo-400",  "to-indigo-500",  "bg-indigo-50/60",  "bg-indigo-100/80",  "text-indigo-700"),
}

export function getConfig(entityType: string | undefined): EntityConfig {
  return entityConfig[entityType || ""] || entityConfig.contact
}

// Build a link to the entity's detail page
export function getEntityLink(action: { entity_type?: string; entity_id?: string; link?: string }): string | null {
  if (action.link) return action.link
  if (!action.entity_id || !action.entity_type) return null
  const routes: Record<string, string> = {
    contact: "/contacts",
    deal: "/deals",
    task: "/tasks",
    segment: "/segments",
    workflow: "/workflows",
    email_template: "/settings/email-templates",
    report: "/reports",
  }
  const base = routes[action.entity_type]
  if (base) return `${base}/${action.entity_id}`
  return null
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/config.ts
git commit -m "feat(chat): enrich action card config with accent colors and entity link builder"
```

---

### Task 2: Redesign CardShell with glass style, eye button, expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/CardShell.tsx`

**Step 1: Rewrite CardShell**

```tsx
"use client"

import { useState } from "react"
import { Eye, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getConfig, getEntityLink } from "./config"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

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
  const config = getConfig(action.entity_type)
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
                title="Voir les details"
              >
                <Eye className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Summary (always visible) */}
        {action.summary && (
          <p className="mb-1 text-[11px] text-muted-foreground">{action.summary}</p>
        )}

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
              {expanded ? "Moins" : "Plus de details"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/CardShell.tsx
git commit -m "feat(chat): redesign CardShell with glass style, eye button, expand/collapse"
```

---

### Task 3: Update EntityCreatedCard with expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/EntityCreatedCard.tsx`

**Step 1: Rewrite with summary/details split**

```tsx
"use client"

import { Badge } from "@/components/ui/badge"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return ""
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function EntityCreatedCard({ action }: { action: EnrichedAction }) {
  const preview = action.entity_preview
  if (!preview) return <CardShell action={action}><p className="text-sm text-muted-foreground">Action effectuee</p></CardShell>

  // Determine if there are extra details to show
  const details: { label: string; value: string }[] = []
  if (preview.email) details.push({ label: "Email", value: preview.email })
  if (preview.phone) details.push({ label: "Telephone", value: preview.phone })
  if (preview.company) details.push({ label: "Entreprise", value: preview.company })
  if (preview.job_title) details.push({ label: "Poste", value: preview.job_title })
  if (preview.amount) details.push({ label: "Montant", value: formatCurrency(preview.amount) })
  if (preview.stage) details.push({ label: "Etape", value: preview.stage })
  if (preview.pipeline) details.push({ label: "Pipeline", value: preview.pipeline })
  if (preview.priority) details.push({ label: "Priorite", value: preview.priority })
  if (preview.due_date) details.push({ label: "Echeance", value: preview.due_date })
  if (preview.content) details.push({ label: "Contenu", value: preview.content })
  if (preview.subject) details.push({ label: "Sujet", value: preview.subject })

  const expandable = details.length > 0 ? (
    <div className="space-y-1">
      {details.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground w-20 shrink-0">{d.label}</span>
          <span className="truncate">{d.value}</span>
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      <div className="flex items-center gap-3">
        {preview.avatar_initials && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {preview.avatar_initials}
          </div>
        )}
        <p className="truncate text-sm font-medium">{preview.name || preview.description || ""}</p>
      </div>
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/EntityCreatedCard.tsx
git commit -m "feat(chat): EntityCreatedCard with expand/collapse details"
```

---

### Task 4: Update EntityUpdatedCard with expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/EntityUpdatedCard.tsx`

**Step 1: Rewrite — show name as summary, changes as expandable**

```tsx
"use client"

import { ArrowRight } from "lucide-react"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function EntityUpdatedCard({ action }: { action: EnrichedAction }) {
  const preview = action.entity_preview
  const changes = action.changes

  const expandable = changes && changes.length > 0 ? (
    <div className="space-y-1">
      {changes.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-muted-foreground">{c.field}</span>
          <span className="text-muted-foreground/60 truncate">{c.from}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          <span className="font-medium text-foreground truncate">{c.to}</span>
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      <p className="truncate text-sm font-medium">
        {preview?.name || "Entite mise a jour"}
      </p>
      {changes && changes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {changes.length} champ{changes.length > 1 ? "s" : ""} modifie{changes.length > 1 ? "s" : ""}
        </p>
      )}
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/EntityUpdatedCard.tsx
git commit -m "feat(chat): EntityUpdatedCard with expand/collapse changes"
```

---

### Task 5: Update EntityDeletedCard (no eye button)

**Files:**
- Modify: `frontend/components/chat/action-cards/EntityDeletedCard.tsx`

**Step 1: Adapt to new CardShell with hideEyeButton**

```tsx
"use client"

import { useState } from "react"
import { Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardShell } from "./CardShell"
import { apiFetch } from "@/lib/api"
import type { EnrichedAction } from "@/types/chat"

export function EntityDeletedCard({ action }: { action: EnrichedAction }) {
  const [restored, setRestored] = useState(false)
  const [loading, setLoading] = useState(false)
  const preview = action.entity_preview

  const handleRestore = async () => {
    if (!action.entity_id) return
    setLoading(true)
    try {
      await apiFetch(`/trash/${action.entity_id}/restore/`, { method: "POST" })
      setRestored(true)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <CardShell action={action} hideEyeButton>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 opacity-60">
          <p className="truncate text-sm font-medium line-through">{preview?.name || preview?.description || ""}</p>
          {preview?.email && <p className="truncate text-xs text-muted-foreground">{preview.email}</p>}
        </div>
        {action.undo_available && !restored && (
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleRestore} disabled={loading}>
            <Undo2 className="h-3 w-3" />
            Annuler
          </Button>
        )}
        {restored && (
          <span className="text-xs font-medium text-green-600">Restaure</span>
        )}
      </div>
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/EntityDeletedCard.tsx
git commit -m "feat(chat): EntityDeletedCard adapted to new CardShell, no eye button"
```

---

### Task 6: Update ChartCard with larger size

**Files:**
- Modify: `frontend/components/chat/action-cards/ChartCard.tsx`

**Step 1: Rewrite with generous sizing**

```tsx
"use client"

import { CardShell } from "./CardShell"
import { DynamicChart } from "@/components/chat/DynamicChart"
import type { EnrichedAction } from "@/types/chat"

export function ChartCard({ action }: { action: EnrichedAction }) {
  if (!action.chart) return null
  return (
    <CardShell action={action} className="w-full">
      {action.chart.title && (
        <p className="text-base font-semibold mb-3">{action.chart.title}</p>
      )}
      <div className="min-h-[400px]">
        <DynamicChart config={action.chart} />
      </div>
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/ChartCard.tsx
git commit -m "feat(chat): ChartCard with larger size and prominent title"
```

---

### Task 7: Update ContactListCard with expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/ContactListCard.tsx`

**Step 1: Rewrite — show first 3 contacts, expand for rest**

```tsx
"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardShell } from "./CardShell"
import { apiFetch } from "@/lib/api"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

function ContactRow({ r }: { r: Record<string, unknown> }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {r.id ? (
        <Link href={`/contacts/${r.id}`} className="font-medium text-primary hover:underline truncate">
          {String(r.name || "")}
        </Link>
      ) : (
        <span className="font-medium truncate">{String(r.name || "")}</span>
      )}
      {r.email ? <span className="text-muted-foreground truncate">{String(r.email)}</span> : null}
      {r.company ? <span className="text-muted-foreground truncate">{String(r.company)}</span> : null}
    </div>
  )
}

export function ContactListCard({ action }: { action: EnrichedAction }) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const results = action.results || []
  const VISIBLE_COUNT = 3

  const handleSaveSegment = async () => {
    if (!action.rules) return
    setLoading(true)
    try {
      await apiFetch("/segments/", {
        method: "POST",
        json: {
          name: action.summary || "Segment depuis le chat",
          rules: action.rules,
        },
      })
      setSaved(true)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const expandable = results.length > VISIBLE_COUNT ? (
    <div className="space-y-1">
      {results.slice(VISIBLE_COUNT).map((r, i) => (
        <ContactRow key={i} r={r} />
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      {results.length > 0 && (
        <div className="space-y-1 mb-2">
          <p className="text-xs text-muted-foreground mb-1">{action.count ?? results.length} contact{(action.count ?? results.length) > 1 ? "s" : ""} trouve{(action.count ?? results.length) > 1 ? "s" : ""}</p>
          {results.slice(0, VISIBLE_COUNT).map((r, i) => (
            <ContactRow key={i} r={r} />
          ))}
        </div>
      )}
      {action.save_as_segment_available && !saved && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSaveSegment} disabled={loading}>
          <Save className="h-3 w-3" />
          Sauvegarder comme segment
        </Button>
      )}
      {saved && <span className="text-xs font-medium text-green-600">Segment sauvegarde</span>}
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/ContactListCard.tsx
git commit -m "feat(chat): ContactListCard with expand/collapse for long lists"
```

---

### Task 8: Update ListCard with expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/ListCard.tsx`

**Step 1: Rewrite — show first 3, expand for rest**

```tsx
"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function ListCard({ action }: { action: EnrichedAction }) {
  const results = action.results || []
  const VISIBLE_COUNT = 3

  const expandable = results.length > VISIBLE_COUNT ? (
    <div className="space-y-1">
      {results.slice(VISIBLE_COUNT).map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium truncate">{String(r.name || r.description || r.content || "")}</span>
          {r.is_active !== undefined && (
            <span className={r.is_active ? "text-green-600" : "text-muted-foreground"}>
              {r.is_active ? "Actif" : "Inactif"}
            </span>
          )}
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      {results.length > 0 ? (
        <div className="space-y-1">
          {results.slice(0, VISIBLE_COUNT).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="font-medium truncate">{String(r.name || r.description || r.content || "")}</span>
              {r.is_active !== undefined && (
                <span className={r.is_active ? "text-green-600" : "text-muted-foreground"}>
                  {r.is_active ? "Actif" : "Inactif"}
                </span>
              )}
            </div>
          ))}
          {results.length > VISIBLE_COUNT && (
            <p className="text-[11px] text-muted-foreground">+ {results.length - VISIBLE_COUNT} autres</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun resultat</p>
      )}
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/ListCard.tsx
git commit -m "feat(chat): ListCard with expand/collapse"
```

---

### Task 9: Update DashboardCard with expand/collapse

**Files:**
- Modify: `frontend/components/chat/action-cards/DashboardCard.tsx`

**Step 1: Rewrite — show key metrics as summary, grid as expandable**

```tsx
"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

function formatCurrency(amount: unknown): string {
  const num = Number(amount)
  if (isNaN(num)) return "0 EUR"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function DashboardCard({ action }: { action: EnrichedAction }) {
  const expandable = (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <p className="text-lg font-semibold">{formatCurrency(action.pipeline_total)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pipeline</p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.active_deals ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Deals actifs</p>
      </div>
      <div>
        <p className="text-lg font-semibold">{String(action.overdue_tasks ?? 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En retard</p>
      </div>
    </div>
  )

  return (
    <CardShell action={action} expandableContent={expandable}>
      <p className="text-sm font-medium">
        {formatCurrency(action.pipeline_total)} en pipeline — {String(action.active_deals ?? 0)} deals actifs
      </p>
    </CardShell>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/DashboardCard.tsx
git commit -m "feat(chat): DashboardCard with expand/collapse metrics"
```

---

### Task 10: Update NavigationCard

**Files:**
- Modify: `frontend/components/chat/action-cards/NavigationCard.tsx`

**Step 1: Adapt to new CardShell (eye button handles the link now)**

```tsx
"use client"

import { ExternalLink } from "lucide-react"
import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"
import Link from "next/link"

export function NavigationCard({ action }: { action: EnrichedAction }) {
  return (
    <CardShell action={action}>
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
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/NavigationCard.tsx
git commit -m "feat(chat): NavigationCard adapted to new CardShell"
```

---

### Task 11: Update ErrorCard with new glass style

**Files:**
- Modify: `frontend/components/chat/action-cards/ErrorCard.tsx`

**Step 1: Rewrite with matching glass style but red accent**

```tsx
"use client"

import { AlertCircle } from "lucide-react"
import type { EnrichedAction } from "@/types/chat"

export function ErrorCard({ action }: { action: EnrichedAction }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-red-200/60 bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="h-[3px] w-full bg-gradient-to-r from-red-400 to-red-500" />
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50/60">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] bg-red-100/80 text-red-700">
            Erreur
          </span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400">{String(action.message || "Une erreur est survenue")}</p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/action-cards/ErrorCard.tsx
git commit -m "feat(chat): ErrorCard with glass style matching new design"
```

---

### Task 12: Visual verification

**Step 1: Run dev server**

```bash
cd frontend && npm run dev
```

**Step 2: Test in browser**

Open the chat, trigger various actions (create contact, update deal, query contacts, generate chart, etc.) and visually verify:
- Glass styling with top accent bar renders correctly
- Eye button appears on all cards except deleted/error
- Eye button links to correct entity pages
- Chevron expand/collapse works with smooth animation
- Chart cards take up full width with generous height
- Badge labels and colors match entity types
- Dark mode still looks acceptable

**Step 3: Final commit if adjustments needed**

```bash
git add -A
git commit -m "feat(chat): action cards redesign — glass style, expand/collapse, eye navigation"
```
