import { apiFetch } from "@/lib/api"
import type { Task, TasksResponse } from "@/types"

export async function fetchTasks(): Promise<TasksResponse> {
  return apiFetch<TasksResponse>(`/tasks/`)
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
