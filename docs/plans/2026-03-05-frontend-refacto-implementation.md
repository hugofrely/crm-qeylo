# Frontend Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the frontend into `types/`, `services/`, `hooks/` directories, extract inline types, centralize API calls, create data-fetching hooks, and decompose large monolithic files into smaller components.

**Architecture:** Progressive refactoring by layer — first create the infrastructure (types → services → hooks), then decompose large files. No behavior changes, pure structural refactoring.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Shadcn/UI, @dnd-kit, @xyflow/react, Tiptap

---

## Phase 1: Types Infrastructure

### Task 1: Create `types/common.ts`

**Files:**
- Create: `frontend/types/common.ts`

**Step 1: Create the shared types file**

```typescript
// frontend/types/common.ts

export interface PaginatedResponse<T> {
  count: number
  results: T[]
}

export interface ApiError {
  detail?: string
  [key: string]: unknown
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `types/common.ts`

**Step 3: Commit**

```bash
git add frontend/types/common.ts
git commit -m "refactor: add types/common.ts with shared type definitions"
```

---

### Task 2: Create `types/contacts.ts`

**Files:**
- Create: `frontend/types/contacts.ts`

**Step 1: Create the contacts types file**

Extract all contact-related types from `contacts/[id]/page.tsx` (lines 60-166), `ContactTable.tsx`, `DealDialog.tsx`, and `settings/organization/page.tsx`:

```typescript
// frontend/types/contacts.ts

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  source: string
  tags: string[]
  notes: string
  job_title: string
  linkedin_url: string
  website: string
  address: string
  industry: string
  lead_score: string
  estimated_budget: string | null
  identified_needs: string
  decision_role: string
  preferred_channel: string
  timezone: string
  language: string
  interests: string[]
  birthday: string | null
  categories: ContactCategory[]
  custom_fields: Record<string, unknown>
  city: string
  postal_code: string
  country: string
  state: string
  secondary_email: string
  secondary_phone: string
  mobile_phone: string
  twitter_url: string
  siret: string
  ai_summary: string
  ai_summary_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface ContactCategory {
  id: string
  name: string
  color: string
  icon: string
  order: number
  is_default: boolean
  contact_count?: number
  created_at?: string
}

export interface CustomFieldDefinition {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
  order: number
  section: string
  created_at?: string
}

export interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  subject: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

/** Lightweight contact for autocomplete dropdowns */
export interface ContactSearchResult {
  id: string
  first_name: string
  last_name: string
  company?: string
  email?: string
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/contacts.ts
git commit -m "refactor: add types/contacts.ts with contact type definitions"
```

---

### Task 3: Create `types/deals.ts`

**Files:**
- Create: `frontend/types/deals.ts`

**Step 1: Create the deals types file**

Extract from `KanbanBoard.tsx`, `DealDialog.tsx`, `KanbanColumn.tsx`, `DealCard.tsx`:

```typescript
// frontend/types/deals.ts

export interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
  probability?: number | null
  expected_close?: string | null
  notes?: string
  created_at?: string
}

export interface Stage {
  id: string
  name: string
  order: number
  color: string
}

export interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/deals.ts
git commit -m "refactor: add types/deals.ts with deal type definitions"
```

---

### Task 4: Create `types/tasks.ts`

**Files:**
- Create: `frontend/types/tasks.ts`

**Step 1: Create the tasks types file**

Extract from `tasks/page.tsx`, `TaskList.tsx`, `TaskDialog.tsx`:

```typescript
// frontend/types/tasks.ts

export interface Task {
  id: string
  description: string
  due_date: string | null
  contact: string | null
  contact_name?: string
  deal: string | null
  deal_name?: string
  priority: string
  is_done: boolean
  created_at: string
}

export interface TasksResponse {
  count: number
  results: Task[]
}

export type TaskFilterTab = "all" | "todo" | "done"
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/tasks.ts
git commit -m "refactor: add types/tasks.ts with task type definitions"
```

---

### Task 5: Create `types/chat.ts`

**Files:**
- Create: `frontend/types/chat.ts`

**Step 1: Create the chat types file**

Extract from `lib/api.ts`, `ChatMessage.tsx`, `InlineToolCard.tsx`, `ActionCard.tsx`:

```typescript
// frontend/types/chat.ts

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
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/chat.ts
git commit -m "refactor: add types/chat.ts with chat type definitions"
```

---

### Task 6: Create `types/workflows.ts`

**Files:**
- Create: `frontend/types/workflows.ts`

**Step 1: Create the workflows types file**

Extract from `workflows/page.tsx`, `workflows/[id]/page.tsx`, `ExecutionHistory.tsx`:

```typescript
// frontend/types/workflows.ts

export interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string | null
  execution_count: number
  last_execution_at: string | null
  created_at: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  trigger_type: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

export interface WorkflowData {
  id: string
  name: string
  description: string
  is_active: boolean
  nodes: Array<{
    id: string
    node_type: string
    node_subtype: string
    config: Record<string, unknown>
    position_x: number
    position_y: number
  }>
  edges: Array<{
    id: string
    source_node: string
    target_node: string
    source_handle: string
    label: string
  }>
}

export interface ExecutionStep {
  id: string
  node_type: string
  node_subtype: string
  status: string
  output_data: Record<string, unknown>
  error: string
  started_at: string
  completed_at: string | null
}

export interface Execution {
  id: string
  workflow_name: string
  trigger_event: string
  trigger_data: Record<string, unknown>
  status: string
  started_at: string
  completed_at: string | null
  error: string
  steps: ExecutionStep[]
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/workflows.ts
git commit -m "refactor: add types/workflows.ts with workflow type definitions"
```

---

### Task 7: Create `types/organizations.ts`

**Files:**
- Create: `frontend/types/organizations.ts`

**Step 1: Create the organizations types file**

Extract from `settings/organization/page.tsx`:

```typescript
// frontend/types/organizations.ts

export interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
}

export interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

export interface MembersResponse {
  members: Member[]
  invitations: PendingInvitation[]
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/organizations.ts
git commit -m "refactor: add types/organizations.ts with org type definitions"
```

---

### Task 8: Create `types/activities.ts`

**Files:**
- Create: `frontend/types/activities.ts`

**Step 1: Create the activities types file**

Extract from `ActivityDialog.tsx`:

```typescript
// frontend/types/activities.ts

export type ActivityEntryType = "call" | "email_sent" | "email_received" | "meeting" | "custom"

export interface CallFields {
  direction: string
  duration_minutes: string
  outcome: string
  phone_number: string
  notes: string
}

export interface EmailSentFields {
  subject: string
  recipients: string
  body: string
}

export interface EmailReceivedFields {
  subject: string
  sender: string
  body: string
}

export interface MeetingFields {
  title: string
  scheduled_at: string
  duration_minutes: string
  location: string
  participants: string
  notes: string
}

export interface CustomActivityFields {
  custom_type_label: string
  description: string
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/activities.ts
git commit -m "refactor: add types/activities.ts with activity type definitions"
```

---

### Task 9: Create `types/notifications.ts`, `types/emails.ts`, `types/dashboard.ts`, `types/search.ts`

**Files:**
- Create: `frontend/types/notifications.ts`
- Create: `frontend/types/emails.ts`
- Create: `frontend/types/dashboard.ts`
- Create: `frontend/types/search.ts`

**Step 1: Create remaining types files**

```typescript
// frontend/types/notifications.ts
export interface Notification {
  id: number
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface UnreadCountResponse {
  count: number
}
```

```typescript
// frontend/types/emails.ts
export interface EmailAccount {
  id: string
  provider: "gmail" | "outlook"
  email_address: string
  is_active: boolean
}
```

```typescript
// frontend/types/dashboard.ts
export interface DealsByStage {
  stage_name: string
  stage_color: string
  count: number
  total_amount: number
}

export interface DashboardStats {
  revenue_this_month: number
  total_pipeline: number
  deals_by_stage: DealsByStage[]
  upcoming_tasks: number
  active_deals_count: number
}
```

```typescript
// frontend/types/search.ts
export interface ContactSearchResult {
  id: string
  first_name: string
  last_name: string
  company: string
  email: string
}

export interface DealSearchResult {
  id: string
  name: string
  amount: string
  stage_name: string
  contact_name: string
}

export interface TaskSearchResult {
  id: string
  description: string
  priority: string
  due_date: string
  is_done: boolean
  contact_name: string
}

export interface SearchResults {
  contacts: ContactSearchResult[]
  deals: DealSearchResult[]
  tasks: TaskSearchResult[]
}
```

**Note:** Remove the `ContactSearchResult` from `types/contacts.ts` if it was added there — keep search types in `types/search.ts`.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/types/notifications.ts frontend/types/emails.ts frontend/types/dashboard.ts frontend/types/search.ts
git commit -m "refactor: add remaining type files (notifications, emails, dashboard, search)"
```

---

### Task 10: Create `types/auth.ts` and `types/index.ts` barrel export

**Files:**
- Create: `frontend/types/auth.ts`
- Create: `frontend/types/index.ts`

**Step 1: Create auth types (extract from lib/auth.tsx)**

```typescript
// frontend/types/auth.ts
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_notifications: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
  }) => Promise<void>
  logout: () => void
}
```

**Step 2: Create barrel export**

```typescript
// frontend/types/index.ts
export * from "./common"
export * from "./auth"
export * from "./contacts"
export * from "./deals"
export * from "./tasks"
export * from "./chat"
export * from "./workflows"
export * from "./organizations"
export * from "./activities"
export * from "./notifications"
export * from "./emails"
export * from "./dashboard"
export * from "./search"
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add frontend/types/auth.ts frontend/types/index.ts
git commit -m "refactor: add types/auth.ts and types/index.ts barrel export"
```

---

## Phase 2: Services Infrastructure

### Task 11: Slim down `lib/api.ts` and create `services/contacts.ts`

**Files:**
- Modify: `frontend/lib/api.ts` — remove chat-specific functions and types (SSECallbacks, ApiMessage, Conversation, streamChat, fetchConversations, createConversation, deleteConversation, renameConversation, fetchConversationMessages)
- Create: `frontend/services/contacts.ts`

**Step 1: Create contacts service**

```typescript
// frontend/services/contacts.ts
import { apiFetch } from "@/lib/api"
import type { Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, ContactSearchResult } from "@/types"
import type { Task } from "@/types"
import type { Deal } from "@/types"
import type { Stage } from "@/types"

export async function fetchContact(id: string): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/`)
}

export async function updateContact(id: string, data: Record<string, unknown>): Promise<Contact> {
  return apiFetch<Contact>(`/contacts/${id}/`, { method: "PATCH", json: data })
}

export async function deleteContact(id: string): Promise<void> {
  await apiFetch(`/contacts/${id}/`, { method: "DELETE" })
}

export async function fetchContacts(): Promise<{ count: number; results: Contact[] }> {
  return apiFetch(`/contacts/`)
}

export async function fetchContactCategories(): Promise<ContactCategory[]> {
  return apiFetch<ContactCategory[]>(`/contacts/categories/`)
}

export async function createContactCategory(data: { name: string; color: string }): Promise<ContactCategory> {
  return apiFetch<ContactCategory>(`/contacts/categories/`, { method: "POST", json: data })
}

export async function updateContactCategory(id: string, data: Partial<ContactCategory>): Promise<ContactCategory> {
  return apiFetch<ContactCategory>(`/contacts/categories/${id}/`, { method: "PATCH", json: data })
}

export async function deleteContactCategory(id: string): Promise<void> {
  await apiFetch(`/contacts/categories/${id}/`, { method: "DELETE" })
}

export async function fetchCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  return apiFetch<CustomFieldDefinition[]>(`/contacts/custom-fields/`)
}

