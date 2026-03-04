"use client"

import { useMemo } from "react"
import { Bot } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ActionCard, type ChatAction } from "@/components/chat/ActionCard"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  actions?: ChatAction[]
  created_at: string
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
    return (
      <div className="flex justify-end gap-3">
        <div className="flex max-w-[75%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          <span className="px-1 text-[10px] text-muted-foreground/60">{time}</span>
        </div>
        <Avatar className="mt-1 h-7 w-7 shrink-0">
          <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Avatar className="mt-1 h-7 w-7 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div
          className={cn(
            "rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-2.5 text-sm shadow-sm"
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            {message.actions.map((action, index) => (
              <ActionCard key={`${message.id}-action-${index}`} action={action} />
            ))}
          </div>
        )}

        <span className="px-1 text-[10px] text-muted-foreground/60">{time}</span>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <Avatar className="mt-1 h-7 w-7 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="typing-dot animation-delay-200 h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span className="typing-dot animation-delay-400 h-2 w-2 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </div>
  )
}
