"""
Pydantic AI tools for the CRM chat agent.

Each tool receives a RunContext[ChatDeps] as its first argument, which provides
access to the current user and organization. All functions are synchronous
because we use Django's sync ORM.
"""
from __future__ import annotations

import uuid as _uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Q, Sum
from django.utils import timezone
from pydantic_ai import RunContext

from contacts.models import Contact, ContactCategory, CustomFieldDefinition
from deals.models import Deal, PipelineStage
from notes.models import TimelineEntry
from tasks.models import Task
from emails.models import EmailAccount
from emails.service import send_email as service_send_email


@dataclass
class ChatDeps:
    """Dependencies injected into every tool via RunContext."""
    organization_id: str
    user_id: str


def _is_valid_uuid(value: str | None) -> bool:
    """Return True if *value* is a valid UUID string."""
    if not value:
        return False
    try:
        _uuid.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False


def _resolve_contact_id(org_id: str, raw_id: str | None) -> str | None:
    """Return a valid contact UUID or None.

    If *raw_id* is already a valid UUID that exists, return it.
    Otherwise try to find the most recently created contact in the org
    (the LLM likely meant the contact it just created).
    """
    if not raw_id:
        return None
    if _is_valid_uuid(raw_id):
        if Contact.objects.filter(id=raw_id, organization_id=org_id).exists():
            return raw_id
    # Fallback: most recently created contact in the org
    latest = Contact.objects.filter(organization_id=org_id).order_by("-created_at").first()
    return str(latest.id) if latest else None


def _resolve_deal_id(org_id: str, raw_id: str | None) -> str | None:
    """Return a valid deal UUID or None."""
    if not raw_id:
        return None
    if _is_valid_uuid(raw_id):
        if Deal.objects.filter(id=raw_id, organization_id=org_id).exists():
            return raw_id
    latest = Deal.objects.filter(organization_id=org_id).order_by("-created_at").first()
    return str(latest.id) if latest else None


# ---------------------------------------------------------------------------
# Contacts
# ---------------------------------------------------------------------------

def create_contact(
    ctx: RunContext[ChatDeps],
    first_name: str,
    last_name: str,
    company: str = "",
    email: str = "",
    phone: str = "",
    categories: str = "",
) -> dict:
    """Create a new contact in the CRM. Checks for duplicates first."""
    org_id = ctx.deps.organization_id
    # Check for existing contact with same name
    existing = Contact.objects.filter(
        organization_id=org_id,
        first_name__iexact=first_name,
        last_name__iexact=last_name,
    ).first()
    if existing:
        return {
            "action": "duplicate_found",
            "id": str(existing.id),
            "name": f"{existing.first_name} {existing.last_name}",
            "company": existing.company,
            "email": existing.email,
            "message": f"Le contact {existing.first_name} {existing.last_name} existe deja.",
        }

    contact = Contact.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        first_name=first_name,
        last_name=last_name,
        company=company,
        email=email,
        phone=phone,
    )
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_CREATED,
        content=f"Contact {first_name} {last_name} created via chat",
    )

    # Set categories if provided (comma-separated names)
    if categories:
        cat_names = [n.strip() for n in categories.split(",") if n.strip()]
        cats = ContactCategory.objects.filter(
            organization_id=org_id,
            name__in=cat_names,
        )
        contact.categories.set(cats)

    return {
        "action": "contact_created",
        "id": str(contact.id),
        "name": f"{first_name} {last_name}",
        "company": company,
    }


def search_contacts(ctx: RunContext[ChatDeps], query: str, category: str = "") -> dict:
    """Search contacts by name, company or email. Optionally filter by category name."""
    org_id = ctx.deps.organization_id
    qs = Contact.objects.filter(organization_id=org_id)
    # Split query into words so "hugo frely" matches first_name=hugo AND last_name=frely
    words = query.strip().split()
    for word in words:
        qs = qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
        )
    if category:
        qs = qs.filter(categories__name__iexact=category)
    contacts = qs[:10]
    results = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "company": c.company,
            "email": c.email,
            "job_title": c.job_title,
            "lead_score": c.lead_score,
            "categories": list(c.categories.values_list("name", flat=True)),
        }
        for c in contacts
    ]
    return {"action": "search_contacts", "count": len(results), "results": results}


