import { apiFetch } from "@/lib/api"
import type { Deal, Pipeline, PipelineStage, Stage } from "@/types"

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
