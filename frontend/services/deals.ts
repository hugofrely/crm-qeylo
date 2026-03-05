import { apiFetch } from "@/lib/api"
import type { Deal, PipelineStage, Stage } from "@/types"

export async function fetchPipeline(): Promise<PipelineStage[]> {
  return apiFetch<PipelineStage[]>(`/deals/pipeline/`)
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

export async function fetchPipelineStages(): Promise<Stage[]> {
  return apiFetch<Stage[]>(`/pipeline-stages/`)
}

export async function createPipelineStage(data: { name: string; color: string; order: number }): Promise<Stage> {
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
