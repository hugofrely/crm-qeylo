export interface SegmentCondition {
  field: string
  operator: string
  value: unknown
  unit?: string
}

export interface SegmentRuleGroup {
  logic: "AND" | "OR"
  conditions: SegmentCondition[]
}

export interface SegmentRules {
  logic: "AND" | "OR"
  groups: SegmentRuleGroup[]
}

export interface Segment {
  id: string
  name: string
  description: string
  icon: string
  color: string
  rules: SegmentRules
  is_pinned: boolean
  order: number
  contact_count?: number
  created_at: string
  updated_at: string
}
