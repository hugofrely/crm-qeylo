export interface Pipeline {
  id: string
  name: string
  order: number
  is_default: boolean
  stage_count: number
  deal_count: number
  created_at: string
}

export interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
  probability?: number | null
  expected_close?: string | null
  notes?: string
  created_at?: string
  loss_reason?: string | null
  loss_reason_name?: string | null
  loss_comment?: string
  won_at?: string | null
  lost_at?: string | null
}

export interface DealLossReason {
  id: string
  name: string
  order: number
  is_default: boolean
}

export interface Stage {
  id: string
  name: string
  order: number
  color: string
  pipeline?: string
  is_won?: boolean
  is_lost?: boolean
}

export interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}

export interface QuoteLine {
  id?: string
  product?: string | null
  product_name?: string | null
  description: string
  quantity: string | number
  unit_price: string | number
  unit: "unit" | "hour" | "day" | "fixed"
  tax_rate: string | number
  discount_percent: string | number
  discount_amount: string | number
  order: number
  line_subtotal?: string
  line_discount?: string
  line_ht?: string
  line_tax?: string
  line_ttc?: string
}

export interface Quote {
  id: string
  deal: string
  number: string
  status: "draft" | "sent" | "accepted" | "refused"
  global_discount_percent: string | number
  global_discount_amount: string | number
  notes: string
  valid_until: string | null
  lines: QuoteLine[]
  subtotal_ht?: string
  total_discount?: string
  total_ht?: string
  total_tax?: string
  total_ttc?: string
  created_at: string
  updated_at: string
}

export interface QuoteListItem {
  id: string
  deal: string
  number: string
  status: "draft" | "sent" | "accepted" | "refused"
  total_ttc: string
  line_count: number
  valid_until: string | null
  created_at: string
}

export interface SalesQuota {
  id: string
  user: string
  user_name: string
  month: string
  target_amount: string | number
  created_at: string
  updated_at: string
}

export interface ForecastCategory {
  count: number
  total: number
  weighted: number
}

export interface ForecastMonth {
  month: string
  commit: ForecastCategory
  best_case: ForecastCategory
  pipeline: ForecastCategory
  total_weighted: number
  quota: number
  closed_won: number
}

export interface ForecastResponse {
  period: string
  months: ForecastMonth[]
  summary: {
    commit: number
    best_case: number
    pipeline: number
    total_weighted: number
    total_quota: number
    total_closed_won: number
  }
}

export interface WinLossResponse {
  period: string
  summary: {
    won: { count: number; total_amount: number }
    lost: { count: number; total_amount: number }
    win_rate: number
  }
  loss_reasons: { reason: string; count: number; total_amount: number; percentage: number }[]
  trend: { month: string; won: number; lost: number; win_rate: number }[]
}

export interface VelocityStage {
  stage: string
  stage_id: string
  avg_days: number
  median_days: number
  deal_count: number
}

export interface VelocityResponse {
  pipeline: string
  period: string
  avg_cycle_days: number
  median_cycle_days: number
  stages: VelocityStage[]
  stagnant_deals: {
    id: string
    name: string
    stage: string
    days_in_stage: number
    avg_for_stage: number
    amount: number
  }[]
}

export interface LeaderboardEntry {
  user: { id: string; first_name: string; last_name: string }
  deals_won: number
  revenue_closed: number
  quota: number
  quota_attainment: number
  avg_deal_size: number
  win_rate: number
}

export interface LeaderboardResponse {
  period: string
  rankings: LeaderboardEntry[]
}
