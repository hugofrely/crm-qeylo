# AI Chat Tools Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all AI chat tools to support full CRUD on every entity, navigation links, dynamic contact queries with segment save, inline charts, and visually rich action cards.

**Architecture:** Extend existing Pydantic AI tools in `backend/chat/tools.py` with 24 new tools following the same pattern. Enrich return format with `entity_type`, `entity_preview`, `changes`, `link`, `undo_available`. Refactor frontend `ActionCard.tsx` into a dispatcher with specialized sub-components. Add `DynamicChart.tsx` for Recharts rendering from structured config.

**Tech Stack:** Django/Pydantic AI (backend), Next.js 16 / React 19 / Recharts 3 / Tailwind 4 / shadcn/ui (frontend)

---

## Task 1: Backend — Contact delete, get, category tools

**Files:**
- Modify: `backend/chat/tools.py` (add 5 new functions after line 353, update ALL_TOOLS at line 1001)

**Step 1: Add `delete_contact` tool**

Add after the `update_custom_field` function (~line 353):

```python
def delete_contact(ctx: RunContext[ChatDeps], contact_id: str) -> dict:
    """Delete a contact (soft delete). Can be undone from the trash."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_contact_id(org_id, contact_id)
    if not resolved_id:
        return {"action": "error", "message": "Contact introuvable."}
    try:
        contact = Contact.objects.get(id=resolved_id, organization_id=org_id)
    except Contact.DoesNotExist:
        return {"action": "error", "message": "Contact introuvable."}

    name = f"{contact.first_name} {contact.last_name}"
    preview = {
        "name": name,
        "email": contact.email,
        "company": contact.company,
    }
    contact.delete()  # soft delete
    return {
        "action": "contact_deleted",
        "entity_type": "contact",
        "entity_id": resolved_id,
        "summary": f"Contact {name} supprime",
        "entity_preview": preview,
        "undo_available": True,
    }
```

**Step 2: Add `get_contact` tool**

```python
def get_contact(ctx: RunContext[ChatDeps], contact_id: str) -> dict:
    """Get full details of a contact for display."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_contact_id(org_id, contact_id)
    if not resolved_id:
        return {"action": "error", "message": "Contact introuvable."}
    try:
        contact = Contact.objects.get(id=resolved_id, organization_id=org_id)
    except Contact.DoesNotExist:
        return {"action": "error", "message": "Contact introuvable."}

    return {
        "action": "contact_details",
        "entity_type": "contact",
        "entity_id": str(contact.id),
        "summary": f"{contact.first_name} {contact.last_name}",
        "entity_preview": {
            "name": f"{contact.first_name} {contact.last_name}",
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "job_title": contact.job_title,
            "lead_score": contact.lead_score,
            "avatar_initials": f"{contact.first_name[:1]}{contact.last_name[:1]}".upper() if contact.first_name and contact.last_name else "",
        },
        "link": f"/contacts/{contact.id}",
    }
```

**Step 3: Add `list_contact_categories`, `create_contact_category`, `delete_contact_category`**

```python
def list_contact_categories(ctx: RunContext[ChatDeps]) -> dict:
    """List all contact categories for the organization."""
    org_id = ctx.deps.organization_id
    cats = ContactCategory.objects.filter(organization_id=org_id).order_by("order")
    return {
        "action": "list_contact_categories",
        "entity_type": "category_list",
        "summary": f"{cats.count()} categories",
        "results": [{"id": str(c.id), "name": c.name, "color": c.color} for c in cats],
    }


def create_contact_category(ctx: RunContext[ChatDeps], name: str, color: str = "#6366f1") -> dict:
    """Create a new contact category."""
    org_id = ctx.deps.organization_id
    if ContactCategory.objects.filter(organization_id=org_id, name__iexact=name).exists():
        return {"action": "error", "message": f"La categorie '{name}' existe deja."}
    cat = ContactCategory.objects.create(
        organization_id=org_id,
        name=name,
        color=color,
    )
    return {
        "action": "category_created",
        "entity_type": "category",
        "entity_id": str(cat.id),
        "summary": f"Categorie '{name}' creee",
        "entity_preview": {"name": cat.name, "color": cat.color},
    }


def delete_contact_category(ctx: RunContext[ChatDeps], category_id: str) -> dict:
    """Delete a contact category."""
    org_id = ctx.deps.organization_id
    try:
        cat = ContactCategory.objects.get(id=category_id, organization_id=org_id)
    except ContactCategory.DoesNotExist:
        return {"action": "error", "message": "Categorie introuvable."}
    name = cat.name
    cat.delete()
    return {
        "action": "category_deleted",
        "entity_type": "category",
        "entity_id": category_id,
        "summary": f"Categorie '{name}' supprimee",
        "entity_preview": {"name": name},
    }
```

**Step 4: Update ALL_TOOLS list**

Add the 5 new functions to the `ALL_TOOLS` list at the end of the file.

**Step 5: Enrich existing contact tools return format**

Update `create_contact` return to include `entity_type`, `entity_preview`, `link`, `summary`. Update `update_contact` to include `entity_type`, `entity_preview`, `changes`, `link`, `summary`. Apply same enrichment pattern to `search_contacts`, `update_contact_categories`, `update_custom_field`.

**Step 6: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add contact delete/get/category tools + enrich return format"
```

---

## Task 2: Backend — Deal tools (update, delete, get, search, pipeline stages)

**Files:**
- Modify: `backend/chat/tools.py` (add 8 new functions in the Deals section, update ALL_TOOLS)

**Step 1: Add `update_deal`**

```python
def update_deal(
    ctx: RunContext[ChatDeps],
    deal_id: str,
    name: Optional[str] = None,
    amount: Optional[float] = None,
    contact_id: Optional[str] = None,
) -> dict:
    """Update an existing deal's fields."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}
    try:
        deal = Deal.objects.select_related("stage", "contact").get(id=resolved_id, organization_id=org_id)
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    changes = []
    if name is not None and name != deal.name:
        changes.append({"field": "name", "from": deal.name, "to": name})
        deal.name = name
    if amount is not None and float(amount) != float(deal.amount):
        changes.append({"field": "amount", "from": str(deal.amount), "to": str(amount)})
        deal.amount = amount
    if contact_id is not None:
        resolved_contact = _resolve_contact_id(org_id, contact_id)
        old_contact = f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else "Aucun"
        deal.contact_id = resolved_contact
        new_contact_obj = Contact.objects.filter(id=resolved_contact).first() if resolved_contact else None
        new_contact_name = f"{new_contact_obj.first_name} {new_contact_obj.last_name}" if new_contact_obj else "Aucun"
        changes.append({"field": "contact", "from": old_contact, "to": new_contact_name})

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    deal.save()
    return {
        "action": "deal_updated",
        "entity_type": "deal",
        "entity_id": str(deal.id),
        "summary": f"Deal '{deal.name}' mis a jour",
        "changes": changes,
        "entity_preview": {
            "name": deal.name,
            "amount": f"{deal.amount}",
            "stage": deal.stage.name if deal.stage else "",
            "contact": f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
        },
        "link": f"/deals/{deal.id}",
    }
```

**Step 2: Add `delete_deal`**

```python
def delete_deal(ctx: RunContext[ChatDeps], deal_id: str) -> dict:
    """Delete a deal (soft delete). Can be undone from the trash."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}
    try:
        deal = Deal.objects.select_related("stage").get(id=resolved_id, organization_id=org_id)
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    preview = {
        "name": deal.name,
        "amount": f"{deal.amount}",
        "stage": deal.stage.name if deal.stage else "",
    }
    deal.delete()
    return {
        "action": "deal_deleted",
        "entity_type": "deal",
        "entity_id": resolved_id,
        "summary": f"Deal '{deal.name}' supprime",
        "entity_preview": preview,
        "undo_available": True,
    }
