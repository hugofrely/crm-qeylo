import { apiFetch } from "@/lib/api"
import type {
  UsageSummary,
  UsageByUser,
  UsageByType,
  UsageTimelinePoint,
  TopConsumers,
} from "@/types/ai-usage"

interface UsageParams {
  start_date?: string
  end_date?: string
  organization_id?: string
  user_id?: string
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  if (entries.length === 0) return ""
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
}

export async function fetchUsageSummary(params: UsageParams = {}): Promise<UsageSummary> {
  return apiFetch<UsageSummary>(`/ai-usage/summary/${buildQuery(params as Record<string, string | undefined>)}`)
}

export async function fetchUsageByUser(params: UsageParams = {}): Promise<UsageByUser[]> {
  return apiFetch<UsageByUser[]>(`/ai-usage/by-user/${buildQuery(params as Record<string, string | undefined>)}`)
}

export async function fetchUsageByType(params: UsageParams = {}): Promise<UsageByType[]> {
  return apiFetch<UsageByType[]>(`/ai-usage/by-type/${buildQuery(params as Record<string, string | undefined>)}`)
}

export async function fetchUsageTimeline(
  params: UsageParams & { granularity?: string } = {}
): Promise<UsageTimelinePoint[]> {
  return apiFetch<UsageTimelinePoint[]>(`/ai-usage/timeline/${buildQuery(params as Record<string, string | undefined>)}`)
}

export async function fetchTopConsumers(
  params: UsageParams & { limit?: string } = {}
): Promise<TopConsumers> {
  return apiFetch<TopConsumers>(`/ai-usage/top-consumers/${buildQuery(params as Record<string, string | undefined>)}`)
}
