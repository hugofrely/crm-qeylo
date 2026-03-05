"use client"

import { useMemo } from "react"
import { Bot } from "lucide-react"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { InlineToolCard, type ToolCallPart } from "@/components/chat/InlineToolCard"
import { cn } from "@/lib/utils"

export type MessagePart =
  | { type: "text"; content: string }
  | ToolCallPart

export interface Message {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
  isStreaming?: boolean
  created_at: string
}

/** Convert legacy API message format (content + actions) to parts. */
export function messageToParts(msg: {
  content: string
  actions?: Array<{ tool?: string; args?: Record<string, unknown>; result?: Record<string, unknown> }>
}): MessagePart[] {
  const parts: MessagePart[] = []
  if (msg.content) {
    parts.push({ type: "text", content: msg.content })
  }
  if (msg.actions) {
    for (const action of msg.actions) {
      parts.push({
        type: "tool_call",
        toolName: action.tool || "",
        toolCallId: "",
        args: action.args || {},
        status: "completed" as const,
        result: action.result,
      })
    }
  }
  return parts
}

function formatTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr))
  } catch {
    return ""
  }
}

export function ChatMessage({
  message,
  userInitials,
}: {
  message: Message
  userInitials: string
}) {
  const isUser = message.role === "user"
  const time = useMemo(() => formatTime(message.created_at), [message.created_at])

  if (isUser) {
    const textContent = message.parts
      .filter((p): p is { type: "text"; content: string } => p.type === "text")
      .map((p) => p.content)
      .join("")

    return (
      <div className="flex justify-end gap-3">
        <div className="flex max-w-[75%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
            <p className="whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body)]">{textContent}</p>
          </div>
          <span className="px-1 text-[10px] text-muted-foreground/40 font-[family-name:var(--font-body)]">{time}</span>
        </div>
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary font-[family-name:var(--font-body)]">
          {userInitials}
        </div>
      </div>
    )
  }

  const isLastPartText =
    message.parts.length > 0 &&
    message.parts[message.parts.length - 1].type === "text"

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div
          className={cn(
            "rounded-2xl rounded-bl-sm border border-border/50 bg-card px-4 py-3 text-sm shadow-sm"
          )}
        >
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              return (
                <MarkdownContent
                  key={index}
                  content={part.content}
                  isStreaming={
                    message.isStreaming &&
                    isLastPartText &&
                    index === message.parts.length - 1
                  }
                />
              )
            }
            if (part.type === "tool_call") {
              return <InlineToolCard key={part.toolCallId || index} part={part} />
            }
            return null
          })}
          {message.isStreaming && !isLastPartText && message.parts.length > 0 && (
            <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 mt-2 rounded-full" />
          )}
        </div>
        <span className="px-1 text-[10px] text-muted-foreground/40 font-[family-name:var(--font-body)]">{time}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border/50 bg-card px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/40" />
        </div>
      </div>
    </div>
  )
}