def update_contact(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    job_title: Optional[str] = None,
    linkedin_url: Optional[str] = None,
    website: Optional[str] = None,
    address: Optional[str] = None,
    industry: Optional[str] = None,
    lead_score: Optional[str] = None,
    estimated_budget: Optional[float] = None,
    identified_needs: Optional[str] = None,
    decision_role: Optional[str] = None,
    preferred_channel: Optional[str] = None,
    timezone: Optional[str] = None,
    language: Optional[str] = None,
    interests: Optional[list[str]] = None,
    birthday: Optional[str] = None,
    notes: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Update an existing contact's fields. Only provided fields are updated."""
    org_id = ctx.deps.organization_id
    try:
        contact = Contact.objects.get(id=contact_id, organization_id=org_id)
    except Contact.DoesNotExist:
        return {"action": "error", "message": f"Contact {contact_id} not found."}

    updatable = {
        "first_name": first_name, "last_name": last_name, "email": email,
        "phone": phone, "company": company, "job_title": job_title,
        "linkedin_url": linkedin_url, "website": website, "address": address,
        "industry": industry, "lead_score": lead_score,
        "identified_needs": identified_needs, "decision_role": decision_role,
        "preferred_channel": preferred_channel, "timezone": timezone,
        "language": language, "interests": interests, "notes": notes,
        "source": source,
    }
    if estimated_budget is not None:
        from decimal import Decimal
        updatable["estimated_budget"] = Decimal(str(estimated_budget))
    if birthday is not None:
        from datetime import date
        try:
            updatable["birthday"] = date.fromisoformat(birthday)
        except ValueError:
            return {"action": "error", "message": f"Invalid birthday format: {birthday}. Use YYYY-MM-DD."}

    changed = []
    for field, value in updatable.items():
        if value is not None:
            setattr(contact, field, value)
            changed.append(field)

    if not changed:
        return {"action": "error", "message": "No fields provided to update."}

    contact.save()

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Contact updated via chat: {', '.join(changed)}",
        metadata={"changed_fields": changed},
    )

    from contacts.ai_summary import trigger_summary_generation
    trigger_summary_generation(str(contact.id))

    return {
        "action": "contact_updated",
        "id": str(contact.id),
        "name": f"{contact.first_name} {contact.last_name}",
        "changed_fields": changed,
    }


def update_contact_categories(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    category_names: list[str],
) -> dict:
    """Met a jour les categories d'un contact. Remplace toutes les categories actuelles par celles fournies."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_contact_id(org_id, contact_id)
    if not resolved_id:
        return {"error": "Contact introuvable."}

    contact = Contact.objects.get(id=resolved_id, organization_id=org_id)

    categories = ContactCategory.objects.filter(
        organization_id=org_id,
        name__in=category_names,
    )
    found_names = set(categories.values_list("name", flat=True))
    not_found = [n for n in category_names if n not in found_names]

    contact.categories.set(categories)

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Categories mises a jour: {', '.join(found_names)}",
        metadata={"changed_fields": ["categories"]},
    )

    result = {
        "action": "categories_updated",
        "contact": f"{contact.first_name} {contact.last_name}",
        "categories": list(found_names),
    }
    if not_found:
        result["warning"] = f"Categories introuvables: {', '.join(not_found)}"
    return result


def update_custom_field(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    field_label: str,
    value: str,
) -> dict:
    """Met a jour un champ personnalise d'un contact. Utilise le label du champ (ex: 'SIRET', 'TVA')."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_contact_id(org_id, contact_id)
    if not resolved_id:
        return {"error": "Contact introuvable."}

    contact = Contact.objects.get(id=resolved_id, organization_id=org_id)

    try:
        field_def = CustomFieldDefinition.objects.get(
            organization_id=org_id,
            label__iexact=field_label,
        )
    except CustomFieldDefinition.DoesNotExist:
        return {"error": f"Champ personnalise '{field_label}' introuvable."}

    # Type conversion
    if field_def.field_type == "number":
        try:
            value = float(value)
        except ValueError:
            return {"error": f"Le champ '{field_label}' attend un nombre."}
    elif field_def.field_type == "checkbox":
        value = value.lower() in ("true", "oui", "1", "yes")
    elif field_def.field_type == "select":
        if value not in field_def.options:
            return {"error": f"Valeur invalide. Options: {field_def.options}"}

    if not contact.custom_fields:
        contact.custom_fields = {}
    contact.custom_fields[str(field_def.id)] = value
    contact.save(update_fields=["custom_fields"])

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_UPDATED,
        content=f"Champ '{field_def.label}' mis a jour",
        metadata={"changed_fields": [f"custom:{field_def.label}"]},
    )

    return {
        "action": "custom_field_updated",
        "contact": f"{contact.first_name} {contact.last_name}",
        "field": field_def.label,
        "value": value,
    }


