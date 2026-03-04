# Activities / Interaction History — Design

## Context

The current `TimelineEntry` model supports basic event types (contact_created, deal_created, deal_moved, note_added, task_created, chat_action, contact_updated). Users need to log richer interactions: phone calls, emails, meetings, and custom activity types.

## Approach

Extend the existing `TimelineEntry` model with new entry types and rich per-type metadata. This avoids creating a separate model and leverages the existing timeline infrastructure (API, frontend display, AI summary integration).

## New Entry Types

Added to `TimelineEntry.entry_type`:

| Type | Description |
|------|-------------|
| `call` | Phone call (inbound or outbound) |
| `email_sent` | Email sent to contact |
| `email_received` | Email received from contact |
| `meeting` | Meeting / appointment |
| `custom` | User-defined activity type |

## Model Changes

### New field on `TimelineEntry`

- `subject` — CharField(max_length=255, blank=True, null=True) — title/subject displayed in timeline without parsing metadata

### Metadata schemas per type

Stored in the existing `metadata` JSONField.

**call:**
```json
{
  "direction": "inbound|outbound",
  "duration_minutes": 15,
  "outcome": "answered|voicemail|no_answer|busy",
  "phone_number": "+33612345678"
}
```

**email_sent:**
```json
{
  "subject": "Follow-up meeting",
  "recipients": ["john@example.com"],
  "body_preview": "Hi John, ..."
}
```

**email_received:**
```json
{
  "subject": "Re: Follow-up meeting",
  "sender": "john@example.com",
  "body_preview": "Thanks for..."
}
```

**meeting:**
```json
{
  "title": "Product demo",
  "scheduled_at": "2026-03-10T14:00:00Z",
  "duration_minutes": 60,
  "location": "Zoom",
  "participants": ["John Doe", "Jane Smith"]
}
```

**custom:**
```json
{
  "custom_type_label": "Lunch",
  ... (any additional free-form fields)
}
```

## API

### New endpoint: `POST /api/activities/`

Creates an activity (TimelineEntry with activity types).

**Request body:**
```json
{
  "entry_type": "call",
  "contact": "uuid",
  "deal": "uuid (optional)",
  "subject": "Call with John",
  "content": "Discussed pricing options...",
  "metadata": {
    "direction": "outbound",
    "duration_minutes": 15,
    "outcome": "answered",
    "phone_number": "+33612345678"
  }
}
```

**Validation:** `ActivityCreateSerializer` validates metadata fields per entry_type:
- `call`: `direction` required, `outcome` required
- `email_sent`: `subject` in metadata required
- `email_received`: `subject` in metadata required
- `meeting`: `title` required, `scheduled_at` required
- `custom`: `custom_type_label` required

### Existing endpoints — unchanged

- `GET /api/timeline/` — already returns all TimelineEntry, will include new activity types
- `POST /api/notes/` — unchanged, for text notes only

## Frontend

### Activity logging dialog

Added to the contact detail page — "Log Activity" button next to the Timeline section title.

**Dialog structure:**
1. Type selector (tab/icon buttons): Call, Email Sent, Email Received, Meeting, Custom
2. Dynamic form per type with type-specific fields
3. Common fields: content/description (textarea)

**Form fields per type:**

| Type | Fields |
|------|--------|
| Call | Direction (radio: inbound/outbound), Duration (number), Outcome (select), Phone number (pre-filled), Notes |
| Email Sent | Subject (required), Recipients (pre-filled), Body/summary |
| Email Received | Subject (required), Sender (pre-filled), Body/summary |
| Meeting | Title (required), Date/time (datetime picker), Duration, Location, Participants, Notes |
| Custom | Type label (required, e.g. "Lunch", "Demo"), Description |

### Enriched timeline display

Activity entries in the timeline show metadata tags/badges:
- Call: direction badge, duration, outcome
- Email: subject line, recipient/sender
- Meeting: date/time, location, participants count
- Custom: custom type label badge

### Icon and color mapping (already partially in place)

| Type | Icon | Color |
|------|------|-------|
| call | Phone | purple |
| email_sent / email_received | Mail | orange |
| meeting | Calendar | blue |
| custom | Tag | gray |

## AI Summary Integration

The existing `generate_ai_summary()` already reads the last 20 timeline entries. New activity types will automatically be included. The `content` field + `subject` field provide enough context for the AI. No changes needed.

## Out of Scope

- Edit/delete activities (can be added later)
- Email/calendar integrations (Gmail, Outlook sync)
- Activities page (/activities route)
- Chat-based activity logging
- Activity reminders/follow-ups
