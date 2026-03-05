# Multi-Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow organizations to have multiple sales pipelines, each with its own stages and deals.

**Architecture:** Add a `Pipeline` model between Organization and PipelineStage. Migrate existing stages to a default "Principal" pipeline. Frontend adds tabs above Kanban and a two-level settings page (pipeline list → stage config).

**Tech Stack:** Django 5.1.4, DRF, PostgreSQL, Next.js 16, React 19, shadcn/ui, @dnd-kit, Tailwind CSS

---

### Task 1: Backend — Pipeline model + migration

**Files:**
- Modify: `backend/deals/models.py`

**What to do:**

Add a `Pipeline` model and update `PipelineStage` to reference it. Keep `organization` on `PipelineStage` for now (the data migration will handle the transition — we remove it in task 2).

Replace the entire `backend/deals/models.py` with:

```python
import uuid
from django.db import models
from django.conf import settings

DEFAULT_STAGES = [
    {"name": "Premier contact", "color": "#6366F1", "order": 1},
    {"name": "En discussion", "color": "#F59E0B", "order": 2},
    {"name": "Devis envoyé", "color": "#3B82F6", "order": 3},
    {"name": "Négociation", "color": "#8B5CF6", "order": 4},
    {"name": "Gagné", "color": "#10B981", "order": 5},
    {"name": "Perdu", "color": "#EF4444", "order": 6},
]

PIPELINE_TEMPLATES = {
    "prospection": [
        {"name": "Premier contact", "color": "#6366F1", "order": 1},
        {"name": "Qualification", "color": "#F59E0B", "order": 2},
        {"name": "Proposition", "color": "#3B82F6", "order": 3},
        {"name": "Négociation", "color": "#8B5CF6", "order": 4},
        {"name": "Gagné", "color": "#10B981", "order": 5},
        {"name": "Perdu", "color": "#EF4444", "order": 6},
    ],
    "upsell": [
        {"name": "Identification", "color": "#6366F1", "order": 1},
        {"name": "Proposition", "color": "#F59E0B", "order": 2},
        {"name": "Décision", "color": "#3B82F6", "order": 3},
        {"name": "Gagné", "color": "#10B981", "order": 4},
        {"name": "Perdu", "color": "#EF4444", "order": 5},
    ],
    "partenariats": [
        {"name": "Prise de contact", "color": "#6366F1", "order": 1},
        {"name": "Évaluation", "color": "#F59E0B", "order": 2},
        {"name": "Négociation", "color": "#3B82F6", "order": 3},
        {"name": "Signé", "color": "#10B981", "order": 4},
        {"name": "Abandonné", "color": "#EF4444", "order": 5},
    ],
}


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="pipelines",
    )
    name = models.CharField(max_length=150)
    order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        pipeline = cls.objects.create(
            organization=organization,
            name="Principal",
            is_default=True,
            order=0,
        )
        for stage_data in DEFAULT_STAGES:
            PipelineStage.objects.create(pipeline=pipeline, **stage_data)
        return pipeline

    @classmethod
    def create_from_template(cls, organization, name, template_key):
        max_order = (
            cls.objects.filter(organization=organization)
            .aggregate(m=models.Max("order"))["m"]
            or -1
        )
        pipeline = cls.objects.create(
            organization=organization,
            name=name,
            order=max_order + 1,
        )
        stages = PIPELINE_TEMPLATES.get(template_key, [])
        for stage_data in stages:
            PipelineStage.objects.create(pipeline=pipeline, **stage_data)
        return pipeline


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name="stages",
        null=True,  # nullable during migration only
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="pipeline_stages",
        null=True,  # will be removed after migration
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default="#6366F1")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        """Legacy method — creates a default Pipeline + stages."""
        Pipeline.create_defaults(organization)


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deals",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.ForeignKey(
        PipelineStage, on_delete=models.PROTECT, related_name="deals"
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
    )
    probability = models.IntegerField(null=True, blank=True)
    expected_close = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
```

