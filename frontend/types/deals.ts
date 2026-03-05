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
}

export interface Stage {
  id: string
  name: string
  order: number
  color: string
}

export interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}
