import { apiFetch } from "@/lib/api"

export async function createActivity(data: Record<string, unknown>): Promise<void> {
  await apiFetch(`/activities/`, { method: "POST", json: data })
}
