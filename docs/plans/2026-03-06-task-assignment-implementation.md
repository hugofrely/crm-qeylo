# Task Assignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow tasks to be assigned to multiple team members, with filtering by assignee and in-app notifications.

**Architecture:** New `TaskAssignment` intermediate model linking `Task` to `User` with metadata (assigned_by, assigned_at). Reuses existing `Notification` system with new `TASK_ASSIGNED` type. Frontend adds multi-select assignee picker in TaskDialog, avatar display in TaskList, and assignee filter on tasks page.

**Tech Stack:** Django REST Framework, Next.js, TypeScript, shadcn/ui

---

### Task 1: TaskAssignment model + migration

**Files:**
- Modify: `backend/tasks/models.py`
- Auto-generated: `backend/tasks/migrations/0002_taskassignment.py`

**Step 1: Add TaskAssignment model**

Add to `backend/tasks/models.py` after the `Task` class:

```python
class TaskAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="assignments")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_assignments"
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("task", "user")

    def __str__(self):
        return f"{self.user} → {self.task}"
```

**Step 2: Generate and apply migration**

Run: `cd backend && python manage.py makemigrations tasks && python manage.py migrate`
Expected: Migration `0002_taskassignment` created and applied.

**Step 3: Commit**

```bash
git add backend/tasks/models.py backend/tasks/migrations/0002_taskassignment.py
git commit -m "feat(tasks): add TaskAssignment model"
```

---

### Task 2: Add TASK_ASSIGNED notification type

**Files:**
- Modify: `backend/notifications/models.py:7-11`
- Auto-generated: `backend/notifications/migrations/0002_alter_notification_type.py`

**Step 1: Add the new type**

In `backend/notifications/models.py`, add to the `Type` TextChoices:

```python
class Type(models.TextChoices):
    REMINDER = "reminder"
    INVITATION = "invitation"
    DEAL_UPDATE = "deal_update"
    TASK_DUE = "task_due"
    IMPORT_COMPLETE = "import_complete"
    TASK_ASSIGNED = "task_assigned"
```

**Step 2: Generate and apply migration**

Run: `cd backend && python manage.py makemigrations notifications && python manage.py migrate`

**Step 3: Commit**

```bash
git add backend/notifications/models.py backend/notifications/migrations/
git commit -m "feat(notifications): add TASK_ASSIGNED type"
```

---

### Task 3: Update TaskSerializer with assignees

**Files:**
- Modify: `backend/tasks/serializers.py`

**Step 1: Write the failing test**

Add to `backend/tasks/tests.py`:

```python
def test_create_task_with_assignees(self):
    """Creating a task with assigned_to should create TaskAssignment records."""
    # Get current user id
    from accounts.models import User
    user = User.objects.get(email="hugo@example.com")

    response = self.client.post(
        "/api/tasks/",
        {
            "description": "Tâche assignée",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [str(user.id)],
        },
        format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    self.assertEqual(len(response.data["assignees"]), 1)
    self.assertEqual(response.data["assignees"][0]["user_id"], str(user.id))
    self.assertEqual(response.data["assignees"][0]["first_name"], "Hugo")

def test_assignees_returned_in_list(self):
    """Task list should include assignees."""
    from accounts.models import User
    user = User.objects.get(email="hugo@example.com")

    self.client.post(
        "/api/tasks/",
        {
            "description": "Tâche avec assigné",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [str(user.id)],
        },
        format="json",
    )
    response = self.client.get("/api/tasks/")
    self.assertEqual(len(response.data["results"][0]["assignees"]), 1)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: FAIL — `assigned_to` not handled, `assignees` not in response.

**Step 3: Update the serializer**

Replace `backend/tasks/serializers.py` with:

```python
from rest_framework import serializers
from organizations.models import Membership
from .models import Task, TaskAssignment


class TaskAssigneeSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id")
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = TaskAssignment
        fields = ["user_id", "email", "first_name", "last_name", "assigned_at"]
        read_only_fields = fields


class TaskSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    deal_name = serializers.SerializerMethodField()
    assignees = TaskAssigneeSerializer(source="assignments", many=True, read_only=True)
    assigned_to = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False, default=list
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "description",
            "due_date",
            "contact",
            "contact_name",
            "deal",
            "deal_name",
            "priority",
            "is_done",
            "is_recurring",
            "recurrence_rule",
            "created_at",
            "assignees",
            "assigned_to",
        ]
        read_only_fields = ["id", "created_at"]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_deal_name(self, obj):
        if obj.deal:
            return obj.deal.name
        return None

    def validate_assigned_to(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if not request:
            return value
        org = request.organization
        valid_user_ids = set(
            Membership.objects.filter(organization=org, user_id__in=value)
            .values_list("user_id", flat=True)
        )
        invalid = [str(uid) for uid in value if uid not in valid_user_ids]
        if invalid:
            raise serializers.ValidationError(
                f"Users not members of this organization: {', '.join(invalid)}"
            )
        return value

    def _sync_assignments(self, task, assigned_to_ids, assigned_by):
        from notifications.helpers import create_notification

        current_ids = set(task.assignments.values_list("user_id", flat=True))
        new_ids = set(assigned_to_ids)

        # Remove unassigned
        task.assignments.filter(user_id__in=current_ids - new_ids).delete()

        # Add new assignments
        for user_id in new_ids - current_ids:
            assignment = TaskAssignment.objects.create(
                task=task, user_id=user_id, assigned_by=assigned_by
            )
            # Don't notify yourself
            if user_id != assigned_by.id:
                assigner_name = f"{assigned_by.first_name} {assigned_by.last_name}".strip()
                create_notification(
                    organization=task.organization,
                    recipient_id=user_id,
                    type="task_assigned",
                    title="Nouvelle tâche assignée",
                    message=f"{assigner_name} vous a assigné : {task.description}",
                    link="/tasks",
                )

    def create(self, validated_data):
        assigned_to = validated_data.pop("assigned_to", [])
        task = super().create(validated_data)
        if assigned_to:
            request = self.context.get("request")
            self._sync_assignments(task, assigned_to, request.user)
        return task

    def update(self, instance, validated_data):
        assigned_to = validated_data.pop("assigned_to", None)
        task = super().update(instance, validated_data)
        if assigned_to is not None:
            request = self.context.get("request")
            self._sync_assignments(task, assigned_to, request.user)
        return task
```

**Step 4: Check if `create_notification` accepts `recipient_id` or `recipient` object**

The existing helper `notifications/helpers.py:5` takes `recipient` as a User object. We need to adjust the call. Either:
- Pass `recipient=User.objects.get(id=user_id)` (extra query)
- Or fetch all users at once before the loop

Adjust `_sync_assignments` to bulk-fetch users:

```python
def _sync_assignments(self, task, assigned_to_ids, assigned_by):
    from notifications.helpers import create_notification
    from django.contrib.auth import get_user_model
    User = get_user_model()

    current_ids = set(task.assignments.values_list("user_id", flat=True))
    new_ids = set(assigned_to_ids)

    # Remove unassigned
    task.assignments.filter(user_id__in=current_ids - new_ids).delete()

    # Add new assignments + notifications
    ids_to_add = new_ids - current_ids
    if ids_to_add:
        users_map = {u.id: u for u in User.objects.filter(id__in=ids_to_add)}
        assigner_name = f"{assigned_by.first_name} {assigned_by.last_name}".strip()
        for user_id in ids_to_add:
            TaskAssignment.objects.create(
                task=task, user_id=user_id, assigned_by=assigned_by
            )
            if user_id != assigned_by.id and user_id in users_map:
                create_notification(
                    organization=task.organization,
                    recipient=users_map[user_id],
                    type="task_assigned",
                    title="Nouvelle tâche assignée",
                    message=f"{assigner_name} vous a assigné : {task.description}",
                    link="/tasks",
                )
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add backend/tasks/serializers.py backend/tasks/tests.py
git commit -m "feat(tasks): add assignees to TaskSerializer with sync and notifications"
```

---

### Task 4: Update TaskViewSet — prefetch + filter by assigned_to

**Files:**
- Modify: `backend/tasks/views.py`
- Test: `backend/tasks/tests.py`

**Step 1: Write the failing tests**

Add to `backend/tasks/tests.py`:

```python
def test_filter_by_assigned_to_me(self):
    """Filter assigned_to=me returns tasks assigned to current user."""
    from accounts.models import User
    user = User.objects.get(email="hugo@example.com")

    # Task assigned to me
    r1 = self.client.post(
        "/api/tasks/",
        {"description": "My task", "due_date": "2026-03-10T10:00:00Z", "assigned_to": [str(user.id)]},
        format="json",
    )
    # Task not assigned
    self.client.post(
        "/api/tasks/",
        {"description": "Unassigned", "due_date": "2026-03-11T10:00:00Z"},
    )

    response = self.client.get("/api/tasks/?assigned_to=me")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "My task")

