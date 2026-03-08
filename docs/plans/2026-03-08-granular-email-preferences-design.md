# Granular Email Notification Preferences

## Context

Currently, the CRM has a single boolean toggle `email_notifications` on the `User` model that enables/disables all email notifications at once. Users need finer control over which types of emails they receive.

## Design

### Data Model

Keep `email_notifications` as a master switch. Add 11 `BooleanField(default=True)` fields on the `User` model:

| Field | Description |
|-------|-------------|
| `email_notify_task_reminder` | Task reminders (before due date) |
| `email_notify_task_assigned` | Task assigned to user |
| `email_notify_task_due` | Task overdue / due date alerts |
| `email_notify_daily_digest` | Daily summary (inactive deals, overdue tasks, etc.) |
| `email_notify_deal_update` | Deal updates |
| `email_notify_mention` | Mentions |
| `email_notify_new_comment` | New comments |
| `email_notify_reaction` | Reactions |
| `email_notify_import_complete` | Import completed |
| `email_notify_invitation` | Organization invitations |
| `email_notify_workflow` | Workflow notifications |

An email is sent only if `email_notifications` (master) AND the specific toggle are both `True`.

### Backend API

Extend `PATCH /auth/me/` to accept all new fields. Add a helper function:

```python
def should_send_email(user, notification_type):
    if not getattr(user, "email_notifications", True):
        return False
    field = f"email_notify_{notification_type}"
    return getattr(user, field, True)
```

Update all email sending points to use this helper:
- `notifications/helpers.py` — check based on notification `type`
- `tasks/celery_tasks.py` — check `email_notify_task_reminder`
- `check_reminders.py` — check `email_notify_daily_digest`
- Invitation emails — check `email_notify_invitation`

### Frontend UI

In Settings page, keep the master switch at the top. Below it, display individual toggles grouped by category. All individual toggles are visually disabled (grayed out) when master switch is off.

**Categories:**

- **Tâches / Tasks:** task_reminder, task_assigned, task_due
- **Activité / Activity:** mention, new_comment, reaction
- **CRM:** deal_update, workflow
- **Général / General:** daily_digest, import_complete, invitation

Each toggle sends `PATCH /auth/me/` with its corresponding field. Add FR/EN translations in `messages/{locale}/settings.json`.

### Approach

Boolean fields directly on User model (vs. JSONField or separate model). Chosen for simplicity, consistency with existing `email_notifications` field, DB-level validation, and easy querying.
