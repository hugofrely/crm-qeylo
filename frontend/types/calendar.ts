export interface CalendarAccount {
  id: string
  provider: "google" | "outlook"
  calendar_id: string
  is_active: boolean
  email_account: string
  email_address: string | null
  created_at: string
}

export interface Meeting {
  id: string
  title: string
  description: string
  location: string
  start_at: string
  end_at: string
  is_all_day: boolean
  contact: string | null
  contact_name: string | null
  deal: string | null
  created_by: string
  calendar_account: string | null
  sync_status: "pending" | "synced" | "failed" | "not_synced"
  attendees: { email?: string; address?: string; name?: string }[]
  reminder_minutes: number
  created_at: string
  updated_at: string
}
