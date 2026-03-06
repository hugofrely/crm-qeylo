import { apiFetch } from "@/lib/api"
import type { TrashItem, TrashCounts } from "@/types/trash"

export async function fetchTrash(type?: string): Promise<TrashItem[]> {
  const params = type ? `?type=${type}` : ""
  return apiFetch<TrashItem[]>(`/trash/${params}`)
}

export async function fetchTrashCounts(): Promise<TrashCounts> {
  return apiFetch<TrashCounts>("/trash/counts/")
}

export async function restoreItems(type: string, ids: string[]): Promise<void> {
  await apiFetch("/trash/restore/", {
    method: "POST",
    json: { type, ids },
  })
}

export async function permanentDeleteItems(type: string, ids: string[]): Promise<void> {
  await apiFetch("/trash/permanent-delete/", {
    method: "DELETE",
    json: { type, ids },
  })
}

export async function emptyTrash(): Promise<void> {
  await apiFetch("/trash/empty/", { method: "DELETE" })
}