Then run:
```bash
docker compose exec backend python manage.py makemigrations deals
```

This creates the migration that adds the Pipeline model and the `pipeline` FK on PipelineStage.

**Commit:** `feat(deals): add Pipeline model with templates`

---

### Task 2: Backend — Data migration + remove organization from PipelineStage

**Files:**
- Create: `backend/deals/migrations/XXXX_migrate_stages_to_pipelines.py` (data migration)

**What to do:**

Create a data migration that:
1. For each organization that has pipeline stages, creates a Pipeline "Principal" (is_default=True)
2. Assigns all existing PipelineStage records to their org's new pipeline
3. Sets organization=NULL on PipelineStage (prep for column removal)

```bash
docker compose exec backend python manage.py makemigrations deals --empty -n migrate_stages_to_pipelines
```

Then edit the generated migration file:

```python
from django.db import migrations


def migrate_stages_to_pipelines(apps, schema_editor):
    Pipeline = apps.get_model("deals", "Pipeline")
    PipelineStage = apps.get_model("deals", "PipelineStage")
    Organization = apps.get_model("organizations", "Organization")

    # Get all orgs that have stages
    org_ids = PipelineStage.objects.values_list("organization_id", flat=True).distinct()
    for org_id in org_ids:
        pipeline = Pipeline.objects.create(
            organization_id=org_id,
            name="Principal",
            is_default=True,
            order=0,
        )
        PipelineStage.objects.filter(organization_id=org_id).update(pipeline=pipeline)

    # Also create pipelines for orgs that have no stages yet
    orgs_without = Organization.objects.exclude(id__in=org_ids)
    for org in orgs_without:
        Pipeline.objects.create(
            organization=org,
            name="Principal",
            is_default=True,
            order=0,
        )


def reverse_migration(apps, schema_editor):
    Pipeline = apps.get_model("deals", "Pipeline")
    PipelineStage = apps.get_model("deals", "PipelineStage")

    for stage in PipelineStage.objects.select_related("pipeline").all():
        if stage.pipeline:
            stage.organization_id = stage.pipeline.organization_id
            stage.save(update_fields=["organization_id"])

    Pipeline.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("deals", "PREVIOUS_MIGRATION"),  # Replace with actual previous migration name
        ("organizations", "0001_initial"),  # Adjust if different
    ]

    operations = [
        migrations.RunPython(migrate_stages_to_pipelines, reverse_migration),
    ]
```

After that, remove `organization` FK from PipelineStage and make `pipeline` non-nullable:

In `backend/deals/models.py`, update PipelineStage:
- Remove the `organization` field entirely
- Change `pipeline` to `null=False` (remove `null=True`)

Then:
```bash
docker compose exec backend python manage.py makemigrations deals
docker compose exec backend python manage.py migrate
```

**Commit:** `feat(deals): migrate existing stages to pipelines`

---

### Task 3: Backend — Pipeline serializer + ViewSet

**Files:**
- Modify: `backend/deals/serializers.py`
- Modify: `backend/deals/views.py`

**What to do:**

Add to `backend/deals/serializers.py`:

```python
from .models import Pipeline, PipelineStage, Deal

class PipelineSerializer(serializers.ModelSerializer):
    stage_count = serializers.IntegerField(read_only=True)
    deal_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Pipeline
        fields = ["id", "name", "order", "is_default", "stage_count", "deal_count", "created_at"]
        read_only_fields = ["id", "created_at"]
```

Add to `backend/deals/views.py`:

