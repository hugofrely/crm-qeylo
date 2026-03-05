# Chat Streaming, Markdown & Inline Tool Cards — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add SSE streaming responses with markdown rendering and inline tool call cards to the CRM chat.

**Architecture:** Backend uses `agent.run_stream_events()` from Pydantic AI to stream events as SSE via Django's `StreamingHttpResponse`. Frontend consumes with `fetch` + `ReadableStream`, renders markdown with `react-markdown`, and shows tool calls inline as they happen.

**Tech Stack:** Django 5.1 async views, Pydantic AI 1.65.0 streaming, React 19, react-markdown, remark-gfm, @tailwindcss/typography (Tailwind v4)

---

## Task 1: Install frontend dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install packages**

Run:
```bash
cd frontend && npm install react-markdown remark-gfm @tailwindcss/typography
```

**Step 2: Add typography plugin to CSS**

Modify `frontend/app/globals.css` — add after line 2 (`@import "tw-animate-css";`):
```css
@plugin "@tailwindcss/typography";
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/app/globals.css
git commit -m "chore: add react-markdown, remark-gfm, and tailwind typography"
```

---

## Task 2: Backend — Add SSE streaming endpoint

**Files:**
- Modify: `backend/chat/views.py`
- Modify: `backend/chat/urls.py`

**Step 1: Write the streaming view**

Add to `backend/chat/views.py` — new imports and async view function:

```python
# Add imports at top
import json
import asyncio
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartStartEvent,
    PartDeltaEvent,
    TextPartDelta,
    ToolReturnPart,
)
from pydantic_ai.run import AgentRunResultEvent
```

Add the new view after `send_message`:

```python
def _sse_event(event_type: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_message(request):
    """Stream an AI response as Server-Sent Events."""
    # Django 5.1 async views receive the same request object.
    # We need to parse the body manually since DRF decorators are sync.
    if request.method != "POST":
        return StreamingHttpResponse(status=405)

    # Auth check — reuse DRF JWT logic
    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    jwt_auth = JWTAuthentication()
    try:
        auth_result = jwt_auth.authenticate(request)
        if auth_result is None:
            return StreamingHttpResponse(status=401)
        user, _ = auth_result
    except AuthenticationFailed:
        return StreamingHttpResponse(status=401)

    org = getattr(request, "organization", None)
    if org is None:
        # Fetch org from membership (since middleware may not have run for async)
        from organizations.models import Membership
        membership = await Membership.objects.select_related("organization").filter(
            user=user
        ).afirst()
        if not membership:
            return StreamingHttpResponse(status=400)
        org = membership.organization

    # Parse body
    try:
        body = json.loads(request.body)
        user_message = body.get("message", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return StreamingHttpResponse(status=400)

    if not user_message:
        return StreamingHttpResponse(status=400)

    # Save user message
    await ChatMessage.objects.acreate(
        organization=org,
        user=user,
        role=ChatMessage.Role.USER,
        content=user_message,
    )

    # Build context (sync ORM calls wrapped in sync_to_async)
    from asgiref.sync import sync_to_async
    contacts_summary, deals_summary, tasks_summary = await sync_to_async(_build_context)(org)
    user_name = f"{user.first_name} {user.last_name}".strip()
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=user_name or user.email,
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
    )

    agent = build_agent()
    deps = ChatDeps(
        organization_id=str(org.id),
        user_id=str(user.id),
    )

    async def event_generator():
        full_text = ""
        actions = []

        try:
            async for event in agent.run_stream_events(
                user_message,
                deps=deps,
                model=settings.AI_MODEL,
                instructions=formatted_prompt,
            ):
                if isinstance(event, PartDeltaEvent):
                    if isinstance(event.delta, TextPartDelta):
                        delta = event.delta.content_delta
                        full_text += delta
                        yield _sse_event("text_delta", {"content": delta})

                elif isinstance(event, FunctionToolCallEvent):
                    yield _sse_event("tool_call_start", {
                        "tool_name": event.part.tool_name,
                        "tool_call_id": event.part.tool_call_id,
                        "args": event.part.args
                        if isinstance(event.part.args, dict)
                        else {},
                    })

                elif isinstance(event, FunctionToolResultEvent):
                    result_content = event.result.content if isinstance(event.result, ToolReturnPart) else None
                    if isinstance(result_content, dict):
                        actions.append({
                            "tool": event.result.tool_name,
                            "args": {},
                            "result": result_content,
                        })
                    yield _sse_event("tool_result", {
                        "tool_call_id": event.result.tool_call_id if isinstance(event.result, ToolReturnPart) else "",
                        "result": result_content if isinstance(result_content, dict) else {},
                    })

                elif isinstance(event, AgentRunResultEvent):
                    # Final result — save to DB
                    if not full_text and event.result.output:
                        full_text = event.result.output

            # Save assistant message
            assistant_msg = await ChatMessage.objects.acreate(
                organization=org,
                user=user,
                role=ChatMessage.Role.ASSISTANT,
                content=full_text,
                actions=actions,
            )

            yield _sse_event("done", {
                "message_id": str(assistant_msg.id),
                "actions": actions,
            })

        except Exception:
            logger.exception("Streaming AI agent error")
            error_text = "Desole, une erreur est survenue. Veuillez reessayer."
            yield _sse_event("error", {"message": error_text})
            # Save error message
            await ChatMessage.objects.acreate(
                organization=org,
                user=user,
                role=ChatMessage.Role.ASSISTANT,
                content=error_text,
                actions=[],
            )

    response = StreamingHttpResponse(
        event_generator(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
```

