import { apiFetch } from "@/lib/api"
import type { Sequence, SequenceStep, SequenceEnrollment } from "@/types/sequences"

export async function fetchSequences(): Promise<Sequence[]> {
  return apiFetch<Sequence[]>("/sequences/")
}

export async function fetchSequence(id: string): Promise<Sequence> {
  return apiFetch<Sequence>(`/sequences/${id}/`)
}

export async function createSequence(data: Partial<Sequence>): Promise<Sequence> {
  return apiFetch<Sequence>("/sequences/", { method: "POST", json: data })
}

export async function updateSequence(id: string, data: Partial<Sequence>): Promise<Sequence> {
  return apiFetch<Sequence>(`/sequences/${id}/`, { method: "PATCH", json: data })
}

export async function deleteSequence(id: string): Promise<void> {
  await apiFetch(`/sequences/${id}/`, { method: "DELETE" })
}

export async function addSequenceStep(sequenceId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  return apiFetch<SequenceStep>(`/sequences/${sequenceId}/steps/`, { method: "POST", json: data })
}

export async function updateSequenceStep(sequenceId: string, stepId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  return apiFetch<SequenceStep>(`/sequences/${sequenceId}/steps/${stepId}/`, { method: "PUT", json: data })
}

export async function deleteSequenceStep(sequenceId: string, stepId: string): Promise<void> {
  await apiFetch(`/sequences/${sequenceId}/steps/${stepId}/`, { method: "DELETE" })
}

export async function enrollContacts(sequenceId: string, contactIds: string[]): Promise<{ enrolled_count: number }> {
  return apiFetch<{ enrolled_count: number }>(`/sequences/${sequenceId}/enroll/`, {
    method: "POST",
    json: { contact_ids: contactIds },
  })
}

export async function fetchEnrollments(sequenceId: string, status?: string): Promise<SequenceEnrollment[]> {
  const query = status ? `?status=${status}` : ""
  return apiFetch<SequenceEnrollment[]>(`/sequences/${sequenceId}/enrollments/${query}`)
}

export async function unenrollContact(enrollmentId: string): Promise<void> {
  await apiFetch(`/sequences/enrollments/${enrollmentId}/unenroll/`, { method: "POST" })
}
