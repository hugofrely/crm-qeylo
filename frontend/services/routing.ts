import { apiFetch } from "@/lib/api"
import type { LeadRoutingRule } from "@/types/contacts"

export async function fetchRoutingRules(): Promise<LeadRoutingRule[]> {
  return apiFetch<LeadRoutingRule[]>("/contacts/routing-rules/")
}

export async function createRoutingRule(
  data: Omit<LeadRoutingRule, "id" | "created_at" | "assign_to_name">
): Promise<LeadRoutingRule> {
  return apiFetch<LeadRoutingRule>("/contacts/routing-rules/", {
    method: "POST",
    json: data,
  })
}

export async function updateRoutingRule(
  id: string,
  data: Partial<LeadRoutingRule>
): Promise<LeadRoutingRule> {
  return apiFetch<LeadRoutingRule>(`/contacts/routing-rules/${id}/`, {
    method: "PATCH",
    json: data,
  })
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await apiFetch(`/contacts/routing-rules/${id}/`, { method: "DELETE" })
}

export async function fetchRoundRobinState(): Promise<{
  eligible_user_ids: string[]
  last_assigned_index: number
}> {
  return apiFetch("/contacts/round-robin/")
}

export async function updateRoundRobinState(
  eligible_user_ids: string[]
): Promise<void> {
  await apiFetch("/contacts/round-robin/", {
    method: "PATCH",
    json: { eligible_user_ids },
  })
}
