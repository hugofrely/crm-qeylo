import { apiFetch } from "@/lib/api"

export async function createNote(data: { contact: string; content: string }): Promise<void> {
  await apiFetch(`/notes/`, { method: "POST", json: data })
}

export async function updateNote(id: number, data: { content: string }): Promise<void> {
  await apiFetch(`/notes/${id}/`, { method: "PATCH", json: data })
}

export async function deleteNote(id: number): Promise<void> {
  await apiFetch(`/notes/${id}/`, { method: "DELETE" })
}
