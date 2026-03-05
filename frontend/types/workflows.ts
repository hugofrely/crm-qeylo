export interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string | null
  execution_count: number
  last_execution_at: string | null
  created_at: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  trigger_type: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

export interface WorkflowData {
  id: string
  name: string
  description: string
  is_active: boolean
  nodes: Array<{
    id: string
    node_type: string
    node_subtype: string
    config: Record<string, unknown>
    position_x: number
    position_y: number
  }>
  edges: Array<{
    id: string
    source_node: string
    target_node: string
    source_handle: string
    label: string
  }>
}

export interface ExecutionStep {
  id: string
  node_type: string
  node_subtype: string
  status: string
  output_data: Record<string, unknown>
  error: string
  started_at: string
  completed_at: string | null
}

export interface Execution {
  id: string
  workflow_name: string
  trigger_event: string
  trigger_data: Record<string, unknown>
  status: string
  started_at: string
  completed_at: string | null
  error: string
  steps: ExecutionStep[]
}