```python
from .models import Pipeline, PipelineStage, Deal, PIPELINE_TEMPLATES
from .serializers import PipelineSerializer, PipelineStageSerializer, DealSerializer, PipelineDealSerializer
from django.db.models import Count, Q

class PipelineViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Pipeline.objects.filter(
            organization=self.request.organization
        ).annotate(
            stage_count=Count("stages"),
            deal_count=Count("stages__deals"),
        )

    def perform_create(self, serializer):
        template = self.request.data.get("template")
        name = serializer.validated_data["name"]
        if template and template in PIPELINE_TEMPLATES:
            Pipeline.create_from_template(
                self.request.organization, name, template
            )
        else:
            max_order = (
                Pipeline.objects.filter(organization=self.request.organization)
                .aggregate(m=models.Max("order"))["m"]
                or -1
            )
            serializer.save(
                organization=self.request.organization,
                order=max_order + 1,
            )

    def destroy(self, request, *args, **kwargs):
        pipeline = self.get_object()
        org_pipeline_count = Pipeline.objects.filter(
            organization=request.organization
        ).count()

        if org_pipeline_count <= 1:
            return Response(
                {"detail": "Impossible de supprimer le dernier pipeline."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deal_count = Deal.objects.filter(stage__pipeline=pipeline).count()
        migrate_to = request.query_params.get("migrate_to")

        if deal_count > 0 and not migrate_to:
            return Response(
                {"deal_count": deal_count, "detail": "Pipeline has deals. Provide migrate_to parameter."},
                status=status.HTTP_409_CONFLICT,
            )

        if deal_count > 0 and migrate_to:
            try:
                target_pipeline = Pipeline.objects.get(
                    id=migrate_to, organization=request.organization
                )
            except Pipeline.DoesNotExist:
                return Response(
                    {"detail": "Target pipeline not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            first_stage = target_pipeline.stages.order_by("order").first()
            if not first_stage:
                return Response(
                    {"detail": "Target pipeline has no stages."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            Deal.objects.filter(stage__pipeline=pipeline).update(stage=first_stage)

        # If deleted pipeline was default, assign default to first remaining
        was_default = pipeline.is_default
        pipeline.delete()
        if was_default:
            next_pipeline = Pipeline.objects.filter(
                organization=request.organization
            ).first()
            if next_pipeline:
                next_pipeline.is_default = True
                next_pipeline.save(update_fields=["is_default"])

        return Response(status=status.HTTP_204_NO_CONTENT)
```

Update `PipelineStageViewSet` to filter by pipeline instead of organization:

```python
class PipelineStageViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        pipeline_id = self.request.query_params.get("pipeline")
        if pipeline_id:
            return PipelineStage.objects.filter(
                pipeline_id=pipeline_id,
                pipeline__organization=self.request.organization,
            )
        return PipelineStage.objects.filter(
            pipeline__organization=self.request.organization
        )

    def perform_create(self, serializer):
        pipeline_id = self.request.data.get("pipeline")
        pipeline = Pipeline.objects.get(
            id=pipeline_id, organization=self.request.organization
        )
        serializer.save(pipeline=pipeline)

    def destroy(self, request, *args, **kwargs):
        stage = self.get_object()
        deal_count = stage.deals.count()
        migrate_to = request.query_params.get("migrate_to")

        if deal_count > 0 and not migrate_to:
            return Response(
                {"deal_count": deal_count, "detail": "Stage has deals. Provide migrate_to parameter."},
                status=status.HTTP_409_CONFLICT,
            )

        if deal_count > 0 and migrate_to:
            try:
                target_stage = PipelineStage.objects.get(
                    id=migrate_to, pipeline__organization=request.organization
                )
            except PipelineStage.DoesNotExist:
                return Response(
                    {"detail": "Target stage not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage.deals.update(stage=target_stage)

        stage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

Update `pipeline_view` to accept `?pipeline={id}`:

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pipeline_view(request):
    pipeline_id = request.query_params.get("pipeline")
    if pipeline_id:
        pipeline = Pipeline.objects.filter(
            id=pipeline_id, organization=request.organization
        ).first()
    else:
        pipeline = Pipeline.objects.filter(
            organization=request.organization, is_default=True
        ).first()

    if not pipeline:
        return Response([])

    stages = pipeline.stages.prefetch_related("deals", "deals__contact")
    result = []
    for stage in stages:
        deals = stage.deals.select_related("contact")
        result.append(
            {
                "stage": PipelineStageSerializer(stage).data,
                "deals": PipelineDealSerializer(deals, many=True).data,
                "total_amount": float(sum(d.amount for d in deals)),
            }
        )
    return Response(result)
```

