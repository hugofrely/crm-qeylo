import { apiFetch } from "@/lib/api"
import type { ScoringRule } from "@/types/contacts"

export async function fetchScoringRules(): Promise<ScoringRule[]> {
  return apiFetch<ScoringRule[]>("/contacts/scoring-rules/")
}

export async function updateScoringRule(
  id: string,
  data: Partial<ScoringRule>
): Promise<ScoringRule> {
  return apiFetch<ScoringRule>(`/contacts/scoring-rules/${id}/`, {
    method: "PATCH",
    json: data,
  })
}

export async function createScoringRule(
  data: Pick<ScoringRule, "event_type" | "points">
): Promise<ScoringRule> {
  return apiFetch<ScoringRule>("/contacts/scoring-rules/", {
    method: "POST",
    json: data,
  })
}