# ---------------------------------------------------------------------------
# Deals
# ---------------------------------------------------------------------------

def create_deal(
    ctx: RunContext[ChatDeps],
    name: str,
    amount: float = 0,
    contact_id: Optional[str] = None,
    stage_name: str = "Premier contact",
) -> dict:
    """Create a new deal in the pipeline."""
    org_id = ctx.deps.organization_id
    stage = PipelineStage.objects.filter(
        organization_id=org_id, name=stage_name,
    ).first()
    if not stage:
        stage = PipelineStage.objects.filter(organization_id=org_id).first()
    if not stage:
        return {"action": "error", "message": "No pipeline stages found. Please create stages first."}

    resolved_contact = _resolve_contact_id(org_id, contact_id)

    deal = Deal.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name,
        amount=amount,
        stage=stage,
        contact_id=resolved_contact,
    )
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        deal=deal,
        contact_id=resolved_contact,
        entry_type=TimelineEntry.EntryType.DEAL_CREATED,
        content=f"Deal '{name}' created via chat ({amount} EUR)",
    )
    return {
        "action": "deal_created",
        "id": str(deal.id),
        "name": name,
        "amount": float(amount),
        "stage": stage.name,
    }


def move_deal(
    ctx: RunContext[ChatDeps],
    deal_id: str,
    new_stage_name: str,
) -> dict:
    """Move a deal to a different pipeline stage."""
    org_id = ctx.deps.organization_id
    try:
        deal = Deal.objects.get(id=deal_id, organization_id=org_id)
    except Deal.DoesNotExist:
        return {"action": "error", "message": f"Deal {deal_id} not found."}

    stage = PipelineStage.objects.filter(
        organization_id=org_id, name=new_stage_name,
    ).first()
    if not stage:
        return {"action": "error", "message": f"Stage '{new_stage_name}' not found."}

    old_stage = deal.stage.name
    deal.stage = stage
    if new_stage_name in ("Gagne", "Perdu"):
        deal.closed_at = timezone.now()
    deal.save()

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        deal=deal,
        entry_type=TimelineEntry.EntryType.DEAL_MOVED,
        content=f"Deal '{deal.name}' moved from '{old_stage}' to '{new_stage_name}'",
    )
    return {
        "action": "deal_moved",
        "id": str(deal.id),
        "name": deal.name,
        "old_stage": old_stage,
        "new_stage": new_stage_name,
    }


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

def create_task(
    ctx: RunContext[ChatDeps],
    description: str,
    due_date: str,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    priority: str = "normal",
) -> dict:
    """Create a task / reminder. due_date should be ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM)."""
    org_id = ctx.deps.organization_id
    try:
        parsed_date = datetime.fromisoformat(due_date)
        if parsed_date.tzinfo is None:
            parsed_date = timezone.make_aware(parsed_date)
    except (ValueError, TypeError):
        parsed_date = timezone.now() + timedelta(days=1)

    resolved_contact = _resolve_contact_id(org_id, contact_id)
    resolved_deal = _resolve_deal_id(org_id, deal_id)

    task = Task.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        description=description,
        due_date=parsed_date,
        contact_id=resolved_contact,
        deal_id=resolved_deal,
        priority=priority,
    )
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact_id=resolved_contact,
        deal_id=resolved_deal,
        entry_type=TimelineEntry.EntryType.TASK_CREATED,
        content=f"Task created via chat: {description}",
    )
    return {
        "action": "task_created",
        "id": str(task.id),
        "description": description,
        "due_date": str(task.due_date),
        "priority": priority,
    }


