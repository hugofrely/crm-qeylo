import { apiFetch } from "@/lib/api";
import type { Call } from "@/types/calls";

export async function fetchCalls(params?: {
  contact?: string;
  deal?: string;
}): Promise<Call[]> {
  const query = new URLSearchParams();
  if (params?.contact) query.set("contact", params.contact);
  if (params?.deal) query.set("deal", params.deal);
  return apiFetch(`/calls/?${query.toString()}`);
}

export async function createCall(data: {
  contact: string;
  deal?: string;
  direction: string;
  outcome: string;
  duration_seconds?: number;
  started_at: string;
  notes?: string;
}): Promise<Call> {
  return apiFetch("/calls/", { method: "POST", json: data });
}

export async function deleteCall(id: string): Promise<void> {
  return apiFetch(`/calls/${id}/`, { method: "DELETE" });
}
