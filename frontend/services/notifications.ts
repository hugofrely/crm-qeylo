import { apiFetch } from "@/lib/api"
import type { Notification, UnreadCountResponse } from "@/types"

export async function fetchNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/notifications/`)
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>(`/notifications/unread-count/`)
}

export async function markAsRead(ids: number[]): Promise<void> {
  await apiFetch(`/notifications/read/`, { method: "POST", json: { ids } })
}

export async function markAllAsRead(): Promise<void> {
  await apiFetch(`/notifications/read-all/`, { method: "POST" })
}
