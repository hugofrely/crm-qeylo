import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface FetchOptions extends RequestInit {
  json?: unknown
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options
  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }

  const token = Cookies.get("access_token")
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: json ? JSON.stringify(json) : rest.body,
  })

  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${Cookies.get("access_token")}`
      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers,
        body: json ? JSON.stringify(json) : rest.body,
      })
      if (!retryResponse.ok)
        throw new Error(`API error: ${retryResponse.status}`)
      if (retryResponse.status === 204) return undefined as T
      return retryResponse.json()
    }
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(JSON.stringify(error))
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

async function refreshToken(): Promise<boolean> {
  const refresh = Cookies.get("refresh_token")
  if (!refresh) return false
  try {
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) return false
    const data = await response.json()
    Cookies.set("access_token", data.access, { expires: 1 / 24 })
    return true
  } catch {
    return false
  }
}

export function setTokens(access: string, refresh: string) {
  Cookies.set("access_token", access, { expires: 1 / 24 })
  Cookies.set("refresh_token", refresh, { expires: 7 })
}

export function clearTokens() {
  Cookies.remove("access_token")
  Cookies.remove("refresh_token")
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

export async function streamChat(
  message: string,
  callbacks: SSECallbacks,
  conversationId?: string
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = Cookies.get("access_token")

  const response = await fetch(`${API_URL}/chat/stream/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, ...(conversationId ? { conversation_id: conversationId } : {}) }),
  })

  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (!refreshed) {
      callbacks.onError("Session expirée. Veuillez vous reconnecter.")
      return
    }
    return streamChat(message, callbacks, conversationId)
  }

  if (!response.ok || !response.body) {
    callbacks.onError("Une erreur est survenue.")
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    let currentEvent = ""
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6))
          switch (currentEvent) {
            case "text_delta":
              callbacks.onTextDelta(data.content)
              break
            case "tool_call_start":
              callbacks.onToolCallStart(data)
              break
            case "tool_result":
              callbacks.onToolResult(data)
              break
            case "done":
              callbacks.onDone(data)
              break
            case "error":
              callbacks.onError(data.message)
              break
          }
        } catch {
          // Skip malformed JSON
        }
        currentEvent = ""
      }
    }
  }
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

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message_preview: string | null
}

export async function fetchConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/chat/conversations/")
}

export async function createConversation(): Promise<Conversation> {
  return apiFetch<Conversation>("/chat/conversations/", {
    method: "POST",
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/chat/conversations/${id}/`, {
    method: "DELETE",
  })
}

export async function renameConversation(
  id: string,
  title: string
): Promise<Conversation> {
  return apiFetch<Conversation>(`/chat/conversations/${id}/`, {
    method: "PATCH",
    json: { title },
  })
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<ApiMessage[]> {
  return apiFetch<ApiMessage[]>(
    `/chat/conversations/${conversationId}/messages/`
  )
}
