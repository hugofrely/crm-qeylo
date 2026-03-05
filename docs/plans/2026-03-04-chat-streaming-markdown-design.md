# Chat Streaming, Markdown & Inline Tool Cards

**Date:** 2026-03-04
**Status:** Approved

## Summary

Add streaming responses (SSE), markdown rendering, and inline tool call cards to the CRM chat. The AI response streams token-by-token with tool calls appearing inline in the message flow in real-time.

## Current State

- No streaming: `agent.run_sync()` returns complete response
- No markdown: messages displayed as plain text with `whitespace-pre-wrap`
- Tool actions extracted after completion and rendered as cards below the message
- Backend: Django + Pydantic AI (Claude Sonnet 4), synchronous views
- Frontend: React, Tailwind CSS, plain `fetch` API calls

## Design Decisions

- **Transport:** SSE via `StreamingHttpResponse` (not WebSocket — unidirectional streaming doesn't need bidirectional)
- **Tool display:** Inline in the message flow (not separated below)
- **Markdown:** Full support (bold, italic, lists, headings, code blocks with syntax highlighting, links, tables)
- **Backend streaming:** Pydantic AI `run_stream()` (async)

## SSE Protocol

New endpoint: `POST /api/chat/stream/`
Response: `Content-Type: text/event-stream`

### Event Types

```
event: text_delta
data: {"content": "Je vais"}

event: tool_call_start
data: {"tool_name": "create_contact", "tool_call_id": "tc_1", "args": {"first_name": "Thomas"}}

event: tool_result
data: {"tool_call_id": "tc_1", "result": {"action": "contact_created", "id": "uuid", "name": "Thomas Durand"}}

event: error
data: {"message": "Une erreur est survenue"}

event: done
data: {"message_id": "uuid", "actions": [...]}
```

5 event types: `text_delta`, `tool_call_start`, `tool_result`, `error`, `done`.

## Backend Changes

### New async view: `stream_message`

- `POST /api/chat/stream/`
- Uses `agent.run_stream()` instead of `agent.run_sync()`
- Iterates over Pydantic AI stream, converts each event to SSE format
- Saves user message immediately, assistant message at end of stream
- Returns `StreamingHttpResponse(content_type='text/event-stream')`

### URL addition

```python
path("stream/", stream_message, name="chat-stream")
```

### Persistence

- User message saved before streaming begins
- Assistant message saved after stream completes (on `done` event)
- Actions extracted from stream and stored in `actions` JSON field as before

## Frontend Changes

### New Message Model

```typescript
type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; toolName: string; toolCallId: string; args: Record<string, any>; status: "running" | "completed" | "error"; result?: any }

interface Message {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
  isStreaming?: boolean
  created_at: string
}
```

Messages are now a list of interleaved `parts` instead of a single `content` string. This allows tool calls to appear inline between text segments.

### History Compatibility

Messages from `GET /chat/history/` (format `{ content, actions }`) are converted to parts:
```typescript
parts: [
  { type: "text", content: message.content },
  ...message.actions.map(a => ({ type: "tool_call", ... }))
]
```

### New Hook: `useStreamingChat`

Manages SSE connection, parses events, updates message parts progressively:
- On `text_delta`: append to current text part (or create new one)
- On `tool_call_start`: add new tool_call part with `status: "running"`
- On `tool_result`: update matching tool_call part with result and `status: "completed"`
- On `done`: mark message as not streaming, update with final message_id

### New Components

- **`MarkdownContent.tsx`** — Wrapper around `react-markdown` + `remark-gfm` + `rehype-highlight`. Applied only to assistant text parts.
- **`InlineToolCard.tsx`** — Compact card for tool calls inline in the flow:
  - Running: spinner icon, tool name, args summary, pulsing border
  - Completed: green check, result display (reuses ActionCard logic)
  - Error: red error icon, error message

### Modified Components

- **`ChatMessage.tsx`** — Iterates over `parts[]` instead of rendering `content` directly. Renders `MarkdownContent` for text parts and `InlineToolCard` for tool_call parts.
- **`ChatWindow.tsx`** — Uses `useStreamingChat` hook instead of direct fetch calls.

### Markdown Rendering

- Library: `react-markdown` + `remark-gfm` + `rehype-highlight`
- Styling: `@tailwindcss/typography` `prose` class
- Applied only to assistant messages (user messages stay plain text)
- Streaming cursor: blinking `|` at end of text during streaming

### Dependencies to Add

```
react-markdown
remark-gfm
rehype-highlight
@tailwindcss/typography
highlight.js (peer dep of rehype-highlight)
```

## File Changes Summary

| File | Change |
|------|--------|
| `backend/chat/views.py` | Add `stream_message` async view |
| `backend/chat/urls.py` | Add `stream/` path |
| `frontend/lib/api.ts` | Add SSE streaming function |
| `frontend/components/chat/ChatWindow.tsx` | Use streaming hook |
| `frontend/components/chat/ChatMessage.tsx` | Render parts instead of content |
| `frontend/components/chat/MarkdownContent.tsx` | New — markdown renderer |
| `frontend/components/chat/InlineToolCard.tsx` | New — inline tool card |
| `frontend/hooks/useStreamingChat.ts` | New — SSE streaming hook |
| `frontend/package.json` | Add markdown/typography deps |
