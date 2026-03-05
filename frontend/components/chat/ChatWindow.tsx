"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  streamChat,
  fetchConversations,
  createConversation,
  fetchConversationMessages,
} from "@/services/chat"
import type { Conversation } from "@/types"
import { ChatInput } from "@/components/chat/ChatInput"
import {
  ChatMessage,
  TypingIndicator,
  messageToParts,
  type Message,
} from "@/components/chat/ChatMessage"
import { ConversationSidebar } from "@/components/chat/ConversationSidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ChatWindow() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userInitials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  const firstName = user?.first_name || "there"

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Load conversations on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const convs = await fetchConversations()
        if (cancelled) return
        setConversations(convs)
        if (convs.length > 0) {
          setActiveConversationId(convs[0].id)
        } else {
          setIsHistoryLoaded(true)
        }
      } catch {
        if (!cancelled) setIsHistoryLoaded(true)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      setIsHistoryLoaded(true)
      return
    }

    let cancelled = false
    setIsHistoryLoaded(false)

    async function loadMessages() {
      try {
        const history = await fetchConversationMessages(activeConversationId!)
        if (cancelled) return
        setMessages(
          history.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: messageToParts(msg),
            created_at: msg.created_at,
          }))
        )
        setIsHistoryLoaded(true)
      } catch {
        if (!cancelled) setIsHistoryLoaded(true)
      }
    }

    loadMessages()
    return () => { cancelled = true }
  }, [activeConversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isHistoryLoaded) scrollToBottom()
  }, [messages, isLoading, isHistoryLoaded, scrollToBottom])

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await createConversation()
      setConversations((prev) => [conv, ...prev])
      setActiveConversationId(conv.id)
      setMessages([])
      setIsHistoryLoaded(true)
    } catch {
      // ignore
    }
  }, [])

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id)
        if (activeConversationId === id) {
          if (remaining.length > 0) {
            setActiveConversationId(remaining[0].id)
          } else {
            setActiveConversationId(null)
            setMessages([])
            setIsHistoryLoaded(true)
          }
        }
        return remaining
      })
    },
    [activeConversationId]
  )

  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      )
    },
    []
  )

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeConversationId

      // Auto-create conversation if none active
      if (!convId) {
        try {
          const conv = await createConversation()
          setConversations((prev) => [conv, ...prev])
          convId = conv.id
          setActiveConversationId(conv.id)
        } catch {
          return
        }
      }

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", content: text }],
        created_at: new Date().toISOString(),
      }

      const assistantId = `streaming-${Date.now()}`
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        parts: [],
        isStreaming: true,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsLoading(true)

      try {
        await streamChat(
          text,
          {
            onTextDelta: (content) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  const parts = [...msg.parts]
                  const lastPart = parts[parts.length - 1]
                  if (lastPart && lastPart.type === "text") {
                    parts[parts.length - 1] = {
                      ...lastPart,
                      content: lastPart.content + content,
                    }
                  } else {
                    parts.push({ type: "text", content })
                  }
                  return { ...msg, parts }
                })
              )
            },

            onToolCallStart: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: [
                      ...msg.parts,
                      {
                        type: "tool_call" as const,
                        toolName: data.tool_name,
                        toolCallId: data.tool_call_id,
                        args: data.args,
                        status: "running" as const,
                      },
                    ],
                  }
                })
              )
            },

            onToolResult: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: msg.parts.map((part) => {
                      if (
                        part.type === "tool_call" &&
                        part.toolCallId === data.tool_call_id
                      ) {
                        return {
                          ...part,
                          status: "completed" as const,
                          result: data.result,
                        }
                      }
                      return part
                    }),
                  }
                })
              )
            },

            onDone: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    id: data.message_id,
                    isStreaming: false,
                  }
                })
              )
              // Update conversation title if provided
              if (data.conversation_title) {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? { ...c, title: data.conversation_title! }
                      : c
                  )
                )
              }
              // Move conversation to top and update preview
              setConversations((prev) => {
                const conv = prev.find((c) => c.id === convId)
                if (!conv) return prev
                return [
                  { ...conv, updated_at: new Date().toISOString(), last_message_preview: text },
                  ...prev.filter((c) => c.id !== convId),
                ]
              })
            },

            onError: (errorMessage) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: [{ type: "text", content: errorMessage }],
                    isStreaming: false,
                  }
                })
              )
            },
          },
          convId
        )
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantId) return msg
            return {
              ...msg,
              parts: [
                {
                  type: "text",
                  content: "Désolé, une erreur est survenue. Veuillez réessayer.",
                },
              ],
              isStreaming: false,
            }
          })
        )
        console.error("Chat error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId]
  )

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="mx-auto max-w-3xl px-4 py-6">
            {isHistoryLoaded && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">
                  Bonjour {firstName} !
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Dis-moi ce que tu veux faire. Je peux créer des contacts,
                  gérer tes deals, organiser tes tâches, et bien plus encore.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userInitials={userInitials}
                />
              ))}
              {isLoading && !messages.some((m) => m.isStreaming) && (
                <TypingIndicator />
              )}
            </div>

            <div ref={bottomRef} className="h-1" />
          </div>
        </ScrollArea>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Conversations sidebar (right) */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewConversation}
        onDeleted={handleDeleteConversation}
        onRenamed={handleRenameConversation}
      />
    </div>
  )
}