```

**Step 3: Add `get_deal`**

```python
def get_deal(ctx: RunContext[ChatDeps], deal_id: str) -> dict:
    """Get full details of a deal for display."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}
    try:
        deal = Deal.objects.select_related("stage", "contact").get(id=resolved_id, organization_id=org_id)
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    return {
        "action": "deal_details",
        "entity_type": "deal",
        "entity_id": str(deal.id),
        "summary": deal.name,
        "entity_preview": {
            "name": deal.name,
            "amount": f"{deal.amount}",
            "stage": deal.stage.name if deal.stage else "",
            "contact": f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
        },
        "link": f"/deals/{deal.id}",
    }
```

**Step 4: Add `search_deals`**

```python
def search_deals(ctx: RunContext[ChatDeps], query: str, stage_name: str = "") -> dict:
    """Search deals by name. Optionally filter by stage name."""
    org_id = ctx.deps.organization_id
    qs = Deal.objects.filter(organization_id=org_id).select_related("stage", "contact")
    for word in query.strip().split():
        qs = qs.filter(Q(name__icontains=word))
    if stage_name:
        qs = qs.filter(stage__name__iexact=stage_name)
    deals = qs[:10]
    results = [
        {
            "id": str(d.id),
            "name": d.name,
            "amount": f"{d.amount}",
            "stage": d.stage.name if d.stage else "",
            "contact": f"{d.contact.first_name} {d.contact.last_name}" if d.contact else None,
        }
        for d in deals
    ]
    return {"action": "search_deals", "entity_type": "deal_list", "summary": f"{len(results)} deals trouves", "count": len(results), "results": results}
```

**Step 5: Add pipeline stage tools — `list_pipeline_stages`, `create_pipeline_stage`, `update_pipeline_stage`, `delete_pipeline_stage`**

```python
def list_pipeline_stages(ctx: RunContext[ChatDeps], pipeline_id: Optional[str] = None) -> dict:
    """List all pipeline stages. If pipeline_id provided, filter to that pipeline."""
    from deals.models import Pipeline
    org_id = ctx.deps.organization_id
    qs = PipelineStage.objects.filter(organization_id=org_id).order_by("position")
    if pipeline_id:
        qs = qs.filter(pipeline_id=pipeline_id)
    stages = qs.select_related("pipeline")
    return {
        "action": "list_pipeline_stages",
        "entity_type": "stage_list",
        "summary": f"{stages.count()} stages",
        "results": [{"id": str(s.id), "name": s.name, "position": s.position, "pipeline": s.pipeline.name} for s in stages],
    }


def create_pipeline_stage(ctx: RunContext[ChatDeps], name: str, pipeline_id: str, position: Optional[int] = None) -> dict:
    """Add a new stage to a pipeline."""
    from deals.models import Pipeline
    org_id = ctx.deps.organization_id
    try:
        pipeline = Pipeline.objects.get(id=pipeline_id, organization_id=org_id)
    except Pipeline.DoesNotExist:
        return {"action": "error", "message": "Pipeline introuvable."}

    if position is None:
        last = PipelineStage.objects.filter(pipeline=pipeline).order_by("-position").first()
        position = (last.position + 1) if last else 0

    stage = PipelineStage.objects.create(
        organization_id=org_id,
        pipeline=pipeline,
        name=name,
        position=position,
    )
    return {
        "action": "stage_created",
        "entity_type": "stage",
        "entity_id": str(stage.id),
        "summary": f"Stage '{name}' ajoute au pipeline {pipeline.name}",
        "entity_preview": {"name": name, "pipeline": pipeline.name, "position": position},
    }


def update_pipeline_stage(ctx: RunContext[ChatDeps], stage_id: str, name: Optional[str] = None, position: Optional[int] = None) -> dict:
    """Update a pipeline stage name or position."""
    org_id = ctx.deps.organization_id
    try:
        stage = PipelineStage.objects.select_related("pipeline").get(id=stage_id, organization_id=org_id)
    except PipelineStage.DoesNotExist:
        return {"action": "error", "message": "Stage introuvable."}

    changes = []
    if name is not None and name != stage.name:
        changes.append({"field": "name", "from": stage.name, "to": name})
        stage.name = name
    if position is not None and position != stage.position:
        changes.append({"field": "position", "from": str(stage.position), "to": str(position)})
        stage.position = position

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    stage.save()
    return {
        "action": "stage_updated",
        "entity_type": "stage",
        "entity_id": str(stage.id),
        "summary": f"Stage '{stage.name}' mis a jour",
        "changes": changes,
        "entity_preview": {"name": stage.name, "pipeline": stage.pipeline.name, "position": stage.position},
    }


def delete_pipeline_stage(ctx: RunContext[ChatDeps], stage_id: str) -> dict:
    """Delete a pipeline stage. Deals in this stage should be moved first."""
    org_id = ctx.deps.organization_id
    try:
        stage = PipelineStage.objects.select_related("pipeline").get(id=stage_id, organization_id=org_id)
    except PipelineStage.DoesNotExist:
        return {"action": "error", "message": "Stage introuvable."}

    deal_count = Deal.objects.filter(stage=stage, organization_id=org_id).count()
    if deal_count > 0:
        return {"action": "error", "message": f"Impossible de supprimer: {deal_count} deals sont dans ce stage. Deplacez-les d'abord."}

    name = stage.name
    pipeline_name = stage.pipeline.name
    stage.delete()
    return {
        "action": "stage_deleted",
        "entity_type": "stage",
        "entity_id": stage_id,
        "summary": f"Stage '{name}' supprime du pipeline {pipeline_name}",
        "entity_preview": {"name": name, "pipeline": pipeline_name},
    }
```

**Step 6: Enrich existing deal tools + update ALL_TOOLS**

Update `create_deal` and `move_deal` returns with `entity_type`, `entity_preview`, `link`, `summary`.

**Step 7: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add deal CRUD + pipeline stage tools"
```

---

## Task 3: Backend — Task tools (update, delete, search)

**Files:**
- Modify: `backend/chat/tools.py` (add 3 functions in Tasks section, update ALL_TOOLS)

**Step 1: Add `update_task`, `delete_task`, `search_tasks`**

```python
def update_task(
    ctx: RunContext[ChatDeps],
    task_id: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: Optional[str] = None,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
) -> dict:
    """Update an existing task's fields."""
    org_id = ctx.deps.organization_id
    try:
        task = Task.objects.get(id=task_id, organization_id=org_id)
    except Task.DoesNotExist:
        return {"action": "error", "message": "Tache introuvable."}

    changes = []
    if description is not None and description != task.description:
        changes.append({"field": "description", "from": task.description, "to": description})
        task.description = description
    if due_date is not None:
        try:
            parsed = datetime.fromisoformat(due_date)
            if parsed.tzinfo is None:
                parsed = timezone.make_aware(parsed)
            old_date = str(task.due_date)
            changes.append({"field": "due_date", "from": old_date, "to": due_date})
            task.due_date = parsed
        except (ValueError, TypeError):
            return {"action": "error", "message": f"Format de date invalide: {due_date}. Utilisez YYYY-MM-DD."}
    if priority is not None and priority != task.priority:
        changes.append({"field": "priority", "from": task.priority, "to": priority})
        task.priority = priority
    if contact_id is not None:
        resolved = _resolve_contact_id(org_id, contact_id)
        task.contact_id = resolved
        changes.append({"field": "contact", "from": "", "to": contact_id})
    if deal_id is not None:
        resolved = _resolve_deal_id(org_id, deal_id)
        task.deal_id = resolved
        changes.append({"field": "deal", "from": "", "to": deal_id})

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    task.save()
    return {
        "action": "task_updated",
        "entity_type": "task",
        "entity_id": str(task.id),
        "summary": f"Tache mise a jour",
        "changes": changes,
        "entity_preview": {
            "description": task.description,
            "due_date": str(task.due_date),
            "priority": task.priority,
            "is_done": task.is_done,
        },
    }


