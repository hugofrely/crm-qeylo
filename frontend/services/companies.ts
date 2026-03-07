import { apiFetch } from "@/lib/api"
import type {
  Company,
  CompanyListItem,
  CompanyStats,
  OrgChartData,
  ContactRelationship,
} from "@/types"
import type { Contact, TimelineEntry } from "@/types"
import type { Deal } from "@/types"

export async function fetchCompanies(params?: {
  search?: string
  industry?: string
  owner?: string
  health_score?: string
  parent?: string
  has_open_deals?: string
  ordering?: string
  page?: number
}): Promise<{ count: number; results: CompanyListItem[] }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.industry) searchParams.set("industry", params.industry)
  if (params?.owner) searchParams.set("owner", params.owner)
  if (params?.health_score) searchParams.set("health_score", params.health_score)
  if (params?.parent) searchParams.set("parent", params.parent)
  if (params?.has_open_deals) searchParams.set("has_open_deals", params.has_open_deals)
  if (params?.ordering) searchParams.set("ordering", params.ordering)
  if (params?.page) searchParams.set("page", String(params.page))
  const query = searchParams.toString()
  return apiFetch(`/companies/${query ? `?${query}` : ""}`)
}

export async function fetchCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/`)
}

export async function createCompany(data: Record<string, unknown>): Promise<Company> {
  return apiFetch<Company>("/companies/", { method: "POST", json: data })
}

export async function updateCompany(id: string, data: Record<string, unknown>): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/`, { method: "PATCH", json: data })
}

export async function deleteCompany(id: string): Promise<void> {
  await apiFetch(`/companies/${id}/`, { method: "DELETE" })
}

export async function fetchCompanyContacts(id: string): Promise<Contact[]> {
  return apiFetch<Contact[]>(`/companies/${id}/contacts/`)
}

export async function fetchCompanyDeals(id: string): Promise<Deal[]> {
  return apiFetch<Deal[]>(`/companies/${id}/deals/`)
}

export async function fetchCompanySubsidiaries(id: string): Promise<unknown[]> {
  return apiFetch(`/companies/${id}/subsidiaries/`)
}

export async function fetchCompanyHierarchy(id: string): Promise<unknown> {
  return apiFetch(`/companies/${id}/hierarchy/`)
}

export async function fetchCompanyStats(id: string): Promise<CompanyStats> {
  return apiFetch<CompanyStats>(`/companies/${id}/stats/`)
}

export async function fetchCompanyOrgChart(id: string): Promise<OrgChartData> {
  return apiFetch<OrgChartData>(`/companies/${id}/org-chart/`)
}

export async function fetchCompanyTimeline(id: string): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/companies/${id}/timeline/`)
}

export async function fetchContactRelationships(contactId: string): Promise<ContactRelationship[]> {
  return apiFetch<ContactRelationship[]>(`/contacts/${contactId}/relationships/`)
}

export async function createContactRelationship(
  contactId: string,
  data: { from_contact: string; to_contact: string; relationship_type: string; notes?: string }
): Promise<ContactRelationship> {
  return apiFetch<ContactRelationship>(`/contacts/${contactId}/relationships/`, {
    method: "POST",
    json: data,
  })
}

export async function deleteContactRelationship(id: string): Promise<void> {
  await apiFetch(`/companies/contact-relationships/${id}/`, { method: "DELETE" })
}
