# Soft Delete / Corbeille — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add soft delete (corbeille) to Contact, Deal, Task with cascade, auto-purge after 30 days, and a dedicated `/trash` page.

**Architecture:** A `SoftDeleteModel` abstract mixin adds `deleted_at`, `deleted_by`, `deletion_source` to Contact, Deal, Task. A custom manager filters out deleted items by default. A new `trash` Django app provides the trash API endpoints and Celery purge task. The frontend gets a new `/trash` page with tabs and restore/delete actions.

**Tech Stack:** Django 5.1 + DRF 3.15, Celery, Next.js 16 + React 19, Tailwind + shadcn/ui, Sonner toasts, Lucide icons

---

## Task 1: Create SoftDeleteModel mixin

**Files:**
- Create: `backend/core/__init__.py`
- Create: `backend/core/models.py`

**Step 1: Create core app directory**

```bash
mkdir -p backend/core
touch backend/core/__init__.py
```

**Step 2: Write the SoftDeleteModel mixin**

Create `backend/core/models.py`:

```python
from django.db import models
from django.conf import settings
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class AllObjectsManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    deletion_source = models.CharField(max_length=255, null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def soft_delete(self, user=None, source="direct"):
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.deletion_source = source
        self.save(update_fields=["deleted_at", "deleted_by", "deletion_source"])

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.deletion_source = None
        self.save(update_fields=["deleted_at", "deleted_by", "deletion_source"])

    def hard_delete(self):
        super().delete()

    @property
    def is_deleted(self):
        return self.deleted_at is not None
```

**Step 3: Commit**

```bash
git add backend/core/
git commit -m "feat(core): add SoftDeleteModel mixin"
```

---

## Task 2: Apply SoftDeleteModel to Contact, Deal, Task

**Files:**
- Modify: `backend/contacts/models.py:6` (Contact class)
- Modify: `backend/deals/models.py:110` (Deal class)
- Modify: `backend/tasks/models.py:6` (Task class)

**Step 1: Update Contact model**

In `backend/contacts/models.py`, add import and mixin:

```python
# Add at top:
from core.models import SoftDeleteModel

# Change line 6:
class Contact(SoftDeleteModel):  # was: class Contact(models.Model)
```

Override `soft_delete` for cascade:

```python
    def soft_delete(self, user=None, source="direct"):
        super().soft_delete(user=user, source=source)
        cascade_source = f"cascade_contact:{self.id}"
        # Cascade to deals
        for deal in Deal.objects.filter(contact=self):
            deal.soft_delete(user=user, source=cascade_source)
        # Cascade to tasks linked directly to this contact (not via deal)
        from tasks.models import Task
        Task.objects.filter(contact=self).update(
            deleted_at=self.deleted_at,
            deleted_by=user,
            deletion_source=cascade_source,
        )

    def restore(self):
        cascade_source = f"cascade_contact:{self.id}"
        # Restore cascaded deals
        Deal.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        # Restore cascaded tasks (from contact AND from deals)
        from tasks.models import Task
        Task.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        super().restore()
```

Note: The `Deal` import is already available in contacts via `from deals.models import Deal` — add it if not present, or use a late import to avoid circular imports.

**Step 2: Update Deal model**

In `backend/deals/models.py`, add import and mixin:

```python
from core.models import SoftDeleteModel

class Deal(SoftDeleteModel):  # was: class Deal(models.Model)
```

Override `soft_delete` for cascade to tasks:

```python
    def soft_delete(self, user=None, source="direct"):
        super().soft_delete(user=user, source=source)
        cascade_source = source if source.startswith("cascade_contact:") else f"cascade_deal:{self.id}"
        from tasks.models import Task
        Task.objects.filter(deal=self).update(
            deleted_at=self.deleted_at,
            deleted_by=user,
            deletion_source=cascade_source,
        )

    def restore(self):
        cascade_source = f"cascade_deal:{self.id}"
        from tasks.models import Task
        Task.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        super().restore()
```

**Step 3: Update Task model**

In `backend/tasks/models.py`:

```python
from core.models import SoftDeleteModel

class Task(SoftDeleteModel):  # was: class Task(models.Model)
```

No cascade override needed for Task.

**Step 4: Generate and run migrations**

```bash
cd backend
python manage.py makemigrations contacts deals tasks
python manage.py migrate
```