Also add `PipelineStageSerializer` field for pipeline:

```python
class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color", "pipeline"]
        read_only_fields = ["id"]
```

**Commit:** `feat(deals): add Pipeline API (CRUD, delete with migration, pipeline_view filter)`

---

### Task 4: Backend — Pipeline URLs + reorder endpoint

**Files:**
- Create: `backend/deals/pipeline_urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/deals/views.py`

**What to do:**

Create `backend/deals/pipeline_urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineViewSet, reorder_pipelines

router = DefaultRouter()
router.register("", PipelineViewSet, basename="pipeline")

urlpatterns = [
    path("reorder/", reorder_pipelines),
    path("", include(router.urls)),
]
```

Add `reorder_pipelines` view in `backend/deals/views.py`:

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_pipelines(request):
    order = request.data.get("order", [])
    for index, pipeline_id in enumerate(order):
        Pipeline.objects.filter(
            id=pipeline_id, organization=request.organization
        ).update(order=index)
    return Response({"status": "ok"})
```

Add to `backend/config/urls.py` (add BEFORE the deals line):

```python
path("api/pipelines/", include("deals.pipeline_urls")),
```

**Commit:** `feat(deals): add pipeline URLs and reorder endpoint`

---

### Task 5: Frontend — Types + service functions for pipelines

**Files:**
- Modify: `frontend/types/deals.ts`
- Modify: `frontend/services/deals.ts`

**What to do:**

Update `frontend/types/deals.ts` — add Pipeline interface:

```typescript
export interface Pipeline {
  id: string
  name: string
  order: number
  is_default: boolean
  stage_count: number
  deal_count: number
  created_at: string
}

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
  pipeline?: string
}

export interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}
```

Update `frontend/services/deals.ts` — add pipeline service functions and update existing ones:

```typescript
import { apiFetch } from "@/lib/api"
import type { Deal, Pipeline, PipelineStage, Stage } from "@/types"

// Pipeline CRUD
export async function fetchPipelines(): Promise<Pipeline[]> {
  return apiFetch<Pipeline[]>(`/pipelines/`)
}

export async function createPipeline(data: { name: string; template?: string }): Promise<Pipeline> {
  return apiFetch<Pipeline>(`/pipelines/`, { method: "POST", json: data })
}

export async function updatePipeline(id: string, data: Partial<Pipeline>): Promise<Pipeline> {
  return apiFetch<Pipeline>(`/pipelines/${id}/`, { method: "PATCH", json: data })
}

export async function deletePipeline(id: string, migrateTo?: string): Promise<void> {
  const url = migrateTo
    ? `/pipelines/${id}/?migrate_to=${migrateTo}`
    : `/pipelines/${id}/`
  await apiFetch(url, { method: "DELETE" })
}

export async function reorderPipelines(order: string[]): Promise<void> {
  await apiFetch(`/pipelines/reorder/`, { method: "POST", json: { order } })
}

// Pipeline view (Kanban data)
export async function fetchPipeline(pipelineId?: string): Promise<PipelineStage[]> {
  const params = pipelineId ? `?pipeline=${pipelineId}` : ""
  return apiFetch<PipelineStage[]>(`/deals/pipeline/${params}`)
}