**Step 2: Add URL**

Modify `backend/chat/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("message/", views.send_message),
    path("stream/", views.stream_message),
    path("history/", views.chat_history),
]
```

**Step 3: Run backend tests to verify no regressions**

Run: `cd backend && python manage.py test chat -v2`
Expected: All existing tests pass (the new endpoint is untested for now — we'll test it manually later).

**Step 4: Commit**

```bash
git add backend/chat/views.py backend/chat/urls.py
git commit -m "feat: add SSE streaming endpoint for chat"
```

---

## Task 3: Frontend — Add streaming API function

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add SSE streaming function**

Add to the end of `frontend/lib/api.ts`:

```typescript
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
    actions: Array<Record<string, unknown>>
  }) => void
  onError: (message: string) => void
}

export async function streamChat(
  message: string,
  callbacks: SSECallbacks
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = Cookies.get("access_token")

  const response = await fetch(`${API_URL}/chat/stream/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  })

  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (!refreshed) {
      callbacks.onError("Session expirée. Veuillez vous reconnecter.")
      return
    }
    // Retry with new token
    return streamChat(message, callbacks)
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
    // Keep the last incomplete line in the buffer
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
```

**Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: add SSE streaming function for chat"
```

---

## Task 4: Frontend — Create MarkdownContent component

**Files:**
- Create: `frontend/components/chat/MarkdownContent.tsx`

**Step 1: Create the component**

```tsx
"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownContent({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/MarkdownContent.tsx
git commit -m "feat: add MarkdownContent component with react-markdown"
```

---

## Task 5: Frontend — Create InlineToolCard component

**Files:**
- Create: `frontend/components/chat/InlineToolCard.tsx`

**Step 1: Create the component**

This component reuses the styling concepts from `ActionCard.tsx` but is designed for inline display with running/completed/error states.

