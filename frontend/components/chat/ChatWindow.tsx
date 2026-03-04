"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import { ChatInput } from "@/components/chat/ChatInput"
import { ChatMessage, TypingIndicator, type Message } from "@/components/chat/ChatMessage"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SendMessageResponse {
  message: Message
  actions: unknown[]
}

export function ChatWindow() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userInitials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  const firstName = user?.first_name || "there"

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM has been updated
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Load chat history
  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        const history = await apiFetch<Message[]>("/chat/history/")
        if (!cancelled) {
          setMessages(history)
          setIsHistoryLoaded(true)
        }
      } catch {
        // Silently fail — show empty chat
        if (!cancelled) {
          setIsHistoryLoaded(true)
        }
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [])

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (isHistoryLoaded) {
      scrollToBottom()
    }
  }, [messages, isLoading, isHistoryLoaded, scrollToBottom])

  const handleSend = useCallback(
    async (text: string) => {
      // Optimistically add user message
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      try {
        const data = await apiFetch<SendMessageResponse>("/chat/message/", {
          method: "POST",
          json: { message: text },
        })

        setMessages((prev) => {
          // Replace the temp user message with the real one if the API returns it,
          // and append the assistant response
          const withoutTemp = prev.filter((m) => m.id !== userMessage.id)
          // The API returns the assistant message in data.message
          // We keep the user message (it was already added optimistically)
          // and add the assistant's response
          return [
            ...withoutTemp,
            userMessage, // keep the user message
            data.message, // add the assistant response
          ]
        })
      } catch (error) {
        // Show error as an assistant message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            "D\u00e9sol\u00e9, une erreur est survenue. Veuillez r\u00e9essayer.",
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
        console.error("Chat error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* Welcome message when no history */}
          {isHistoryLoaded && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Bonjour {firstName} !
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Dis-moi ce que tu veux faire. Je peux cr\u00e9er des contacts,
                g\u00e9rer tes deals, organiser tes t\u00e2ches, et bien plus encore.
              </p>
            </div>
          )}

          {/* Messages list */}
          <div className="flex flex-col gap-5">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                userInitials={userInitials}
              />
            ))}
            {isLoading && <TypingIndicator />}
          </div>

          {/* Scroll anchor */}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
