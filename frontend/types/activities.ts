export type ActivityEntryType = "call" | "email_sent" | "email_received" | "meeting" | "custom"

export interface CallFields {
  direction: string
  duration_minutes: string
  outcome: string
  phone_number: string
  notes: string
}

export interface EmailSentFields {
  subject: string
  recipients: string
  body: string
}

export interface EmailReceivedFields {
  subject: string
  sender: string
  body: string
}

export interface MeetingFields {
  title: string
  scheduled_at: string
  duration_minutes: string
  location: string
  participants: string
  notes: string
}

export interface CustomActivityFields {
  custom_type_label: string
  description: string
}