export async function createCustomFieldDefinition(data: Record<string, unknown>): Promise<CustomFieldDefinition> {
  return apiFetch<CustomFieldDefinition>(`/contacts/custom-fields/`, { method: "POST", json: data })
}

export async function updateCustomFieldDefinition(id: string, data: Record<string, unknown>): Promise<CustomFieldDefinition> {
  return apiFetch<CustomFieldDefinition>(`/contacts/custom-fields/${id}/`, { method: "PATCH", json: data })
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  await apiFetch(`/contacts/custom-fields/${id}/`, { method: "DELETE" })
}

export async function searchContacts(query: string): Promise<ContactSearchResult[]> {
  return apiFetch<ContactSearchResult[]>(`/contacts/search/?q=${encodeURIComponent(query)}`)
}

export async function fetchContactTimeline(contactId: string, type: "interactions" | "journal"): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/timeline/?contact=${contactId}&type=${type}`)
}

export async function fetchContactTasks(contactId: string): Promise<Task[]> {
  const res = await apiFetch<{ results: Task[] }>(`/tasks/?contact=${contactId}`)
  return res.results ?? res as unknown as Task[]
}

export async function fetchContactDeals(contactId: string): Promise<Deal[]> {
  const res = await apiFetch<Deal[]>(`/deals/?contact=${contactId}`)
  return res
}

export async function checkEmailAccount(): Promise<boolean> {
  try {
    const accounts = await apiFetch<Array<{ id: string }>>(`/email/accounts/`)
    return accounts.length > 0
  } catch {
    return false
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/contacts.ts
git commit -m "refactor: add services/contacts.ts with all contact API functions"
```

---

### Task 12: Create `services/deals.ts`

**Files:**
- Create: `frontend/services/deals.ts`

**Step 1: Create deals service**

```typescript
// frontend/services/deals.ts
import { apiFetch } from "@/lib/api"
import type { Deal, PipelineStage, Stage } from "@/types"

export async function fetchPipeline(): Promise<PipelineStage[]> {
  return apiFetch<PipelineStage[]>(`/deals/pipeline/`)
}

export async function createDeal(data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/`, { method: "POST", json: data })
}

export async function updateDeal(id: string, data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/${id}/`, { method: "PATCH", json: data })
}

export async function deleteDeal(id: string): Promise<void> {
  await apiFetch(`/deals/${id}/`, { method: "DELETE" })
}

export async function fetchPipelineStages(): Promise<Stage[]> {
  return apiFetch<Stage[]>(`/pipeline-stages/`)
}

export async function createPipelineStage(data: { name: string; color: string; order: number }): Promise<Stage> {
  return apiFetch<Stage>(`/pipeline-stages/`, { method: "POST", json: data })
}

export async function updatePipelineStage(id: string | number, data: Partial<Stage>): Promise<Stage> {
  return apiFetch<Stage>(`/pipeline-stages/${id}/`, { method: "PATCH", json: data })
}

export async function deletePipelineStage(id: string | number, migrateTo?: string | number): Promise<void> {
  const url = migrateTo
    ? `/pipeline-stages/${id}/?migrate_to=${migrateTo}`
    : `/pipeline-stages/${id}/`
  await apiFetch(url, { method: "DELETE" })
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/deals.ts
git commit -m "refactor: add services/deals.ts with deal and pipeline API functions"
```

---

### Task 13: Create `services/tasks.ts`

**Files:**
- Create: `frontend/services/tasks.ts`

**Step 1: Create tasks service**

```typescript
// frontend/services/tasks.ts
import { apiFetch } from "@/lib/api"
import type { Task, TasksResponse } from "@/types"

export async function fetchTasks(): Promise<TasksResponse> {
  return apiFetch<TasksResponse>(`/tasks/`)
}

export async function createTask(data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/`, { method: "POST", json: data })
}

export async function updateTask(id: string, data: Record<string, unknown>): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}/`, { method: "PATCH", json: data })
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}/`, { method: "DELETE" })
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/tasks.ts
git commit -m "refactor: add services/tasks.ts with task API functions"
```

---

### Task 14: Create `services/chat.ts`

**Files:**
- Create: `frontend/services/chat.ts`
- Modify: `frontend/lib/api.ts` — remove streamChat, fetchConversations, createConversation, deleteConversation, renameConversation, fetchConversationMessages, SSECallbacks, ApiMessage, Conversation types

**Step 1: Create chat service**

Move the chat functions from `lib/api.ts` to `services/chat.ts`. The functions use raw `fetch` (not `apiFetch`) for SSE streaming, so copy the implementation as-is:

```typescript
// frontend/services/chat.ts
import { apiFetch } from "@/lib/api"
import type { Conversation, ApiMessage, SSECallbacks } from "@/types"
import Cookies from "js-cookie"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export async function streamChat(
  message: string,
  callbacks: SSECallbacks,
  conversationId?: string
): Promise<void> {
  // Copy the exact implementation from lib/api.ts streamChat function
  const token = Cookies.get("access_token")
  const body: Record<string, unknown> = { message }
  if (conversationId) body.conversation_id = conversationId

  const resp = await fetch(`${API}/chat/stream/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!resp.ok || !resp.body) {
    callbacks.onError("Erreur serveur")
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === "[DONE]") continue

      try {
        const evt = JSON.parse(raw)
        switch (evt.type) {
          case "text_delta":
            callbacks.onTextDelta(evt.content)
            break
          case "tool_call_start":
            callbacks.onToolCallStart(evt)
            break
          case "tool_result":
            callbacks.onToolResult(evt)
            break
          case "done":
            callbacks.onDone(evt)
            break
          case "error":
            callbacks.onError(evt.message)
            break
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
}

export async function fetchConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>(`/chat/conversations/`)
}

export async function createConversation(): Promise<Conversation> {
  return apiFetch<Conversation>(`/chat/conversations/`, { method: "POST" })
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/chat/conversations/${id}/`, { method: "DELETE" })
}

