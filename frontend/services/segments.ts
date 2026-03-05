import { apiFetch } from "@/lib/api"
import type { Segment, SegmentRules } from "@/types"
import type { Contact } from "@/types"

interface PaginatedContacts {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

export async function fetchSegments(): Promise<Segment[]> {
  return apiFetch<Segment[]>("/segments/")
}

export async function fetchSegment(id: string): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${id}/`)
}

export async function createSegment(data: Partial<Segment>): Promise<Segment> {
  return apiFetch<Segment>("/segments/", { method: "POST", json: data })
}

export async function updateSegment(id: string, data: Partial<Segment>): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${id}/`, { method: "PUT", json: data })
}

export async function deleteSegment(id: string): Promise<void> {
  await apiFetch(`/segments/${id}/`, { method: "DELETE" })
}

export async function fetchSegmentContacts(id: string, page: number = 1): Promise<PaginatedContacts> {
  return apiFetch<PaginatedContacts>(`/segments/${id}/contacts/?page=${page}`)
}

export async function previewSegment(rules: SegmentRules): Promise<{ count: number }> {
  return apiFetch<{ count: number }>("/segments/preview/", { method: "POST", json: { rules } })
}

export async function reorderSegments(order: string[]): Promise<void> {
  await apiFetch("/segments/reorder/", { method: "POST", json: { order } })
}