This will create 3 migration files adding `deleted_at`, `deleted_by`, `deletion_source` to each model.

**Step 5: Commit**

```bash
git add backend/contacts/ backend/deals/ backend/tasks/
git commit -m "feat(models): apply SoftDeleteModel to Contact, Deal, Task"
```

---

## Task 3: Update ViewSets to use soft delete

**Files:**
- Modify: `backend/contacts/views.py:11` (ContactViewSet)
- Modify: `backend/deals/views.py:169` (DealViewSet)
- Modify: `backend/tasks/views.py:10` (TaskViewSet)

**Step 1: Update ContactViewSet**

In `backend/contacts/views.py`, add `perform_destroy`:

```python
class ContactViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)
```

**Step 2: Update DealViewSet**

In `backend/deals/views.py`, add `perform_destroy`:

```python
class DealViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)
```

**Step 3: Update TaskViewSet**

In `backend/tasks/views.py`, add `perform_destroy`:

```python
class TaskViewSet(viewsets.ModelViewSet):
    # ... existing code ...

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)
```

**Step 4: Commit**

```bash
git add backend/contacts/views.py backend/deals/views.py backend/tasks/views.py
git commit -m "feat(views): use soft delete in Contact, Deal, Task ViewSets"
```

---

## Task 4: Fix queryset references that need to see all objects

**Files:**
- Modify: `backend/tasks/celery_tasks.py` — task reminders must still query soft-deleted-excluded tasks (already handled by default manager, but verify)
- Modify: `backend/contacts/views.py` — search_contacts if it uses custom querysets
- Modify: `backend/deals/views.py` — DealViewSet.get_queryset uses Deal.objects which is now filtered

**Step 1: Audit and verify**

The `SoftDeleteManager` is set as `objects`, so all existing `Model.objects.filter(...)` calls will automatically exclude deleted items. This is the desired behavior for:
- ViewSet querysets (list/retrieve)
- Task reminder checks
- Search endpoints
- Dashboard/report queries

Verify that no code path needs to see deleted items (except the new trash endpoints). If any code uses `Model.objects.all()` expecting to include deleted items, switch to `Model.all_objects.all()`.

Check these files specifically:
- `backend/tasks/celery_tasks.py` — uses `Task.objects.filter(...)` which will correctly exclude deleted tasks
- `backend/notes/views.py` — timeline entries use CASCADE from Contact/Deal, but Contact/Deal aren't actually deleted, so timeline entries remain intact

**Step 2: Commit if changes needed**

```bash
git add -A
git commit -m "fix: ensure queryset references work with soft delete"
```

---

## Task 5: Create Trash API app

**Files:**
- Create: `backend/trash/__init__.py`
- Create: `backend/trash/views.py`
- Create: `backend/trash/urls.py`
- Create: `backend/trash/serializers.py`
- Modify: `backend/config/urls.py:4` (add trash URL)
- Modify: `backend/config/settings.py:30` (add to INSTALLED_APPS)

**Step 1: Create trash app**

```bash
mkdir -p backend/trash
touch backend/trash/__init__.py
```

**Step 2: Write serializer**

Create `backend/trash/serializers.py`:

```python
from rest_framework import serializers


class TrashItemSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.UUIDField()
    name = serializers.CharField()
    deleted_at = serializers.DateTimeField()
    deleted_by_name = serializers.CharField(allow_null=True)
    deletion_source = serializers.CharField(allow_null=True)
```

**Step 3: Write views**

Create `backend/trash/views.py`:

```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task


MODEL_MAP = {
    "contact": Contact,
    "deal": Deal,
    "task": Task,
}


def _get_name(obj):
    if hasattr(obj, "name"):
        return obj.name
    if hasattr(obj, "first_name"):
        return f"{obj.first_name} {obj.last_name}".strip()
    if hasattr(obj, "description"):
        return obj.description[:50]
    return str(obj.id)


def _serialize_item(obj, item_type):
    return {
        "type": item_type,
        "id": str(obj.id),
        "name": _get_name(obj),
        "deleted_at": obj.deleted_at.isoformat() if obj.deleted_at else None,
        "deleted_by_name": (
            obj.deleted_by.get_full_name() or obj.deleted_by.email
            if obj.deleted_by
            else None
        ),
        "deletion_source": obj.deletion_source,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trash_list(request):
    org = request.organization
    type_filter = request.query_params.get("type")

    items = []
    for item_type, Model in MODEL_MAP.items():
        if type_filter and type_filter != item_type:
            continue
        qs = Model.all_objects.filter(
            organization=org,
            deleted_at__isnull=False,
        ).select_related("deleted_by").order_by("-deleted_at")
        for obj in qs:
            items.append(_serialize_item(obj, item_type))

    # Sort all items by deleted_at descending
    items.sort(key=lambda x: x["deleted_at"] or "", reverse=True)
    return Response(items)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trash_restore(request):
    item_type = request.data.get("type")
    ids = request.data.get("ids", [])

    Model = MODEL_MAP.get(item_type)
    if not Model:
        return Response(
            {"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST
        )

    org = request.organization
    restored = 0
    for obj in Model.all_objects.filter(
        organization=org, id__in=ids, deleted_at__isnull=False
    ):
        obj.restore()
        restored += 1

    return Response({"restored": restored})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def trash_permanent_delete(request):
    item_type = request.data.get("type")
    ids = request.data.get("ids", [])

    Model = MODEL_MAP.get(item_type)
    if not Model:
        return Response(
            {"error": "Invalid type"}, status=status.HTTP_400_BAD_REQUEST
        )

    org = request.organization
    count, _ = Model.all_objects.filter(
        organization=org, id__in=ids, deleted_at__isnull=False
    ).delete()

    return Response({"deleted": count})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def trash_empty(request):
    org = request.organization
    total = 0
    # Order matters: Tasks first, then Deals, then Contacts (FK constraints)
    for Model in [Task, Deal, Contact]:
        count, _ = Model.all_objects.filter(
            organization=org, deleted_at__isnull=False
        ).delete()
        total += count

    return Response({"deleted": total})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trash_counts(request):
    org = request.organization
    counts = {}
    for item_type, Model in MODEL_MAP.items():
        counts[item_type] = Model.all_objects.filter(
            organization=org, deleted_at__isnull=False
        ).count()
    counts["total"] = sum(counts.values())
    return Response(counts)
```

**Step 4: Write URLs**

Create `backend/trash/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("", views.trash_list, name="trash-list"),
    path("restore/", views.trash_restore, name="trash-restore"),
    path("permanent-delete/", views.trash_permanent_delete, name="trash-permanent-delete"),
    path("empty/", views.trash_empty, name="trash-empty"),
    path("counts/", views.trash_counts, name="trash-counts"),
]
```

**Step 5: Register in settings and URLs**

In `backend/config/settings.py` at line 46 (before the closing `]`), add:

```python
    "trash",
```

In `backend/config/urls.py`, add after line 27:

```python
    path("api/trash/", include("trash.urls")),
```

**Step 6: Commit**

```bash
git add backend/trash/ backend/config/urls.py backend/config/settings.py
git commit -m "feat(trash): add trash API endpoints (list, restore, permanent-delete, empty, counts)"
```

---

## Task 6: Add Celery purge task

**Files:**
- Create: `backend/trash/tasks.py`
- Modify: `backend/config/settings.py:214-219` (CELERY_BEAT_SCHEDULE)

**Step 1: Write purge task**

Create `backend/trash/tasks.py`:

```python
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task


@shared_task
def purge_trash():
    cutoff = timezone.now() - timedelta(days=30)
    total = 0
    # Order: Tasks -> Deals -> Contacts (FK constraints)
    for Model in [Task, Deal, Contact]:
        count, _ = Model.all_objects.filter(
            deleted_at__isnull=False,
            deleted_at__lte=cutoff,
        ).delete()
        total += count
    return f"Purged {total} items from trash"
```

**Step 2: Add to CELERY_BEAT_SCHEDULE**

In `backend/config/settings.py`, update the `CELERY_BEAT_SCHEDULE` dict (around line 214) to add:

```python
    "purge-trash": {
        "task": "trash.tasks.purge_trash",
        "schedule": 86400,  # every 24 hours
    },
```

**Step 3: Commit**

```bash
git add backend/trash/tasks.py backend/config/settings.py
git commit -m "feat(trash): add Celery purge task (30-day retention)"
```

---

## Task 7: Create frontend trash service and types

**Files:**
- Create: `frontend/types/trash.ts`
- Create: `frontend/services/trash.ts`
- Create: `frontend/hooks/useTrash.ts`

