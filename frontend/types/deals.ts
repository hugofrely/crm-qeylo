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