def complete_task(ctx: RunContext[ChatDeps], task_id: str) -> dict:
    """Mark a task as done."""
    org_id = ctx.deps.organization_id
    try:
        task = Task.objects.get(id=task_id, organization_id=org_id)
    except Task.DoesNotExist:
        return {"action": "error", "message": f"Task {task_id} not found."}

    task.is_done = True
    task.save()
    return {
        "action": "task_completed",
        "id": str(task.id),
        "description": task.description,
    }


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------

def add_note(
    ctx: RunContext[ChatDeps],
    content: str,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
) -> dict:
    """Add a note to a contact or deal (or standalone)."""
    org_id = ctx.deps.organization_id
    resolved_contact = _resolve_contact_id(org_id, contact_id)
    resolved_deal = _resolve_deal_id(org_id, deal_id)

    entry = TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact_id=resolved_contact,
        deal_id=resolved_deal,
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=content,
    )
    if resolved_contact:
        from contacts.ai_summary import trigger_summary_generation
        trigger_summary_generation(resolved_contact)
    return {
        "action": "note_added",
        "id": str(entry.id),
        "content": content[:100],
    }


# ---------------------------------------------------------------------------
# Emails
# ---------------------------------------------------------------------------

def send_contact_email(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    subject: str,
    body: str,
) -> dict:
    """Send an email to a contact using the user's connected email account.
    Use when the user asks to email, send a message, or follow up with a contact.
    The body should be plain text — it will be converted to HTML automatically.
    """
    from accounts.models import User
    from organizations.models import Organization

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    # Check email account exists
    account = EmailAccount.objects.filter(
        user_id=user_id, organization_id=org_id, is_active=True,
    ).first()
    if not account:
        return {
            "action": "error",
            "message": "Aucun compte email connecté. Connectez votre Gmail ou Outlook dans Paramètres.",
        }

    # Convert plain text body to simple HTML
    body_html = "".join(f"<p>{line}</p>" for line in body.split("\n") if line.strip())
    if not body_html:
        body_html = f"<p>{body}</p>"

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=org_id)
        sent = service_send_email(
            user=user,
            organization=org,
            contact_id=contact_id,
            subject=subject,
            body_html=body_html,
        )
    except (ValueError, PermissionError) as e:
        return {"action": "error", "message": str(e)}
    except Exception:
        return {"action": "error", "message": "Erreur lors de l'envoi de l'email."}

    return {
        "action": "email_sent",
        "to": sent.to_email,
        "subject": subject,
    }


# ---------------------------------------------------------------------------
# Interactions (timeline activities)
# ---------------------------------------------------------------------------

INTERACTION_TYPES = {"call", "meeting", "custom"}


def log_interaction(
    ctx: RunContext[ChatDeps],
    contact_id: str,
    interaction_type: str,
    subject: str,
    content: str = "",
    deal_id: Optional[str] = None,
    occurred_at: Optional[str] = None,
) -> dict:
    """Log a past interaction (call, meeting, or custom activity) on a contact's timeline.

    Use this when the user mentions they had a call, meeting, or any interaction
    with a contact. Examples: "J'ai eu Amelie au telephone", "Reunion avec X hier".

    interaction_type must be one of: call, meeting, custom.
    occurred_at should be ISO format (YYYY-MM-DDTHH:MM) if the user specifies when it happened.
    """
    org_id = ctx.deps.organization_id

    if interaction_type not in INTERACTION_TYPES:
        interaction_type = "custom"

    resolved_contact = _resolve_contact_id(org_id, contact_id)
    if not resolved_contact:
        return {"action": "error", "message": "Contact introuvable."}

    resolved_deal = _resolve_deal_id(org_id, deal_id)

    metadata = {}
    if occurred_at:
        try:
            parsed = datetime.fromisoformat(occurred_at)
            metadata["occurred_at"] = parsed.isoformat()
        except (ValueError, TypeError):
            pass

    entry = TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact_id=resolved_contact,
        deal_id=resolved_deal,
        entry_type=interaction_type,
        subject=subject,
        content=content,
        metadata=metadata,
    )

    # Refresh AI summary for the contact
    from contacts.ai_summary import trigger_summary_generation
    trigger_summary_generation(resolved_contact)

    return {
        "action": "interaction_logged",
        "id": str(entry.id),
        "type": interaction_type,
        "subject": subject,
        "contact_id": resolved_contact,
    }


