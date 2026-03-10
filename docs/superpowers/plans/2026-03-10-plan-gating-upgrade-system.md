# Plan Gating & Upgrade System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preventive plan gating with lock icons, progressive quota warnings, and contextual upgrade modals that redirect to Stripe Checkout.

**Architecture:** A `PlanProvider` context wraps the authenticated app layout. It fetches usage data on mount and exposes `usePlanGate()` hook. Components use this hook to show locks on sidebar items, quota banners on pages, and open an upgrade modal when users hit limits.

**Tech Stack:** Next.js 16, React 19, TypeScript, shadcn/ui (Radix Dialog), Tailwind CSS, next-intl, Lucide icons, Sonner toasts.

**Spec:** `docs/superpowers/specs/2026-03-10-plan-gating-upgrade-system-design.md`

---

## Chunk 1: Core Infrastructure

### Task 1: Create i18n translation files

**Files:**
- Create: `frontend/messages/fr/plan.json`
- Create: `frontend/messages/en/plan.json`

- [ ] **Step 1: Create French translation file**

Create `frontend/messages/fr/plan.json`:

```json
{
  "upgrade": {
    "featureTitle": "Fonctionnalité Pro",
    "quotaTitle": "Limite atteinte",
    "cta": "Passer au {plan} →",
    "compareLink": "Comparer tous les plans",
    "loading": "Redirection..."
  },
  "quota": {
    "warning": "Vous approchez de la limite — {current}/{limit} {label}",
    "warningSubtext": "Passez au Pro pour un nombre illimité.",
    "limit": "Limite atteinte — {current}/{limit} {label}",
    "limitSubtext": "Vous ne pouvez plus ajouter de {label}. Passez au Pro pour continuer.",
    "ctaWarning": "Passer au Pro",
    "ctaLimit": "Passer au Pro"
  },
  "plans": {
    "pro": {
      "name": "Plan Pro",
      "price": "19€",
      "period": "/mois",
      "benefits": {
        "contacts": "Contacts illimités",
        "pipelines": "Pipelines illimités",
        "ai": "Messages IA illimités",
        "products": "Catalogue produits",
        "workflows": "Workflows & séquences",
        "csv": "Import/export CSV",
        "reports": "Rapports avancés",
        "all": "Toutes les fonctionnalités Pro"
      }
    },
    "team": {
      "name": "Plan Team",
      "price": "49€",
      "period": "/mois",
      "benefits": {
        "users": "Utilisateurs illimités",
        "api": "Accès API",
        "assignment": "Attribution d'équipe",
        "onboarding": "Onboarding dédié",
        "all": "Toutes les fonctionnalités Team"
      }
    }
  },
  "features": {
    "products_catalog": {
      "label": "Catalogue Produits",
      "description": "Gérez vos produits, catégories et tarifs pour vos devis et factures."
    },
    "workflows": {
      "label": "Workflows",
      "description": "Automatisez vos processus métier avec des workflows personnalisés."
    },
    "dynamic_segments": {
      "label": "Segments dynamiques",
      "description": "Créez des segments avancés pour cibler vos contacts."
    },
    "conversion_funnel": {
      "label": "Tunnel de conversion",
      "description": "Analysez votre pipeline avec un tunnel de conversion visuel."
    },
    "custom_reports": {
      "label": "Rapports personnalisés",
      "description": "Créez des rapports avancés adaptés à vos besoins."
    },
    "custom_stages": {
      "label": "Étapes personnalisées",
      "description": "Personnalisez les étapes de votre pipeline."
    },
    "duplicate_detection": {
      "label": "Détection de doublons",
      "description": "Identifiez et fusionnez automatiquement les contacts en double."
    },
    "email_templates": {
      "label": "Modèles d'email",
      "description": "Créez des modèles d'email réutilisables."
    },
    "email_integration": {
      "label": "Intégration email",
      "description": "Connectez votre boîte mail à votre CRM."
    },
    "csv_import_export": {
      "label": "Import/Export CSV",
      "description": "Importez et exportez vos données en CSV."
    },
    "advanced_dashboard": {
      "label": "Tableau de bord avancé",
      "description": "Accédez à des métriques détaillées et personnalisables."
    },
    "api_access": {
      "label": "Accès API",
      "description": "Intégrez Qeylo avec vos outils via l'API REST."
    },
    "team_assignment": {
      "label": "Attribution d'équipe",
      "description": "Assignez des contacts et tâches à vos membres d'équipe."
    },
    "priority_support": {
      "label": "Support prioritaire",
      "description": "Bénéficiez d'un support client prioritaire."
    },
    "dedicated_onboarding": {
      "label": "Onboarding dédié",
      "description": "Un accompagnement personnalisé pour démarrer."
    }
  },
  "sidebar": {
    "locked": "Disponible avec le plan {plan}"
  }
}
```