def delete_task(ctx: RunContext[ChatDeps], task_id: str) -> dict:
    """Delete a task (soft delete). Can be undone from the trash."""
    org_id = ctx.deps.organization_id
    try:
        task = Task.objects.get(id=task_id, organization_id=org_id)
    except Task.DoesNotExist:
        return {"action": "error", "message": "Tache introuvable."}

    preview = {
        "description": task.description,
        "due_date": str(task.due_date),
        "priority": task.priority,
    }
    task.delete()
    return {
        "action": "task_deleted",
        "entity_type": "task",
        "entity_id": task_id,
        "summary": f"Tache supprimee",
        "entity_preview": preview,
        "undo_available": True,
    }


def search_tasks(
    ctx: RunContext[ChatDeps],
    query: str = "",
    is_done: Optional[bool] = None,
    priority: Optional[str] = None,
    contact_id: Optional[str] = None,
) -> dict:
    """Search and filter tasks."""
    org_id = ctx.deps.organization_id
    qs = Task.objects.filter(organization_id=org_id)
    if query:
        qs = qs.filter(description__icontains=query)
    if is_done is not None:
        qs = qs.filter(is_done=is_done)
    if priority:
        qs = qs.filter(priority=priority)
    if contact_id:
        resolved = _resolve_contact_id(org_id, contact_id)
        if resolved:
            qs = qs.filter(contact_id=resolved)
    tasks = qs.order_by("due_date")[:20]
    results = [
        {
            "id": str(t.id),
            "description": t.description,
            "due_date": str(t.due_date),
            "priority": t.priority,
            "is_done": t.is_done,
        }
        for t in tasks
    ]
    return {"action": "search_tasks", "entity_type": "task_list", "summary": f"{len(results)} taches trouvees", "count": len(results), "results": results}
```

**Step 2: Enrich existing task tools + update ALL_TOOLS**

Update `create_task` and `complete_task` returns with `entity_type`, `entity_preview`, `summary`.

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add task update/delete/search tools"
```

---

## Task 4: Backend — Segment tools

**Files:**
- Modify: `backend/chat/tools.py` (add 4 functions, add import for segments engine, update ALL_TOOLS)

**Step 1: Add segment imports at top of file**

```python
from segments.models import Segment
from segments.engine import build_segment_queryset
```

**Step 2: Add `list_segments`, `update_segment`, `delete_segment`, `get_segment_contacts`**

```python
# ---------------------------------------------------------------------------
# Segments
# ---------------------------------------------------------------------------

def list_segments(ctx: RunContext[ChatDeps]) -> dict:
    """List all contact segments."""
    org_id = ctx.deps.organization_id
    segments = Segment.objects.filter(organization_id=org_id).order_by("order")
    results = [
        {
            "id": str(s.id),
            "name": s.name,
            "description": s.description,
            "icon": s.icon,
            "color": s.color,
            "is_pinned": s.is_pinned,
        }
        for s in segments
    ]
    return {"action": "list_segments", "entity_type": "segment_list", "summary": f"{len(results)} segments", "count": len(results), "results": results}


def update_segment(
    ctx: RunContext[ChatDeps],
    segment_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    rules: Optional[dict] = None,
) -> dict:
    """Update a segment's properties or rules."""
    org_id = ctx.deps.organization_id
    try:
        segment = Segment.objects.get(id=segment_id, organization_id=org_id)
    except Segment.DoesNotExist:
        return {"action": "error", "message": "Segment introuvable."}

    changes = []
    if name is not None and name != segment.name:
        changes.append({"field": "name", "from": segment.name, "to": name})
        segment.name = name
    if description is not None and description != segment.description:
        changes.append({"field": "description", "from": segment.description or "", "to": description})
        segment.description = description
    if icon is not None:
        segment.icon = icon
        changes.append({"field": "icon", "from": "", "to": icon})
    if color is not None:
        segment.color = color
        changes.append({"field": "color", "from": "", "to": color})
    if rules is not None:
        segment.rules = rules
        changes.append({"field": "rules", "from": "...", "to": "updated"})

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    segment.save()
    return {
        "action": "segment_updated",
        "entity_type": "segment",
        "entity_id": str(segment.id),
        "summary": f"Segment '{segment.name}' mis a jour",
        "changes": changes,
        "entity_preview": {"name": segment.name, "description": segment.description, "icon": segment.icon, "color": segment.color},
        "link": f"/segments/{segment.id}",
    }


def delete_segment(ctx: RunContext[ChatDeps], segment_id: str) -> dict:
    """Delete a segment."""
    org_id = ctx.deps.organization_id
    try:
        segment = Segment.objects.get(id=segment_id, organization_id=org_id)
    except Segment.DoesNotExist:
        return {"action": "error", "message": "Segment introuvable."}

    name = segment.name
    segment.delete()
    return {
        "action": "segment_deleted",
        "entity_type": "segment",
        "entity_id": segment_id,
        "summary": f"Segment '{name}' supprime",
        "entity_preview": {"name": name},
    }


def get_segment_contacts(ctx: RunContext[ChatDeps], segment_id: str, limit: int = 20) -> dict:
    """Get the contacts matching a segment's rules."""
    org_id = ctx.deps.organization_id
    try:
        segment = Segment.objects.get(id=segment_id, organization_id=org_id)
    except Segment.DoesNotExist:
        return {"action": "error", "message": "Segment introuvable."}

    org = Organization.objects.get(id=org_id)
    qs = build_segment_queryset(org, segment.rules)
    total = qs.count()
    contacts = qs[:limit]
    results = [
        {"id": str(c.id), "name": f"{c.first_name} {c.last_name}", "email": c.email, "company": c.company}
        for c in contacts
    ]
    return {
        "action": "segment_contacts",
        "entity_type": "contact_list",
        "summary": f"{total} contacts dans le segment '{segment.name}'",
        "count": total,
        "results": results,
    }
```

