import { apiFetch } from "@/lib/api"
import type { Task, TasksResponse, TaskFilters } from "@/types"

export async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.is_done) params.set("is_done", filters.is_done)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.contact) params.set("contact", filters.contact)
  if (filters.due_date) params.set("due_date", filters.due_date)
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to)
  if (filters.due_date_gte) params.set("due_date_gte", filters.due_date_gte)
  if (filters.due_date_lte) params.set("due_date_lte", filters.due_date_lte)
  const qs = params.toString()
  return apiFetch<TasksResponse>(`/tasks/${qs ? `?${qs}` : ""}`)
}

export async function fetchTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/`)
}

export async function createTask(data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/`, { method: "POST", json: data })
}

export async function updateTask(id: string, data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/`, { method: "PATCH", json: data })
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}/`, { method: "DELETE" })
}
