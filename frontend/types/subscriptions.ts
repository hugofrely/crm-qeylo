export type Plan = "solo" | "pro" | "team"

export interface SubscriptionDetail {
  plan: Plan
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export interface UsageItem {
  current: number
  limit: number | null
}

export interface UsageSummary {
  plan: Plan
  contacts: UsageItem
  pipelines: UsageItem
  users: UsageItem
  ai_messages: UsageItem
  features: Record<string, boolean>
}

export interface Invoice {
  id: string
  date: number
  amount: number
  currency: string
  status: string
  pdf_url: string | null
}

export interface PaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}