**Step 3: Update ALL_TOOLS and commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add segment tools (list, update, delete, get_contacts)"
```

---

## Task 5: Backend — Workflow and email template tools

**Files:**
- Modify: `backend/chat/tools.py` (add 5 functions, update ALL_TOOLS)

**Step 1: Add `update_workflow` and `delete_workflow`**

```python
def update_workflow(
    ctx: RunContext[ChatDeps],
    workflow_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> dict:
    """Update a workflow's name or description."""
    from workflows.models import Workflow
    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": "Workflow introuvable."}

    changes = []
    if name is not None and name != workflow.name:
        changes.append({"field": "name", "from": workflow.name, "to": name})
        workflow.name = name
    if description is not None and description != (workflow.description or ""):
        changes.append({"field": "description", "from": workflow.description or "", "to": description})
        workflow.description = description

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    workflow.save()
    return {
        "action": "workflow_updated",
        "entity_type": "workflow",
        "entity_id": str(workflow.id),
        "summary": f"Workflow '{workflow.name}' mis a jour",
        "changes": changes,
        "entity_preview": {"name": workflow.name, "description": workflow.description, "is_active": workflow.is_active},
        "link": f"/workflows/{workflow.id}",
    }


def delete_workflow(ctx: RunContext[ChatDeps], workflow_id: str) -> dict:
    """Delete a workflow."""
    from workflows.models import Workflow
    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": "Workflow introuvable."}

    name = workflow.name
    workflow.delete()
    return {
        "action": "workflow_deleted",
        "entity_type": "workflow",
        "entity_id": workflow_id,
        "summary": f"Workflow '{name}' supprime",
        "entity_preview": {"name": name},
    }
```

**Step 2: Add `create_email_template`, `update_email_template`, `delete_email_template`**

```python
# ---------------------------------------------------------------------------
# Email Templates (CRUD)
# ---------------------------------------------------------------------------

def create_email_template(
    ctx: RunContext[ChatDeps],
    name: str,
    subject: str,
    body_html: str,
    tags: Optional[list[str]] = None,
    is_shared: bool = False,
) -> dict:
    """Create a new email template. tags are variable placeholders like ['first_name', 'company']."""
    from emails.models import EmailTemplate
    org_id = ctx.deps.organization_id
    template = EmailTemplate.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name,
        subject=subject,
        body_html=body_html,
        tags=tags or [],
        is_shared=is_shared,
    )
    return {
        "action": "email_template_created",
        "entity_type": "email_template",
        "entity_id": str(template.id),
        "summary": f"Template '{name}' cree",
        "entity_preview": {"name": name, "subject": subject},
        "link": f"/settings/email-templates/{template.id}",
    }


def update_email_template(
    ctx: RunContext[ChatDeps],
    template_id: str,
    name: Optional[str] = None,
    subject: Optional[str] = None,
    body_html: Optional[str] = None,
    tags: Optional[list[str]] = None,
) -> dict:
    """Update an email template."""
    from emails.models import EmailTemplate
    org_id = ctx.deps.organization_id
    try:
        template = EmailTemplate.objects.get(id=template_id, organization_id=org_id)
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    changes = []
    if name is not None and name != template.name:
        changes.append({"field": "name", "from": template.name, "to": name})
        template.name = name
    if subject is not None and subject != template.subject:
        changes.append({"field": "subject", "from": template.subject, "to": subject})
        template.subject = subject
    if body_html is not None:
        template.body_html = body_html
        changes.append({"field": "body", "from": "...", "to": "updated"})
    if tags is not None:
        template.tags = tags
        changes.append({"field": "tags", "from": "...", "to": ", ".join(tags)})

    if not changes:
        return {"action": "error", "message": "Aucun champ a modifier."}

    template.save()
    return {
        "action": "email_template_updated",
        "entity_type": "email_template",
        "entity_id": str(template.id),
        "summary": f"Template '{template.name}' mis a jour",
        "changes": changes,
        "entity_preview": {"name": template.name, "subject": template.subject},
        "link": f"/settings/email-templates/{template.id}",
    }


def delete_email_template(ctx: RunContext[ChatDeps], template_id: str) -> dict:
    """Delete an email template."""
    from emails.models import EmailTemplate
    org_id = ctx.deps.organization_id
    try:
        template = EmailTemplate.objects.get(id=template_id, organization_id=org_id)
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    name = template.name
    template.delete()
    return {
        "action": "email_template_deleted",
        "entity_type": "email_template",
        "entity_id": template_id,
        "summary": f"Template '{name}' supprime",
        "entity_preview": {"name": name},
    }
```

**Step 3: Update ALL_TOOLS and commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add workflow update/delete + email template CRUD tools"
```

---

## Task 6: Backend — Timeline/notes tools

**Files:**
- Modify: `backend/chat/tools.py` (add 3 functions, update ALL_TOOLS)

**Step 1: Add `update_note`, `delete_note`, `list_timeline`**

```python
def update_note(ctx: RunContext[ChatDeps], note_id: str, content: str) -> dict:
    """Update the content of a note."""
    org_id = ctx.deps.organization_id
    try:
        entry = TimelineEntry.objects.get(
            id=note_id,
            organization_id=org_id,
            entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        )
    except TimelineEntry.DoesNotExist:
        return {"action": "error", "message": "Note introuvable."}

    old_content = entry.content[:50]
    entry.content = content
    entry.save(update_fields=["content"])
    return {
        "action": "note_updated",
        "entity_type": "note",
        "entity_id": str(entry.id),
        "summary": "Note mise a jour",
        "changes": [{"field": "content", "from": old_content + "...", "to": content[:50] + "..."}],
        "entity_preview": {"content": content[:100]},
    }


def delete_note(ctx: RunContext[ChatDeps], note_id: str) -> dict:
    """Delete a note from the timeline."""
    org_id = ctx.deps.organization_id
    try:
        entry = TimelineEntry.objects.get(
            id=note_id,
            organization_id=org_id,
            entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        )
    except TimelineEntry.DoesNotExist:
        return {"action": "error", "message": "Note introuvable."}

    preview = {"content": entry.content[:100]}
    entry.delete()
    return {
        "action": "note_deleted",
        "entity_type": "note",
        "entity_id": note_id,
        "summary": "Note supprimee",
        "entity_preview": preview,
    }


def list_timeline(
    ctx: RunContext[ChatDeps],
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """List recent timeline events for a contact or deal."""
    org_id = ctx.deps.organization_id
    qs = TimelineEntry.objects.filter(organization_id=org_id).order_by("-created_at")
    if contact_id:
        resolved = _resolve_contact_id(org_id, contact_id)
        if resolved:
            qs = qs.filter(contact_id=resolved)
    if deal_id:
        resolved = _resolve_deal_id(org_id, deal_id)
        if resolved:
            qs = qs.filter(deal_id=resolved)

    entries = qs[:limit]
    results = [
        {
            "id": str(e.id),
            "type": e.entry_type,
            "subject": e.subject or "",
            "content": (e.content or "")[:100],
            "created_at": str(e.created_at),
        }
        for e in entries
    ]
    return {"action": "list_timeline", "entity_type": "timeline", "summary": f"{len(results)} evenements", "count": len(results), "results": results}
```

