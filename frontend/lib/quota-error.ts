import { toast } from "sonner"

interface QuotaError {
  error: string
  detail: string
  limit?: number
  current?: number
  feature?: string
  upgrade_required?: string
}

export function handleQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  let parsed: QuotaError
  try {
    parsed = JSON.parse(error.message)
  } catch {
    return false
  }

  if (parsed?.error === "quota_exceeded" || parsed?.error === "feature_not_available") {
    toast.error(parsed.detail, {
      duration: 6000,
      action: {
        label: "Voir les plans",
        onClick: () => {
          window.location.href = "/settings/organization"
        },
      },
    })
    return true
  }
  return false
}
