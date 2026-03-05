import Cookies from "js-cookie"
import { apiFetch, refreshToken } from "@/lib/api"
import type { Conversation, ApiMessage, SSECallbacks } from "@/types"

export async function streamChat(
  message: string,
  callbacks: SSECallbacks,
  conversationId?: string
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = Cookies.get("access_token")

  const orgId = Cookies.get("organization_id")

  const response = await fetch(`${API_URL}/chat/stream/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { "X-Organization": orgId } : {}),
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