- [ ] **Step 2: Create English translation file**

Create `frontend/messages/en/plan.json`:

```json
{
  "upgrade": {
    "featureTitle": "Pro Feature",
    "quotaTitle": "Limit Reached",
    "cta": "Upgrade to {plan} →",
    "compareLink": "Compare all plans",
    "loading": "Redirecting..."
  },
  "quota": {
    "warning": "Approaching limit — {current}/{limit} {label}",
    "warningSubtext": "Upgrade to Pro for unlimited.",
    "limit": "Limit reached — {current}/{limit} {label}",
    "limitSubtext": "You can no longer add {label}. Upgrade to Pro to continue.",
    "ctaWarning": "Upgrade to Pro",
    "ctaLimit": "Upgrade to Pro"
  },
  "plans": {
    "pro": {
      "name": "Pro Plan",
      "price": "€19",
      "period": "/month",
      "benefits": {
        "contacts": "Unlimited contacts",
        "pipelines": "Unlimited pipelines",
        "ai": "Unlimited AI messages",
        "products": "Product catalog",
        "workflows": "Workflows & sequences",
        "csv": "CSV import/export",
        "reports": "Advanced reports",
        "all": "All Pro features"
      }
    },
    "team": {
      "name": "Team Plan",
      "price": "€49",
      "period": "/month",
      "benefits": {
        "users": "Unlimited users",
        "api": "API access",
        "assignment": "Team assignment",
        "onboarding": "Dedicated onboarding",
        "all": "All Team features"
      }
    }
  },
  "features": {
    "products_catalog": {
      "label": "Product Catalog",
      "description": "Manage your products, categories and pricing for quotes and invoices."
    },
    "workflows": {
      "label": "Workflows",
      "description": "Automate your business processes with custom workflows."
    },
    "dynamic_segments": {
      "label": "Dynamic Segments",
      "description": "Create advanced segments to target your contacts."
    },
    "conversion_funnel": {
      "label": "Conversion Funnel",
      "description": "Analyze your pipeline with a visual conversion funnel."
    },
    "custom_reports": {
      "label": "Custom Reports",
      "description": "Create advanced reports tailored to your needs."
    },
    "custom_stages": {
      "label": "Custom Stages",
      "description": "Customize your pipeline stages."
    },
    "duplicate_detection": {
      "label": "Duplicate Detection",
      "description": "Automatically identify and merge duplicate contacts."
    },
    "email_templates": {
      "label": "Email Templates",
      "description": "Create reusable email templates."
    },
    "email_integration": {
      "label": "Email Integration",
      "description": "Connect your mailbox to your CRM."
    },
    "csv_import_export": {
      "label": "CSV Import/Export",
      "description": "Import and export your data as CSV."
    },
    "advanced_dashboard": {
      "label": "Advanced Dashboard",
      "description": "Access detailed and customizable metrics."
    },
    "api_access": {
      "label": "API Access",
      "description": "Integrate Qeylo with your tools via the REST API."
    },
    "team_assignment": {
      "label": "Team Assignment",
      "description": "Assign contacts and tasks to your team members."
    },
    "priority_support": {
      "label": "Priority Support",
      "description": "Get priority customer support."
    },
    "dedicated_onboarding": {
      "label": "Dedicated Onboarding",
      "description": "Personalized assistance to get started."
    }
  },
  "sidebar": {
    "locked": "Available with {plan} plan"
  }
}
```

- [ ] **Step 3: Register plan namespace in i18n config**

Modify `frontend/i18n/request.ts`. Add the import after the existing namespace imports (after line 29 — the `seo` import):

```ts
const plan = (await import(`@/messages/${locale}/plan.json`)).default;
```

Then add `plan` to the `messages` object in the return statement (after `seo,`):

