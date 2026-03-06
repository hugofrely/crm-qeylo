# Task Reminders Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send in-app + email reminder notifications before task deadlines, with org-configurable offsets and optional time-of-day in the task form.

**Architecture:** Celery Beat periodic task (every 5 min) checks upcoming deadlines against org-configured offsets. `TaskReminder` model prevents duplicates. `OrganizationSettings` OneToOne model stores reminder offsets. TaskDialog gets optional time input.

**Tech Stack:** Django, Celery Beat, DRF, Next.js, TypeScript, shadcn/ui

---

### Task 1: OrganizationSettings model + migration + auto-creation

**Files:**
- Modify: `backend/organizations/models.py`
- Modify: `backend/organizations/views.py` (auto-create on org creation)
- Auto-generated: `backend/organizations/migrations/0003_organizationsettings.py`

**Step 1: Add OrganizationSettings model**

Add to `backend/organizations/models.py` after the `Invitation` class:

```python
def default_reminder_offsets():
    return [60, 1440]


class OrganizationSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name="settings"
    )
    task_reminder_offsets = models.JSONField(default=default_reminder_offsets)

    def __str__(self):
        return f"Settings for {self.organization.name}"
```

**Step 2: Auto-create settings on org creation**

In `backend/organizations/views.py`, in the `organization_list` POST handler, after `create_default_categories(org)` (line 62), add:

```python
from .models import OrganizationSettings
OrganizationSettings.objects.create(organization=org)
```

Also, in `backend/accounts/views.py`, after `Pipeline.create_defaults(org)` (line 41), add:

```python
from organizations.models import OrganizationSettings
OrganizationSettings.objects.create(organization=org)
```

**Step 3: Generate migration**

Run: `cd backend && python manage.py makemigrations organizations`

**Step 4: Data migration for existing orgs**

Create a data migration to create `OrganizationSettings` for all existing orgs:

Run: `cd backend && python manage.py makemigrations organizations --empty -n populate_organization_settings`

Edit the generated file to add:

```python
from django.db import migrations


def create_settings(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    OrganizationSettings = apps.get_model("organizations", "OrganizationSettings")
    for org in Organization.objects.all():
        OrganizationSettings.objects.get_or_create(organization=org)


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_organizationsettings"),
    ]

    operations = [
        migrations.RunPython(create_settings, migrations.RunPython.noop),
    ]
```

**Step 5: Commit**

```bash
git add backend/organizations/ backend/accounts/views.py
git commit -m "feat(organizations): add OrganizationSettings model with reminder offsets"
```

---

### Task 2: TASK_REMINDER notification type + TaskReminder model

**Files:**
- Modify: `backend/notifications/models.py`
- Modify: `backend/tasks/models.py`
- Auto-generated: `backend/notifications/migrations/0003_*.py`
- Auto-generated: `backend/tasks/migrations/0003_taskreminder.py`

**Step 1: Add notification type**

In `backend/notifications/models.py`, add to `Type` TextChoices after `TASK_ASSIGNED`:

```python
TASK_REMINDER = "task_reminder"
```

**Step 2: Add TaskReminder model**

Add to `backend/tasks/models.py` after the `TaskAssignment` class:

```python
class TaskReminder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="reminders")
    offset_minutes = models.IntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("task", "offset_minutes")

    def __str__(self):
        return f"Reminder {self.offset_minutes}min for {self.task}"
```

**Step 3: Generate migrations**

Run: `cd backend && python manage.py makemigrations notifications tasks`

**Step 4: Commit**

```bash
git add backend/notifications/ backend/tasks/
git commit -m "feat: add TASK_REMINDER notification type and TaskReminder model"
```

---

### Task 3: check_task_reminders Celery task + tests

**Files:**
- Create: `backend/tasks/celery_tasks.py`
- Create: `backend/tasks/test_reminders.py`
- Modify: `backend/config/settings.py`

**Step 1: Write the tests**

