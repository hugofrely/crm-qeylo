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