```ts
messages: {
  // ... existing namespaces ...
  seo,
  plan,
},
```

- [ ] **Step 4: Commit**

```bash
git add frontend/messages/fr/plan.json frontend/messages/en/plan.json frontend/i18n/request.ts
git commit -m "feat(plan): add i18n translations for plan gating system"
```

---

### Task 2: Update handleQuotaError with register pattern

**Files:**
- Modify: `frontend/lib/quota-error.ts`

This must happen before PlanContext is created, because PlanContext imports `registerUpgradeModal` and `registerRefreshUsage` from this file.

- [ ] **Step 1: Rewrite quota-error.ts**

Replace the entire contents of `frontend/lib/quota-error.ts` with:

```ts
export type QuotaKey = "contacts" | "pipelines" | "users" | "ai_messages"

export interface UpgradeModalContext {
  type: "feature" | "quota"
  feature?: string
  quota?: QuotaKey
  current?: number
  limit?: number
  requiredPlan: "pro" | "team"
}

interface QuotaError {
  error: string
  detail: string
  limit?: number
  current?: number
  feature?: string
  upgrade_required?: string
}

let _openUpgradeModal: ((ctx: UpgradeModalContext) => void) | null = null
let _refreshUsage: (() => Promise<void>) | null = null

export function registerUpgradeModal(fn: ((ctx: UpgradeModalContext) => void) | null) {
  _openUpgradeModal = fn
}

export function registerRefreshUsage(fn: (() => Promise<void>) | null) {
  _refreshUsage = fn
}

function inferQuotaFromDetail(detail: string): QuotaKey {
  if (detail.includes("contact")) return "contacts"
  if (detail.includes("pipeline")) return "pipelines"
  if (detail.includes("utilisateur") || detail.includes("member") || detail.includes("user")) return "users"
  if (detail.includes("IA") || detail.includes("AI") || detail.includes("message")) return "ai_messages"
  return "contacts"
}

export function handleQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  let parsed: QuotaError
  try {
    parsed = JSON.parse(error.message)
  } catch {
    return false
  }

  if (parsed?.error === "quota_exceeded") {
    const quota = inferQuotaFromDetail(parsed.detail)
    if (_openUpgradeModal) {
      _openUpgradeModal({
        type: "quota",
        quota,
        current: parsed.current,
        limit: parsed.limit,
        requiredPlan: (parsed.upgrade_required as "pro" | "team") ?? "pro",
      })
      _refreshUsage?.()
    }
    return true
  }

  if (parsed?.error === "feature_not_available") {
    if (_openUpgradeModal) {
      _openUpgradeModal({
        type: "feature",
        feature: parsed.feature,
        requiredPlan: (parsed.upgrade_required as "pro" | "team") ?? "pro",
      })
    }
    return true
  }

  return false
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/quota-error.ts
git commit -m "feat(plan): update handleQuotaError with register pattern for upgrade modal"
```

---

### Task 3: Create PlanContext provider and usePlanGate hook

**Files:**
- Create: `frontend/contexts/PlanContext.tsx`
- Modify: `frontend/app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Create PlanContext.tsx**

Create `frontend/contexts/PlanContext.tsx`:

```tsx
"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { fetchUsageSummary } from "@/services/subscriptions"
import type { Plan, UsageSummary } from "@/types/subscriptions"
import {
  registerUpgradeModal,
  registerRefreshUsage,
  type QuotaKey,
  type UpgradeModalContext,
} from "@/lib/quota-error"

export type { QuotaKey, UpgradeModalContext }
export type QuotaStatus = "ok" | "warning" | "limit"