**Step 1: Write types**

Create `frontend/types/trash.ts`:

```typescript
export interface TrashItem {
  type: "contact" | "deal" | "task"
  id: string
  name: string
  deleted_at: string
  deleted_by_name: string | null
  deletion_source: string | null
}

export interface TrashCounts {
  contact: number
  deal: number
  task: number
  total: number
}
```

**Step 2: Write service**

Create `frontend/services/trash.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { TrashItem, TrashCounts } from "@/types/trash"

export async function fetchTrash(type?: string): Promise<TrashItem[]> {
  const params = type ? `?type=${type}` : ""
  return apiFetch<TrashItem[]>(`/trash/${params}`)
}

export async function fetchTrashCounts(): Promise<TrashCounts> {
  return apiFetch<TrashCounts>("/trash/counts/")
}

export async function restoreItems(type: string, ids: string[]): Promise<void> {
  await apiFetch("/trash/restore/", {
    method: "POST",
    json: { type, ids },
  })
}

export async function permanentDeleteItems(type: string, ids: string[]): Promise<void> {
  await apiFetch("/trash/permanent-delete/", {
    method: "DELETE",
    json: { type, ids },
  })
}

export async function emptyTrash(): Promise<void> {
  await apiFetch("/trash/empty/", { method: "DELETE" })
}
```

**Step 3: Write hook**

Create `frontend/hooks/useTrash.ts`:

```typescript
"use client"

import { useState, useCallback, useEffect } from "react"
import { useOrganization } from "@/hooks/useOrganization"
import { fetchTrash, fetchTrashCounts } from "@/services/trash"
import type { TrashItem, TrashCounts } from "@/types/trash"

export function useTrash(typeFilter?: string) {
  const { orgVersion } = useOrganization()
  const [items, setItems] = useState<TrashItem[]>([])
  const [counts, setCounts] = useState<TrashCounts>({ contact: 0, deal: 0, task: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const [trashItems, trashCounts] = await Promise.all([
        fetchTrash(typeFilter),
        fetchTrashCounts(),
      ])
      setItems(trashItems)
      setCounts(trashCounts)
    } finally {
      setLoading(false)
    }
  }, [orgVersion, typeFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, counts, loading, refresh }
}
```

**Step 4: Commit**

```bash
git add frontend/types/trash.ts frontend/services/trash.ts frontend/hooks/useTrash.ts
git commit -m "feat(frontend): add trash service, types, and hook"
```

---

## Task 8: Create Trash page

**Files:**
- Create: `frontend/app/(app)/trash/page.tsx`

**Step 1: Build the trash page**

Create `frontend/app/(app)/trash/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/PageHeader"
import { useTrash } from "@/hooks/useTrash"
import { restoreItems, permanentDeleteItems, emptyTrash } from "@/services/trash"
import type { TrashItem } from "@/types/trash"

const TYPE_LABELS: Record<string, string> = {
  contact: "Contacts",
  deal: "Deals",
  task: "Taches",
}

function TrashTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRestore,
  onPermanentDelete,
}: {
  items: TrashItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onRestore: (ids: string[]) => void
  onPermanentDelete: (ids: string[]) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Trash2 className="h-12 w-12 mb-4 opacity-30" />
        <p>La corbeille est vide</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-3 w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={onToggleAll}
                className="rounded border-input"
              />
            </th>
            <th className="p-3">Nom</th>
            <th className="p-3">Supprime par</th>
            <th className="p-3">Date de suppression</th>
            <th className="p-3">Source</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-muted/50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="rounded border-input"
                />
              </td>
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3 text-muted-foreground">
                {item.deleted_by_name || "-"}
              </td>
              <td className="p-3 text-muted-foreground">
                {new Date(item.deleted_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="p-3">
                {item.deletion_source && item.deletion_source !== "direct" ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Cascade
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">Direct</span>
                )}
              </td>
              <td className="p-3 text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRestore([item.id])}
                  title="Restaurer"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onPermanentDelete([item.id])}
                  title="Supprimer definitivement"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState("contact")
  const { items, counts, loading, refresh } = useTrash(activeTab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false)
  const [emptying, setEmptying] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const handleRestore = async (ids: string[]) => {
    try {
      await restoreItems(activeTab, ids)
      toast.success(`${ids.length} element(s) restaure(s)`)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors de la restauration")
    }
  }

  const handlePermanentDelete = async (ids: string[]) => {
    try {
      await permanentDeleteItems(activeTab, ids)
      toast.success(`${ids.length} element(s) supprime(s) definitivement`)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleEmpty = async () => {
    setEmptying(true)
    try {
      await emptyTrash()
      toast.success("Corbeille videe")
      setEmptyDialogOpen(false)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors du vidage de la corbeille")
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Corbeille">
        {counts.total > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setEmptyDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider la corbeille
          </Button>
        )}
      </PageHeader>

      <div className="px-6 pb-2">
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Les elements sont supprimes definitivement apres 30 jours.
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()) }}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                  {counts[key as keyof typeof counts] > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                      {counts[key as keyof typeof counts]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selectionne(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(Array.from(selectedIds))}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handlePermanentDelete(Array.from(selectedIds))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            Object.keys(TYPE_LABELS).map((key) => (
              <TabsContent key={key} value={key}>
                <TrashTable
                  items={items}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleAll={toggleAll}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              </TabsContent>
            ))
          )}
        </Tabs>
      </div>

      <Dialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider la corbeille</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irreversible. Tous les elements de la corbeille
            ({counts.total}) seront supprimes definitivement.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEmptyDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleEmpty} disabled={emptying}>
              {emptying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vider definitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/trash/
git commit -m "feat(frontend): add Trash page with tabs, restore, bulk actions"
```

