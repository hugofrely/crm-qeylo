export interface Company {
  id: string
  name: string
  domain: string
  logo_url: string
  industry: string
  parent: string | null
  parent_name: string | null
  annual_revenue: string | null
  employee_count: number | null
  siret: string
  vat_number: string
  legal_status: string
  owner: string | null
  owner_name: string | null
  source: string
  health_score: "excellent" | "good" | "at_risk" | "churned"
  phone: string
  email: string
  website: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  description: string
  custom_fields: Record<string, unknown>
  ai_summary: string
  created_at: string
  updated_at: string
  contacts_count: number
  deals_count: number
  open_deals_value: string
  won_deals_value: string
  subsidiaries_count: number
  last_interaction: string | null
}

export interface CompanyListItem {
  id: string
  name: string
  domain: string
  industry: string
  health_score: string
  owner: string | null
  owner_name: string | null
  parent: string | null
  parent_name: string | null
  contacts_count: number
  deals_count: number
  open_deals_value: string
  won_deals_value: string
  created_at: string
}

export interface ContactRelationship {
  id: string
  from_contact: string
  from_contact_name: string
  to_contact: string
  to_contact_name: string
  relationship_type: string
  notes: string
  created_at: string
}

export interface CompanyStats {
  contacts_count: number
  total_deals: number
  open_deals: number
  won_deals: number
  lost_deals: number
  open_deals_value: string
  won_deals_value: string
  avg_deal_value: string
  subsidiaries_count: number
}

export interface OrgChartData {
  nodes: OrgChartNode[]
  edges: OrgChartEdge[]
}

export interface OrgChartNode {
  id: string
  name: string
  job_title: string
  email: string
  phone: string
}

export interface OrgChartEdge {
  id: string
  from: string
  to: string
  type: string
  label: string
  notes: string
}

export interface CompanyHierarchyNode extends Company {
  depth: number
  children: CompanyHierarchyNode[]
}
