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