def test_filter_by_assigned_to_user_id(self):
    """Filter assigned_to=<uuid> returns tasks assigned to that user."""
    from accounts.models import User
    user = User.objects.get(email="hugo@example.com")

    self.client.post(
        "/api/tasks/",
        {"description": "Assigned", "due_date": "2026-03-10T10:00:00Z", "assigned_to": [str(user.id)]},
        format="json",
    )
    self.client.post(
        "/api/tasks/",
        {"description": "Not assigned", "due_date": "2026-03-11T10:00:00Z"},
    )

    response = self.client.get(f"/api/tasks/?assigned_to={user.id}")
    self.assertEqual(response.data["count"], 1)
    self.assertEqual(response.data["results"][0]["description"], "Assigned")
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test tasks.tests.TaskTests.test_filter_by_assigned_to_me -v 2`
Expected: FAIL — filter not implemented.

**Step 3: Update the view**

Modify `backend/tasks/views.py`:

```python
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def _base_queryset(self):
        return Task.objects.filter(
            organization=self.request.organization
        ).select_related("contact", "deal").prefetch_related("assignments__user")

    def get_queryset(self):
        qs = self._base_queryset()
        params = self.request.query_params

        contact_id = params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)

        is_done = params.get("is_done")
        if is_done == "true":
            qs = qs.filter(is_done=True)
        elif is_done == "false":
            qs = qs.filter(is_done=False)

        priority = params.get("priority")
        if priority in ("high", "normal", "low"):
            qs = qs.filter(priority=priority)

        due_date = params.get("due_date")
        if due_date:
            now = timezone.now()
            if due_date == "overdue":
                qs = qs.filter(due_date__lt=now, is_done=False)
            elif due_date == "today":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end = start + timedelta(days=1)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)
            elif due_date == "this_week":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                start -= timedelta(days=start.weekday())
                end = start + timedelta(days=7)
                qs = qs.filter(due_date__gte=start, due_date__lt=end)

        assigned_to = params.get("assigned_to")
        if assigned_to:
            if assigned_to == "me":
                qs = qs.filter(assignments__user=self.request.user)
            else:
                qs = qs.filter(assignments__user_id=assigned_to)
            qs = qs.distinct()

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        base_qs = self._base_queryset()
        response.data["todo_count"] = base_qs.filter(is_done=False).count()
        response.data["done_count"] = base_qs.filter(is_done=True).count()
        return response

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )
```

Key changes: added `.prefetch_related("assignments__user")` and `assigned_to` filter with `me` shortcut + `.distinct()`.

**Step 4: Run tests to verify they pass**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add backend/tasks/views.py backend/tasks/tests.py
git commit -m "feat(tasks): add assigned_to filter with me shortcut"
```

---

### Task 5: Test assignment validation + notification creation

**Files:**
- Test: `backend/tasks/tests.py`

**Step 1: Write validation and notification tests**

Add to `backend/tasks/tests.py`:

```python
def test_assign_non_member_fails(self):
    """Assigning a user who is not a member of the org should fail validation."""
    import uuid as uuid_mod
    fake_user_id = str(uuid_mod.uuid4())
    response = self.client.post(
        "/api/tasks/",
        {
            "description": "Bad assign",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [fake_user_id],
        },
        format="json",
    )
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

def test_update_assignees(self):
    """Updating assigned_to should sync TaskAssignment records."""
    from accounts.models import User
    user = User.objects.get(email="hugo@example.com")

    # Create task without assignees
    r = self.client.post(
        "/api/tasks/",
        {"description": "Task", "due_date": "2026-03-10T10:00:00Z"},
    )
    task_id = r.data["id"]
    self.assertEqual(len(r.data["assignees"]), 0)

    # Add assignee
    r2 = self.client.patch(
        f"/api/tasks/{task_id}/",
        {"assigned_to": [str(user.id)]},
        format="json",
    )
    self.assertEqual(len(r2.data["assignees"]), 1)

    # Remove assignee
    r3 = self.client.patch(
        f"/api/tasks/{task_id}/",
        {"assigned_to": []},
        format="json",
    )
    self.assertEqual(len(r3.data["assignees"]), 0)

def test_notification_created_on_assign(self):
    """Assigning someone else should create a notification."""
    from accounts.models import User
    from notifications.models import Notification

    # Register a second user and add to org
    r = self.client.post("/api/auth/register/", {
        "email": "alice@example.com",
        "password": "securepass123",
        "first_name": "Alice",
        "last_name": "Martin",
    })
    alice = User.objects.get(email="alice@example.com")

    # Add alice to same org
    from organizations.models import Membership
    hugo = User.objects.get(email="hugo@example.com")
    org = hugo.memberships.first().organization
    Membership.objects.create(organization=org, user=alice, role="member")

    # Assign alice (as hugo)
    self.client.post(
        "/api/tasks/",
        {
            "description": "Tâche pour Alice",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [str(alice.id)],
        },
        format="json",
    )

    notif = Notification.objects.filter(recipient=alice, type="task_assigned").first()
    self.assertIsNotNone(notif)
    self.assertIn("Hugo", notif.message)
    self.assertIn("Tâche pour Alice", notif.message)

def test_no_self_notification(self):
    """Assigning yourself should not create a notification."""
    from accounts.models import User
    from notifications.models import Notification

    user = User.objects.get(email="hugo@example.com")
    self.client.post(
        "/api/tasks/",
        {
            "description": "Self assign",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [str(user.id)],
        },
        format="json",
    )

    count = Notification.objects.filter(recipient=user, type="task_assigned").count()
    self.assertEqual(count, 0)

def test_unique_assignment(self):
    """Assigning same user twice in update should not duplicate."""
    from accounts.models import User
    from tasks.models import TaskAssignment

    user = User.objects.get(email="hugo@example.com")
    r = self.client.post(
        "/api/tasks/",
        {
            "description": "Dedup test",
            "due_date": "2026-03-10T10:00:00Z",
            "assigned_to": [str(user.id)],
        },
        format="json",
    )
    task_id = r.data["id"]

    # Re-assign same user
    self.client.patch(
        f"/api/tasks/{task_id}/",
        {"assigned_to": [str(user.id)]},
        format="json",
    )
    self.assertEqual(TaskAssignment.objects.filter(task_id=task_id).count(), 1)
```

**Step 2: Run all tests**

Run: `cd backend && python manage.py test tasks -v 2`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add backend/tasks/tests.py
git commit -m "test(tasks): add assignment validation, notification, and dedup tests"
```

---

### Task 6: Frontend types + service updates

**Files:**
- Modify: `frontend/types/tasks.ts`
- Modify: `frontend/services/tasks.ts`

**Step 1: Update TypeScript types**

Add to `frontend/types/tasks.ts`:

```typescript
export interface TaskAssignee {
  user_id: string
  email: string
  first_name: string
  last_name: string
  assigned_at: string
}

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
  assignees: TaskAssignee[]
}

export interface TasksResponse {
  count: number
  todo_count: number
  done_count: number
  results: Task[]
}

export type TaskFilterTab = "all" | "todo" | "done"

export interface TaskFilters {
  is_done?: "true" | "false"
  priority?: "high" | "normal" | "low"
  contact?: string
  due_date?: "overdue" | "today" | "this_week"
  assigned_to?: string
  page?: number
}
```

**Step 2: Update tasks service**

Add `assigned_to` filter support in `frontend/services/tasks.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { Task, TasksResponse, TaskFilters } from "@/types"

export async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
  const params = new URLSearchParams()
  if (filters.page) params.set("page", String(filters.page))
  if (filters.is_done) params.set("is_done", filters.is_done)
  if (filters.priority) params.set("priority", filters.priority)
  if (filters.contact) params.set("contact", filters.contact)
  if (filters.due_date) params.set("due_date", filters.due_date)
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to)
  const qs = params.toString()
  return apiFetch<TasksResponse>(`/tasks/${qs ? `?${qs}` : ""}`)
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

**Step 3: Commit**

```bash
git add frontend/types/tasks.ts frontend/services/tasks.ts
git commit -m "feat(frontend): add assignee types and filter support"
```