# ---------------------------------------------------------------------------
# Dashboard / Search
# ---------------------------------------------------------------------------

def get_dashboard_summary(ctx: RunContext[ChatDeps]) -> dict:
    """Get a summary of the CRM dashboard: deals, tasks, contacts."""
    org_id = ctx.deps.organization_id
    now = timezone.now()

    total_contacts = Contact.objects.filter(organization_id=org_id).count()

    excluded_stages = ["Gagne", "Perdu"]
    active_deals = Deal.objects.filter(organization_id=org_id).exclude(
        stage__name__in=excluded_stages,
    )
    pipeline_total = float(
        active_deals.aggregate(total=Sum("amount"))["total"] or 0
    )

    upcoming_tasks = Task.objects.filter(
        organization_id=org_id,
        is_done=False,
        due_date__lte=now + timedelta(days=7),
    ).count()

    overdue_tasks = Task.objects.filter(
        organization_id=org_id,
        is_done=False,
        due_date__lt=now,
    ).count()

    return {
        "action": "dashboard_summary",
        "total_contacts": total_contacts,
        "active_deals": active_deals.count(),
        "pipeline_total": pipeline_total,
        "upcoming_tasks_7d": upcoming_tasks,
        "overdue_tasks": overdue_tasks,
    }


def search_all(ctx: RunContext[ChatDeps], query: str) -> dict:
    """Search across contacts, deals, and notes."""
    org_id = ctx.deps.organization_id

    contact_qs = Contact.objects.filter(organization_id=org_id)
    for word in query.strip().split():
        contact_qs = contact_qs.filter(
            Q(first_name__icontains=word)
            | Q(last_name__icontains=word)
            | Q(company__icontains=word)
            | Q(email__icontains=word)
        )
    contacts = contact_qs[:5]

    deals = Deal.objects.filter(
        organization_id=org_id,
    ).filter(Q(name__icontains=query) | Q(notes__icontains=query))[:5]

    notes = TimelineEntry.objects.filter(
        organization_id=org_id,
        content__icontains=query,
    )[:5]

    return {
        "action": "search_all",
        "contacts": [
            {"id": str(c.id), "name": f"{c.first_name} {c.last_name}"}
            for c in contacts
        ],
        "deals": [
            {"id": str(d.id), "name": d.name, "amount": float(d.amount)}
            for d in deals
        ],
        "notes": [
            {"id": str(n.id), "content": n.content[:100]}
            for n in notes
        ],
    }


# ---------------------------------------------------------------------------
# Workflows
# ---------------------------------------------------------------------------