```tsx
"use client"

import {
  User,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle,
  StickyNote,
  BarChart3,
  Search,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToolCallPart {
  type: "tool_call"
  toolName: string
  toolCallId: string
  args: Record<string, unknown>
  status: "running" | "completed" | "error"
  result?: Record<string, unknown>
}

const toolConfig: Record<
  string,
  {
    icon: React.ElementType
    label: string
    borderColor: string
    bgColor: string
    iconColor: string
  }
> = {
  create_contact: {
    icon: User,
    label: "Création de contact",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600",
  },
  search_contacts: {
    icon: Search,
    label: "Recherche de contacts",
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600",
  },
  create_deal: {
    icon: Briefcase,
    label: "Création de deal",
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600",
  },
  move_deal: {
    icon: ArrowRight,
    label: "Déplacement de deal",
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600",
  },
  create_task: {
    icon: Clock,
    label: "Création de tâche",
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600",
  },
  complete_task: {
    icon: CheckCircle,
    label: "Complétion de tâche",
    borderColor: "border-l-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-600",
  },
  add_note: {
    icon: StickyNote,
    label: "Ajout de note",
    borderColor: "border-l-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    iconColor: "text-orange-600",
  },
  get_dashboard_summary: {
    icon: BarChart3,
    label: "Résumé du tableau de bord",
    borderColor: "border-l-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-600",
  },
  search_all: {
    icon: Search,
    label: "Recherche globale",
    borderColor: "border-l-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/30",
    iconColor: "text-gray-600",
  },
}

const defaultConfig = {
  icon: CheckCircle,
  label: "Action",
  borderColor: "border-l-gray-500",
  bgColor: "bg-gray-50 dark:bg-gray-950/30",
  iconColor: "text-gray-600",
}

function formatResult(result: Record<string, unknown>): string {
  const action = result.action as string | undefined
  if (!action) return ""

  switch (action) {
    case "contact_created":
      return `${result.name}${result.company ? ` — ${result.company}` : ""}`
    case "deal_created":
      return `${result.name} — ${result.amount} €`
    case "deal_moved":
      return `${result.name}: ${result.old_stage} → ${result.new_stage}`
    case "task_created":
      return String(result.description || "")
    case "task_completed":
      return String(result.description || "")
    case "note_added":
      return String(result.content || "").slice(0, 80)
    case "dashboard_summary":
      return `${result.active_deals} deals actifs · ${result.upcoming_tasks_7d} tâches`
    case "search_contacts":
      return `${result.count} résultat(s)`
    case "search_all":
      return "Recherche terminée"
    default:
      return ""
  }
}

function formatArgs(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "create_contact":
      return [args.first_name, args.last_name].filter(Boolean).join(" ")
    case "search_contacts":
    case "search_all":
      return String(args.query || "")
    case "create_deal":
      return String(args.name || "")
    case "move_deal":
      return String(args.new_stage_name || "")
    case "create_task":
      return String(args.description || "").slice(0, 50)
    case "complete_task":
      return ""
    case "add_note":
      return String(args.content || "").slice(0, 50)
    case "get_dashboard_summary":
      return ""
    default:
      return ""
  }
}

export function InlineToolCard({ part }: { part: ToolCallPart }) {
  const config = toolConfig[part.toolName] || defaultConfig
  const Icon = config.icon
  const argsText = formatArgs(part.toolName, part.args)
  const resultText =
    part.status === "completed" && part.result
      ? formatResult(part.result)
      : ""

  return (
    <div
      className={cn(
        "my-2 flex items-center gap-2.5 rounded-lg border border-border/60 border-l-[3px] px-3 py-2 text-sm transition-all",
        config.borderColor,
        config.bgColor,
        part.status === "running" && "animate-pulse"
      )}
    >
      <div className={cn("shrink-0", config.iconColor)}>
        {part.status === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : part.status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground">
          {config.label}
        </span>
        {argsText && part.status === "running" && (
          <span className="ml-1.5 text-xs text-muted-foreground/70">
            {argsText}
          </span>
        )}
        {resultText && part.status === "completed" && (
          <span className="ml-1.5 text-xs text-foreground">
            — {resultText}
          </span>
        )}
      </div>

      {part.status === "completed" && (
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/InlineToolCard.tsx
git commit -m "feat: add InlineToolCard component for streaming tool calls"
```

---

## Task 6: Frontend — Refactor ChatMessage to use parts

**Files:**
- Modify: `frontend/components/chat/ChatMessage.tsx`

**Step 1: Update the Message type and ChatMessage component**

Replace the entire file with the new parts-based rendering:

```tsx
"use client"

import { useMemo } from "react"
import { Bot } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
    // User messages: just show the first text part as plain text
    const textContent = message.parts
      .filter((p): p is { type: "text"; content: string } => p.type === "text")
      .map((p) => p.content)
      .join("")

    return (
      <div className="flex justify-end gap-3">
        <div className="flex max-w-[75%] flex-col items-end gap-1">
          <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
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

  // Assistant messages: render parts inline
  const isLastPartText =
    message.parts.length > 0 &&
    message.parts[message.parts.length - 1].type === "text"

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
          {/* Show cursor when streaming and last part is a tool call (text hasn't started yet after it) */}
          {message.isStreaming && !isLastPartText && message.parts.length > 0 && (
            <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5 mt-2" />
          )}
        </div>
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
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ChatMessage.tsx
git commit -m "refactor: ChatMessage to use parts-based rendering with markdown"
```

---

