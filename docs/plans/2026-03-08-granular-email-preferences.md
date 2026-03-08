# Granular Email Notification Preferences — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to control which types of email notifications they receive, with a master switch and per-type toggles.

**Architecture:** Add 11 boolean fields to the User model, expose them via the existing `PATCH /auth/me/` endpoint, add a `should_send_email(user, type)` helper, and update all email-sending callsites. Frontend gets grouped toggles in Settings.

**Tech Stack:** Django (backend), Next.js + next-intl (frontend), Resend (email provider)

---

### Task 1: Add boolean fields to User model

**Files:**
- Modify: `backend/accounts/models.py:22-39`

**Step 1: Add fields to User model**

In `backend/accounts/models.py`, add after line 26 (`email_notifications = models.BooleanField(default=True)`):

```python
    # Granular email notification preferences
    email_notify_task_reminder = models.BooleanField(default=True)
    email_notify_task_assigned = models.BooleanField(default=True)
    email_notify_task_due = models.BooleanField(default=True)
    email_notify_daily_digest = models.BooleanField(default=True)
    email_notify_deal_update = models.BooleanField(default=True)
    email_notify_mention = models.BooleanField(default=True)
    email_notify_new_comment = models.BooleanField(default=True)
    email_notify_reaction = models.BooleanField(default=True)
    email_notify_import_complete = models.BooleanField(default=True)
    email_notify_invitation = models.BooleanField(default=True)
    email_notify_workflow = models.BooleanField(default=True)
```

**Step 2: Create and apply migration**

Run: `cd backend && python manage.py makemigrations accounts && python manage.py migrate`
Expected: Migration created with 11 AddField operations, applied successfully.

**Step 3: Commit**

```bash
git add backend/accounts/models.py backend/accounts/migrations/
git commit -m "feat: add granular email notification preference fields to User model"
```

---

### Task 2: Add `should_send_email` helper

**Files:**
- Modify: `backend/notifications/helpers.py`

**Step 1: Add helper function**

In `backend/notifications/helpers.py`, add before `create_notification`:

```python
def should_send_email(user, notification_type):
    """Check master switch AND per-type preference."""
    if not getattr(user, "email_notifications", True):
        return False
    field = f"email_notify_{notification_type}"
    return getattr(user, field, True)
```

**Step 2: Update `create_notification` to use the helper**

Replace line 14:
```python
    if getattr(recipient, "email_notifications", True):
```
with:
```python
    if should_send_email(recipient, type):
```

**Step 3: Commit**

```bash
git add backend/notifications/helpers.py
git commit -m "feat: add should_send_email helper with per-type preference check"
```

---

### Task 3: Update all email-sending callsites

**Files:**
- Modify: `backend/tasks/celery_tasks.py:77-81`
- Modify: `backend/notifications/management/commands/check_reminders.py:123`
- Modify: `backend/organizations/views.py:122`

**Step 1: Update task reminders (celery_tasks.py)**

In `backend/tasks/celery_tasks.py`, add import at top:
```python
from notifications.helpers import should_send_email
```

Replace lines 77-81:
```python
                    if getattr(user, "email_notifications", True):
                        send_notification_email(
                            user.email, title, _("Rappel : {description}").format(description=task.description),
                            user=user,
                        )
```
with:
```python
                    if should_send_email(user, "task_reminder"):
                        send_notification_email(
                            user.email, title, _("Rappel : {description}").format(description=task.description),
                            user=user,
                        )
```

**Step 2: Update daily digest (check_reminders.py)**

In `backend/notifications/management/commands/check_reminders.py`, add import at top:
```python
from notifications.helpers import should_send_email
```

Replace line 123:
```python
                if reminders and getattr(user, "email_notifications", True):
```
with:
```python
                if reminders and should_send_email(user, "daily_digest"):
```

**Step 3: Update invitation emails (organizations/views.py)**

In `backend/organizations/views.py`, add import:
```python
from notifications.helpers import should_send_email
```

After line 121 (`invite_link = ...`), wrap the `send_invitation_email` call:
```python
    if should_send_email(existing_user, "invitation") if existing_user else True:
        send_invitation_email(email, org.name, invite_link, user=existing_user)
```
Note: `existing_user` may be None (inviting a non-registered email). In that case, always send.

**Step 4: Commit**

```bash
git add backend/tasks/celery_tasks.py backend/notifications/management/commands/check_reminders.py backend/organizations/views.py
git commit -m "feat: use should_send_email helper at all email-sending callsites"
```

---

### Task 4: Update serializer and API endpoint

