export interface UsageSummary {
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
  avg_cost_per_call: number
  previous_period: {
    total_cost: number
    total_calls: number
  } | null
}

export interface UsageByUser {
  user_id: string
  email: string
  name: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface UsageByType {
  call_type: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface UsageTimelinePoint {
  period: string
  total_cost: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
}

export interface TopConsumers {
  top_organizations: {
    organization_id: string
    name: string
    total_cost: number
    total_calls: number
  }[]
  top_users: {
    user_id: string
    email: string
    name: string
    total_cost: number
    total_calls: number
  }[]
}
