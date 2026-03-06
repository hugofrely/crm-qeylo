export interface WidgetConfig {
  id: string
  type: "line_chart" | "bar_chart" | "pie_chart" | "kpi_card" | "table"
  title: string
  source: "deals" | "contacts" | "tasks" | "activities" | "quotes"
  metric: string
  group_by: string | null
  filters: Record<string, unknown>
  size: "small" | "medium" | "large"
}

export interface Report {
  id: string
  name: string
  description: string
  is_template: boolean
  is_dashboard: boolean
  widgets: WidgetConfig[]
  created_at: string
  updated_at: string
}

export interface AggregateRequest {
  source: string
  metric: string
  group_by?: string | null
  date_field?: string
  date_range?: string
  date_from?: string
  date_to?: string
  filters?: Record<string, unknown>
  compare?: boolean
}

export interface AggregateDataPoint {
  label: string
  value: number
}

export interface AggregateResponse {
  data: AggregateDataPoint[]
  total: number
  previous_total?: number
  delta_percent?: number
}
