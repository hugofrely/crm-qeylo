# Frontend Refactoring Design

**Date:** 2026-03-05
**Scope:** Full frontend restructuring — types, services, hooks, component decomposition

## Problem

The frontend has grown organically with:
- Types defined inline in components (duplicated across files)
- No `hooks/` or `services/` directories
- Monolithic page files (contacts detail: 1815 lines, org settings: 1082 lines)
- Business logic mixed into presentation components
- `lib/api.ts` mixes generic utilities with domain-specific endpoints

## Approach

**Progressive refactoring by layer:**
1. Create infrastructure (`types/`, `services/`, `hooks/`) and migrate existing code
2. Decompose large files into smaller components

## Target Structure

```
frontend/
├── types/
│   ├── contacts.ts        # Contact, ContactCategory, CustomField...
│   ├── deals.ts           # Deal, Stage, PipelineStage...
│   ├── tasks.ts           # Task
│   ├── chat.ts            # Conversation, ApiMessage, SSECallbacks...
│   ├── workflows.ts       # Workflow, Node, Edge, Execution...
│   ├── organizations.ts   # Organization, Invitation, Member...
│   ├── activities.ts      # Activity, ActivityType...
│   ├── notifications.ts   # Notification
│   └── common.ts          # PaginatedResponse, ApiError, shared types
│
├── services/
│   ├── contacts.ts        # fetchContacts, fetchContact, createContact, updateContact...
│   ├── deals.ts           # fetchDeals, createDeal, updateDeal, moveDeal...
│   ├── tasks.ts           # fetchTasks, createTask, updateTask...
│   ├── chat.ts            # streamChat, fetchConversations, createConversation...
│   ├── workflows.ts       # fetchWorkflows, createWorkflow...
│   ├── organizations.ts   # fetchOrganization, updateOrg, inviteMember...
│   ├── activities.ts      # fetchActivities, createActivity...
│   ├── notifications.ts   # fetchNotifications, markAsRead...
│   ├── emails.ts          # sendEmail...
│   └── search.ts          # globalSearch...
│
├── hooks/
│   ├── useContacts.ts     # useContacts(), useContact(id)
│   ├── useDeals.ts        # useDeals(), useDeal(id)
│   ├── useTasks.ts        # useTasks()
│   ├── useChat.ts         # useChat(), useConversations()
│   ├── useWorkflows.ts    # useWorkflows()
│   ├── useOrganization.ts # useOrganization(), useMembers()
│   ├── useActivities.ts   # useActivities(contactId)
│   └── useNotifications.ts# useNotifications()
│
├── lib/
│   ├── api.ts             # apiFetch only (generic utility)
│   ├── auth.tsx           # AuthContext + useAuth (unchanged)
│   └── utils.ts           # cn() + shared helpers
│
├── components/
│   ├── contacts/
│   │   ├── ContactHeader.tsx       # Avatar, name, actions
│   │   ├── ContactInfo.tsx         # Contact info (email, phone, etc.)
│   │   ├── ContactTimeline.tsx     # Activity timeline
│   │   ├── ContactDeals.tsx        # Deals section
│   │   ├── ContactTasks.tsx        # Tasks section
│   │   ├── ContactNotes.tsx        # Notes section
│   │   ├── ContactEmails.tsx       # Emails section
│   │   ├── ContactCustomFields.tsx # Custom fields
│   │   ├── ContactTable.tsx        # (existing)
│   │   └── ImportCSVDialog.tsx     # (existing)
│   ├── settings/
│   │   ├── MembersSection.tsx      # Member management
│   │   ├── InvitationsSection.tsx  # Invitations
│   │   ├── OrganizationForm.tsx    # Org form
│   │   ├── CustomFieldsManager.tsx # Custom fields management
│   │   └── PipelineManager.tsx     # Pipeline config
│   ├── activities/
│   │   ├── ActivityDialog.tsx      # (reduced, logic extracted)
│   │   └── ActivityForm.tsx        # Activity form
│   ├── workflows/
│   │   ├── NodeConfigPanel.tsx     # (reduced)
│   │   └── NodeConfigForms/
│   │       ├── EmailNodeConfig.tsx
│   │       ├── DelayNodeConfig.tsx
│   │       ├── ConditionNodeConfig.tsx
│   │       └── WebhookNodeConfig.tsx
│   └── deals/
│       └── DealDialog.tsx          # (reduced, logic extracted)
```

## Design Decisions

### Types
- One file per domain in `types/`
- `common.ts` for shared types (PaginatedResponse, ApiError)
- Types are the single source of truth — components import from `types/`

### Services
- One file per domain in `services/`
- Each service imports `apiFetch` from `lib/api.ts`
- `lib/api.ts` keeps only: `apiFetch`, `refreshToken`, `setTokens`, `clearTokens`
- Chat streaming (`streamChat`) moves to `services/chat.ts`

### Hooks
- One file per domain in `hooks/`
- Each hook encapsulates: service call + useState (data, loading, error) + refresh function
- Pages and components consume hooks instead of calling services directly

### Component Decomposition

**contacts/[id]/page.tsx (1815 → ~100 lines)**
- Extract: ContactHeader, ContactInfo, ContactTimeline, ContactDeals, ContactTasks, ContactNotes, ContactEmails, ContactCustomFields
- Page becomes an assembler of sub-components

**settings/organization/page.tsx (1082 → ~100 lines)**
- Extract: MembersSection, InvitationsSection, OrganizationForm, CustomFieldsManager

**ActivityDialog.tsx (481 → ~200 lines)**
- Extract form logic into ActivityForm component
- Dialog handles open/close, form handles data

**NodeConfigPanel.tsx (436 → ~150 lines)**
- Extract per-node-type config forms into NodeConfigForms/

**DealDialog.tsx (375 → ~200 lines)**
- Extract form logic, service calls move to services/deals.ts

## Migration Rules

- No behavior changes — pure structural refactoring
- All existing imports must be updated
- Types must not be duplicated — single definition in types/
- Helper functions (formatDate, etc.) that are used in multiple places move to lib/utils.ts
- Helper functions used in a single component stay in that component
