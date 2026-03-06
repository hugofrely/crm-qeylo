# Quick Navigation Links & Task Detail Page — Design

## Problem

The CRM lacks quick navigation between related entities. Users can't easily jump from a task to its linked contact, from a deal to its contact, or from a contact to its deals/tasks. Tasks also lack a detail page.

## Solution

### 1. Reusable `EntityLink` Component

Create `components/shared/EntityLink.tsx`:
- Props: `type` ("contact" | "deal" | "task"), `id` (string), `name` (string)
- Renders: clickable name (Next.js Link) + ExternalLink icon (lucide-react)
- Routes: `/contacts/{id}`, `/deals/{id}`, `/tasks/{id}`
- Style: text hover underline + small icon, consistent with existing UI

### 2. Task Detail Page `/tasks/{id}`

Full page with these sections:

**Header:**
- Task description (editable inline)
- Priority badge (high/normal/low), status badge (done/todo)
- Due date, assigned members
- Actions: mark as done, edit (opens TaskDialog), delete

**Contact Section** (if contact exists):
- Card: name, email, phone, company, job title, segment (hot/warm/cold)
- EntityLink to `/contacts/{id}`

**Deal Section** (if deal exists):
- Card: deal name, amount, pipeline stage, probability, expected close date
- EntityLink to `/deals/{id}`

**Contact Notes** (if contact exists):
- Reuses ContactNotes logic

**Contact Timeline** (if contact exists):
- Reuses ContactTimeline logic (recent activities)

### 3. EntityLink Integration Points

| Component | Link to Add |
|---|---|
| `TaskList` | contact -> `/contacts/{id}`, deal -> `/deals/{id}` |
| `ContactTasks` | task -> `/tasks/{id}` |
| `ContactDeals` | deal -> `/deals/{id}` (fix existing bug: currently links to `/deals`) |
| `DealCard` | contact -> `/contacts/{id}` |
| Deal Detail page | contact -> `/contacts/{id}`, tasks -> `/tasks/{id}` |

### 4. Backend

- Verify `GET /tasks/{id}/` endpoint exists (retrieve single task)
- Ensure serializers return `contact_id`, `contact_name`, `deal_id`, `deal_name`
- No model changes needed — relationships already exist

## Approach

Approach A: Reusable `EntityLink` component. Single component for all cross-entity links, ensuring visual consistency and easy maintenance.

## Technical Notes

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, lucide-react
- Backend: Django 5, DRF
- Existing patterns: ContactTable row click -> `/contacts/{id}`, DealCard click -> `/deals/{id}`
