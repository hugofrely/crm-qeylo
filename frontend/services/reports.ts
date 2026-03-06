import { apiFetch } from "@/lib/api"
import type { Report, AggregateRequest, AggregateResponse } from "@/types"

export async function fetchReports(): Promise<Report[]> {
  return apiFetch<Report[]>("/reports/")
}

export async function fetchReport(id: string): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}/`)
}

export async function createReport(data: {
  name: string
  description?: string
  widgets: unknown[]
}): Promise<Report> {
  return apiFetch<Report>("/reports/", { method: "POST", json: data })
}

export async function updateReport(
  id: string,
  data: Record<string, unknown>
): Promise<Report> {
  return apiFetch<Report>(`/reports/${id}/`, { method: "PATCH", json: data })
}

export async function deleteReport(id: string): Promise<void> {
  await apiFetch(`/reports/${id}/`, { method: "DELETE" })
}

export async function fetchAggregate(
  request: AggregateRequest
): Promise<AggregateResponse> {
  return apiFetch<AggregateResponse>("/reports/aggregate/", {
    method: "POST",
    json: request,
  })
}
