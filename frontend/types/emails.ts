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

export interface Email {
  id: string
  email_account: string
  thread: string | null
  provider_message_id: string
  direction: "inbound" | "outbound"
  from_address: string
  from_name: string
  to_addresses: { name: string; address: string }[]
  cc_addresses: { name: string; address: string }[]
  bcc_addresses: { name: string; address: string }[]
  subject: string
  body_html: string
  body_text: string
  snippet: string
  is_read: boolean
  is_starred: boolean
  labels: string[]
  has_attachments: boolean
  attachments_metadata: { filename: string; mime_type: string; size: number }[]
  contact: string | null
  contact_name: string | null
  deal: string | null
  sent_at: string
  created_at: string
}

export interface EmailThread {
  id: string
  provider_thread_id: string
  subject: string
  last_message_at: string
  message_count: number
  participants: { address: string }[]
  last_email: {
    id: string
    snippet: string
    from_name: string
    direction: "inbound" | "outbound"
    sent_at: string
    is_read: boolean
  } | null
  unread_count: number
}

export interface SyncStatus {
  account_id: string
  email: string
  provider: "gmail" | "outlook"
  sync_status: "idle" | "syncing" | "error"
  last_sync_at: string | null
  error_message: string
}