interface PlanContextValue {
  plan: Plan
  usage: UsageSummary | null
  loading: boolean
  isFeatureLocked: (feature: string) => boolean
  getQuotaStatus: (quota: QuotaKey) => QuotaStatus
  getQuotaInfo: (quota: QuotaKey) => { current: number; limit: number | null; percent: number }
  openUpgradeModal: (context: UpgradeModalContext) => void
  refreshUsage: () => Promise<void>
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
  modalContext: UpgradeModalContext | null
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalContext, setModalContext] = useState<UpgradeModalContext | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const refreshUsage = useCallback(async () => {
    try {
      const data = await fetchUsageSummary()
      setUsage(data)
    } catch (err) {
      console.error("Failed to fetch usage summary:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  const openUpgradeModal = useCallback((context: UpgradeModalContext) => {
    setModalContext(context)
    setModalOpen(true)
  }, [])

  // Register with quota-error.ts so API errors can open the modal
  const openUpgradeModalRef = useRef(openUpgradeModal)
  openUpgradeModalRef.current = openUpgradeModal
  const refreshUsageRef = useRef(refreshUsage)
  refreshUsageRef.current = refreshUsage

  useEffect(() => {
    registerUpgradeModal((ctx) => openUpgradeModalRef.current(ctx))
    registerRefreshUsage(() => refreshUsageRef.current())
    return () => {
      registerUpgradeModal(null)
      registerRefreshUsage(null)
    }
  }, [])

  const plan = usage?.plan ?? "solo"

  const isFeatureLocked = useCallback(
    (feature: string): boolean => {
      if (!usage) return false
      return usage.features[feature] === false
    },
    [usage]
  )

  const getQuotaStatus = useCallback(
    (quota: QuotaKey): QuotaStatus => {
      if (!usage) return "ok"
      const item = usage[quota]
      if (item.limit === null) return "ok"
      if (item.limit === 0) return "limit"
      const percent = (item.current / item.limit) * 100
      if (percent >= 100) return "limit"
      if (percent >= 80) return "warning"
      return "ok"
    },
    [usage]
  )

  const getQuotaInfo = useCallback(
    (quota: QuotaKey): { current: number; limit: number | null; percent: number } => {
      if (!usage) return { current: 0, limit: null, percent: 0 }
      const item = usage[quota]
      const percent = item.limit === null ? 0 : item.limit === 0 ? 100 : (item.current / item.limit) * 100
      return { current: item.current, limit: item.limit, percent: Math.min(percent, 100) }
    },
    [usage]
  )

  const value: PlanContextValue = {
    plan,
    usage,
    loading,
    isFeatureLocked,
    getQuotaStatus,
    getQuotaInfo,
    openUpgradeModal,
    refreshUsage,
    modalOpen,
    setModalOpen,
    modalContext,
  }

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlanGate(): PlanContextValue {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error("usePlanGate must be used within a PlanProvider")
  }
  return context
}
```

- [ ] **Step 2: Mount PlanProvider and UpgradeModal in app layout**

Modify `frontend/app/[locale]/(app)/layout.tsx`. Add the imports at the top:

```ts
import { PlanProvider } from "@/contexts/PlanContext"
import { UpgradeModalWrapper } from "@/components/plan/UpgradeModalWrapper"
```

Wrap the content inside `<OrganizationProvider>` with `<PlanProvider>`, and add `<UpgradeModalWrapper />` at the end (inside PlanProvider):

Change the return from:
```tsx
<OrganizationProvider>
  <div className="h-dvh flex overflow-hidden bg-background">
```

To:
```tsx
<OrganizationProvider>
  <PlanProvider>
    <div className="h-dvh flex overflow-hidden bg-background">
```

And the closing from:
```tsx
      </div>
    </OrganizationProvider>
```

To:
```tsx
      </div>
      <UpgradeModalWrapper />
    </PlanProvider>
  </OrganizationProvider>
```

Note: `UpgradeModalWrapper` is a thin wrapper created in Task 4 that reads `modalOpen`/`modalContext` from PlanContext and renders the UpgradeModal. This avoids circular imports between PlanContext and UpgradeModal.

- [ ] **Step 3: Commit**

```bash
git add frontend/contexts/PlanContext.tsx frontend/app/\[locale\]/\(app\)/layout.tsx
git commit -m "feat(plan): add PlanProvider context and usePlanGate hook"
```

---

### Task 4: Create UpgradeModal and UpgradeModalWrapper components

**Files:**
- Create: `frontend/components/plan/UpgradeModal.tsx`
- Create: `frontend/components/plan/UpgradeModalWrapper.tsx`

- [ ] **Step 1: Create the UpgradeModal component**

Create `frontend/components/plan/UpgradeModal.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Lock, AlertCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createCheckoutSession } from "@/services/subscriptions"
import type { UpgradeModalContext } from "@/lib/quota-error"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: UpgradeModalContext | null
}