## Task 7: Frontend — Refactor ChatWindow to use streaming

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx`

**Step 1: Rewrite ChatWindow with streaming**

Replace the entire file:

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { apiFetch, streamChat } from "@/lib/api"
import { ChatInput } from "@/components/chat/ChatInput"
import {
  ChatMessage,
  TypingIndicator,
  messageToParts,
  type Message,
  type MessagePart,
} from "@/components/chat/ChatMessage"
import { ScrollArea } from "@/components/ui/scroll-area"

/** Raw message shape from the history API */
interface ApiMessage {
  id: string
  role: "user" | "assistant"
  content: string
  actions?: Array<{ tool?: string; args?: Record<string, unknown>; result?: Record<string, unknown> }>
  created_at: string
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

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Load chat history
  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        const history = await apiFetch<ApiMessage[]>("/chat/history/")
        if (!cancelled) {
          setMessages(
            history.map((msg) => ({
              id: msg.id,
              role: msg.role,
              parts: messageToParts(msg),
              created_at: msg.created_at,
            }))
          )
          setIsHistoryLoaded(true)
        }
      } catch {
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

  // Scroll to bottom when messages change
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
        parts: [{ type: "text", content: text }],
        created_at: new Date().toISOString(),
      }

      // Create placeholder assistant message for streaming
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
        await streamChat(text, {
          onTextDelta: (content) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantId) return msg
                const parts = [...msg.parts]
                const lastPart = parts[parts.length - 1]
                if (lastPart && lastPart.type === "text") {
                  // Append to existing text part
                  parts[parts.length - 1] = {
                    ...lastPart,
                    content: lastPart.content + content,
                  }
                } else {
                  // Start new text part
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
        })
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
                Dis-moi ce que tu veux faire. Je peux créer des contacts,
                gérer tes deals, organiser tes tâches, et bien plus encore.
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
            {isLoading && !messages.some((m) => m.isStreaming) && (
              <TypingIndicator />
            )}
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
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx
git commit -m "feat: refactor ChatWindow to use SSE streaming with inline tools"
```

---

## Task 8: Update system prompt to allow markdown

**Files:**
- Modify: `backend/chat/prompts.py`

**Step 1: Update the prompt**

The current prompt says "N'utilise PAS de markdown excessif." — change it to encourage structured markdown now that we render it properly.

Replace the last two lines of the prompt format string:
```python
# Old:
# N'utilise PAS de markdown excessif. Reste naturel et conversationnel.

# New:
"""Tu peux utiliser du markdown (gras, listes, titres) pour structurer tes reponses. Reste concis et professionnel."""
```

**Step 2: Commit**

```bash
git add backend/chat/prompts.py
git commit -m "feat: update system prompt to allow markdown formatting"
```

---

## Task 9: Manual integration test

**Step 1: Start the backend**

Run: `cd backend && python manage.py runserver`

**Step 2: Start the frontend**

Run: `cd frontend && npm run dev`

**Step 3: Test in browser**

1. Open the chat
2. Send: "Nouveau contact : Thomas Durand, thomas@gmail.com. N'oublie pas de le rappeler vendredi."
3. Verify:
   - Text streams in progressively (word by word)
   - Tool call cards appear inline with spinner during execution
   - Tool cards show green check when completed
   - Text after tool calls renders correctly
   - Markdown formatting works (if the AI uses it)
4. Refresh the page — verify history loads correctly with parts
5. Send: "Donne-moi un résumé" — verify dashboard_summary tool works

**Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete chat streaming with markdown and inline tool cards"
```

---

## File Changes Summary

| # | File | Action |
|---|------|--------|
| 1 | `frontend/package.json` | Add react-markdown, remark-gfm, @tailwindcss/typography |
| 2 | `frontend/app/globals.css` | Add `@plugin "@tailwindcss/typography"` |
| 3 | `backend/chat/views.py` | Add async `stream_message` view with SSE |
| 4 | `backend/chat/urls.py` | Add `stream/` path |
| 5 | `frontend/lib/api.ts` | Add `streamChat()` SSE function |
| 6 | `frontend/components/chat/MarkdownContent.tsx` | New — react-markdown wrapper |
| 7 | `frontend/components/chat/InlineToolCard.tsx` | New — inline tool call card |
| 8 | `frontend/components/chat/ChatMessage.tsx` | Refactor to parts-based rendering |
| 9 | `frontend/components/chat/ChatWindow.tsx` | Refactor to use streaming |
| 10 | `backend/chat/prompts.py` | Allow markdown in AI responses |
