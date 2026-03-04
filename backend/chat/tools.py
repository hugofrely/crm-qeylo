"""
Pydantic AI tools for the CRM chat agent.

Each tool receives a RunContext[ChatDeps] as its first argument, which provides
access to the current user and organization. All functions are synchronous
because we use Django's sync ORM.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Q, Sum
from django.utils import timezone
from pydantic_ai import RunContext

from contacts.models import Contact
from deals.models import Deal, PipelineStage
from notes.models import TimelineEntry
from tasks.models import Task


@dataclass
class ChatDeps:
    """Dependencies injected into every tool via RunContext."""
    organization_id: str
    user_id: str


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
) -> dict:
    """Create a new contact in the CRM."""
    contact = Contact.objects.create(
        organization_id=ctx.deps.organization_id,
        created_by_id=ctx.deps.user_id,
        first_name=first_name,
        last_name=last_name,
        company=company,
        email=email,
        phone=phone,
    )
    TimelineEntry.objects.create(
        organization_id=ctx.deps.organization_id,
        created_by_id=ctx.deps.user_id,
        contact=contact,
        entry_type=TimelineEntry.EntryType.CONTACT_CREATED,
        content=f"Contact {first_name} {last_name} created via chat",
    )
    return {
        "action": "contact_created",
        "id": str(contact.id),
        "name": f"{first_name} {last_name}",
        "company": company,
    }


def search_contacts(ctx: RunContext[ChatDeps], query: str) -> dict:
    """Search contacts by name, company or email."""
    org_id = ctx.deps.organization_id
    contacts = Contact.objects.filter(
        organization_id=org_id,
    ).filter(
        Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
        | Q(company__icontains=query)
        | Q(email__icontains=query)
    )[:10]
    results = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "company": c.company,
            "email": c.email,
        }
        for c in contacts
    ]
    return {"action": "search_contacts", "count": len(results), "results": results}


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

    deal = Deal.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name,
        amount=amount,
        stage=stage,
        contact_id=contact_id,
    )
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        deal=deal,
        contact_id=contact_id,
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

    task = Task.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        description=description,
        due_date=parsed_date,
        contact_id=contact_id,
        deal_id=deal_id,
        priority=priority,
    )
    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        contact_id=contact_id,
        deal_id=deal_id,
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
    entry = TimelineEntry.objects.create(
        organization_id=ctx.deps.organization_id,
        created_by_id=ctx.deps.user_id,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=content,
    )
    return {
        "action": "note_added",
        "id": str(entry.id),
        "content": content[:100],
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

    contacts = Contact.objects.filter(
        organization_id=org_id,
    ).filter(
        Q(first_name__icontains=query)
        | Q(last_name__icontains=query)
        | Q(company__icontains=query)
        | Q(email__icontains=query)
    )[:5]

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


# All tools to register on the agent
ALL_TOOLS = [
    create_contact,
    search_contacts,
    create_deal,
    move_deal,
    create_task,
    complete_task,
    add_note,
    get_dashboard_summary,
    search_all,
]