Create `backend/tasks/test_reminders.py`:

```python
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from notifications.models import Notification
from organizations.models import Organization, Membership, OrganizationSettings
from tasks.models import Task, TaskAssignment, TaskReminder

User = get_user_model()


class CheckTaskRemindersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="hugo@test.com", password="pass12345678",
            first_name="Hugo", last_name="Frely",
        )
        self.org = Organization.objects.create(name="Test Org", slug="test-org")
        Membership.objects.create(organization=self.org, user=self.user, role="owner")
        self.settings = OrganizationSettings.objects.create(
            organization=self.org, task_reminder_offsets=[60, 1440]
        )

    def _create_task(self, due_date, is_done=False, assign_user=None):
        task = Task.objects.create(
            organization=self.org, created_by=self.user,
            description="Test task", due_date=due_date, is_done=is_done,
        )
        if assign_user:
            TaskAssignment.objects.create(task=task, user=assign_user, assigned_by=self.user)
        return task

    @patch("tasks.celery_tasks.send_notification_email")
    def test_reminder_sent_for_task_due_in_1h(self, mock_email):
        """Task due in ~1h should trigger a 60min reminder."""
        due = timezone.now() + timedelta(minutes=60)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=60).exists())
        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("1 heure", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_reminder_sent_for_task_due_in_24h(self, mock_email):
        """Task due in ~24h should trigger a 1440min reminder."""
        due = timezone.now() + timedelta(minutes=1440)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=1440).exists())
        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("demain", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_duplicate_reminder(self, mock_email):
        """Already-sent reminder should not be sent again."""
        due = timezone.now() + timedelta(minutes=60)
        task = self._create_task(due, assign_user=self.user)
        TaskReminder.objects.create(task=task, offset_minutes=60)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_reminder_for_done_task(self, mock_email):
        """Completed tasks should not get reminders."""
        due = timezone.now() + timedelta(minutes=60)
        self._create_task(due, is_done=True, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_fallback_to_creator_when_no_assignees(self, mock_email):
        """If no one is assigned, creator gets the reminder."""
        due = timezone.now() + timedelta(minutes=60)
        self._create_task(due)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        notif = Notification.objects.filter(recipient=self.user, type="task_reminder").first()
        self.assertIsNotNone(notif)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_custom_offsets_respected(self, mock_email):
        """Org with only [30] offset should only check 30min window."""
        self.settings.task_reminder_offsets = [30]
        self.settings.save()

        due = timezone.now() + timedelta(minutes=30)
        task = self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertTrue(TaskReminder.objects.filter(task=task, offset_minutes=30).exists())
        notif = Notification.objects.filter(type="task_reminder").first()
        self.assertIsNotNone(notif)
        self.assertIn("30 minutes", notif.title)

    @patch("tasks.celery_tasks.send_notification_email")
    def test_no_reminder_outside_window(self, mock_email):
        """Task due in 3h should not trigger a 60min reminder."""
        due = timezone.now() + timedelta(hours=3)
        self._create_task(due, assign_user=self.user)

        from tasks.celery_tasks import check_task_reminders
        check_task_reminders()

        self.assertEqual(Notification.objects.filter(type="task_reminder").count(), 0)
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec -T backend python manage.py test tasks.test_reminders -v 2`
Expected: ImportError — `tasks.celery_tasks` does not exist.

**Step 3: Create the Celery task**

Create `backend/tasks/celery_tasks.py`:

```python
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from notifications.email import send_notification_email
from notifications.models import Notification
from organizations.models import Organization, OrganizationSettings
from .models import Task, TaskReminder


WINDOW_MINUTES = 5


def format_reminder_title(offset_minutes):
    if offset_minutes >= 1440:
        days = offset_minutes // 1440
        if days == 1:
            return "Tâche due demain"
        return f"Tâche due dans {days} jours"
    if offset_minutes >= 60:
        hours = offset_minutes // 60
        if hours == 1:
            return "Tâche due dans 1 heure"
        return f"Tâche due dans {hours} heures"
    return f"Tâche due dans {offset_minutes} minutes"


def get_task_recipients(task):
    assignees = [a.user for a in task.assignments.select_related("user").all()]
    if assignees:
        return assignees
    if task.created_by:
        return [task.created_by]
    return []


@shared_task
def check_task_reminders():
    """Periodic task: check for upcoming task deadlines and send reminders.

    Runs every 5 minutes via Celery Beat. For each org, checks configured
    reminder offsets and sends notifications to task assignees (or creator).
    """
    now = timezone.now()

    for org_settings in OrganizationSettings.objects.select_related("organization").all():
        org = org_settings.organization
        offsets = org_settings.task_reminder_offsets or []

        for offset in offsets:
            window_start = now + timedelta(minutes=offset - WINDOW_MINUTES)
            window_end = now + timedelta(minutes=offset + WINDOW_MINUTES)

            tasks = (
                Task.objects.filter(
                    organization=org,
                    is_done=False,
                    due_date__gte=window_start,
                    due_date__lte=window_end,
                )
                .exclude(reminders__offset_minutes=offset)
                .prefetch_related("assignments__user")
                .select_related("created_by")
            )

            title = format_reminder_title(offset)

            for task in tasks:
                recipients = get_task_recipients(task)
                for user in recipients:
                    Notification.objects.create(
                        organization=org,
                        recipient=user,
                        type="task_reminder",
                        title=title,
                        message=f"Rappel : {task.description}",
                        link="/tasks",
                    )
                    if getattr(user, "email_notifications", True):
                        send_notification_email(
                            user.email, title, f"Rappel : {task.description}"
                        )

                TaskReminder.objects.create(task=task, offset_minutes=offset)
```

**Step 4: Add to Celery Beat schedule**

In `backend/config/settings.py`, after the `CELERY_TIMEZONE` line (line 212), add:

```python
CELERY_BEAT_SCHEDULE = {
    "check-task-reminders": {
        "task": "tasks.celery_tasks.check_task_reminders",
        "schedule": 300,  # every 5 minutes
    },
}
```

**Step 5: Run tests to verify they pass**

Run: `docker compose exec -T backend python manage.py test tasks.test_reminders -v 2`
Expected: All 7 tests PASS.

**Step 6: Commit**

```bash
git add backend/tasks/celery_tasks.py backend/tasks/test_reminders.py backend/config/settings.py
git commit -m "feat(tasks): add check_task_reminders Celery task with tests"
```

---

### Task 4: Reset reminders when due_date changes

**Files:**
- Modify: `backend/tasks/serializers.py`
- Modify: `backend/tasks/tests.py`

**Step 1: Write the test**

Add to `backend/tasks/tests.py`:

```python
def test_reminders_reset_on_due_date_change(self):
    """Changing due_date should delete existing TaskReminder records."""
    from tasks.models import TaskReminder

    r = self.client.post(
        "/api/tasks/",
        {"description": "Reminder test", "due_date": "2026-03-10T10:00:00Z"},
    )
    task_id = r.data["id"]

    # Simulate a sent reminder
    TaskReminder.objects.create(task_id=task_id, offset_minutes=60)
    self.assertEqual(TaskReminder.objects.filter(task_id=task_id).count(), 1)

    # Change due_date
    self.client.patch(
        f"/api/tasks/{task_id}/",
        {"due_date": "2026-03-15T14:00:00Z"},
    )

    # Reminders should be cleared
    self.assertEqual(TaskReminder.objects.filter(task_id=task_id).count(), 0)
```

**Step 2: Update TaskSerializer.update()**

In `backend/tasks/serializers.py`, modify the `update` method to clear reminders when `due_date` changes:

```python
def update(self, instance, validated_data):
    assigned_to = validated_data.pop("assigned_to", None)

    # Clear reminders if due_date is changing
    new_due_date = validated_data.get("due_date")
    if new_due_date and new_due_date != instance.due_date:
        instance.reminders.all().delete()

    task = super().update(instance, validated_data)
    if assigned_to is not None:
        request = self.context.get("request")
        self._sync_assignments(task, assigned_to, request.user)
    return task
```

**Step 3: Run tests**

Run: `docker compose exec -T backend python manage.py test tasks -v 2`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add backend/tasks/serializers.py backend/tasks/tests.py
git commit -m "feat(tasks): reset reminders when due_date changes"
```

---

### Task 5: Organization settings API

**Files:**
- Modify: `backend/organizations/serializers.py`
- Modify: `backend/organizations/views.py`
- Modify: `backend/organizations/urls.py`

**Step 1: Add serializer**

Add to `backend/organizations/serializers.py`:

```python
from .models import Organization, Membership, Invitation, OrganizationSettings

class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = ["task_reminder_offsets"]
```

**Step 2: Add view**

Add to `backend/organizations/views.py`:

```python
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def organization_settings(request, org_id):
    try:
        org = Organization.objects.get(id=org_id)
    except Organization.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    if not Membership.objects.filter(organization=org, user=request.user).exists():
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    settings_obj, _ = OrganizationSettings.objects.get_or_create(organization=org)

    if request.method == "GET":
        from .serializers import OrganizationSettingsSerializer
        return Response(OrganizationSettingsSerializer(settings_obj).data)

    # PATCH — only owner/admin
    caller = Membership.objects.filter(organization=org, user=request.user).first()
    if not caller or caller.role not in ("owner", "admin"):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    from .serializers import OrganizationSettingsSerializer
    serializer = OrganizationSettingsSerializer(settings_obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)
```

Also add the import at the top of views.py:

```python
from .models import Invitation, Membership, Organization, OrganizationSettings
```

**Step 3: Add URL**

In `backend/organizations/urls.py`, add:

```python
path("<uuid:org_id>/settings/", views.organization_settings),
```

**Step 4: Commit**

```bash
git add backend/organizations/
git commit -m "feat(organizations): add settings API endpoint"
```

---

### Task 6: Optional time input in TaskDialog

**Files:**
- Modify: `frontend/components/tasks/TaskDialog.tsx`

**Step 1: Add dueTime state**

In `TaskDialog`, add state:

```typescript
const [dueTime, setDueTime] = useState("")
```

In the `useEffect` when `open` changes, initialize `dueTime`:

```typescript
// In the if (task) block, after setDueDate:
const timeMatch = task.due_date?.match(/T(\d{2}:\d{2})/)
setDueTime(timeMatch && timeMatch[1] !== "23:59" ? timeMatch[1] : "")

// In the else block:
setDueTime("")
```

**Step 2: Update payload in handleSave**

Replace the `due_date` line in the payload:

```typescript
due_date: dueDate ? `${dueDate}T${dueTime || "23:59"}:00Z` : null,
```

**Step 3: Add time input in JSX**

Change the "Date + Priorité" grid from `grid-cols-2` to `grid-cols-3` and add the time field after the date field:

```tsx
<div className="grid grid-cols-3 gap-3">
  <div className="space-y-1.5">
    <Label htmlFor="task-due-date">Date d&apos;échéance</Label>
    <Input
      id="task-due-date"
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
    />
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="task-due-time">Heure</Label>
    <Input
      id="task-due-time"
      type="time"
      value={dueTime}
      onChange={(e) => setDueTime(e.target.value)}
      placeholder="Optionnel"
    />
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="task-priority">Priorité</Label>
    <select ... >
      ...
    </select>
  </div>
</div>
```

**Step 4: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend/components/tasks/TaskDialog.tsx
git commit -m "feat(frontend): add optional time input to TaskDialog"
```

---

### Task 7: Frontend settings — reminder offsets configuration