---

## Task 9: Add Trash to sidebar navigation

**Files:**
- Modify: `frontend/components/Sidebar.tsx:38-49` (navigation array)

**Step 1: Add trash nav item**

In `frontend/components/Sidebar.tsx`, add to the `navigation` array (after the last item, around line 48):

```typescript
  { name: "Corbeille", href: "/trash", icon: Trash2 },
```

Make sure `Trash2` is imported from `lucide-react` at the top of the file.

**Step 2: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(sidebar): add Corbeille nav item"
```

---

## Task 10: Add undo toast on delete actions

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx` (contact delete handler)
- Modify: `frontend/components/deals/KanbanBoard.tsx` or wherever deal delete is triggered
- Modify: `frontend/app/(app)/tasks/page.tsx` or wherever task delete is triggered

**Step 1: Update contact delete handler**

In the contact detail page, after the delete call succeeds, replace the simple toast with an undo toast:

```typescript
import { restoreItems } from "@/services/trash"

// In the delete handler, after successful delete:
toast("Contact supprime", {
  action: {
    label: "Annuler",
    onClick: async () => {
      try {
        await restoreItems("contact", [contactId])
        toast.success("Contact restaure")
        // Navigate back or refresh
      } catch {
        toast.error("Erreur lors de la restauration")
      }
    },
  },
  duration: 5000,
})
```

**Step 2: Apply same pattern to deal and task delete handlers**

Same pattern — replace `toast.success("Supprime")` with undo toast using `restoreItems`.

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add undo toast on delete actions"
```

---

## Task 11: Update existing delete tests

**Files:**
- Modify: `backend/contacts/tests.py` (test_delete_contact)
- Modify: `backend/tasks/tests.py` (test_delete_task)

**Step 1: Update contact delete test**

The existing `test_delete_contact` expects `204` and the contact to be gone. Now it should still return `204` but the contact should exist with `deleted_at` set:

```python
def test_delete_contact(self):
    create = self.client.post("/api/contacts/", {...}, format="json")
    contact_id = create.data["id"]
    response = self.client.delete(f"/api/contacts/{contact_id}/")
    self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    # Should not appear in normal list
    list_response = self.client.get("/api/contacts/")
    ids = [c["id"] for c in list_response.data["results"]]
    self.assertNotIn(contact_id, ids)

    # Should still exist in DB with deleted_at set
    from contacts.models import Contact
    contact = Contact.all_objects.get(id=contact_id)
    self.assertIsNotNone(contact.deleted_at)
```

**Step 2: Add cascade test**

```python
def test_delete_contact_cascades_to_deals(self):
    # Create contact, then deal linked to contact
    contact = self.client.post("/api/contacts/", {...}, format="json")
    deal = self.client.post("/api/deals/", {"contact": contact.data["id"], ...}, format="json")

    # Delete contact
    self.client.delete(f"/api/contacts/{contact.data['id']}/")

    # Deal should be soft-deleted too
    from deals.models import Deal
    deal_obj = Deal.all_objects.get(id=deal.data["id"])
    self.assertIsNotNone(deal_obj.deleted_at)
    self.assertTrue(deal_obj.deletion_source.startswith("cascade_contact:"))