**Step 2: Enrich existing `add_note` and `log_interaction` returns + update ALL_TOOLS**

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add timeline/note update, delete, list tools"
```

---

## Task 7: Backend — Navigate tool

**Files:**
- Modify: `backend/chat/tools.py` (add 1 function, update ALL_TOOLS)

**Step 1: Add `navigate` tool**

```python
# ---------------------------------------------------------------------------
# Navigation
# ---------------------------------------------------------------------------

ROUTE_MAP = {
    "contact": {"path": "/contacts", "label": "Contacts"},
    "deal": {"path": "/deals", "label": "Pipeline"},
    "task": {"path": "/tasks", "label": "Taches"},
    "segment": {"path": "/segments", "label": "Segments"},
    "workflow": {"path": "/workflows", "label": "Workflows"},
    "email_template": {"path": "/settings/email-templates", "label": "Templates email"},
    "dashboard": {"path": "/dashboard", "label": "Dashboard"},
    "reports": {"path": "/reports", "label": "Rapports"},
    "settings": {"path": "/settings", "label": "Parametres"},
    "pipeline": {"path": "/deals", "label": "Pipeline"},
    "funnel": {"path": "/pipeline/funnel", "label": "Entonnoir"},
    "trash": {"path": "/trash", "label": "Corbeille"},
    "products": {"path": "/products", "label": "Produits"},
    "chat": {"path": "/chat", "label": "Chat"},
}


def navigate(
    ctx: RunContext[ChatDeps],
    destination: str,
    entity_id: Optional[str] = None,
) -> dict:
    """Generate a navigation link to a page in the CRM.

    destination: contact, deal, task, segment, workflow, email_template,
    dashboard, reports, settings, pipeline, funnel, trash, products, chat.
    entity_id: optional UUID to link to a specific entity's detail page.
    """
    route = ROUTE_MAP.get(destination)
    if not route:
        return {"action": "error", "message": f"Destination inconnue: {destination}"}

    link = route["path"]
    title = route["label"]
    description = ""

    if entity_id:
        link = f"{route['path']}/{entity_id}"
        # Try to resolve entity name for better display
        org_id = ctx.deps.organization_id
        if destination == "contact":
            c = Contact.objects.filter(id=entity_id, organization_id=org_id).first()
            if c:
                title = f"{c.first_name} {c.last_name}"
                description = f"Contact · {c.email}" + (f" · {c.company}" if c.company else "")
        elif destination == "deal":
            d = Deal.objects.filter(id=entity_id, organization_id=org_id).select_related("stage").first()
            if d:
                title = d.name
                description = f"Deal · {d.amount} EUR" + (f" · {d.stage.name}" if d.stage else "")
        elif destination == "segment":
            s = Segment.objects.filter(id=entity_id, organization_id=org_id).first()
            if s:
                title = s.name
                description = f"Segment" + (f" · {s.description}" if s.description else "")

    return {
        "action": "navigation",
        "entity_type": destination,
        "link": link,
        "title": title,
        "description": description,
        "summary": f"Lien vers {title}",
    }
```

**Step 2: Update ALL_TOOLS and commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add navigate tool for page links"
```

---

## Task 8: Backend — query_contacts tool

**Files:**
- Modify: `backend/chat/tools.py` (add 1 function, update ALL_TOOLS)

**Step 1: Add `query_contacts` tool**

```python
# ---------------------------------------------------------------------------
# Dynamic contact queries
# ---------------------------------------------------------------------------

def query_contacts(
    ctx: RunContext[ChatDeps],
    filters: dict,
    sort_by: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Query contacts dynamically using segment-style filter rules.

    filters should follow the segment rules format:
    {
        "logic": "AND",
        "groups": [
            {
                "logic": "AND",
                "conditions": [
                    {"field": "lead_score", "operator": "equals", "value": "hot"},
                    {"field": "has_deal_closing_within", "operator": "within_next", "value": 30, "unit": "days"}
                ]
            }
        ]
    }

    Available fields: first_name, last_name, email, company, phone, lead_score,
    source, industry, job_title, city, country, language, categories,
    deals_count, open_deals_count, tasks_count, open_tasks_count,
    last_interaction_date, has_deal_closing_within, created_at, updated_at,
    and any custom_field.{field_id}.

    Operators: equals, not_equals, contains, not_contains, is_empty, is_not_empty,
    in, not_in, greater_than, less_than, between, within_last, within_next, before, after.
    """
    org_id = ctx.deps.organization_id
    org = Organization.objects.get(id=org_id)

    try:
        qs = build_segment_queryset(org, filters)
    except Exception as e:
        return {"action": "error", "message": f"Erreur de filtrage: {str(e)}"}

    total = qs.count()

    if sort_by:
        sort_field = sort_by.lstrip("-")
        if sort_field in ("first_name", "last_name", "email", "company", "created_at", "lead_score"):
            qs = qs.order_by(sort_by)

    contacts = qs[:limit]
    results = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "company": c.company,
            "lead_score": c.lead_score,
        }
        for c in contacts
    ]
    return {
        "action": "contacts_queried",
        "entity_type": "contact_list",
        "summary": f"{total} contacts correspondent aux criteres",
        "count": total,
        "results": results,
        "rules": filters,
        "save_as_segment_available": True,
    }
```

**Step 2: Update ALL_TOOLS and commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add query_contacts tool with segment-style filtering"
```

---

## Task 9: Backend — generate_chart tool

**Files:**
- Modify: `backend/chat/tools.py` (add 1 function + helper, update ALL_TOOLS)

**Step 1: Add `generate_chart` tool with metric handlers**

```python
# ---------------------------------------------------------------------------
# Chart generation
# ---------------------------------------------------------------------------

