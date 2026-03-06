export interface EmailAccount {
  id: string
  provider: "gmail" | "outlook"
  email_address: string
  is_active: boolean
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  tags: string[]
  is_shared: boolean
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface RenderedTemplate {
  subject: string
  body_html: string
}
