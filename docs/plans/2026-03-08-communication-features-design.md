# Communication Features Design

**Date**: 2026-03-08
**Status**: Approved
**Order of implementation**: Inbox → Sequences → Call Log → Calendar

---

## Feature 1: Unified Inbox

### Goal
Full bidirectional email sync — pull emails from Gmail/Outlook via APIs, store in DB, display a real inbox in the CRM.

### Architecture
- **Sync engine**: Celery polling via Gmail API (history.list + messages.get) and Microsoft Graph (/messages with delta query) every 2-5 min
- **Webhook option**: Gmail Push Notifications (Pub/Sub) and Microsoft Graph Subscriptions for near-realtime, with polling fallback
- **Threading**: Group by thread_id (native Gmail, In-Reply-To/References for Outlook)
- **Contact matching**: Auto-associate email ↔ CRM contact by email address (from/to/cc)

### Models

**Email**
- id (UUID), organization, email_account (FK → EmailAccount)
- provider_message_id, thread_id
- direction: INBOUND / OUTBOUND
- from_address, from_name
- to_addresses (JSON), cc_addresses (JSON), bcc_addresses (JSON)
- subject, body_html, body_text, snippet
- is_read, is_starred, labels (JSON)
- has_attachments, attachments_metadata (JSON)
- contact (FK nullable → Contact), deal (FK nullable → Deal)
- sent_at, synced_at, created_at, updated_at

**EmailThread**
- id (UUID), organization, provider_thread_id
- subject, last_message_at, message_count
- contacts (M2M → Contact), participants (JSON)

**EmailSyncState**
- email_account (OneToOne → EmailAccount)
- last_history_id (Gmail), last_delta_token (Outlook)
- last_sync_at, sync_status: IDLE / SYNCING / ERROR, error_message

### Frontend
- New `/inbox` page: 3-column layout (thread list | selected email | contact detail)
- Filters: all / unread / by email account / by contact
- Integrated email composer (reuse existing)
- Contact detail page: "Emails" tab showing all exchanges

### Migration
- Existing `SentEmail` model migrated to `Email` (direction=OUTBOUND)
- `EmailAccount` unchanged, sync state added via EmailSyncState
- Timeline entries EMAIL_SENT and EMAIL_RECEIVED point to new Email model

---

## Feature 2: Email Sequences

### Goal
Dedicated Sequences module for automated email nurturing, separate from the workflow engine. Auto-stop on reply, bounce, or opt-out.

### Architecture
- Dedicated `sequences` Django app
- Celery Beat checks every minute for steps to send
- Reply detection via inbox sync — inbound email matching a sequence thread auto-stops enrollment

### Models

**Sequence**
- id (UUID), organization, name, description
- status: DRAFT / ACTIVE / PAUSED / ARCHIVED
- email_account (FK → EmailAccount)
- created_by (FK → User), created_at, updated_at

**SequenceStep**
- id (UUID), sequence (FK → Sequence), order (int)
- delay_days (int), delay_hours (int)
- subject, body_html, body_text
- step_type: EMAIL / MANUAL_TASK
- created_at, updated_at

**SequenceEnrollment**
- id (UUID), sequence (FK → Sequence), contact (FK → Contact)
- current_step (FK nullable → SequenceStep)
- status: ACTIVE / COMPLETED / REPLIED / BOUNCED / OPTED_OUT / PAUSED / UNENROLLED
- enrolled_at, completed_at, enrolled_by (FK → User)

**SequenceEmail**
- id (UUID), enrollment (FK → SequenceEnrollment), step (FK → SequenceStep)
- email (FK nullable → Email)
- status: SCHEDULED / SENT / OPENED / CLICKED / BOUNCED / FAILED
- scheduled_at, sent_at, opened_at, clicked_at

### Frontend
- `/sequences` page: list with stats (enrolled, completed, reply rate)
- Sequence editor: add/reorder steps, email preview, delay config
- Enrollment from contact detail or bulk from list/segment
- Sequence dashboard: per-step funnel, open/reply/bounce rates
- Contact detail: "enrolled in sequence X" indicator with unenroll option

### Interactions with Inbox
- Sequence emails create normal `Email` records (direction=OUTBOUND), visible in inbox
- Contact reply (detected by inbox sync) auto-stops enrollment
- Variable substitution with contact data (first name, last name, company, etc.)

---

## Feature 3: Call Log

### Goal
Enriched manual call logging with duration, notes, outcome, and contact/deal association.

### Architecture
- Extend the `notes` module with a dedicated `Call` model
- Each call auto-creates a `TimelineEntry` of type CALL

### Model

**Call** (in notes/)
- id (UUID), organization
- contact (FK → Contact), deal (FK nullable → Deal)
- direction: INBOUND / OUTBOUND
- outcome: ANSWERED / VOICEMAIL / NO_ANSWER / BUSY / WRONG_NUMBER
- duration_seconds (int nullable)
- started_at (datetime), notes (text)
- logged_by (FK → User)
- timeline_entry (OneToOne → TimelineEntry)
- created_at, updated_at

### Frontend
- "Log a call" modal accessible from: contact detail (phone button), deal detail, quick action in navbar
- Form fields: contact (autocomplete), direction, outcome, duration (mm:ss), date/time, notes
- Contact detail: calls in timeline with dedicated icon, formatted duration, outcome badge
- Timeline filter by "Calls" type
- Click phone number → opens `tel:` AND offers to log the call after
- Dashboard: call count by period, by outcome

---

## Feature 4: Calendar Integration (Push)

### Goal
Create events in the CRM → they sync to Google Calendar / Outlook Calendar. No pull of external events.

### Architecture
- Reuse same OAuth tokens as inbox (Gmail/Outlook), add calendar scopes
- On meeting create/update/delete, Celery task pushes to Google Calendar API or Microsoft Graph
- If no calendar connected, meeting stays local (sync_status=NOT_SYNCED)
- Participant invitations handled natively by Google/Outlook

### Models

**CalendarAccount** (new calendars/ module)
- id (UUID), organization, user (FK → User)
- email_account (FK nullable → EmailAccount)
- provider: GOOGLE / OUTLOOK
- calendar_id (string), is_active
- created_at, updated_at

**Meeting**
- id (UUID), organization, title, description, location (nullable)
- start_at (datetime), end_at (datetime), is_all_day (bool)
- contact (FK nullable → Contact), contacts (M2M → Contact)
- deal (FK nullable → Deal)
- created_by (FK → User)
- provider_event_id (nullable), calendar_account (FK nullable → CalendarAccount)
- sync_status: PENDING / SYNCED / FAILED / NOT_SYNCED
- attendees (JSON), reminder_minutes (int, default 15)
- timeline_entry (OneToOne → TimelineEntry)
- created_at, updated_at

### Frontend
- `/calendar` page: month/week/day view showing CRM meetings only
- Meeting creation modal: title, start/end datetime, contact(s), deal, location, description, calendar selection
- Contact detail: meetings in timeline (type MEETING)
- Deal detail: associated meetings visible