def generate_chart(
    ctx: RunContext[ChatDeps],
    metric: str,
    chart_type: str = "bar",
    period: Optional[str] = None,
    group_by: Optional[str] = None,
    filters: Optional[dict] = None,
) -> dict:
    """Generate chart data for visualization.

    metric: deals_count, deals_amount, deals_by_stage, contacts_count,
    contacts_by_source, contacts_by_category, tasks_count, tasks_by_priority,
    tasks_completion_rate, revenue_over_time, pipeline_funnel, emails_sent,
    workflow_executions.

    chart_type: bar, line, pie, area, funnel, radar, composed.
    period: 7d, 30d, 90d, 12m, ytd, all.
    group_by: day, week, month, stage, source, category, priority.
    """
    from django.db.models import Count
    from django.db.models.functions import TruncMonth, TruncWeek, TruncDay

    org_id = ctx.deps.organization_id
    now = timezone.now()

    # Parse period
    start_date = None
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    elif period == "12m":
        start_date = now - timedelta(days=365)
    elif period == "ytd":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0)

    # Determine truncation function
    trunc_map = {"day": TruncDay, "week": TruncWeek, "month": TruncMonth}
    trunc_fn = trunc_map.get(group_by, TruncMonth)

    data = []
    series = []
    title = ""
    x_key = "label"

    if metric == "deals_count":
        title = "Nombre de deals"
        qs = Deal.objects.filter(organization_id=org_id)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(count=Count("id")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Deals", "color": "#6366f1"}]

    elif metric == "deals_amount":
        title = "Montant des deals"
        qs = Deal.objects.filter(organization_id=org_id)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(total=Sum("amount")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": float(r["total"] or 0)} for r in rows]
        series = [{"key": "value", "label": "Montant (EUR)", "color": "#10b981"}]

    elif metric == "deals_by_stage":
        title = "Deals par stage"
        rows = Deal.objects.filter(organization_id=org_id).values("stage__name").annotate(count=Count("id")).order_by("-count")
        data = [{"label": r["stage__name"] or "Sans stage", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Deals", "color": "#f59e0b"}]

    elif metric == "contacts_count":
        title = "Contacts crees"
        qs = Contact.objects.filter(organization_id=org_id)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(count=Count("id")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Contacts", "color": "#3b82f6"}]

    elif metric == "contacts_by_source":
        title = "Contacts par source"
        rows = Contact.objects.filter(organization_id=org_id).exclude(source="").values("source").annotate(count=Count("id")).order_by("-count")
        data = [{"label": r["source"] or "Non defini", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Contacts", "color": "#8b5cf6"}]

    elif metric == "contacts_by_category":
        title = "Contacts par categorie"
        rows = Contact.objects.filter(organization_id=org_id).values("categories__name").annotate(count=Count("id")).order_by("-count")
        data = [{"label": r["categories__name"] or "Sans categorie", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Contacts", "color": "#ec4899"}]

    elif metric == "tasks_count":
        title = "Taches creees"
        qs = Task.objects.filter(organization_id=org_id)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(count=Count("id")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Taches", "color": "#a855f7"}]

    elif metric == "tasks_by_priority":
        title = "Taches par priorite"
        rows = Task.objects.filter(organization_id=org_id).values("priority").annotate(count=Count("id")).order_by("-count")
        data = [{"label": r["priority"] or "normal", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Taches", "color": "#f97316"}]

    elif metric == "tasks_completion_rate":
        title = "Taux de completion des taches"
        qs = Task.objects.filter(organization_id=org_id)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(
            total=Count("id"),
            done=Count("id", filter=Q(is_done=True)),
        ).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": round(r["done"] / r["total"] * 100, 1) if r["total"] else 0} for r in rows]
        series = [{"key": "value", "label": "Completion (%)", "color": "#22c55e"}]

    elif metric == "revenue_over_time":
        title = "Revenus (deals gagnes)"
        qs = Deal.objects.filter(organization_id=org_id, stage__name="Gagne")
        if start_date:
            qs = qs.filter(closed_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("closed_at")).values("period").annotate(total=Sum("amount")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": float(r["total"] or 0)} for r in rows]
        series = [{"key": "value", "label": "Revenus (EUR)", "color": "#10b981"}]

    elif metric == "pipeline_funnel":
        title = "Entonnoir du pipeline"
        stages = PipelineStage.objects.filter(organization_id=org_id).order_by("position")
        data = []
        for s in stages:
            count = Deal.objects.filter(stage=s, organization_id=org_id).count()
            data.append({"label": s.name, "value": count})
        series = [{"key": "value", "label": "Deals", "color": "#6366f1"}]
        if not chart_type or chart_type == "bar":
            chart_type = "funnel"

    elif metric == "emails_sent":
        title = "Emails envoyes"
        qs = TimelineEntry.objects.filter(organization_id=org_id, entry_type=TimelineEntry.EntryType.EMAIL_SENT)
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("created_at")).values("period").annotate(count=Count("id")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Emails", "color": "#0ea5e9"}]

    elif metric == "workflow_executions":
        title = "Executions de workflows"
        from workflows.models import WorkflowExecution
        qs = WorkflowExecution.objects.filter(workflow__organization_id=org_id)
        if start_date:
            qs = qs.filter(started_at__gte=start_date)
        rows = qs.annotate(period=trunc_fn("started_at")).values("period").annotate(count=Count("id")).order_by("period")
        data = [{"label": r["period"].strftime("%b %Y") if r["period"] else "", "value": r["count"]} for r in rows]
        series = [{"key": "value", "label": "Executions", "color": "#14b8a6"}]

    else:
        return {"action": "error", "message": f"Metrique inconnue: {metric}"}

    if not data:
        return {"action": "error", "message": "Aucune donnee disponible pour cette metrique."}

    return {
        "action": "chart_generated",
        "entity_type": "chart",
        "summary": title,
        "chart": {
            "type": chart_type,
            "title": title,
            "data": data,
            "xKey": x_key,
            "series": series,
        },
    }
```

**Step 2: Update ALL_TOOLS and commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add generate_chart tool with 13 metrics"
```

---

## Task 10: Backend — Enrich all existing tools + final ALL_TOOLS

**Files:**
- Modify: `backend/chat/tools.py`

**Step 1: Update all existing tool return values**

Go through each existing tool and add `entity_type`, `summary`, `entity_preview`, `link` fields to their return dicts following the enriched format convention. This is the list:

- `create_contact`: add `entity_type: "contact"`, `summary`, `entity_preview` (name, email, company, avatar_initials), `link`
- `search_contacts`: add `entity_type: "contact_list"`, `summary`
- `update_contact`: add `entity_type: "contact"`, `summary`, `entity_preview`, `changes` (convert changed list to `[{field, from, to}]`), `link`
- `update_contact_categories`: add `entity_type: "contact"`, `summary`
- `update_custom_field`: add `entity_type: "contact"`, `summary`
- `create_deal`: add `entity_type: "deal"`, `summary`, `entity_preview`, `link`
- `move_deal`: add `entity_type: "deal"`, `summary`, `entity_preview`, `changes`, `link`
- `create_task`: add `entity_type: "task"`, `summary`, `entity_preview`
- `complete_task`: add `entity_type: "task"`, `summary`, `entity_preview`
- `add_note`: add `entity_type: "note"`, `summary`, `entity_preview`
- `log_interaction`: add `entity_type: "interaction"`, `summary`
- `send_contact_email`: add `entity_type: "email"`, `summary`
- `send_email_from_template`: add `entity_type: "email"`, `summary`
- `list_email_templates`: add `entity_type: "email_template_list"`, `summary`
- `get_dashboard_summary`: add `entity_type: "dashboard"`, `summary`
- `search_all`: add `entity_type: "search_results"`, `summary`
- `create_workflow`: add `entity_type: "workflow"`, `summary`, `entity_preview`, `link`
- `list_workflows`: add `entity_type: "workflow_list"`, `summary`
- `toggle_workflow`: add `entity_type: "workflow"`, `summary`, `entity_preview`
- `get_workflow_executions`: add `entity_type: "workflow_executions"`, `summary`

**Step 2: Finalize ALL_TOOLS with all new tools**

```python
ALL_TOOLS = [
    # Contacts
    create_contact, search_contacts, update_contact,
    update_contact_categories, update_custom_field,
    delete_contact, get_contact,
    list_contact_categories, create_contact_category, delete_contact_category,
    # Deals
    create_deal, move_deal, update_deal, delete_deal, get_deal, search_deals,
    list_pipeline_stages, create_pipeline_stage, update_pipeline_stage, delete_pipeline_stage,
    # Tasks
    create_task, complete_task, update_task, delete_task, search_tasks,
    # Notes / Timeline
    add_note, log_interaction, update_note, delete_note, list_timeline,
    # Emails
    send_contact_email, list_email_templates, send_email_from_template,
    create_email_template, update_email_template, delete_email_template,
    # Segments
    list_segments, update_segment, delete_segment, get_segment_contacts,
    # Workflows
    create_workflow, list_workflows, toggle_workflow, get_workflow_executions,
    update_workflow, delete_workflow,
    # Dashboard / Search
    get_dashboard_summary, search_all,
    # Transversal
    navigate, query_contacts, generate_chart,
]
```

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): enrich all existing tool returns + finalize ALL_TOOLS"
```

---

## Task 11: Frontend — Update chat types

**Files:**
- Modify: `frontend/types/chat.ts`

**Step 1: Add new types for enriched tool results**

```typescript
// Add after existing ChatAction interface

export interface EntityPreview {
  name?: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  lead_score?: string
  avatar_initials?: string
  description?: string
  amount?: string
  stage?: string
  contact?: string | null
  due_date?: string
  priority?: string
  is_done?: boolean
  is_active?: boolean
  content?: string
  subject?: string
  icon?: string
  color?: string
  pipeline?: string
  position?: number
}

export interface FieldChange {
  field: string
  from: string
  to: string
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "funnel" | "radar" | "composed"
  title: string
  data: Array<Record<string, unknown>>
  xKey: string
  series: Array<{
    key: string
    label: string
    color: string
  }>
}

export interface EnrichedAction {
  action: string
  entity_type?: string
  entity_id?: string
  summary?: string
  entity_preview?: EntityPreview
  changes?: FieldChange[]
  link?: string
  undo_available?: boolean
  save_as_segment_available?: boolean
  rules?: Record<string, unknown>
  count?: number
  results?: Array<Record<string, unknown>>
  chart?: ChartConfig
  title?: string
  description?: string
  [key: string]: unknown
}
```

**Step 2: Commit**

```bash
git add frontend/types/chat.ts
git commit -m "feat(chat): add enriched action types for new action cards"
```

---

## Task 12: Frontend — DynamicChart component

**Files:**
- Create: `frontend/components/chat/DynamicChart.tsx`

**Step 1: Create the DynamicChart component**

```tsx
"use client"

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from "recharts"
import type { ChartConfig } from "@/types/chat"

const FALLBACK_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#0ea5e9",
]

export function DynamicChart({ config }: { config: ChartConfig }) {
  const { type, title, data, xKey, series } = config

  if (!data || data.length === 0) return null

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} name={s.label} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        )

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s) => (
              <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.2} name={s.label} />
            ))}
          </AreaChart>
        )

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={series[0]?.key || "value"}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        )

      case "funnel":
        return (
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey={series[0]?.key || "value"} data={data} nameKey={xKey}>
              <LabelList position="right" fill="#666" stroke="none" dataKey={xKey} fontSize={11} />
              {data.map((_, i) => (
                <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        )

      case "radar":
        return (
          <RadarChart cx="50%" cy="50%" outerRadius={80} data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s) => (
              <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.3} />
            ))}
          </RadarChart>
        )

      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )
    }
  }

  return (
    <div className="w-full">
      {title && <p className="mb-2 text-sm font-medium">{title}</p>}
      <ResponsiveContainer width="100%" height={250}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/DynamicChart.tsx
git commit -m "feat(chat): add DynamicChart component for inline chart rendering"
```

---

## Task 13: Frontend — Refactor ActionCard into dispatcher + sub-components

**Files:**
- Modify: `frontend/components/chat/ActionCard.tsx` (complete rewrite as dispatcher)
- Create: `frontend/components/chat/action-cards/EntityCreatedCard.tsx`
- Create: `frontend/components/chat/action-cards/EntityUpdatedCard.tsx`
- Create: `frontend/components/chat/action-cards/EntityDeletedCard.tsx`
- Create: `frontend/components/chat/action-cards/ContactListCard.tsx`
- Create: `frontend/components/chat/action-cards/ChartCard.tsx`
- Create: `frontend/components/chat/action-cards/NavigationCard.tsx`
- Create: `frontend/components/chat/action-cards/ErrorCard.tsx`

**Step 1: Create shared config**

Create `frontend/components/chat/action-cards/config.ts`:

```typescript
import {
  User, Briefcase, CheckSquare, StickyNote, Mail,
  BarChart3, Layers, Zap, ArrowRight, Tags, Link2,
  AlertCircle, List, Trash2,
} from "lucide-react"

export const entityConfig: Record<string, {
  icon: React.ElementType
  borderColor: string
  iconColor: string
  bgColor: string
  label: string
}> = {
  contact: { icon: User, borderColor: "border-l-blue-500", iconColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", label: "Contact" },
  deal: { icon: Briefcase, borderColor: "border-l-emerald-500", iconColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", label: "Deal" },
  task: { icon: CheckSquare, borderColor: "border-l-purple-500", iconColor: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", label: "Tache" },
  note: { icon: StickyNote, borderColor: "border-l-orange-500", iconColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", label: "Note" },
  interaction: { icon: StickyNote, borderColor: "border-l-orange-500", iconColor: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30", label: "Interaction" },
  email: { icon: Mail, borderColor: "border-l-cyan-500", iconColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30", label: "Email" },
  email_template: { icon: Mail, borderColor: "border-l-cyan-500", iconColor: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-950/30", label: "Template" },
  segment: { icon: Layers, borderColor: "border-l-pink-500", iconColor: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-950/30", label: "Segment" },
  workflow: { icon: Zap, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Workflow" },
  stage: { icon: ArrowRight, borderColor: "border-l-amber-500", iconColor: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30", label: "Stage" },
  category: { icon: Tags, borderColor: "border-l-indigo-500", iconColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", label: "Categorie" },
  dashboard: { icon: BarChart3, borderColor: "border-l-indigo-500", iconColor: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-950/30", label: "Dashboard" },
  chart: { icon: BarChart3, borderColor: "border-l-violet-500", iconColor: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-950/30", label: "Graphique" },
  navigation: { icon: Link2, borderColor: "border-l-gray-500", iconColor: "text-gray-600", bgColor: "bg-gray-50 dark:bg-gray-950/30", label: "Navigation" },
  error: { icon: AlertCircle, borderColor: "border-l-red-500", iconColor: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30", label: "Erreur" },
  contact_list: { icon: List, borderColor: "border-l-blue-500", iconColor: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30", label: "Contacts" },
  deal_list: { icon: List, borderColor: "border-l-emerald-500", iconColor: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", label: "Deals" },
  task_list: { icon: List, borderColor: "border-l-purple-500", iconColor: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30", label: "Taches" },
}
```

**Step 2: Create EntityCreatedCard**

`frontend/components/chat/action-cards/EntityCreatedCard.tsx`:

This card displays: entity type badge, icon, preview fields (name, email, company, etc.), and a "Voir ->" link. Used for actions ending in `_created` or `_details`.

**Step 3: Create EntityUpdatedCard**

`frontend/components/chat/action-cards/EntityUpdatedCard.tsx`:

Shows entity preview + changes list with `field: old -> new` format. Used for actions ending in `_updated`.

**Step 4: Create EntityDeletedCard**

`frontend/components/chat/action-cards/EntityDeletedCard.tsx`:

Shows entity preview in muted/strikethrough style + "Annuler la suppression" button that calls `POST /api/trash/{entity_id}/restore/`. Used for actions ending in `_deleted`.

**Step 5: Create ContactListCard**

`frontend/components/chat/action-cards/ContactListCard.tsx`:

Shows count badge, mini table of results, each row clickable. If `save_as_segment_available`, shows "Sauvegarder comme segment" button that calls `POST /api/segments/` with the `rules` from the action.

**Step 6: Create ChartCard**

`frontend/components/chat/action-cards/ChartCard.tsx`:

Wraps `DynamicChart` component with the card styling. Used for `action === "chart_generated"`.

**Step 7: Create NavigationCard**

`frontend/components/chat/action-cards/NavigationCard.tsx`:

Shows icon, title, description, and a styled clickable link. Uses Next.js `Link` component. Used for `action === "navigation"`.

**Step 8: Create ErrorCard**

`frontend/components/chat/action-cards/ErrorCard.tsx`:

Red-styled card showing error message. Used for `action === "error"`.

**Step 9: Rewrite ActionCard.tsx as dispatcher**

```tsx
"use client"

import type { EnrichedAction } from "@/types/chat"
import { EntityCreatedCard } from "./action-cards/EntityCreatedCard"
import { EntityUpdatedCard } from "./action-cards/EntityUpdatedCard"
import { EntityDeletedCard } from "./action-cards/EntityDeletedCard"
import { ContactListCard } from "./action-cards/ContactListCard"
import { ChartCard } from "./action-cards/ChartCard"
import { NavigationCard } from "./action-cards/NavigationCard"
import { ErrorCard } from "./action-cards/ErrorCard"

export function ActionCard({ action }: { action: EnrichedAction }) {
  const a = action.action

  if (a === "error") return <ErrorCard action={action} />
  if (a === "chart_generated") return <ChartCard action={action} />
  if (a === "navigation") return <NavigationCard action={action} />
  if (a === "contacts_queried" || action.entity_type === "contact_list" || action.entity_type === "deal_list" || action.entity_type === "task_list")
    return <ContactListCard action={action} />
  if (a.endsWith("_deleted")) return <EntityDeletedCard action={action} />
  if (a.endsWith("_updated") || action.changes) return <EntityUpdatedCard action={action} />
  if (a.endsWith("_created") || a.endsWith("_details") || action.entity_preview)
    return <EntityCreatedCard action={action} />

  // Fallback for legacy actions (dashboard_summary, list_*, search_*, etc.)
  return <EntityCreatedCard action={action} />
}
```

**Step 10: Commit**

```bash
git add frontend/components/chat/ActionCard.tsx frontend/components/chat/action-cards/ frontend/components/chat/DynamicChart.tsx
git commit -m "feat(chat): refactor ActionCard into dispatcher with rich sub-components"
```

---

## Task 14: Frontend — Update InlineToolCard for new tools

**Files:**
- Modify: `frontend/components/chat/InlineToolCard.tsx`

**Step 1: Add entries for all new tools in the tool config**

Add tool definitions for: `delete_contact`, `get_contact`, `list_contact_categories`, `create_contact_category`, `delete_contact_category`, `update_deal`, `delete_deal`, `get_deal`, `search_deals`, `list_pipeline_stages`, `create_pipeline_stage`, `update_pipeline_stage`, `delete_pipeline_stage`, `update_task`, `delete_task`, `search_tasks`, `list_segments`, `update_segment`, `delete_segment`, `get_segment_contacts`, `update_workflow`, `delete_workflow`, `create_email_template`, `update_email_template`, `delete_email_template`, `update_note`, `delete_note`, `list_timeline`, `navigate`, `query_contacts`, `generate_chart`.

Each entry needs: icon, label, accentColor, bgColor matching the entity type from the config.

**Step 2: Update `formatResult` and `formatArgs` for new tool types**

**Step 3: Commit**

```bash
git add frontend/components/chat/InlineToolCard.tsx
git commit -m "feat(chat): add all new tools to InlineToolCard config"
```

---

## Task 15: Frontend — Update ChatMessage to use EnrichedAction

**Files:**
- Modify: `frontend/components/chat/ChatMessage.tsx`

**Step 1: Update imports and action rendering**

Ensure `ChatMessage` passes `EnrichedAction` typed objects to the refactored `ActionCard`. Update the `messageToParts` function if needed to properly parse enriched action data from the API response.

**Step 2: Commit**

```bash
git add frontend/components/chat/ChatMessage.tsx
git commit -m "feat(chat): update ChatMessage for enriched action cards"
```

---

## Task 16: Integration testing

**Step 1: Test backend tools manually**

Run the Django shell and test each new tool:

```bash
cd backend && python manage.py shell
```

Verify: `delete_contact`, `get_contact`, `update_deal`, `delete_deal`, `search_deals`, `navigate`, `query_contacts`, `generate_chart` all return the expected enriched format.

**Step 2: Test frontend rendering**

Start the dev server and test via the chat interface:
- "Cree un contact Jean Dupont chez Acme" -> verify enriched action card
- "Supprime le contact Jean Dupont" -> verify deleted card with undo button
- "Montre-moi les contacts avec un deal chaud" -> verify contact list card
- "Montre-moi l'evolution des deals ce mois" -> verify chart renders inline
- "Emmene-moi vers le dashboard" -> verify navigation link card

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(chat): complete AI chat tools upgrade with rich action cards"
```