**Files:**
- Modify: `frontend/services/organizations.ts`
- Create: `frontend/components/settings/ReminderSettings.tsx`
- Modify: `frontend/app/(app)/settings/organization/page.tsx`

**Step 1: Add settings service functions**

Add to `frontend/services/organizations.ts`:

```typescript
export interface OrgSettings {
  task_reminder_offsets: number[]
}

export async function fetchOrgSettings(orgId: string): Promise<OrgSettings> {
  return apiFetch<OrgSettings>(`/organizations/${orgId}/settings/`)
}

export async function updateOrgSettings(orgId: string, data: Partial<OrgSettings>): Promise<OrgSettings> {
  return apiFetch<OrgSettings>(`/organizations/${orgId}/settings/`, { method: "PATCH", json: data })
}
```

**Step 2: Create ReminderSettings component**

Create `frontend/components/settings/ReminderSettings.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Bell, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchOrgSettings, updateOrgSettings } from "@/services/organizations"

interface ReminderSettingsProps {
  orgId: string
}

const PRESET_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 heure" },
  { value: 120, label: "2 heures" },
  { value: 1440, label: "1 jour" },
  { value: 2880, label: "2 jours" },
]

function formatOffset(minutes: number): string {
  if (minutes >= 1440) {
    const days = minutes / 1440
    return days === 1 ? "1 jour" : `${days} jours`
  }
  if (minutes >= 60) {
    const hours = minutes / 60
    return hours === 1 ? "1 heure" : `${hours} heures`
  }
  return `${minutes} minutes`
}

export default function ReminderSettings({ orgId }: ReminderSettingsProps) {
  const [offsets, setOffsets] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchOrgSettings(orgId)
      .then((data) => setOffsets(data.task_reminder_offsets || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId])

  const save = async (newOffsets: number[]) => {
    setSaving(true)
    try {
      const sorted = [...newOffsets].sort((a, b) => a - b)
      setOffsets(sorted)
      await updateOrgSettings(orgId, { task_reminder_offsets: sorted })
    } catch {
      // revert on error
      fetchOrgSettings(orgId).then((data) => setOffsets(data.task_reminder_offsets || []))
    } finally {
      setSaving(false)
    }
  }

  const addOffset = (value: number) => {
    if (!offsets.includes(value)) {
      save([...offsets, value])
    }
  }

  const removeOffset = (value: number) => {
    save(offsets.filter((o) => o !== value))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const availablePresets = PRESET_OPTIONS.filter((p) => !offsets.includes(p.value))

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Rappels de tâches</h2>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
        Recevez une notification avant l&apos;échéance de vos tâches.
      </p>

      {/* Current offsets */}
      <div className="flex flex-wrap gap-2">
        {offsets.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucun rappel configuré</p>
        )}
        {offsets.map((offset) => (
          <span
            key={offset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            {formatOffset(offset)} avant
            <button
              onClick={() => removeOffset(offset)}
              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Add preset */}
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => addOffset(preset.value)}
            >
              <Plus className="h-3 w-3" />
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Add ReminderSettings to organization settings page**

In `frontend/app/(app)/settings/organization/page.tsx`, add import:

```typescript
import ReminderSettings from "@/components/settings/ReminderSettings"
```

Add after `<CustomFieldsManager />`:

```tsx
{orgId && <ReminderSettings orgId={orgId} />}
```

**Step 4: Verify build**

Run: `cd frontend && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add frontend/services/organizations.ts frontend/components/settings/ReminderSettings.tsx frontend/app/(app)/settings/organization/page.tsx
git commit -m "feat(frontend): add reminder offsets configuration in org settings"
```

---

### Task 8: Run full test suite + build verification

**Step 1: Apply all migrations**

Run: `docker compose exec -T backend python manage.py migrate`

**Step 2: Run backend tests**

Run: `docker compose exec -T backend python manage.py test tasks -v 2`
Expected: All tests PASS (existing + new reminder tests).

**Step 3: Run frontend build**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: address any issues from full test run"
```