const PLAN_BENEFITS: Record<string, string[]> = {
  pro: ["contacts", "pipelines", "ai", "products", "workflows", "csv", "reports"],
  team: ["users", "api", "assignment", "onboarding", "all"],
}

export function UpgradeModal({ open, onOpenChange, context }: UpgradeModalProps) {
  const t = useTranslations("plan")
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!context) return null

  const { type, feature, current, limit, requiredPlan } = context
  const planName = t(`plans.${requiredPlan}.name`)
  const planPrice = t(`plans.${requiredPlan}.price`)
  const planPeriod = t(`plans.${requiredPlan}.period`)
  const benefits = PLAN_BENEFITS[requiredPlan] ?? PLAN_BENEFITS.pro

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSession(requiredPlan)
      window.location.href = url
    } catch (err) {
      console.error("Failed to create checkout session:", err)
      setLoading(false)
    }
  }

  const handleCompare = () => {
    onOpenChange(false)
    router.push("/settings")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <div className="p-6 pb-0 text-center">
          {/* Icon */}
          {type === "feature" ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
          )}

          {/* Title & Description */}
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-bold">
              {type === "feature" && feature
                ? t(`features.${feature}.label`)
                : t("upgrade.quotaTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {type === "feature" && feature
                ? t(`features.${feature}.description`)
                : t("quota.limitSubtext", { label: context.quota ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {/* Quota progress bar (quota mode only) */}
          {type === "quota" && limit != null && (
            <div className="mt-4 mb-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-destructive transition-all"
                  style={{ width: `${Math.min(((current ?? 0) / limit) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {current}/{limit}
              </p>
            </div>
          )}
        </div>

        {/* Plan card */}
        <div className="px-6 pt-4">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-base">{planName}</span>
              <span className="text-sm">
                {planPrice}
                <span className="text-xs opacity-70">{planPeriod}</span>
              </span>
            </div>
            <div className="text-xs opacity-85 leading-relaxed space-y-1">
              {benefits.map((key) => (
                <div key={key}>✓ {t(`plans.${requiredPlan}.benefits.${key}`)}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 space-y-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("upgrade.loading")}
              </>
            ) : (
              t("upgrade.cta", { plan: planName })
            )}
          </Button>
          <button
            onClick={handleCompare}
            className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {t("upgrade.compareLink")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create the UpgradeModalWrapper**

Create `frontend/components/plan/UpgradeModalWrapper.tsx`:

```tsx
"use client"

import { usePlanGate } from "@/contexts/PlanContext"
import { UpgradeModal } from "./UpgradeModal"

export function UpgradeModalWrapper() {
  const { modalOpen, setModalOpen, modalContext } = usePlanGate()

  return (
    <UpgradeModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      context={modalContext}
    />
  )
}
```

- [ ] **Step 3: Verify it builds**

Run: `cd frontend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add frontend/components/plan/UpgradeModal.tsx frontend/components/plan/UpgradeModalWrapper.tsx
git commit -m "feat(plan): add UpgradeModal component with feature and quota modes"
```

---

### Task 5: Create QuotaBanner component

**Files:**
- Create: `frontend/components/plan/QuotaBanner.tsx`

- [ ] **Step 1: Create QuotaBanner.tsx**

Create `frontend/components/plan/QuotaBanner.tsx`:

```tsx
"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlanGate, type QuotaKey } from "@/contexts/PlanContext"

interface QuotaBannerProps {
  quota: QuotaKey
  label: string
}

export function QuotaBanner({ quota, label }: QuotaBannerProps) {
  const t = useTranslations("plan")
  const { getQuotaStatus, getQuotaInfo, openUpgradeModal } = usePlanGate()

  const status = getQuotaStatus(quota)
  const { current, limit, percent } = getQuotaInfo(quota)

  if (status === "ok" || limit === null) return null

  const isLimit = status === "limit"

  const handleUpgrade = () => {
    openUpgradeModal({
      type: "quota",
      quota,
      current,
      limit: limit ?? undefined,
      requiredPlan: "pro",
    })
  }

  return (
    <div
      className={`rounded-lg border p-3.5 flex items-center gap-3.5 ${
        isLimit
          ? "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800"
          : "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isLimit
            ? "bg-red-100 dark:bg-red-900/50"
            : "bg-amber-100 dark:bg-amber-900/50"
        }`}
      >
        {isLimit ? (
          <XCircle className="h-[18px] w-[18px] text-red-600 dark:text-red-400" />
        ) : (
          <AlertTriangle className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
        )}
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] font-semibold ${
            isLimit
              ? "text-red-900 dark:text-red-200"
              : "text-amber-900 dark:text-amber-200"
          }`}
        >
          {isLimit
            ? t("quota.limit", { current, limit, label })
            : t("quota.warning", { current, limit, label })}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            isLimit
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {isLimit
            ? t("quota.limitSubtext", { label })
            : t("quota.warningSubtext")}
        </p>
      </div>

      {/* Mini progress bar */}
      <div className="w-20 shrink-0">
        <div
          className={`h-1.5 rounded-full overflow-hidden ${
            isLimit ? "bg-red-200 dark:bg-red-800" : "bg-amber-200 dark:bg-amber-800"
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isLimit ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p
          className={`text-center text-[10px] mt-0.5 ${
            isLimit
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {Math.round(percent)}%
        </p>
      </div>

      {/* CTA */}
      <Button
        size="sm"
        onClick={handleUpgrade}
        className={`shrink-0 ${
          isLimit
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}
      >
        {isLimit ? t("quota.ctaLimit") : t("quota.ctaWarning")}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/plan/QuotaBanner.tsx
git commit -m "feat(plan): add QuotaBanner component with warning and limit states"
```

---

## Chunk 2: Sidebar & Page Integration

### Task 6: Modify Sidebar with lock icons and quota badges

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

- [ ] **Step 1: Add feature and quota properties to navigation items**

In `frontend/components/Sidebar.tsx`, add the import for `Lock` icon and the plan hook. At the top of the file, add to the lucide-react import:

```ts
Lock,
```

Add the hook import:
```ts
import { usePlanGate, type QuotaKey } from "@/contexts/PlanContext"
```

- [ ] **Step 2: Add type for navigation items with feature/quota**

Before the `navigationGroups` definition inside `Sidebar()`, add a type and the hook:

```ts
const { isFeatureLocked, getQuotaStatus, getQuotaInfo, openUpgradeModal, loading: planLoading } = usePlanGate()
```

Update the `navigationGroups` items to include `feature` and `quota` properties. Change the items array to:

```ts
const navigationGroups = [
  {
    label: t('groups.crm'),
    items: [
      { name: t('items.chat'), href: "/chat", icon: MessageSquare, key: "chat" },
      { name: t('items.inbox'), href: "/inbox", icon: Mail, key: "inbox" },
      { name: t('items.contacts'), href: "/contacts", icon: Users, key: "contacts", quota: "contacts" as QuotaKey },
      { name: t('items.companies'), href: "/companies", icon: Building2, key: "companies" },
      { name: t('items.segments'), href: "/segments", icon: ListFilter, key: "segments", feature: "dynamic_segments" },
      { name: t('items.pipeline'), href: "/deals", icon: Kanban, key: "pipeline", quota: "pipelines" as QuotaKey },
      { name: t('items.funnel'), href: "/pipeline/funnel", icon: Filter, key: "funnel", feature: "conversion_funnel" },
    ],
  },
  {
    label: t('groups.management'),
    items: [
      { name: t('items.products'), href: "/products", icon: Package, key: "products", feature: "products_catalog" },
      { name: t('items.tasks'), href: "/tasks", icon: CheckSquare, key: "tasks" },
      { name: t('items.workflows'), href: "/workflows", icon: Workflow, key: "workflows", feature: "workflows" },
      { name: t('items.sequences'), href: "/sequences", icon: Zap, key: "sequences", feature: "workflows" },
      { name: t('items.calendar'), href: "/calendar", icon: Calendar, key: "calendar" },
    ],
  },
  {
    label: t('groups.analytics'),
    items: [
      { name: t('items.dashboard'), href: "/dashboard", icon: BarChart3, key: "dashboard" },
      { name: t('items.reports'), href: "/reports", icon: FileBarChart, key: "reports", feature: "custom_reports" },
    ],
  },
]
```

- [ ] **Step 3: Update the navigation item rendering**

Replace the `group.items.map((item) => { ... })` block (the inner map that renders `<Link>` elements, approximately lines 189-211) with:

```tsx
{group.items.map((item) => {
  const isActive = pathname.startsWith(item.href)
  const locked = item.feature ? isFeatureLocked(item.feature) : false
  const quotaStatus = item.quota ? getQuotaStatus(item.quota) : null
  const quotaInfo = item.quota ? getQuotaInfo(item.quota) : null
  const requiredPlan = item.feature === "api_access" || item.feature === "team_assignment" ? "team" as const : "pro" as const

  if (locked) {
    return (
      <button
        key={item.key}
        onClick={() => {
          openUpgradeModal({
            type: "feature",
            feature: item.feature!,
            requiredPlan,
          })
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
          "text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)]/60 hover:bg-[var(--sidebar-accent)]/30"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0 opacity-50" />
        <span className="opacity-50">{item.name}</span>
        <Lock className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
      </button>
    )
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
        isActive
          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)] shadow-sm"
          : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
      )}
    >
      <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[var(--sidebar-primary)]")} />
      {item.name}
      {item.key === "tasks" && overdueCount > 0 && (
        <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
          {overdueCount}
        </span>
      )}
      {quotaStatus && quotaStatus !== "ok" && quotaInfo && (
        <span
          className={cn(
            "ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold",
            quotaStatus === "limit"
              ? "bg-red-500 text-white"
              : "bg-amber-500 text-white"
          )}
        >
          {quotaInfo.current}/{quotaInfo.limit}
        </span>
      )}
    </Link>
  )
})}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(plan): add lock icons and quota badges to sidebar navigation"
```

---

### Task 7: Add QuotaBanner to Contacts page

**Files:**
- Modify: `frontend/app/[locale]/(app)/contacts/page.tsx`

- [ ] **Step 1: Add imports**

At the top of the contacts page file, add:

```ts
import { QuotaBanner } from "@/components/plan/QuotaBanner"
import { usePlanGate } from "@/contexts/PlanContext"
```

- [ ] **Step 2: Add hook and banner**

Inside the component function, add the hook call:

```ts
const { getQuotaStatus, openUpgradeModal } = usePlanGate()
const contactsAtLimit = getQuotaStatus("contacts") === "limit"
```

Add the `QuotaBanner` right after the opening `<div>` and before `<PageHeader>`:

```tsx
<QuotaBanner quota="contacts" label="contacts" />
```

- [ ] **Step 3: Gate the create button**

Find the "Add Contact" button (the DialogTrigger in the PageHeader). When quota is at limit, the button should open the upgrade modal instead of the dialog. Wrap the trigger logic:

If `contactsAtLimit`, replace the DialogTrigger button with a plain button that calls `openUpgradeModal`:

```tsx
{contactsAtLimit ? (
  <Button
    onClick={() => openUpgradeModal({ type: "quota", quota: "contacts", requiredPlan: "pro" })}
    variant="outline"
    className="opacity-60"
  >
    <Lock className="mr-2 h-4 w-4" />
    {t("addContact")}
  </Button>
) : (
  <DialogTrigger asChild>
    <Button>{t("addContact")}</Button>
  </DialogTrigger>
)}
```

Add `Lock` to the lucide-react imports if not already there.

- [ ] **Step 4: Call refreshUsage after successful contact creation**

In the existing `createContact()` success path (the try block that calls the create API), add a call to refresh usage data so the quota badge and banner update immediately:

```ts
const { refreshUsage } = usePlanGate()
// ... inside the success handler after createContact() API call:
await refreshUsage()
```

This ensures the sidebar badge and banner reflect the new count without a page reload.

**Important:** Apply the same pattern to all pages where entities are created (deals, products, etc.) — after a successful create API call, call `refreshUsage()` so the quota state stays in sync.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/contacts/page.tsx
git commit -m "feat(plan): add quota banner and gated create button to contacts page"
```

---

### Task 8: Add QuotaBanner to Deals page

**Files:**
- Modify: `frontend/app/[locale]/(app)/deals/page.tsx`

- [ ] **Step 1: Add imports and hook**

```ts
import { QuotaBanner } from "@/components/plan/QuotaBanner"
```

- [ ] **Step 2: Add banner after PageHeader**

Insert `<QuotaBanner quota="pipelines" label="pipelines" />` right after the PageHeader section.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/deals/page.tsx
git commit -m "feat(plan): add quota banner to deals page"
```

---

### Task 9: Add QuotaBanner to Chat page

**Files:**
- Modify: `frontend/app/[locale]/(app)/chat/page.tsx`

- [ ] **Step 1: Add imports and banner**

```ts
import { QuotaBanner } from "@/components/plan/QuotaBanner"
```

Add `<QuotaBanner quota="ai_messages" label="messages IA" />` before the ChatWindow component.

- [ ] **Step 2: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/chat/page.tsx
git commit -m "feat(plan): add quota banner to chat page"
```

---

### Task 10: Gate create buttons on feature-locked pages (Products, Workflows, Segments)

**Files:**
- Modify: `frontend/app/[locale]/(app)/products/page.tsx`
- Modify: `frontend/app/[locale]/(app)/workflows/page.tsx`
- Modify: `frontend/app/[locale]/(app)/segments/page.tsx`

- [ ] **Step 1: Gate Products page create button**

In `frontend/app/[locale]/(app)/products/page.tsx`, add:

```ts
import { usePlanGate } from "@/contexts/PlanContext"
import { Lock } from "lucide-react"
```

Inside the component:
```ts
const { isFeatureLocked, openUpgradeModal } = usePlanGate()
const productsLocked = isFeatureLocked("products_catalog")
```

Replace the "New Product" button with a conditional:

```tsx
{productsLocked ? (
  <Button
    onClick={() => openUpgradeModal({ type: "feature", feature: "products_catalog", requiredPlan: "pro" })}
    variant="outline"
    className="opacity-60"
  >
    <Lock className="mr-2 h-4 w-4" />
    {t("newProduct")}
  </Button>
) : (
  <Button onClick={openCreateDialog}>
    {t("newProduct")}
  </Button>
)}
```

Also, if the entire page content should be gated (showing a full-page lock message instead of an empty product list), add a check at the top of the return:

```tsx
{productsLocked && products.length === 0 && (
  <div className="text-center py-16 text-muted-foreground">
    <Lock className="mx-auto h-10 w-10 mb-4 opacity-40" />
    <p className="text-lg font-medium">{t("features.products_catalog.label")}</p>
    <p className="text-sm mt-1">{t("features.products_catalog.description")}</p>
    <Button
      onClick={() => openUpgradeModal({ type: "feature", feature: "products_catalog", requiredPlan: "pro" })}
      className="mt-4"
    >
      {t("upgrade.cta", { plan: "Pro" })}
    </Button>
  </div>
)}
```

Note: Use `useTranslations("plan")` for plan-specific translations, keeping the existing page translations namespace separate.

- [ ] **Step 2: Gate Workflows page create button**

Same pattern in `frontend/app/[locale]/(app)/workflows/page.tsx`:

```ts
import { usePlanGate } from "@/contexts/PlanContext"
import { Lock } from "lucide-react"

// Inside component:
const { isFeatureLocked, openUpgradeModal } = usePlanGate()
const workflowsLocked = isFeatureLocked("workflows")
```

Replace the "New" button with a conditional that opens the upgrade modal when locked.

- [ ] **Step 3: Gate Segments page create button**

Same pattern in `frontend/app/[locale]/(app)/segments/page.tsx`:

```ts
import { usePlanGate } from "@/contexts/PlanContext"
import { Lock } from "lucide-react"

// Inside component:
const { isFeatureLocked, openUpgradeModal } = usePlanGate()
const segmentsLocked = isFeatureLocked("dynamic_segments")
```

Replace the "New Segment" button with a conditional.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/products/page.tsx frontend/app/\[locale\]/\(app\)/workflows/page.tsx frontend/app/\[locale\]/\(app\)/segments/page.tsx
git commit -m "feat(plan): gate create buttons on products, workflows, and segments pages"
```

---

### Task 11: Verify the complete system

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Run the dev server and test manually**

```bash
cd frontend && npm run dev
```

Test the following scenarios:
1. Solo plan user → sidebar shows lock icons on Products, Workflows, Segments, Funnel, Reports
2. Click a locked sidebar item → upgrade modal appears
3. Click "Passer au Pro" in modal → Stripe Checkout session created
4. Contacts page with 80+ contacts → amber QuotaBanner appears
5. Contacts page at 100/100 → red QuotaBanner, create button disabled with lock
6. API error on create → modal opens instead of toast

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(plan): address integration issues from manual testing"
```
