export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message_preview: string | null
}

export interface ApiMessage {
  id: string
  role: "user" | "assistant"
  content: string
  actions?: Array<{
    tool?: string
    args?: Record<string, unknown>
    result?: Record<string, unknown>
  }>
  created_at: string
}

export interface SSECallbacks {
  onTextDelta: (content: string) => void
  onToolCallStart: (data: {
    tool_name: string
    tool_call_id: string
    args: Record<string, unknown>
  }) => void
  onToolResult: (data: {
    tool_call_id: string
    result: Record<string, unknown>
  }) => void
  onDone: (data: {
    message_id: string
    conversation_id: string
    conversation_title?: string
    actions: Array<Record<string, unknown>>
  }) => void
  onError: (message: string) => void
}

export type MessagePart =
  | { type: "text"; content: string }
  | ToolCallPart

export interface ToolCallPart {
  type: "tool_call"
  toolName: string
  toolCallId: string
  args: Record<string, unknown>
  status: "running" | "completed" | "error"
  result?: Record<string, unknown>
}

export interface Message {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
  isStreaming?: boolean
  created_at: string
}

export interface ChatAction {
  action: string
  [key: string]: unknown
}

export interface EntityPreview {
  name?: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  lead_score?: string
  avatar_initials?: string
  description?: string
  amount?: string
  stage?: string
  contact?: string | null
  due_date?: string
  priority?: string
  is_done?: boolean
  is_active?: boolean
  content?: string
  subject?: string
  icon?: string
  color?: string
  pipeline?: string
  position?: number
}

export interface FieldChange {
  field: string
  from: string
  to: string
}

export interface ChartSeries {
  key: string
  label: string
  color: string
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut" | "stacked_bar" | "area" | "funnel" | "radar" | "composed"
  title: string
  data: Array<Record<string, unknown>>
  xKey: string
  series: ChartSeries[]
}

export interface EnrichedAction {
  action: string
  entity_type?: string
  entity_id?: string
  summary?: string
  entity_preview?: EntityPreview
  changes?: FieldChange[]
  link?: string
  undo_available?: boolean
  save_as_segment_available?: boolean
  rules?: Record<string, unknown>
  count?: number
  results?: Array<Record<string, unknown>>
  chart?: ChartConfig
  title?: string
  description?: string
  [key: string]: unknown
}