**Files:**
- Modify: `backend/accounts/serializers.py:21-25`
- Modify: `backend/accounts/views.py:110-122`

**Step 1: Update UserSerializer**

In `backend/accounts/serializers.py`, replace the `fields` line to include all new fields:

```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "email_notifications", "preferred_language", "date_joined", "is_superuser",
            "email_notify_task_reminder", "email_notify_task_assigned",
            "email_notify_task_due", "email_notify_daily_digest",
            "email_notify_deal_update", "email_notify_mention",
            "email_notify_new_comment", "email_notify_reaction",
            "email_notify_import_complete", "email_notify_invitation",
            "email_notify_workflow",
        ]
        read_only_fields = fields
```

**Step 2: Update `me` view to accept all new fields**

In `backend/accounts/views.py`, replace the `me` function body for PATCH:

```python
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        user = request.user
        allowed_fields = [
            "email_notifications", "preferred_language",
            "email_notify_task_reminder", "email_notify_task_assigned",
            "email_notify_task_due", "email_notify_daily_digest",
            "email_notify_deal_update", "email_notify_mention",
            "email_notify_new_comment", "email_notify_reaction",
            "email_notify_import_complete", "email_notify_invitation",
            "email_notify_workflow",
        ]
        update_fields = []
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                update_fields.append(field)
        if update_fields:
            user.save(update_fields=update_fields)
        return Response(UserSerializer(user).data)
    return Response(UserSerializer(request.user).data)
```

**Step 3: Commit**

```bash
git add backend/accounts/serializers.py backend/accounts/views.py
git commit -m "feat: expose granular email preferences in API serializer and PATCH endpoint"
```

---

### Task 5: Update TypeScript types

**Files:**
- Modify: `frontend/types/auth.ts:1-9`

**Step 1: Add new fields to User interface**

```typescript
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_notifications: boolean
  is_superuser: boolean
  preferred_language?: string
  email_notify_task_reminder: boolean
  email_notify_task_assigned: boolean
  email_notify_task_due: boolean
  email_notify_daily_digest: boolean
  email_notify_deal_update: boolean
  email_notify_mention: boolean
  email_notify_new_comment: boolean
  email_notify_reaction: boolean
  email_notify_import_complete: boolean
  email_notify_invitation: boolean
  email_notify_workflow: boolean
}
```

**Step 2: Commit**

```bash
git add frontend/types/auth.ts
git commit -m "feat: add granular email preference fields to User TypeScript type"
```

---

### Task 6: Add i18n translation strings

**Files:**
- Modify: `frontend/messages/en/settings.json`
- Modify: `frontend/messages/fr/settings.json`

**Step 1: Update English translations**

In `frontend/messages/en/settings.json`, replace the `"notifications"` section:

```json
"notifications": {
  "emailNotifications": "Email notifications",
  "emailNotificationsDesc": "Master switch — disable to stop all notification emails",
  "categories": {
    "tasks": "Tasks",
    "activity": "Activity",
    "crm": "CRM",
    "general": "General"
  },
  "taskReminder": "Task reminders",
  "taskReminderDesc": "Reminders before task deadlines",
  "taskAssigned": "Task assigned",
  "taskAssignedDesc": "When a task is assigned to you",
  "taskDue": "Overdue tasks",
  "taskDueDesc": "Alerts when tasks are overdue",
  "dailyDigest": "Daily digest",
  "dailyDigestDesc": "Daily summary of inactive deals, tasks, and contacts",
  "dealUpdate": "Deal updates",
  "dealUpdateDesc": "Notifications about deal changes",
  "mention": "Mentions",
  "mentionDesc": "When someone mentions you in a comment",
  "newComment": "New comments",
  "newCommentDesc": "Comments on items you follow",
  "reaction": "Reactions",
  "reactionDesc": "When someone reacts to your comment",
  "importComplete": "Import completed",
  "importCompleteDesc": "When a contact import finishes",
  "invitation": "Invitations",
  "invitationDesc": "Organization invitation emails",
  "workflow": "Workflow notifications",
  "workflowDesc": "Notifications triggered by automated workflows"
}
```

**Step 2: Update French translations**

In `frontend/messages/fr/settings.json`, replace the `"notifications"` section:

```json
"notifications": {
  "emailNotifications": "Notifications email",
  "emailNotificationsDesc": "Interrupteur principal — désactiver pour arrêter tous les emails de notification",
  "categories": {
    "tasks": "Tâches",
    "activity": "Activité",
    "crm": "CRM",
    "general": "Général"
  },
  "taskReminder": "Rappels de tâches",
  "taskReminderDesc": "Rappels avant l'échéance des tâches",
  "taskAssigned": "Tâche assignée",
  "taskAssignedDesc": "Lorsqu'une tâche vous est assignée",
  "taskDue": "Tâches en retard",
  "taskDueDesc": "Alertes lorsque des tâches sont en retard",
  "dailyDigest": "Résumé quotidien",
  "dailyDigestDesc": "Résumé quotidien des deals inactifs, tâches et contacts",
  "dealUpdate": "Mises à jour de deals",
  "dealUpdateDesc": "Notifications sur les changements de deals",
  "mention": "Mentions",
  "mentionDesc": "Lorsque quelqu'un vous mentionne dans un commentaire",
  "newComment": "Nouveaux commentaires",
  "newCommentDesc": "Commentaires sur les éléments que vous suivez",
  "reaction": "Réactions",
  "reactionDesc": "Lorsque quelqu'un réagit à votre commentaire",
  "importComplete": "Import terminé",
  "importCompleteDesc": "Lorsqu'un import de contacts est terminé",
  "invitation": "Invitations",
  "invitationDesc": "Emails d'invitation à une organisation",
  "workflow": "Notifications de workflow",
  "workflowDesc": "Notifications déclenchées par les workflows automatisés"
}
```

**Step 3: Commit**

```bash
git add frontend/messages/en/settings.json frontend/messages/fr/settings.json
git commit -m "feat: add i18n translations for granular email notification preferences"
```

---

### Task 7: Build the frontend UI for granular email toggles

**Files:**
- Modify: `frontend/app/[locale]/(app)/settings/page.tsx:265-289`

**Step 1: Replace the email notifications toggle section**

Replace lines 265-289 in `frontend/app/[locale]/(app)/settings/page.tsx` with the new grouped toggles UI. Add `ListChecks` and `MessageSquare` to the lucide imports.

```tsx
          {/* Email notifications */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Master switch */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="font-[family-name:var(--font-body)]">
                  <p className="text-sm font-medium">{t('notifications.emailNotifications')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('notifications.emailNotificationsDesc')}
                  </p>
                </div>
              </div>
              <Checkbox
                checked={user?.email_notifications ?? true}
                onCheckedChange={async (checked) => {
                  await apiFetch("/auth/me/", {
                    method: "PATCH",
                    json: { email_notifications: !!checked },
                  })
                }}
              />
            </div>

            {/* Per-type toggles — grouped by category */}
            <div className={cn(
              "px-6 py-4 space-y-5 font-[family-name:var(--font-body)] transition-opacity",
              !(user?.email_notifications ?? true) && "opacity-40 pointer-events-none"
            )}>
              {/* Tasks */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.tasks')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_task_reminder", label: t('notifications.taskReminder'), desc: t('notifications.taskReminderDesc') },
                    { field: "email_notify_task_assigned", label: t('notifications.taskAssigned'), desc: t('notifications.taskAssignedDesc') },
                    { field: "email_notify_task_due", label: t('notifications.taskDue'), desc: t('notifications.taskDueDesc') },
                  ] as const).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Activity */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.activity')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_mention", label: t('notifications.mention'), desc: t('notifications.mentionDesc') },
                    { field: "email_notify_new_comment", label: t('notifications.newComment'), desc: t('notifications.newCommentDesc') },
                    { field: "email_notify_reaction", label: t('notifications.reaction'), desc: t('notifications.reactionDesc') },
                  ] as const).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* CRM */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.crm')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_deal_update", label: t('notifications.dealUpdate'), desc: t('notifications.dealUpdateDesc') },
                    { field: "email_notify_workflow", label: t('notifications.workflow'), desc: t('notifications.workflowDesc') },
                  ] as const).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* General */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.general')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_daily_digest", label: t('notifications.dailyDigest'), desc: t('notifications.dailyDigestDesc') },
                    { field: "email_notify_import_complete", label: t('notifications.importComplete'), desc: t('notifications.importCompleteDesc') },
                    { field: "email_notify_invitation", label: t('notifications.invitation'), desc: t('notifications.invitationDesc') },
                  ] as const).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
```

**Step 2: Commit**

```bash
git add frontend/app/\\[locale\\]/\\(app\\)/settings/page.tsx
git commit -m "feat: add granular email notification toggles UI in settings page"
```

---

### Task 8: Verify everything works

**Step 1: Run backend tests**

Run: `cd backend && python manage.py test tasks.test_reminders -v2`
Expected: All 7 tests pass (existing behavior preserved).

**Step 2: Run frontend build**

Run: `cd frontend && npx next build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: Final commit (if any fix needed)**

Fix any issues and commit.
