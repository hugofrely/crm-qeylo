# Plan Gating & Upgrade System — Design Spec

**Date:** 2026-03-10
**Status:** Approved

## Problem

On the free plan (Solo), actions like creating products or workflows are blocked by the backend, but the user receives no clear feedback explaining why. There are no visual indicators (locks, warnings) before attempting an action, and the current error handling only shows a brief toast notification. This leads to confusion and missed upgrade opportunities.

## Solution

A preventive plan gating system with:
1. Lock icons on restricted sidebar items and buttons
2. Progressive quota warnings (80%+ and 100%)
3. Contextual upgrade modal with direct Stripe Checkout integration
4. Improved API error fallback that opens the modal instead of a toast

## Architecture

### PlanProvider + usePlanGate hook

A React context (`PlanContext`) wraps the app layout and fetches `UsageSummary` on mount via `fetchUsageSummary()`. All components consume it through `usePlanGate()`.

**Context state:**
```ts
interface PlanContextValue {
  plan: Plan                          // "solo" | "pro" | "team"
  usage: UsageSummary | null
  loading: boolean
  isFeatureLocked: (feature: string) => boolean
  getQuotaStatus: (quota: QuotaKey) => "ok" | "warning" | "limit"
  getQuotaInfo: (quota: QuotaKey) => { current: number; limit: number | null; percent: number }
  openUpgradeModal: (context: UpgradeModalContext) => void
  refreshUsage: () => Promise<void>
}

type QuotaKey = "contacts" | "pipelines" | "users" | "ai_messages"
```

**File:** `frontend/contexts/PlanContext.tsx`

**Mounted in:** `frontend/app/[locale]/(app)/layout.tsx` — wraps the entire authenticated app.

### Quota status thresholds

| Status | Condition | Visual |
|--------|-----------|--------|
| `ok` | < 80% of limit | No indicator |
| `warning` | 80–99% of limit | Yellow badge in sidebar, yellow banner on page |
| `limit` | 100% of limit (or limit is 0) | Red badge in sidebar, red banner on page, create buttons disabled |

When `limit` is `null` (unlimited), status is always `ok`.

## Components

### UpgradeModal

**File:** `frontend/components/plan/UpgradeModal.tsx`

Single dialog component with two visual modes:

**Feature mode** — when a locked feature is accessed:
- Purple lock icon
- Feature name + contextual description
- Recommended plan card (gradient, price, key benefits)
- CTA button → `createCheckoutSession(requiredPlan)` → Stripe redirect
- Secondary link "Comparer tous les plans" → `/settings`

**Quota mode** — when a quota limit is reached:
- Amber warning icon
- "Limite atteinte" message + usage bar (red, 100%)
- Recommended plan card with focus on lifted limits
- Same CTA and secondary link

**Props:**
```ts
interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  context: {
    type: "feature" | "quota"
    feature?: string           // "products_catalog", "workflows", etc.
    quota?: QuotaKey
    current?: number
    limit?: number
    requiredPlan: "pro" | "team"
  }
}
```

**Plan recommendation logic:** `requiredPlan` determines which plan card to show. Features like `api_access` and `team_assignment` require "team", everything else requires "pro".

**Feature descriptions** — a static map provides contextual descriptions:
```ts
const FEATURE_INFO: Record<string, { label: string; description: string }> = {
  products_catalog: {
    label: "Catalogue Produits",
    description: "Gérez vos produits, catégories et tarifs pour vos devis et factures."
  },
  workflows: {
    label: "Workflows",
    description: "Automatisez vos processus métier avec des workflows personnalisés."
  },
  dynamic_segments: {
    label: "Segments dynamiques",
    description: "Créez des segments avancés pour cibler vos contacts."
  },
  // ... etc for all gated features
}
```

### QuotaBanner

**File:** `frontend/components/plan/QuotaBanner.tsx`

Displayed at the top of pages that have quota-limited resources.

| State | Background | Border | Icon | Message | CTA button |
|-------|-----------|--------|------|---------|------------|
| `warning` | `#fffbeb` | `#fcd34d` | Triangle warning (amber) | "Vous approchez de la limite — {current}/{limit} {label}" | Amber "Passer au Pro" |
| `limit` | `#fef2f2` | `#fca5a5` | X circle (red) | "Limite atteinte — {current}/{limit} {label}" | Red "Passer au Pro" |

Includes a mini progress bar (80px wide) showing the percentage.

CTA button calls `openUpgradeModal({ type: "quota", quota, current, limit, requiredPlan: "pro" })`.

**Props:**
```ts
interface QuotaBannerProps {
  quota: QuotaKey
  label: string  // display name: "contacts", "pipelines", etc.
}
// Reads PlanContext internally for current/limit and computes state
```

**Where banners appear:**
- Contacts page → quota `contacts`
- Deals/Pipeline page → quota `pipelines`
- Chat page → quota `ai_messages`

Hidden when status is `ok` or when plan has unlimited quota (`limit === null`).

### Sidebar modifications

**File:** `frontend/components/Sidebar.tsx`

Each navigation item gains an optional `feature` property:

```ts
{ name: "Produits", href: "/products", icon: Package, key: "products", feature: "products_catalog" },
{ name: "Workflows", href: "/workflows", icon: Workflow, key: "workflows", feature: "workflows" },
{ name: "Séquences", href: "/sequences", icon: Zap, key: "sequences", feature: "workflows" },
{ name: "Segments", href: "/segments", icon: ListFilter, key: "segments", feature: "dynamic_segments" },
{ name: "Funnel", href: "/pipeline/funnel", icon: Filter, key: "funnel", feature: "conversion_funnel" },
{ name: "Reports", href: "/reports", icon: FileBarChart, key: "reports", feature: "custom_reports" },
```

**Rendering logic per item:**
- If `feature` is set and `isFeatureLocked(feature)` is true:
  - Text opacity reduced (0.5)
  - Lock icon (`Lock`, 14px) displayed at right
  - `onClick` intercepted → calls `openUpgradeModal({ type: "feature", feature, requiredPlan })` instead of navigating
  - `href` is not followed (use `e.preventDefault()`)
- If item has a quota association (contacts, pipeline):
  - When `getQuotaStatus(quota) === "warning"`: amber badge showing `{current}/{limit}` at right
  - When `getQuotaStatus(quota) === "limit"`: red badge showing `{current}/{limit}` at right
  - Navigation still works normally

**Quota-to-sidebar mapping:**
- Contacts item → `contacts` quota
- Pipeline item → `pipelines` quota

Items without `feature` or quota association render unchanged: Chat, Inbox, Companies, Tasks, Dashboard, Calendar, Trash, Settings.

## handleQuotaError replacement

**File:** `frontend/lib/quota-error.ts`

The existing `handleQuotaError()` is modified to open the upgrade modal instead of showing a toast. It needs access to the `openUpgradeModal` function from PlanContext.

**New approach:** Export a setter that PlanContext calls on mount to register its `openUpgradeModal` function:

```ts
let _openUpgradeModal: ((ctx: UpgradeModalContext) => void) | null = null

export function registerUpgradeModal(fn: (ctx: UpgradeModalContext) => void) {
  _openUpgradeModal = fn
}

export function handleQuotaError(error: unknown): boolean {
  // ... parse error as before ...
  if (parsed?.error === "quota_exceeded") {
    _openUpgradeModal?.({
      type: "quota",
      quota: inferQuotaFromError(parsed),
      current: parsed.current,
      limit: parsed.limit,
      requiredPlan: parsed.upgrade_required ?? "pro"
    })
    refreshUsage()  // sync preventive state
    return true
  }
  if (parsed?.error === "feature_not_available") {
    _openUpgradeModal?.({
      type: "feature",
      feature: parsed.feature,
      requiredPlan: parsed.upgrade_required ?? "pro"
    })
    return true
  }
  // fallback to toast if modal not registered
  return false
}
```

## Complete user flow

```
User clicks "Create contact"
  → Preventive check (PlanContext): quota OK?
    → No (limit) → UpgradeModal opens immediately (no API call)
    → Yes → API call
      → 200 OK → Success + refreshUsage()
      → 403 quota_exceeded → handleQuotaError() → UpgradeModal + refreshUsage()

User clicks "Products" in sidebar
  → isFeatureLocked("products_catalog")?
    → Yes → e.preventDefault() + UpgradeModal (feature mode)
    → No → Normal navigation
```

## Files summary

| File | Action | Description |
|------|--------|-------------|
| `frontend/contexts/PlanContext.tsx` | **Create** | Provider, context, `usePlanGate` hook |
| `frontend/components/plan/UpgradeModal.tsx` | **Create** | Contextual upgrade dialog |
| `frontend/components/plan/QuotaBanner.tsx` | **Create** | Warning/limit banner |
| `frontend/components/Sidebar.tsx` | **Modify** | Add lock icons, quota badges, click interception |
| `frontend/lib/quota-error.ts` | **Modify** | Open modal instead of toast, register pattern |
| `frontend/app/[locale]/(app)/layout.tsx` | **Modify** | Wrap with `PlanProvider` |
| `frontend/app/[locale]/(app)/contacts/page.tsx` | **Modify** | Add `QuotaBanner`, disable create button at limit |
| `frontend/app/[locale]/(app)/deals/page.tsx` | **Modify** | Add `QuotaBanner` for pipelines |
| `frontend/app/[locale]/(app)/chat/page.tsx` | **Modify** | Add `QuotaBanner` for AI messages |
| `frontend/app/[locale]/(app)/products/page.tsx` | **Modify** | Gate create button with feature check |
| `frontend/app/[locale]/(app)/workflows/page.tsx` | **Modify** | Gate create button with feature check |
| `frontend/app/[locale]/(app)/segments/page.tsx` | **Modify** | Gate create button with feature check |

## i18n

All user-facing strings will be added to `frontend/messages/fr/plan.json` and `frontend/messages/en/plan.json` with the namespace `plan`. Keys include:
- `plan.upgrade.featureTitle` / `plan.upgrade.quotaTitle`
- `plan.upgrade.cta` / `plan.upgrade.compareLink`
- `plan.quota.warning` / `plan.quota.limit`
- `plan.features.*` (labels and descriptions for each gated feature)
- `plan.plans.pro.name` / `plan.plans.pro.price` / `plan.plans.team.name` / `plan.plans.team.price`

## Out of scope

- Changing backend quota logic or API responses (already correct)
- Pricing page redesign
- Billing settings page changes
- Downgrade flow
- Usage analytics/tracking
