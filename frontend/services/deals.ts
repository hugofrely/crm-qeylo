import { apiFetch } from "@/lib/api"
import type { Deal, Pipeline, PipelineStage, Stage, DealLossReason, SalesQuota, ForecastResponse, WinLossResponse, VelocityResponse, LeaderboardResponse } from "@/types"

// Pipeline CRUD
export async function fetchPipelines(): Promise<Pipeline[]> {
  return apiFetch<Pipeline[]>(`/pipelines/`)
}

export async function createPipeline(data: { name: string; template?: string }): Promise<Pipeline> {
  return apiFetch<Pipeline>(`/pipelines/`, { method: "POST", json: data })
}

export async function updatePipeline(id: string, data: Partial<Pipeline>): Promise<Pipeline> {
  return apiFetch<Pipeline>(`/pipelines/${id}/`, { method: "PATCH", json: data })
}

export async function deletePipeline(id: string, migrateTo?: string): Promise<void> {
  const url = migrateTo
    ? `/pipelines/${id}/?migrate_to=${migrateTo}`
    : `/pipelines/${id}/`
  await apiFetch(url, { method: "DELETE" })
}

export async function reorderPipelines(order: string[]): Promise<void> {
  await apiFetch(`/pipelines/reorder/`, { method: "POST", json: { order } })
}

// Pipeline view (Kanban data)
export async function fetchPipeline(pipelineId?: string, filters?: Record<string, string>): Promise<PipelineStage[]> {
  const params = new URLSearchParams()
  if (pipelineId) params.set("pipeline", pipelineId)
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value)
    }
  }
  const qs = params.toString()
  return apiFetch<PipelineStage[]>(`/deals/pipeline/${qs ? `?${qs}` : ""}`)
}

// Deal CRUD
export async function fetchDeal(id: string): Promise<Deal> {
  return apiFetch<Deal>(`/deals/${id}/`)
}

export async function createDeal(data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/`, { method: "POST", json: data })
}

export async function updateDeal(id: string, data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/${id}/`, { method: "PATCH", json: data })
}

export async function deleteDeal(id: string): Promise<void> {
  await apiFetch(`/deals/${id}/`, { method: "DELETE" })
}

// Stage CRUD
export async function fetchPipelineStages(pipelineId?: string): Promise<Stage[]> {
  const params = pipelineId ? `?pipeline=${pipelineId}` : ""
  return apiFetch<Stage[]>(`/pipeline-stages/${params}`)
}

export async function createPipelineStage(data: { name: string; color: string; order: number; pipeline: string }): Promise<Stage> {
  return apiFetch<Stage>(`/pipeline-stages/`, { method: "POST", json: data })
}

export async function updatePipelineStage(id: string | number, data: Partial<Stage>): Promise<Stage> {
  return apiFetch<Stage>(`/pipeline-stages/${id}/`, { method: "PATCH", json: data })
}

export async function deletePipelineStage(id: string | number, migrateTo?: string | number): Promise<void> {
  const url = migrateTo
    ? `/pipeline-stages/${id}/?migrate_to=${migrateTo}`
    : `/pipeline-stages/${id}/`
  await apiFetch(url, { method: "DELETE" })
}

// Loss Reasons
export async function fetchLossReasons(): Promise<DealLossReason[]> {
  return apiFetch<DealLossReason[]>(`/deals/loss-reasons/`)
}

// Sales Quotas
export async function fetchQuotas(month?: string): Promise<SalesQuota[]> {
  const params = month ? `?month=${month}` : ""
  return apiFetch<SalesQuota[]>(`/quotas/${params}`)
}

export async function upsertQuota(data: { user: string; month: string; target_amount: number }): Promise<SalesQuota> {
  return apiFetch<SalesQuota>(`/quotas/`, { method: "POST", json: data })
}

export async function bulkUpdateQuotas(quotas: { user: string; month: string; target_amount: number }[]): Promise<SalesQuota[]> {
  return apiFetch<SalesQuota[]>(`/quotas/bulk/`, { method: "POST", json: { quotas } })
}

// Analytics
export async function fetchForecast(params?: { period?: string; pipeline?: string; user?: string }): Promise<ForecastResponse> {
  const sp = new URLSearchParams()
  if (params?.period) sp.set("period", params.period)
  if (params?.pipeline) sp.set("pipeline", params.pipeline)
  if (params?.user) sp.set("user", params.user)
  const qs = sp.toString()
  return apiFetch<ForecastResponse>(`/deals/forecast/${qs ? `?${qs}` : ""}`)
}

export async function fetchWinLoss(params?: { period?: string; pipeline?: string; user?: string }): Promise<WinLossResponse> {
  const sp = new URLSearchParams()
  if (params?.period) sp.set("period", params.period)
  if (params?.pipeline) sp.set("pipeline", params.pipeline)
  if (params?.user) sp.set("user", params.user)
  const qs = sp.toString()
  return apiFetch<WinLossResponse>(`/deals/win-loss/${qs ? `?${qs}` : ""}`)
}

export async function fetchVelocity(params: { pipeline: string; period?: string; user?: string }): Promise<VelocityResponse> {
  const sp = new URLSearchParams({ pipeline: params.pipeline })
  if (params.period) sp.set("period", params.period)
  if (params.user) sp.set("user", params.user)
  return apiFetch<VelocityResponse>(`/deals/velocity/?${sp.toString()}`)
}

export async function fetchLeaderboard(params?: { period?: string; pipeline?: string }): Promise<LeaderboardResponse> {
  const sp = new URLSearchParams()
  if (params?.period) sp.set("period", params.period)
  if (params?.pipeline) sp.set("pipeline", params.pipeline)
  const qs = sp.toString()
  return apiFetch<LeaderboardResponse>(`/deals/leaderboard/${qs ? `?${qs}` : ""}`)
}