// Deal CRUD
export async function createDeal(data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/`, { method: "POST", json: data })
}

export async function updateDeal(id: string, data: Record<string, unknown>): Promise<Deal> {
  return apiFetch<Deal>(`/deals/${id}/`, { method: "PATCH", json: data })
}

export async function deleteDeal(id: string): Promise<void> {
  await apiFetch(`/deals/${id}/`, { method: "DELETE" })
}

// Stage CRUD
export async function fetchPipelineStages(pipelineId?: string): Promise<Stage[]> {
  const params = pipelineId ? `?pipeline=${pipelineId}` : ""
  return apiFetch<Stage[]>(`/pipeline-stages/${params}`)
}

export async function createPipelineStage(data: { name: string; color: string; order: number; pipeline: string }): Promise<Stage> {
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

**Commit:** `feat(deals): add Pipeline types and service functions`

---

### Task 6: Frontend — Update hooks for pipeline support

**Files:**
- Modify: `frontend/hooks/useDeals.ts`

**What to do:**

Update `usePipeline` to accept a pipelineId and `usePipelineStages` similarly. Add `usePipelines` hook.

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Pipeline, PipelineStage, Stage } from "@/types"
import { fetchPipeline, fetchPipelineStages, fetchPipelines } from "@/services/deals"
import { useOrganization } from "@/lib/organization"

export function usePipelines() {
  const { orgVersion } = useOrganization()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelines()
      setPipelines(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { pipelines, loading, refresh }
}

export function usePipeline(pipelineId?: string) {
  const { orgVersion } = useOrganization()
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipeline(pipelineId)
      setPipeline(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion, pipelineId])

  useEffect(() => { refresh() }, [refresh])

  return { pipeline, setPipeline, loading, refresh }
}

export function usePipelineStages(pipelineId?: string) {
  const { orgVersion } = useOrganization()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelineStages(pipelineId)
      setStages(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion, pipelineId])

  useEffect(() => { refresh() }, [refresh])

  return { stages, setStages, loading, refresh }
}
```

**Commit:** `feat(deals): update hooks with pipeline support`

---

### Task 7: Frontend — Deals page with pipeline tabs

**Files:**
- Modify: `frontend/app/(app)/deals/page.tsx`
- Modify: `frontend/components/deals/KanbanBoard.tsx`

**What to do:**

Update `frontend/app/(app)/deals/page.tsx` to add pipeline tabs:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/deals/KanbanBoard"
import { CreatePipelineDialog } from "@/components/deals/CreatePipelineDialog"
import { usePipelines } from "@/hooks/useDeals"
import type { Pipeline } from "@/types"

export default function DealsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false)
  const { pipelines, loading: pipelinesLoading, refresh: refreshPipelines } = usePipelines()
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)

  // Select default pipeline on load
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0]
      setSelectedPipelineId(defaultPipeline.id)
    }
  }, [pipelines, selectedPipelineId])

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Gérez vos deals par étape du pipeline
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau deal
        </Button>
      </div>

      {/* Pipeline tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPipelineId(p.id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px font-[family-name:var(--font-body)] ${
              selectedPipelineId === p.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setCreatePipelineOpen(true)}
          className="shrink-0 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Kanban Board */}
      {selectedPipelineId && (
        <KanbanBoard
          pipelineId={selectedPipelineId}
          dialogOpen={dialogOpen}
          onDialogOpenChange={setDialogOpen}
        />
      )}

      <CreatePipelineDialog
        open={createPipelineOpen}
        onOpenChange={setCreatePipelineOpen}
        onCreated={(newPipeline) => {
          refreshPipelines()
          setSelectedPipelineId(newPipeline.id)
        }}
      />
    </div>
  )
}
```

Update `frontend/components/deals/KanbanBoard.tsx` to accept `pipelineId` prop:

Change the interface:
```typescript
interface KanbanBoardProps {
  pipelineId: string
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
}
```

Change the function signature and hook usage:
```typescript
export function KanbanBoard({ pipelineId, dialogOpen, onDialogOpenChange }: KanbanBoardProps) {
  const { pipeline, setPipeline, loading, refresh } = usePipeline(pipelineId)
  // ... rest stays the same
}
```

**Commit:** `feat(deals): add pipeline tabs to deals page`

---

### Task 8: Frontend — CreatePipelineDialog component

**Files:**
- Create: `frontend/components/deals/CreatePipelineDialog.tsx`

**What to do:**

```tsx
"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createPipeline } from "@/services/deals"
import type { Pipeline } from "@/types"

