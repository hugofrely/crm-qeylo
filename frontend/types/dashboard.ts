export interface DealsByStage {
  stage_name: string
  stage_color: string
  count: number
  total_amount: number
}

export interface DashboardStats {
  revenue_this_month: number
  total_pipeline: number
  deals_by_stage: DealsByStage[]
  upcoming_tasks: number
  active_deals_count: number
}