```

**Step 3: Add restore test**

```python
def test_restore_contact_restores_cascaded(self):
    # Create contact + deal, delete contact
    # ... (same setup as above)

    # Restore via trash API
    response = self.client.post("/api/trash/restore/", {
        "type": "contact",
        "ids": [str(contact.data["id"])],
    }, format="json")
    self.assertEqual(response.status_code, 200)

    # Both contact and deal should be alive
    from contacts.models import Contact
    from deals.models import Deal
    self.assertIsNone(Contact.objects.get(id=contact.data["id"]).deleted_at)
    self.assertIsNone(Deal.objects.get(id=deal.data["id"]).deleted_at)
```

**Step 4: Run tests**

```bash
cd backend
python manage.py test contacts tasks
```

**Step 5: Commit**

```bash
git add backend/contacts/tests.py backend/tasks/tests.py
git commit -m "test: update delete tests for soft delete, add cascade and restore tests"
```

---

## Task 12: Add trash API tests

**Files:**
- Create: `backend/trash/tests.py`

**Step 1: Write trash endpoint tests**

Create `backend/trash/tests.py`:

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task


class TrashAPITestCase(TestCase):
    def setUp(self):
        # Create user, org, authenticate (follow pattern from contacts/tests.py)
        self.client = APIClient()
        # ... setup auth ...

    def test_trash_list_empty(self):
        response = self.client.get("/api/trash/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_trash_list_shows_deleted(self):
        # Create and soft-delete a contact
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete(user=self.user)

        response = self.client.get("/api/trash/")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "contact")

    def test_trash_filter_by_type(self):
        # Create deleted contact and task
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete()
        task = Task.objects.create(organization=self.org, description="Test task")
        task.soft_delete()

        response = self.client.get("/api/trash/?type=contact")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "contact")

    def test_restore_items(self):
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete()

        response = self.client.post("/api/trash/restore/", {
            "type": "contact",
            "ids": [str(contact.id)],
        }, format="json")
        self.assertEqual(response.status_code, 200)

        contact.refresh_from_db()
        self.assertIsNone(contact.deleted_at)

    def test_permanent_delete(self):
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete()

        response = self.client.delete("/api/trash/permanent-delete/", {
            "type": "contact",
            "ids": [str(contact.id)],
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Contact.all_objects.filter(id=contact.id).exists())

    def test_empty_trash(self):
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete()

        response = self.client.delete("/api/trash/empty/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Contact.all_objects.filter(id=contact.id).exists())

    def test_counts(self):
        contact = Contact.objects.create(organization=self.org, first_name="Test")
        contact.soft_delete()

        response = self.client.get("/api/trash/counts/")
        self.assertEqual(response.data["contact"], 1)
        self.assertEqual(response.data["deal"], 0)
        self.assertEqual(response.data["total"], 1)
```

Note: Copy the auth setup pattern from `backend/contacts/tests.py` setUp method.

**Step 2: Run tests**

```bash
cd backend
python manage.py test trash
```

**Step 3: Commit**

```bash
git add backend/trash/tests.py
git commit -m "test: add trash API endpoint tests"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | SoftDeleteModel mixin | `backend/core/models.py` |
| 2 | Apply to Contact, Deal, Task + migrations | `backend/*/models.py` |
| 3 | Update ViewSets to soft delete | `backend/*/views.py` |
| 4 | Audit queryset references | Various |
| 5 | Trash API app (list, restore, delete, empty) | `backend/trash/` |
| 6 | Celery purge task | `backend/trash/tasks.py` |
| 7 | Frontend service, types, hook | `frontend/services/trash.ts` etc. |
| 8 | Trash page | `frontend/app/(app)/trash/page.tsx` |
| 9 | Sidebar nav item | `frontend/components/Sidebar.tsx` |
| 10 | Undo toast on delete | Contact/Deal/Task pages |
| 11 | Update existing delete tests | `backend/*/tests.py` |
| 12 | Trash API tests | `backend/trash/tests.py` |