const TEMPLATES = [
  { key: "prospection", label: "Prospection", description: "6 étapes classiques de vente" },
  { key: "upsell", label: "Upsell", description: "5 étapes pour la vente additionnelle" },
  { key: "partenariats", label: "Partenariats", description: "5 étapes pour les partenariats" },
  { key: "", label: "Vide", description: "Créez vos propres étapes" },
]

interface CreatePipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (pipeline: Pipeline) => void
}

export function CreatePipelineDialog({ open, onOpenChange, onCreated }: CreatePipelineDialogProps) {
  const [name, setName] = useState("")
  const [template, setTemplate] = useState("prospection")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const pipeline = await createPipeline({
        name: name.trim(),
        ...(template ? { template } : {}),
      })
      setName("")
      setTemplate("prospection")
      onOpenChange(false)
      onCreated(pipeline)
    } catch (err) {
      console.error("Failed to create pipeline:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prospection B2B"
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    template === t.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Commit:** `feat(deals): add CreatePipelineDialog component`

---

### Task 9: Frontend — Settings pipeline page (two-level: pipeline list → stage config)

**Files:**
- Modify: `frontend/app/(app)/settings/pipeline/page.tsx`

**What to do:**

Rewrite the settings pipeline page with two views:
1. **Pipeline list view** — shows all pipelines as cards (name, stage count, deal count, "par défaut" badge). Click → stage config. Actions: rename, delete, set as default. "Nouveau pipeline" button.
2. **Stage config view** — back button to pipeline list, pipeline name as header, stage CRUD + reorder (same as current behavior, but scoped to selected pipeline).

Replace the entire file. The stage config section reuses the same logic as the current page but passes `pipeline` to `createPipelineStage` and uses `fetchPipelineStages(pipelineId)`.

Key changes from current code:
- Add `selectedPipeline` state (null = list view, Pipeline = stage view)
- Pipeline list: fetch pipelines, display as cards with stage_count/deal_count
- Pipeline CRUD: rename (inline), delete (with deal migration dialog), set default
- Stage view: same as current but with `pipelineId` param
- `createPipelineStage` now takes `pipeline` in data
- Import `fetchPipelines, createPipeline, updatePipeline, deletePipeline` from services
- Import `CreatePipelineDialog` component
- Add delete pipeline dialog with migration selector (dropdown of other pipelines)

The file is large (~400 lines) so the implementer should read the current file, understand the stage management patterns, and adapt them with the pipeline layer on top.

**Commit:** `feat(deals): rewrite settings pipeline page with multi-pipeline support`

---

### Task 10: Backend — Update accounts signup to use Pipeline.create_defaults

**Files:**
- Modify: `backend/accounts/views.py:41` — change `PipelineStage.create_defaults(org)` to `Pipeline.create_defaults(org)` (import Pipeline from deals.models)
- Modify: `backend/accounts/management/commands/seed_test_data.py:219` — same change

**Commit:** `feat(deals): use Pipeline.create_defaults in signup and seed`

---

### Task 11: Verify — Build + syntax check + migrate

**Steps:**
1. `docker compose exec backend python -c "import py_compile; py_compile.compile('deals/models.py', doraise=True); py_compile.compile('deals/views.py', doraise=True); py_compile.compile('deals/serializers.py', doraise=True); py_compile.compile('deals/pipeline_urls.py', doraise=True); print('OK')"`
2. `docker compose exec backend python manage.py migrate`
3. `cd frontend && npx next build`

All must pass.

**Commit:** (no commit, verification only)