def create_workflow(
    ctx: RunContext[ChatDeps],
    name: str,
    trigger_type: str,
    trigger_filters: Optional[dict] = None,
    conditions: Optional[list] = None,
    actions: Optional[list] = None,
) -> dict:
    """Create an automated workflow. trigger_type can be: deal.stage_changed, deal.created, deal.won, deal.lost, contact.created, contact.updated, contact.lead_score_changed, task.created, task.completed, task.overdue, email.sent, note.added.

    trigger_filters: optional dict to filter the trigger (e.g. {"new_stage_name": "Négociation"}).
    conditions: optional list of conditions (e.g. [{"field": "deal.amount", "operator": "greater_than", "value": 5000}]).
    actions: required list of actions (e.g. [{"type": "create_task", "description": "Follow up", "due_date_offset": "+3d", "priority": "high"}]).
    Action types: create_task, send_notification, create_note, move_deal, update_contact, send_email, webhook.
    """
    from workflows.models import Workflow, WorkflowNode, WorkflowEdge

    org_id = ctx.deps.organization_id
    if not actions:
        return {"action": "error", "message": "At least one action is required."}

    workflow = Workflow.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name,
        is_active=True,
    )

    # Create trigger node
    y = 50
    trigger_node = WorkflowNode.objects.create(
        workflow=workflow,
        node_type="trigger",
        node_subtype=trigger_type,
        config={"filters": trigger_filters or {}},
        position_x=250,
        position_y=y,
    )

    prev_node = trigger_node

    # Create condition nodes if any
    if conditions:
        for cond in conditions:
            y += 150
            cond_node = WorkflowNode.objects.create(
                workflow=workflow,
                node_type="condition",
                node_subtype="condition",
                config=cond,
                position_x=250,
                position_y=y,
            )
            WorkflowEdge.objects.create(
                workflow=workflow,
                source_node=prev_node,
                target_node=cond_node,
                source_handle="yes" if prev_node.node_type == "condition" else "",
            )
            prev_node = cond_node

    # Create action nodes
    for act in actions:
        y += 150
        action_node = WorkflowNode.objects.create(
            workflow=workflow,
            node_type="action",
            node_subtype=act.get("type", "create_task"),
            config={k: v for k, v in act.items() if k != "type"},
            position_x=250,
            position_y=y,
        )
        WorkflowEdge.objects.create(
            workflow=workflow,
            source_node=prev_node,
            target_node=action_node,
            source_handle="yes" if prev_node.node_type == "condition" else "",
        )
        prev_node = action_node

    return {
        "action": "workflow_created",
        "id": str(workflow.id),
        "name": name,
        "trigger": trigger_type,
        "action_count": len(actions),
        "is_active": True,
    }


def list_workflows(ctx: RunContext[ChatDeps]) -> dict:
    """List all workflows for the current organization with their status."""
    from workflows.models import Workflow

    org_id = ctx.deps.organization_id
    workflows = Workflow.objects.filter(organization_id=org_id)
    results = [
        {
            "id": str(w.id),
            "name": w.name,
            "is_active": w.is_active,
            "description": w.description,
            "execution_count": w.executions.count(),
        }
        for w in workflows[:20]
    ]
    return {"action": "list_workflows", "count": len(results), "workflows": results}


def toggle_workflow(ctx: RunContext[ChatDeps], workflow_id: str, active: bool) -> dict:
    """Activate or deactivate a workflow."""
    from workflows.models import Workflow

    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": f"Workflow {workflow_id} not found."}

    workflow.is_active = active
    workflow.save(update_fields=["is_active"])
    status_text = "activé" if active else "désactivé"
    return {
        "action": "workflow_toggled",
        "id": str(workflow.id),
        "name": workflow.name,
        "is_active": active,
        "message": f"Workflow '{workflow.name}' {status_text}.",
    }


def get_workflow_executions(ctx: RunContext[ChatDeps], workflow_id: str, limit: int = 5) -> dict:
    """Get recent executions of a workflow to see its history."""
    from workflows.models import Workflow, WorkflowExecution

    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": f"Workflow {workflow_id} not found."}

    executions = WorkflowExecution.objects.filter(workflow=workflow)[:limit]
    results = [
        {
            "id": str(e.id),
            "status": e.status,
            "trigger_event": e.trigger_event,
            "started_at": str(e.started_at),
            "completed_at": str(e.completed_at) if e.completed_at else None,
            "error": e.error if e.error else None,
        }
        for e in executions
    ]
    return {
        "action": "workflow_executions",
        "workflow": workflow.name,
        "count": len(results),
        "executions": results,
    }


# All tools to register on the agent
ALL_TOOLS = [
    create_contact,
    search_contacts,
    update_contact,
    update_contact_categories,
    update_custom_field,
    create_deal,
    move_deal,
    create_task,
    complete_task,
    add_note,
    log_interaction,
    send_contact_email,
    get_dashboard_summary,
    search_all,
    # Workflows
    create_workflow,
    list_workflows,
    toggle_workflow,
    get_workflow_executions,
]
