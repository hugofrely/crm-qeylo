export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  source: string
  tags: string[]
  notes: string
  job_title: string
  linkedin_url: string
  website: string
  address: string
  industry: string
  lead_score: string
  numeric_score: number
  estimated_budget: string | null
  identified_needs: string
  decision_role: string
  preferred_channel: string
  timezone: string
  language: string
  interests: string[]
  birthday: string | null
  categories: ContactCategory[]
  custom_fields: Record<string, unknown>
  city: string
  postal_code: string
  country: string
  state: string
  secondary_email: string
  secondary_phone: string
  mobile_phone: string
  twitter_url: string
  siret: string
  company_entity: string | null
  company_entity_name: string | null
  ai_summary: string
  ai_summary_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ContactCategory {
  id: string
  name: string
  color: string
  icon: string
  order: number
  is_default: boolean
  contact_count?: number
  created_at?: string
}

export interface CustomFieldDefinition {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
  order: number
  section: string
  created_at?: string
}

export interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  subject: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ContactSearchResult {
  id: string
  first_name: string
  last_name: string
  company?: string
  email?: string
}

export interface DuplicateMatch {
  contact: Contact
  score: number
  matched_on: string[]
}

export interface CheckDuplicatesResponse {
  duplicates: DuplicateMatch[]
}

export interface ScoringRule {
  id: string
  event_type: string
  points: number
  is_active: boolean
  created_at: string
}

export interface DuplicateDetectionSettings {
  enabled: boolean
  match_email: boolean
  match_name: boolean
  match_phone: boolean
  match_siret: boolean
  match_company: boolean
  similarity_threshold: number
}
