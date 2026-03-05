import { apiFetch } from "@/lib/api"
import type { Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, ContactSearchResult, CheckDuplicatesResponse, DuplicateDetectionSettings } from "@/types"
import type { Task } from "@/types"
import type { Deal } from "@/types"

export async function fetchContact(id: string): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/`)
}

export async function updateContact(id: string, data: Record<string, unknown>): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/`, { method: "PATCH", json: data })
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch(`/contacts/${id}/`, { method: "DELETE" })
}

export async function fetchContacts(): Promise<{ count: number; results: Contact[] }> {
  return apiFetch(`/contacts/`)
}

export async function fetchContactCategories(): Promise<ContactCategory[]> {
  return apiFetch<ContactCategory[]>(`/contacts/categories/`)
}

export async function createContactCategory(data: { name: string; color: string }): Promise<ContactCategory> {
  return apiFetch<ContactCategory>(`/contacts/categories/`, { method: "POST", json: data })
}

export async function updateContactCategory(id: string, data: Partial<ContactCategory>): Promise<ContactCategory> {
  return apiFetch<ContactCategory>(`/contacts/categories/${id}/`, { method: "PATCH", json: data })
}

export async function deleteContactCategory(id: string): Promise<void> {
  await apiFetch(`/contacts/categories/${id}/`, { method: "DELETE" })
}

export async function fetchCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  return apiFetch<CustomFieldDefinition[]>(`/contacts/custom-fields/`)
}

export async function createCustomFieldDefinition(data: Record<string, unknown>): Promise<CustomFieldDefinition> {
  return apiFetch<CustomFieldDefinition>(`/contacts/custom-fields/`, { method: "POST", json: data })
}

export async function updateCustomFieldDefinition(id: string, data: Record<string, unknown>): Promise<CustomFieldDefinition> {
  return apiFetch<CustomFieldDefinition>(`/contacts/custom-fields/${id}/`, { method: "PATCH", json: data })
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  await apiFetch(`/contacts/custom-fields/${id}/`, { method: "DELETE" })
}

export async function searchContacts(query: string): Promise<ContactSearchResult[]> {
  return apiFetch<ContactSearchResult[]>(`/contacts/search/?q=${encodeURIComponent(query)}`)
}

export async function fetchContactTimeline(contactId: string, type: "interactions" | "journal"): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/timeline/?contact=${contactId}&type=${type}`)
}

export async function fetchContactTasks(contactId: string): Promise<Task[]> {
  const res = await apiFetch<{ results: Task[] }>(`/tasks/?contact=${contactId}`)
  return res.results ?? (res as unknown as Task[])
}

export async function fetchContactDeals(contactId: string): Promise<Deal[]> {
  return apiFetch<Deal[]>(`/deals/?contact=${contactId}`)
}

export async function checkDuplicates(data: Record<string, unknown>): Promise<CheckDuplicatesResponse> {
  return apiFetch<CheckDuplicatesResponse>("/contacts/check-duplicates/", {
    method: "POST",
    json: data,
  })
}

export async function mergeContacts(
  primaryId: string,
  duplicateId: string,
  fieldOverrides: Record<string, unknown>
): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${primaryId}/merge/`, {
    method: "POST",
    json: { duplicate_id: duplicateId, field_overrides: fieldOverrides },
  })
}

export async function fetchDuplicateSettings(): Promise<DuplicateDetectionSettings> {
  return apiFetch<DuplicateDetectionSettings>("/contacts/duplicate-settings/")
}

export async function updateDuplicateSettings(
  data: Partial<DuplicateDetectionSettings>
): Promise<DuplicateDetectionSettings> {
  return apiFetch<DuplicateDetectionSettings>("/contacts/duplicate-settings/", {
    method: "PATCH",
    json: data,
  })
}

export async function checkEmailAccount(): Promise<boolean> {
  try {
    const accounts = await apiFetch<Array<{ id: string }>>(`/email/accounts/`)
    return accounts.length > 0
  } catch {
    return false
  }
}

export async function exportContactsCSV(params?: {
  category?: string
  segment?: string
  q?: string
}): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = (await import("js-cookie")).default.get("access_token")
  const orgId = (await import("js-cookie")).default.get("organization_id")

  const searchParams = new URLSearchParams()
  if (params?.category) searchParams.set("category", params.category)
  if (params?.segment) searchParams.set("segment", params.segment)
  if (params?.q) searchParams.set("q", params.q)

  const query = searchParams.toString()
  const url = `${API_URL}/contacts/export/${query ? `?${query}` : ""}`

  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { "X-Organization": orgId } : {}),
    },
  })

  if (!response.ok) throw new Error("Export failed")

  const blob = await response.blob()
  const downloadUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = downloadUrl
  a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(downloadUrl)
}