export async function renameConversation(id: string, title: string): Promise<void> {
  await apiFetch(`/chat/conversations/${id}/`, { method: "PATCH", json: { title } })
}

export async function fetchConversationMessages(conversationId: string): Promise<ApiMessage[]> {
  return apiFetch<ApiMessage[]>(`/chat/conversations/${conversationId}/messages/`)
}
```

**Step 2: Remove chat functions and types from `lib/api.ts`**

Remove from `lib/api.ts`:
- The `SSECallbacks`, `ApiMessage`, `Conversation` interfaces
- The `streamChat`, `fetchConversations`, `createConversation`, `deleteConversation`, `renameConversation`, `fetchConversationMessages` functions
- The `js-cookie` import can stay (still used by `apiFetch`)

Keep in `lib/api.ts` only:
- `apiFetch<T>()` (generic fetch wrapper)
- `refreshToken()` (internal)
- `setTokens()`, `clearTokens()`
- `apiUploadImage()`
- `FetchOptions` interface

**Step 3: Update all imports in chat components**

Update these files to import from `@/services/chat` and `@/types` instead of `@/lib/api`:
- `frontend/components/chat/ChatWindow.tsx` — change `import { fetchConversations, createConversation, streamChat, fetchConversationMessages, Conversation, ApiMessage } from "@/lib/api"` to `import { fetchConversations, createConversation, streamChat, fetchConversationMessages } from "@/services/chat"` and `import type { Conversation, ApiMessage } from "@/types"`
- `frontend/components/chat/ConversationSidebar.tsx` — change `import { renameConversation, deleteConversation, Conversation } from "@/lib/api"` to `import { renameConversation, deleteConversation } from "@/services/chat"` and `import type { Conversation } from "@/types"`
- `frontend/components/chat/ChatMessage.tsx` — imports `Message`, `MessagePart`, `ToolCallPart` types: these are defined locally in ChatMessage.tsx, update to import from `@/types`

**Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 5: Commit**

```bash
git add frontend/services/chat.ts frontend/lib/api.ts frontend/components/chat/ChatWindow.tsx frontend/components/chat/ConversationSidebar.tsx frontend/components/chat/ChatMessage.tsx
git commit -m "refactor: move chat API functions to services/chat.ts, slim lib/api.ts"
```

---

### Task 15: Create `services/workflows.ts`

**Files:**
- Create: `frontend/services/workflows.ts`

**Step 1: Create workflows service**

```typescript
// frontend/services/workflows.ts
import { apiFetch } from "@/lib/api"
import type { Workflow, WorkflowTemplate, WorkflowData, Execution } from "@/types"

export async function fetchWorkflows(): Promise<Workflow[]> {
  return apiFetch<Workflow[]>(`/workflows/`)
}

export async function fetchWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  return apiFetch<WorkflowTemplate[]>(`/workflows/templates/`)
}

export async function createWorkflow(data: Record<string, unknown>): Promise<Workflow> {
  return apiFetch<Workflow>(`/workflows/`, { method: "POST", json: data })
}

export async function fetchWorkflow(id: string): Promise<WorkflowData> {
  return apiFetch<WorkflowData>(`/workflows/${id}/`)
}

export async function saveWorkflow(id: string, data: Record<string, unknown>): Promise<WorkflowData> {
  return apiFetch<WorkflowData>(`/workflows/${id}/`, { method: "PUT", json: data })
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiFetch(`/workflows/${id}/`, { method: "DELETE" })
}

export async function toggleWorkflow(id: string): Promise<{ is_active: boolean }> {
  return apiFetch<{ is_active: boolean }>(`/workflows/${id}/toggle/`, { method: "POST" })
}