---

### Task 7: useMemberAutocomplete hook

**Files:**
- Create: `frontend/hooks/useMemberAutocomplete.ts`

**Step 1: Create the hook**

This hook loads all members for the current org (they're typically few, so no search needed — just filter client-side). Based on existing `useContactAutocomplete` pattern but simpler.

```typescript
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Member } from "@/types"
import { fetchMembers } from "@/services/organizations"
import { useOrganization } from "@/lib/organization"

export function useMemberAutocomplete() {
  const { currentOrganization } = useOrganization()
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Member[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentOrganization) return
    setLoading(true)
    fetchMembers(currentOrganization.id)
      .then((data) => setAllMembers(data.members))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentOrganization?.id])

  const search = useCallback(
    (q: string) => {
      setQuery(q)
      if (q.length < 1) {
        setResults(allMembers)
        setOpen(allMembers.length > 0)
        return
      }
      const lower = q.toLowerCase()
      const filtered = allMembers.filter(
        (m) =>
          m.first_name.toLowerCase().includes(lower) ||
          m.last_name.toLowerCase().includes(lower) ||
          m.email.toLowerCase().includes(lower)
      )
      setResults(filtered)
      setOpen(filtered.length > 0)
    },
    [allMembers]
  )

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

  return { query, results, allMembers, loading, open, setOpen, search, reset, wrapperRef }
}
```

**Step 2: Commit**

```bash
git add frontend/hooks/useMemberAutocomplete.ts
git commit -m "feat(frontend): add useMemberAutocomplete hook"
```

---

### Task 8: Update TaskDialog with assignee multi-select

**Files:**
- Modify: `frontend/components/tasks/TaskDialog.tsx`

**Step 1: Add assignee multi-select to TaskDialog**

Update `frontend/components/tasks/TaskDialog.tsx`:

- Import `useMemberAutocomplete` and `X` icon
- Add state: `const [assigneeIds, setAssigneeIds] = useState<string[]>([])`
- In the `useEffect` for open/task, initialize from `task?.assignees`:
  ```typescript
  setAssigneeIds(task ? task.assignees.map((a) => a.user_id) : [])
  ```
- Add `assigned_to: assigneeIds` to the payload in `handleSave`
- Add this section after the "Contact associé" field:

```tsx
{/* Assignés */}
<div className="space-y-1.5">
  <Label>Assignés</Label>
  {/* Selected assignees as chips */}
  {assigneeIds.length > 0 && (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {assigneeIds.map((uid) => {
        const member = memberAutocomplete.allMembers.find((m) => m.user_id === uid)
        if (!member) return null
        return (
          <span
            key={uid}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium"
          >
            {member.first_name} {member.last_name}
            <button
              type="button"
              onClick={() => setAssigneeIds((prev) => prev.filter((id) => id !== uid))}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      })}
    </div>
  )}
  {/* Search input */}
  <div ref={memberAutocomplete.wrapperRef} className="relative">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={memberAutocomplete.query}
        onChange={(e) => memberAutocomplete.search(e.target.value)}
        onFocus={() => {
          // Show all available members on focus
          memberAutocomplete.search(memberAutocomplete.query)
        }}
        placeholder="Rechercher un membre…"
        className="pl-8"
      />
    </div>
    {memberAutocomplete.open && (
      <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
        {memberAutocomplete.results
          .filter((m) => !assigneeIds.includes(m.user_id))
          .map((m) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => {
                setAssigneeIds((prev) => [...prev, m.user_id])
                memberAutocomplete.reset()
              }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
            >
              {m.first_name} {m.last_name}
              <span className="ml-auto text-xs text-muted-foreground">{m.email}</span>
            </button>
          ))}
        {memberAutocomplete.results.filter((m) => !assigneeIds.includes(m.user_id)).length === 0 && (
          <div className="px-3 py-3 text-sm text-muted-foreground text-center">
            {memberAutocomplete.query ? "Aucun membre trouvé" : "Tous les membres sont déjà assignés"}
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx next build 2>&1 | head -30` (or `npx tsc --noEmit`)
Expected: No type errors.

**Step 3: Commit**

```bash
git add frontend/components/tasks/TaskDialog.tsx
git commit -m "feat(frontend): add assignee multi-select to TaskDialog"
```

---

### Task 9: Update TaskList with assignee avatars

**Files:**
- Modify: `frontend/components/tasks/TaskList.tsx`

**Step 1: Add assignee avatars**

In `frontend/components/tasks/TaskList.tsx`, add an assignee avatar section in each task row, between the metadata row and the priority badge:

```tsx
{/* After the metadata div, before the priority badge div */}
{task.assignees && task.assignees.length > 0 && (
  <div className="flex items-center gap-1 mt-1">
    {task.assignees.slice(0, 3).map((a) => (
      <span
        key={a.user_id}
        title={`${a.first_name} ${a.last_name}`}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0"
      >
        {a.first_name[0]}{a.last_name[0]}
      </span>
    ))}
    {task.assignees.length > 3 && (
      <span
        title={task.assignees.slice(3).map((a) => `${a.first_name} ${a.last_name}`).join(", ")}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-[10px] font-medium shrink-0"
      >
        +{task.assignees.length - 3}
      </span>
    )}
  </div>
)}
```

Move the avatars into the flex-1 content area, after the `flex-wrap` metadata div.

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/components/tasks/TaskList.tsx
git commit -m "feat(frontend): display assignee avatars in TaskList"
```

---

### Task 10: Add assignee filter to tasks page

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Step 1: Add assignee filter state and UI**

In `frontend/app/(app)/tasks/page.tsx`:

1. Import `useMemberAutocomplete` from `@/hooks/useMemberAutocomplete`
2. Add state:
   ```typescript
   const [assignedTo, setAssignedTo] = useState<string | null>(null)
   const [assignedLabel, setAssignedLabel] = useState<string | null>(null)
   const memberAutocomplete = useMemberAutocomplete()
   ```
3. Add `assigned_to` to filters:
   ```typescript
   if (assignedTo) filters.assigned_to = assignedTo
   ```
4. Add a "Mes tâches" pill button and assignee search after the contact filter section:

```tsx
<div className="w-px h-5 bg-border" />

{/* Assigned to filter */}
<div className="flex items-center gap-1.5">
  <button
    onClick={() => {
      if (assignedTo === "me") {
        setAssignedTo(null)
        setAssignedLabel(null)
      } else {
        setAssignedTo("me")
        setAssignedLabel("Mes tâches")
      }
      resetPage()
    }}
    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
      assignedTo === "me"
        ? "bg-primary text-primary-foreground"
        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
    }`}
  >
    Mes tâches
  </button>

  <div className="relative" ref={memberAutocomplete.wrapperRef}>
    {assignedTo && assignedTo !== "me" ? (
      <button
        onClick={() => {
          setAssignedTo(null)
          setAssignedLabel(null)
          memberAutocomplete.reset()
          resetPage()
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors"
      >
        {assignedLabel}
        <X className="h-3 w-3" />
      </button>
    ) : assignedTo !== "me" ? (
      <>
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filtrer par assigné..."
          value={memberAutocomplete.query}
          onChange={(e) => memberAutocomplete.search(e.target.value)}
          className="pl-8 h-8 w-48 text-xs bg-secondary/30 border-border/60"
        />
        {memberAutocomplete.open && memberAutocomplete.results.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
            {memberAutocomplete.results.map((m) => (
              <button
                key={m.user_id}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                onClick={() => {
                  setAssignedTo(m.user_id)
                  setAssignedLabel(`${m.first_name} ${m.last_name}`.trim())
                  memberAutocomplete.reset()
                  resetPage()
                }}
              >
                {m.first_name} {m.last_name}
                {m.email && <span className="text-muted-foreground ml-1">({m.email})</span>}
              </button>
            ))}
          </div>
        )}
      </>
    ) : null}
  </div>
</div>
```

**Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/app/(app)/tasks/page.tsx
git commit -m "feat(frontend): add assignee filter and 'Mes tâches' shortcut"
```

---

### Task 11: Run full test suite + manual verification

**Step 1: Run backend tests**

Run: `cd backend && python manage.py test -v 2`
Expected: All tests PASS.

**Step 2: Run frontend build**

Run: `cd frontend && npx next build`
Expected: Build succeeds with no errors.

**Step 3: Commit any fixes if needed**

---

### Task 12: Final commit

```bash
git add -A
git commit -m "feat(tasks): complete task assignment with multi-assignee, filtering, and notifications"
```
