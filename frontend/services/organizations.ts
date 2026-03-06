import { apiFetch } from "@/lib/api"
import type { MembersResponse } from "@/types"
import type { Organization } from "@/types/organization"

export async function fetchOrganizations(): Promise<Organization[]> {
  return apiFetch<Organization[]>("/organizations/")
}

export async function createOrganization(name: string): Promise<Organization> {
  return apiFetch<Organization>("/organizations/", {
    method: "POST",
    json: { name },
  })
}

export async function fetchMembers(orgId: string): Promise<MembersResponse> {
  return apiFetch<MembersResponse>(`/organizations/${orgId}/members/`)
}

export async function inviteMember(orgId: string, data: { email: string; role: string }): Promise<void> {
  await apiFetch(`/organizations/${orgId}/invite/`, { method: "POST", json: data })
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await apiFetch(`/organizations/${orgId}/members/${userId}/remove/`, { method: "DELETE" })
}

export interface OrgSettings {
  task_reminder_offsets: number[]
}

export async function fetchOrgSettings(orgId: string): Promise<OrgSettings> {
  return apiFetch<OrgSettings>(`/organizations/${orgId}/settings/`)
}

export async function updateOrgSettings(orgId: string, data: Partial<OrgSettings>): Promise<OrgSettings> {
  return apiFetch<OrgSettings>(`/organizations/${orgId}/settings/`, { method: "PATCH", json: data })
}