export async function fetchWorkflowExecutions(workflowId: string): Promise<Execution[]> {
  return apiFetch<Execution[]>(`/workflows/${workflowId}/executions/`)
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/workflows.ts
git commit -m "refactor: add services/workflows.ts with workflow API functions"
```

---

### Task 16: Create `services/organizations.ts`

**Files:**
- Create: `frontend/services/organizations.ts`

**Step 1: Create organizations service**

```typescript
// frontend/services/organizations.ts
import { apiFetch } from "@/lib/api"
import type { MembersResponse } from "@/types"

export async function fetchOrganizations(): Promise<Array<{ id: string; name: string }>> {
  return apiFetch(`/organizations/`)
}

export async function fetchMembers(orgId: string): Promise<MembersResponse> {
  return apiFetch<MembersResponse>(`/organizations/${orgId}/members/`)
}

export async function inviteMember(orgId: string, data: { email: string; role: string }): Promise<void> {
  await apiFetch(`/organizations/${orgId}/invite/`, { method: "POST", json: data })
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  await apiFetch(`/organizations/${orgId}/members/${userId}/remove/`, { method: "DELETE" })
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/organizations.ts
git commit -m "refactor: add services/organizations.ts with org API functions"
```

---

### Task 17: Create `services/activities.ts`, `services/notifications.ts`, `services/emails.ts`, `services/notes.ts`, `services/search.ts`, `services/dashboard.ts`

**Files:**
- Create: `frontend/services/activities.ts`
- Create: `frontend/services/notifications.ts`
- Create: `frontend/services/emails.ts`
- Create: `frontend/services/notes.ts`
- Create: `frontend/services/search.ts`
- Create: `frontend/services/dashboard.ts`

**Step 1: Create remaining services**

```typescript
// frontend/services/activities.ts
import { apiFetch } from "@/lib/api"

export async function createActivity(data: Record<string, unknown>): Promise<void> {
  await apiFetch(`/activities/`, { method: "POST", json: data })
}
```

```typescript
// frontend/services/notifications.ts
import { apiFetch } from "@/lib/api"
import type { Notification, UnreadCountResponse } from "@/types"

export async function fetchNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>(`/notifications/`)
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return apiFetch<UnreadCountResponse>(`/notifications/unread-count/`)
}

export async function markAsRead(ids: number[]): Promise<void> {
  await apiFetch(`/notifications/read/`, { method: "POST", json: { ids } })
}

export async function markAllAsRead(): Promise<void> {
  await apiFetch(`/notifications/read-all/`, { method: "POST" })
}
```

```typescript
// frontend/services/emails.ts
import { apiFetch } from "@/lib/api"
import type { EmailAccount } from "@/types"

export async function fetchEmailAccounts(): Promise<EmailAccount[]> {
  return apiFetch<EmailAccount[]>(`/email/accounts/`)
}

export async function sendEmail(data: {
  contact_id: string
  subject: string
  body_html: string
  provider?: string
}): Promise<void> {
  await apiFetch(`/email/send/`, { method: "POST", json: data })
}
```

```typescript
// frontend/services/notes.ts
import { apiFetch } from "@/lib/api"

export async function createNote(data: { contact: string; content: string }): Promise<void> {
  await apiFetch(`/notes/`, { method: "POST", json: data })
}

export async function updateNote(id: number, data: { content: string }): Promise<void> {
  await apiFetch(`/notes/${id}/`, { method: "PATCH", json: data })
}

export async function deleteNote(id: number): Promise<void> {
  await apiFetch(`/notes/${id}/`, { method: "DELETE" })
}
```

```typescript
// frontend/services/search.ts
import { apiFetch } from "@/lib/api"
import type { SearchResults } from "@/types"

export async function globalSearch(query: string): Promise<SearchResults> {
  return apiFetch<SearchResults>(`/search/?q=${encodeURIComponent(query)}`)
}
```

```typescript
// frontend/services/dashboard.ts
import { apiFetch } from "@/lib/api"
import type { DashboardStats } from "@/types"

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(`/dashboard/stats/`)
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/services/
git commit -m "refactor: add remaining service files (activities, notifications, emails, notes, search, dashboard)"
```

---

## Phase 3: Update All Components to Use Types & Services

### Task 18: Update contact detail page imports

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Replace inline type definitions with imports**

At the top of the file, replace all inline interface definitions (Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, Task, Deal, PipelineStage) with:

```typescript
import type { Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, Task, Deal, Stage as PipelineStage } from "@/types"
```

Remove the inline interface blocks (approximately lines 60-166 in the original file).

**Step 2: Replace direct `apiFetch` calls with service imports**

Replace `import { apiFetch } from "@/lib/api"` with:

```typescript
import {
  fetchContact, updateContact, deleteContact,
  fetchContactCategories, fetchCustomFieldDefinitions,
  fetchContactTimeline, fetchContactTasks, fetchContactDeals,
  checkEmailAccount
} from "@/services/contacts"
import { fetchPipelineStages } from "@/services/deals"
import { createNote, updateNote, deleteNote } from "@/services/notes"
import { updateTask } from "@/services/tasks"
```

Then update each `apiFetch` call site to use the corresponding service function. For example:
- `apiFetch(`/contacts/${id}/`)` → `fetchContact(id)`
- `apiFetch(`/contacts/${id}/`, { method: "PATCH", json: ... })` → `updateContact(id, data)`
- etc.

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "refactor: update contact detail page to use types/ and services/"
```

---

### Task 19: Update deals components imports

**Files:**
- Modify: `frontend/components/deals/KanbanBoard.tsx`
- Modify: `frontend/components/deals/KanbanColumn.tsx`
- Modify: `frontend/components/deals/DealCard.tsx`
- Modify: `frontend/components/deals/DealDialog.tsx`
- Modify: `frontend/app/(app)/deals/page.tsx`

**Step 1: Update each file**

For each file, replace inline type definitions with `import type { Deal, Stage, PipelineStage } from "@/types"` and replace `apiFetch` calls with service imports from `@/services/deals` and `@/services/contacts` (for contact search in DealDialog).

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/components/deals/ frontend/app/\(app\)/deals/
git commit -m "refactor: update deals components to use types/ and services/"
```

---

### Task 20: Update tasks components imports

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`
- Modify: `frontend/components/tasks/TaskList.tsx`
- Modify: `frontend/components/tasks/TaskDialog.tsx`

**Step 1: Update each file**

Replace inline type definitions with imports from `@/types`. Replace `apiFetch` calls with imports from `@/services/tasks` and `@/services/contacts` (for contact search).

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/tasks/ frontend/components/tasks/
git commit -m "refactor: update tasks components to use types/ and services/"
```

---

### Task 21: Update chat components imports

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx`
- Modify: `frontend/components/chat/ChatMessage.tsx`
- Modify: `frontend/components/chat/ConversationSidebar.tsx`
- Modify: `frontend/components/chat/ActionCard.tsx`
- Modify: `frontend/components/chat/InlineToolCard.tsx`

**Step 1: Update each file**

Replace inline type definitions with imports from `@/types`. Replace `@/lib/api` function imports with `@/services/chat`. Keep type exports from `ChatMessage.tsx` if other components import them, but also re-export from `@/types`.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/components/chat/
git commit -m "refactor: update chat components to use types/ and services/"
```

---

### Task 22: Update workflow components imports

**Files:**
- Modify: `frontend/app/(app)/workflows/page.tsx`
- Modify: `frontend/app/(app)/workflows/[id]/page.tsx`
- Modify: `frontend/components/workflows/ExecutionHistory.tsx`
- Modify: `frontend/components/workflows/WorkflowBuilder.tsx`
- Modify: `frontend/components/workflows/NodeConfigPanel.tsx`

**Step 1: Update each file**

Replace inline type definitions with imports from `@/types`. Replace `apiFetch` calls with imports from `@/services/workflows`.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/workflows/ frontend/components/workflows/
git commit -m "refactor: update workflow components to use types/ and services/"
```

---

### Task 23: Update settings pages imports

**Files:**
- Modify: `frontend/app/(app)/settings/organization/page.tsx`
- Modify: `frontend/app/(app)/settings/pipeline/page.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx`

**Step 1: Update each file**

Replace inline type definitions with imports from `@/types`. Replace `apiFetch` calls with imports from `@/services/organizations`, `@/services/deals`, `@/services/contacts`.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/settings/
git commit -m "refactor: update settings pages to use types/ and services/"
```

---

### Task 24: Update remaining components imports

**Files:**
- Modify: `frontend/components/SearchHeader.tsx`
- Modify: `frontend/components/NotificationBell.tsx`
- Modify: `frontend/components/activities/ActivityDialog.tsx`
- Modify: `frontend/components/emails/ComposeEmailDialog.tsx`
- Modify: `frontend/components/contacts/ContactTable.tsx`
- Modify: `frontend/components/contacts/ImportCSVDialog.tsx`
- Modify: `frontend/components/dashboard/StatCard.tsx`
- Modify: `frontend/app/(app)/dashboard/page.tsx`
- Modify: `frontend/lib/auth.tsx`

**Step 1: Update each file**

- `SearchHeader.tsx`: replace inline types with `import type { SearchResults } from "@/types"`, replace `apiFetch` with `import { globalSearch } from "@/services/search"`
- `NotificationBell.tsx`: replace inline types with `import type { Notification, UnreadCountResponse } from "@/types"`, replace `apiFetch` with imports from `@/services/notifications`
- `ActivityDialog.tsx`: replace inline types with imports from `@/types`, replace `apiFetch` with `import { createActivity } from "@/services/activities"`
- `ComposeEmailDialog.tsx`: replace inline types with imports from `@/types`, replace `apiFetch` with imports from `@/services/emails`
- `ContactTable.tsx`: replace inline types with imports from `@/types`
- `ImportCSVDialog.tsx`: keep raw fetch (uses FormData/multipart, not JSON) — only replace types
- `dashboard/page.tsx`: replace inline types with imports from `@/types`, replace `apiFetch` with `import { fetchDashboardStats } from "@/services/dashboard"`
- `lib/auth.tsx`: replace inline `User` and `AuthContextType` with `import type { User, AuthContextType } from "@/types"`

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/components/SearchHeader.tsx frontend/components/NotificationBell.tsx frontend/components/activities/ frontend/components/emails/ frontend/components/contacts/ frontend/components/dashboard/ frontend/app/\(app\)/dashboard/ frontend/lib/auth.tsx
git commit -m "refactor: update remaining components to use types/ and services/"
```

---

## Phase 4: Hooks

### Task 25: Create `hooks/useContacts.ts`

**Files:**
- Create: `frontend/hooks/useContacts.ts`

**Step 1: Create the hook**

```typescript
// frontend/hooks/useContacts.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Contact, ContactCategory, CustomFieldDefinition } from "@/types"
import { fetchContact, fetchContactCategories, fetchCustomFieldDefinitions } from "@/services/contacts"

export function useContact(id: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchContact(id)
      setContact(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { contact, setContact, loading, error, refresh }
}

export function useContactCategories() {
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchContactCategories()
      setCategories(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { categories, setCategories, loading, refresh }
}

export function useCustomFieldDefinitions() {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchCustomFieldDefinitions()
      setDefinitions(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { definitions, setDefinitions, loading, refresh }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/hooks/useContacts.ts
git commit -m "refactor: add hooks/useContacts.ts with useContact, useContactCategories, useCustomFieldDefinitions"
```

---

### Task 26: Create `hooks/useDeals.ts`

**Files:**
- Create: `frontend/hooks/useDeals.ts`

**Step 1: Create the hook**

```typescript
// frontend/hooks/useDeals.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import type { PipelineStage, Stage } from "@/types"
import { fetchPipeline, fetchPipelineStages } from "@/services/deals"

export function usePipeline() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipeline()
      setPipeline(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { pipeline, setPipeline, loading, refresh }
}

export function usePipelineStages() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelineStages()
      setStages(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { stages, setStages, loading, refresh }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/hooks/useDeals.ts
git commit -m "refactor: add hooks/useDeals.ts with usePipeline, usePipelineStages"
```

---

### Task 27: Create `hooks/useTasks.ts`

**Files:**
- Create: `frontend/hooks/useTasks.ts`

**Step 1: Create the hook**

```typescript
// frontend/hooks/useTasks.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Task } from "@/types"
import { fetchTasks } from "@/services/tasks"

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchTasks()
      setTasks(data.results)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { tasks, setTasks, loading, refresh }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/hooks/useTasks.ts
git commit -m "refactor: add hooks/useTasks.ts with useTasks"
```

---

### Task 28: Create `hooks/useContactAutocomplete.ts`

**Files:**
- Create: `frontend/hooks/useContactAutocomplete.ts`

**Step 1: Create the hook**

This extracts the duplicated debounced contact search pattern from `DealDialog.tsx` and `TaskDialog.tsx`:

```typescript
// frontend/hooks/useContactAutocomplete.ts
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { ContactSearchResult } from "@/types"
import { searchContacts } from "@/services/contacts"

export function useContactAutocomplete() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContactSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchContacts(q)
        setResults(data)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const reset = useCallback(() => {
    setQuery("")
    setResults([])
    setOpen(false)
  }, [])

  return { query, results, searching, open, setOpen, search, reset, wrapperRef }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/hooks/useContactAutocomplete.ts
git commit -m "refactor: add hooks/useContactAutocomplete.ts - extract duplicated pattern from DealDialog/TaskDialog"
```

---

### Task 29: Create remaining hooks and integrate hooks into pages

**Files:**
- Create: `frontend/hooks/useNotifications.ts`
- Create: `frontend/hooks/useSearch.ts`

**Step 1: Create notification hook**

```typescript
// frontend/hooks/useNotifications.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Notification } from "@/types"
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from "@/services/notifications"

const POLL_INTERVAL = 30_000

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount()
      setUnreadCount(data.count)
    } catch {
      // silently fail
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const markRead = useCallback(async (id: number) => {
    await markAsRead([id])
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  // Poll unread count
  useEffect(() => {
    refreshUnreadCount()
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  return { notifications, unreadCount, loading, loadNotifications, markRead, markAllRead }
}
```

**Step 2: Create search hook**

```typescript
// frontend/hooks/useSearch.ts
"use client"

import { useState, useRef, useCallback } from "react"
import type { SearchResults } from "@/types"
import { globalSearch } from "@/services/search"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(q)
        setResults(data)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults(null)
  }, [])

  return { query, results, loading, open, setOpen, search, close }
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add frontend/hooks/useNotifications.ts frontend/hooks/useSearch.ts
git commit -m "refactor: add hooks/useNotifications.ts and hooks/useSearch.ts"
```

---

## Phase 5: Component Decomposition

### Task 30: Decompose `contacts/[id]/page.tsx` — Extract ContactHeader

**Files:**
- Create: `frontend/components/contacts/ContactHeader.tsx`
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create ContactHeader component**

Extract the header section (avatar, name, company, tags, edit/delete buttons, category badges) from the contact detail page into a standalone component. The component receives the contact data and edit/delete handlers as props.

```typescript
// frontend/components/contacts/ContactHeader.tsx
"use client"

import type { Contact, ContactCategory } from "@/types"
// Extract the JSX from the page that renders:
// - Back button
// - Avatar with initials
// - Name, company, job title
// - Category badges with toggle
// - Action buttons (edit, delete, email, activity)
// Props: contact, categories, onEdit, onDelete, onToggleCategory, onOpenActivity, onOpenEmail
```

**Step 2: Import and use in page**

Replace the inline header JSX in `contacts/[id]/page.tsx` with `<ContactHeader ... />`.

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add frontend/components/contacts/ContactHeader.tsx frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "refactor: extract ContactHeader component from contact detail page"
```

---

### Task 31: Decompose `contacts/[id]/page.tsx` — Extract ContactInfo

**Files:**
- Create: `frontend/components/contacts/ContactInfo.tsx`
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create ContactInfo component**

Extract the left sidebar info section (email, phone, company, address, social links, qualification data, custom fields display/edit). This is the section that shows contact details and handles inline editing.

Props: `contact`, `editing`, `editForm`, `onEditFormChange`, `customFieldDefs`

**Step 2: Replace inline JSX in page with component**

**Step 3: Verify TypeScript compiles and commit**

```bash
git add frontend/components/contacts/ContactInfo.tsx frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "refactor: extract ContactInfo component from contact detail page"
```

---

### Task 32: Decompose `contacts/[id]/page.tsx` — Extract tab content components

**Files:**
- Create: `frontend/components/contacts/ContactTimeline.tsx`
- Create: `frontend/components/contacts/ContactNotes.tsx`
- Create: `frontend/components/contacts/ContactTasks.tsx`
- Create: `frontend/components/contacts/ContactDeals.tsx`
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Create ContactTimeline component**

Extract the activities tab content — the timeline list with ActivityMetadata sub-component.

Props: `entries: TimelineEntry[]`, `loading: boolean`

**Step 2: Create ContactNotes component**

Extract the notes tab — includes note creation form (RichTextEditor), note list with edit/delete.

Props: `notes`, `contactId`, `onNoteAdded`

**Step 3: Create ContactTasks component**

Extract the tasks tab — task list with toggle functionality.

Props: `tasks`, `contactId`, `onTaskToggle`, `onRefresh`

**Step 4: Create ContactDeals component**

Extract the deals tab — deal list with stage badges.

Props: `deals`, `stages`

**Step 5: Replace inline tab content in page with components**

The page should now be approximately 100-150 lines: imports, state setup, tab switching, and component assembly.

**Step 6: Verify TypeScript compiles and commit**

```bash
git add frontend/components/contacts/ContactTimeline.tsx frontend/components/contacts/ContactNotes.tsx frontend/components/contacts/ContactTasks.tsx frontend/components/contacts/ContactDeals.tsx frontend/app/\(app\)/contacts/\[id\]/page.tsx
git commit -m "refactor: extract tab content components from contact detail page"
```

---

### Task 33: Decompose `settings/organization/page.tsx`

**Files:**
- Create: `frontend/components/settings/MembersSection.tsx`
- Create: `frontend/components/settings/InvitationsSection.tsx`
- Create: `frontend/components/settings/CategoriesManager.tsx`
- Create: `frontend/components/settings/CustomFieldsManager.tsx`
- Create: `frontend/components/settings/PipelineStagesManager.tsx`
- Modify: `frontend/app/(app)/settings/organization/page.tsx`

**Step 1: Create MembersSection**

Extract the members list + invite dialog. Uses `@/services/organizations` for API calls.

Props: `orgId: string`

**Step 2: Create InvitationsSection**

Extract the pending invitations list.

Props: `invitations: PendingInvitation[]`, `onRefresh: () => void`

**Step 3: Create CategoriesManager**

Extract the categories CRUD section. Uses `@/services/contacts` for API calls.

Props: none (self-contained, fetches own data)

**Step 4: Create CustomFieldsManager**

Extract the custom fields CRUD section. Uses `@/services/contacts` for API calls.

Props: none (self-contained)

**Step 5: Create PipelineStagesManager**

Extract the pipeline stages CRUD section with reorder and delete-with-migration. Uses `@/services/deals` for API calls.

Props: none (self-contained)

**Step 6: Update organization page**

The page should become approximately 80-100 lines: just tab layout assembling the section components.

**Step 7: Verify TypeScript compiles and commit**

```bash
git add frontend/components/settings/ frontend/app/\(app\)/settings/organization/page.tsx
git commit -m "refactor: decompose organization settings into section components"
```

---

### Task 34: Decompose `NodeConfigPanel.tsx` into per-node-type forms

**Files:**
- Create: `frontend/components/workflows/NodeConfigForms/TriggerConfig.tsx`
- Create: `frontend/components/workflows/NodeConfigForms/ConditionConfig.tsx`
- Create: `frontend/components/workflows/NodeConfigForms/ActionConfig.tsx`
- Create: `frontend/components/workflows/NodeConfigForms/DelayConfig.tsx`
- Modify: `frontend/components/workflows/NodeConfigPanel.tsx`

**Step 1: Create per-node config components**

Each component receives `node` and `onUpdate(nodeId, data)` props and handles its own form fields.

- `TriggerConfig`: event selector + optional stage filter
- `ConditionConfig`: field, operator, value inputs
- `ActionConfig`: subtype selector with per-subtype fields (biggest — includes create_task, send_notification, create_note, move_deal, send_email, webhook)
- `DelayConfig`: duration_seconds input

Move the constants (TRIGGER_OPTIONS, ACTION_OPTIONS, OPERATOR_OPTIONS, TEMPLATE_VARIABLES) to remain in NodeConfigPanel or into a shared `workflow-constants.ts` file.

**Step 2: Update NodeConfigPanel**

The panel becomes a shell: header with node name/delete button, then renders the appropriate config form based on `node.data.node_type`.

Target: ~100-150 lines (down from 437).

**Step 3: Verify TypeScript compiles and commit**

```bash
git add frontend/components/workflows/NodeConfigForms/ frontend/components/workflows/NodeConfigPanel.tsx
git commit -m "refactor: decompose NodeConfigPanel into per-node-type config forms"
```

---

### Task 35: Extract ActivityDialog form logic

**Files:**
- Create: `frontend/components/activities/ActivityForm.tsx`
- Modify: `frontend/components/activities/ActivityDialog.tsx`

**Step 1: Create ActivityForm**

Extract the tab content (form fields per entry type) into a standalone form component. The dialog keeps only open/close logic and submit handler.

Props: `entryType`, `onEntryTypeChange`, `formData`, `onFormDataChange`

**Step 2: Update ActivityDialog**

Dialog becomes: title, ActivityForm, submit button. Target: ~150 lines (down from 481).

**Step 3: Verify TypeScript compiles and commit**

```bash
git add frontend/components/activities/ActivityForm.tsx frontend/components/activities/ActivityDialog.tsx
git commit -m "refactor: extract ActivityForm from ActivityDialog"
```

---

## Phase 6: Final Cleanup

### Task 36: Integrate hooks into components that can benefit

**Files:**
- Modify: `frontend/components/NotificationBell.tsx` — use `useNotifications()` hook
- Modify: `frontend/components/SearchHeader.tsx` — use `useSearch()` hook
- Modify: `frontend/components/deals/KanbanBoard.tsx` — use `usePipeline()` hook
- Modify: `frontend/app/(app)/tasks/page.tsx` — use `useTasks()` hook
- Modify: `frontend/components/deals/DealDialog.tsx` — use `useContactAutocomplete()` hook
- Modify: `frontend/components/tasks/TaskDialog.tsx` — use `useContactAutocomplete()` hook

**Step 1: Update each component**

For each component, replace the inline useState + useEffect data-fetching pattern with the corresponding hook. This reduces boilerplate in each component.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add frontend/components/NotificationBell.tsx frontend/components/SearchHeader.tsx frontend/components/deals/KanbanBoard.tsx frontend/app/\(app\)/tasks/page.tsx frontend/components/deals/DealDialog.tsx frontend/components/tasks/TaskDialog.tsx
git commit -m "refactor: integrate custom hooks into components (useNotifications, useSearch, usePipeline, useTasks, useContactAutocomplete)"
```

---

### Task 37: Final verification and cleanup

**Files:**
- All modified files

**Step 1: Full TypeScript check**

Run: `cd frontend && npx tsc --noEmit --pretty`
Expected: 0 errors

**Step 2: Verify dev server starts**

Run: `cd frontend && npm run dev` (check it starts without errors)

**Step 3: Check for unused imports**

Run: `cd frontend && npx eslint . --quiet 2>&1 | head -40`
Fix any unused import warnings.

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: final cleanup - fix unused imports and lint issues"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-10 | Create `types/` directory with all type definitions |
| 2 | 11-17 | Create `services/` directory with all API functions |
| 3 | 18-24 | Update all components to import from `types/` and `services/` |
| 4 | 25-29 | Create `hooks/` directory with data-fetching hooks |
| 5 | 30-35 | Decompose large files into smaller components |
| 6 | 36-37 | Integrate hooks and final cleanup |

**Total: 37 tasks across 6 phases**

**Key files affected:**
- `contacts/[id]/page.tsx`: 1815 → ~120 lines
- `settings/organization/page.tsx`: 1082 → ~100 lines
- `NodeConfigPanel.tsx`: 437 → ~120 lines
- `ActivityDialog.tsx`: 481 → ~150 lines
- `lib/api.ts`: 274 → ~80 lines (generic utility only)
