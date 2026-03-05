import { apiFetch } from "@/lib/api"
import type { Workflow, WorkflowTemplate, WorkflowData, Execution } from "@/types"

export async function fetchWorkflows(): Promise<Workflow[]> {
  return apiFetch<Workflow[]>(`/workflows/`)
}

export async function fetchWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  return apiFetch<WorkflowTemplate[]>(`/workflows/templates/`)
}

export async function createWorkflow(data: Record<string, unknown>): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/`, { method: "POST", json: data })
}

export async function fetchWorkflow(id: string): Promise<WorkflowData> {
  return apiFetch<WorkflowData>(`/workflows/${id}/`)
}

export async function saveWorkflow(id: string, data: Record<string, unknown>): Promise<WorkflowData> {
  return apiFetch<WorkflowData>(`/workflows/${id}/`, { method: "PUT", json: data })
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiFetch(`/workflows/${id}/`, { method: "DELETE" })
}

export async function toggleWorkflow(id: string): Promise<{ is_active: boolean }> {
  return apiFetch<{ is_active: boolean }>(`/workflows/${id}/toggle/`, { method: "POST" })
}

export async function fetchWorkflowExecutions(workflowId: string): Promise<Execution[]> {
  return apiFetch<Execution[]>(`/workflows/${workflowId}/executions/`)
}
