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

from contacts.duplicates import _find_duplicates
from contacts.models import Contact, ContactCategory, CustomFieldDefinition, DuplicateDetectionSettings
from deals.models import Deal, Pipeline, PipelineStage
from organizations.models import Organization
from notes.models import TimelineEntry
from segments.models import Segment
from segments.engine import build_segment_queryset
from tasks.models import Task
from emails.models import EmailAccount
from emails.service import send_email as service_send_email
from companies.models import Company
from contacts.models import ContactRelationship


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


def _resolve_company_id(org_id: str, raw_id: str | None) -> str | None:
    """Return a valid company UUID or None."""
    if not raw_id:
        return None
    if _is_valid_uuid(raw_id):
        if Company.objects.filter(id=raw_id, organization_id=org_id).exists():
            return raw_id
    latest = Company.objects.filter(organization_id=org_id).order_by("-created_at").first()
    return str(latest.id) if latest else None


def _find_company(org_id: str, name_or_id: str):
    """Find a company by ID or name."""
    if _is_valid_uuid(name_or_id):
        c = Company.objects.filter(id=name_or_id, organization_id=org_id).first()
        if c:
            return c
    return Company.objects.filter(
        organization_id=org_id, name__icontains=name_or_id
    ).first()


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
    # Check for duplicates using shared detection logic
    org = Organization.objects.get(id=org_id)
    dup_settings, _ = DuplicateDetectionSettings.objects.get_or_create(organization=org)
    duplicates = _find_duplicates(
        org,
        {"first_name": first_name, "last_name": last_name, "email": email, "phone": phone},
        dup_settings,
    )
    if duplicates:
        contact, score, matched_on = duplicates[0]
        return {
            "action": "duplicate_found",
            "id": str(contact.id),
            "name": f"{contact.first_name} {contact.last_name}",
            "company": contact.company,
            "email": contact.email,
            "score": round(score, 2),
            "matched_on": matched_on,
            "message": f"Un contact similaire existe déjà: {contact.first_name} {contact.last_name} (score: {round(score, 2)}).",
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
        "entity_id": str(contact.id),
        "name": f"{first_name} {last_name}",
        "company": company,
        "entity_type": "contact",
        "summary": f"Contact {first_name} {last_name} créé",
        "entity_preview": {
            "name": f"{first_name} {last_name}",
            "email": email,
            "company": company,
            "avatar_initials": f"{first_name[0]}{last_name[0]}".upper() if first_name and last_name else "",
        },
        "link": f"/contacts/{contact.id}",
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
    return {
        "action": "search_contacts",
        "count": len(results),
        "results": results,
        "entity_type": "contact_list",
        "summary": f"{len(results)} contacts trouvés",
    }


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
        "entity_id": str(contact.id),
        "name": f"{contact.first_name} {contact.last_name}",
        "changed_fields": changed,
        "entity_type": "contact",
        "summary": f"Contact {contact.first_name} {contact.last_name} mis à jour",
        "entity_preview": {
            "name": f"{contact.first_name} {contact.last_name}",
            "email": contact.email,
            "company": contact.company,
        },
        "link": f"/contacts/{contact.id}",
        "changes": [{"field": f, "from": "", "to": ""} for f in changed],
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
        "entity_type": "contact",
        "summary": f"Catégories mises à jour pour {contact.first_name} {contact.last_name}",
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
        "entity_type": "contact",
        "summary": f"Champ '{field_def.label}' mis à jour",
    }


def delete_contact(ctx: RunContext[ChatDeps], contact_id: str) -> dict:
    """Supprime un contact (soft delete). Le contact pourra être restauré depuis la corbeille."""
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
    contact.delete()

    return {
        "action": "contact_deleted",
        "entity_type": "contact",
        "entity_id": resolved_id,
        "summary": f"Contact {name} supprimé",
        "entity_preview": preview,
        "undo_available": True,
    }


def get_contact(ctx: RunContext[ChatDeps], contact_id: str) -> dict:
    """Récupère les détails complets d'un contact pour affichage. Utilise l'ID du contact."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_contact_id(org_id, contact_id)
    if not resolved_id:
        return {"action": "error", "message": "Contact introuvable."}

    try:
        contact = Contact.objects.get(id=resolved_id, organization_id=org_id)
    except Contact.DoesNotExist:
        return {"action": "error", "message": "Contact introuvable."}

    initials = ""
    if contact.first_name:
        initials += contact.first_name[0].upper()
    if contact.last_name:
        initials += contact.last_name[0].upper()

    name = f"{contact.first_name} {contact.last_name}"
    return {
        "action": "get_contact",
        "entity_type": "contact",
        "entity_id": resolved_id,
        "entity_preview": {
            "name": name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "job_title": contact.job_title,
            "lead_score": contact.lead_score,
            "avatar_initials": initials,
        },
        "link": f"/contacts/{resolved_id}",
    }


def list_contact_categories(ctx: RunContext[ChatDeps]) -> dict:
    """Liste toutes les catégories de contacts disponibles pour l'organisation."""
    org_id = ctx.deps.organization_id
    categories = ContactCategory.objects.filter(organization_id=org_id)
    results = [
        {
            "id": str(cat.id),
            "name": cat.name,
            "color": cat.color,
        }
        for cat in categories
    ]
    return {"action": "list_contact_categories", "count": len(results), "results": results}


def create_contact_category(
    ctx: RunContext[ChatDeps],
    name: str,
    color: str = "#6366f1",
) -> dict:
    """Crée une nouvelle catégorie de contacts. Vérifie qu'une catégorie avec le même nom n'existe pas déjà."""
    org_id = ctx.deps.organization_id

    existing = ContactCategory.objects.filter(
        organization_id=org_id,
        name__iexact=name,
    ).first()
    if existing:
        return {
            "action": "error",
            "message": f"Une catégorie '{existing.name}' existe déjà.",
        }

    category = ContactCategory.objects.create(
        organization_id=org_id,
        name=name,
        color=color,
    )
    return {
        "action": "contact_category_created",
        "entity_type": "contact_category",
        "entity_id": str(category.id),
        "entity_preview": {
            "name": category.name,
            "color": category.color,
        },
    }


def delete_contact_category(ctx: RunContext[ChatDeps], category_id: str) -> dict:
    """Supprime une catégorie de contacts."""
    org_id = ctx.deps.organization_id

    try:
        category = ContactCategory.objects.get(id=category_id, organization_id=org_id)
    except ContactCategory.DoesNotExist:
        return {"action": "error", "message": "Catégorie introuvable."}

    preview = {
        "name": category.name,
        "color": category.color,
    }
    category.delete()

    return {
        "action": "contact_category_deleted",
        "entity_type": "contact_category",
        "entity_id": category_id,
        "summary": f"Catégorie '{preview['name']}' supprimée",
        "entity_preview": preview,
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
        "entity_id": str(deal.id),
        "name": name,
        "amount": float(amount),
        "stage": stage.name,
        "entity_type": "deal",
        "summary": f"Deal '{name}' créé",
        "entity_preview": {
            "name": name,
            "amount": str(amount),
            "stage": stage.name,
            "contact": None,
        },
        "link": f"/deals/{deal.id}",
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
        "entity_id": str(deal.id),
        "name": deal.name,
        "old_stage": old_stage,
        "new_stage": new_stage_name,
        "entity_type": "deal",
        "summary": f"Deal '{deal.name}' déplacé",
        "entity_preview": {
            "name": deal.name,
            "amount": str(deal.amount),
            "stage": new_stage_name,
        },
        "changes": [{"field": "stage", "from": old_stage, "to": new_stage_name}],
        "link": f"/deals/{deal.id}",
    }


def update_deal(
    ctx: RunContext[ChatDeps],
    deal_id: str,
    name: Optional[str] = None,
    amount: Optional[float] = None,
    contact_id: Optional[str] = None,
) -> dict:
    """Met à jour un deal existant. Seuls les champs fournis sont modifiés."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}

    try:
        deal = Deal.objects.select_related("stage", "contact").get(
            id=resolved_id, organization_id=org_id,
        )
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    changes: list[dict] = []

    if name is not None and name != deal.name:
        changes.append({"field": "name", "from": deal.name, "to": name})
        deal.name = name

    if amount is not None and float(amount) != float(deal.amount):
        changes.append({"field": "amount", "from": str(deal.amount), "to": str(amount)})
        deal.amount = amount

    if contact_id is not None:
        resolved_contact = _resolve_contact_id(org_id, contact_id)
        old_contact_name = (
            f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else ""
        )
        if resolved_contact:
            new_contact = Contact.objects.get(id=resolved_contact, organization_id=org_id)
            new_contact_name = f"{new_contact.first_name} {new_contact.last_name}"
            if str(deal.contact_id) != resolved_contact:
                changes.append({"field": "contact", "from": old_contact_name, "to": new_contact_name})
                deal.contact = new_contact

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    deal.save()

    TimelineEntry.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        deal=deal,
        entry_type=TimelineEntry.EntryType.DEAL_UPDATED,
        content=f"Deal '{deal.name}' mis à jour via chat",
        metadata={"changes": changes},
    )

    contact_name = f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else ""
    return {
        "action": "deal_updated",
        "entity_type": "deal",
        "entity_id": str(deal.id),
        "summary": f"Deal '{deal.name}' mis à jour",
        "changes": changes,
        "entity_preview": {
            "name": deal.name,
            "amount": float(deal.amount),
            "stage": deal.stage.name if deal.stage else "",
            "contact": contact_name,
        },
        "link": f"/deals/{deal.id}",
    }


def delete_deal(ctx: RunContext[ChatDeps], deal_id: str) -> dict:
    """Supprime un deal (soft delete). Le deal pourra être restauré depuis la corbeille."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}

    try:
        deal = Deal.objects.select_related("stage", "contact").get(
            id=resolved_id, organization_id=org_id,
        )
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    contact_name = f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else ""
    preview = {
        "name": deal.name,
        "amount": float(deal.amount),
        "stage": deal.stage.name if deal.stage else "",
        "contact": contact_name,
    }
    deal.delete()

    return {
        "action": "deal_deleted",
        "entity_type": "deal",
        "entity_id": resolved_id,
        "summary": f"Deal '{preview['name']}' supprimé",
        "entity_preview": preview,
        "undo_available": True,
    }


def get_deal(ctx: RunContext[ChatDeps], deal_id: str) -> dict:
    """Récupère les détails complets d'un deal pour affichage. Utilise l'ID du deal."""
    org_id = ctx.deps.organization_id
    resolved_id = _resolve_deal_id(org_id, deal_id)
    if not resolved_id:
        return {"action": "error", "message": "Deal introuvable."}

    try:
        deal = Deal.objects.select_related("stage", "contact").get(
            id=resolved_id, organization_id=org_id,
        )
    except Deal.DoesNotExist:
        return {"action": "error", "message": "Deal introuvable."}

    contact_name = f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else ""
    return {
        "action": "get_deal",
        "entity_type": "deal",
        "entity_id": resolved_id,
        "entity_preview": {
            "name": deal.name,
            "amount": float(deal.amount),
            "stage": deal.stage.name if deal.stage else "",
            "contact": contact_name,
            "closed_at": str(deal.closed_at) if deal.closed_at else None,
        },
        "link": f"/deals/{resolved_id}",
    }


def search_deals(ctx: RunContext[ChatDeps], query: str, stage_name: str = "") -> dict:
    """Recherche des deals par nom. Filtre optionnel par nom d'étape du pipeline."""
    org_id = ctx.deps.organization_id
    qs = Deal.objects.filter(
        organization_id=org_id,
        name__icontains=query,
    ).select_related("stage", "contact")

    if stage_name:
        qs = qs.filter(stage__name__iexact=stage_name)

    deals = qs[:10]
    results = [
        {
            "id": str(d.id),
            "name": d.name,
            "amount": float(d.amount),
            "stage": d.stage.name if d.stage else "",
            "contact": f"{d.contact.first_name} {d.contact.last_name}" if d.contact else "",
        }
        for d in deals
    ]
    return {"action": "search_deals", "count": len(results), "results": results}


def list_pipeline_stages(ctx: RunContext[ChatDeps], pipeline_id: Optional[str] = None) -> dict:
    """Liste les étapes du pipeline, triées par position. Filtre optionnel par pipeline_id."""
    org_id = ctx.deps.organization_id
    qs = PipelineStage.objects.filter(
        pipeline__organization_id=org_id,
    ).select_related("pipeline").order_by("order")

    if pipeline_id:
        qs = qs.filter(pipeline_id=pipeline_id)

    stages = qs
    results = [
        {
            "id": str(s.id),
            "name": s.name,
            "position": s.order,
            "pipeline": s.pipeline.name if s.pipeline else "",
        }
        for s in stages
    ]
    return {"action": "list_pipeline_stages", "count": len(results), "results": results}


def create_pipeline_stage(
    ctx: RunContext[ChatDeps],
    name: str,
    pipeline_id: str,
    position: Optional[int] = None,
) -> dict:
    """Crée une nouvelle étape dans un pipeline. La position est calculée automatiquement si non fournie."""
    org_id = ctx.deps.organization_id

    try:
        pipeline = Pipeline.objects.get(id=pipeline_id, organization_id=org_id)
    except Pipeline.DoesNotExist:
        return {"action": "error", "message": "Pipeline introuvable."}

    if position is None:
        last = PipelineStage.objects.filter(
            pipeline=pipeline,
        ).order_by("-order").first()
        position = (last.order + 1) if last else 0

    stage = PipelineStage.objects.create(
        pipeline=pipeline,
        name=name,
        order=position,
    )

    return {
        "action": "pipeline_stage_created",
        "entity_type": "pipeline_stage",
        "entity_id": str(stage.id),
        "entity_preview": {
            "name": stage.name,
            "position": stage.order,
            "pipeline": pipeline.name,
        },
    }


def update_pipeline_stage(
    ctx: RunContext[ChatDeps],
    stage_id: str,
    name: Optional[str] = None,
    position: Optional[int] = None,
) -> dict:
    """Met à jour une étape du pipeline. Seuls les champs fournis sont modifiés."""
    org_id = ctx.deps.organization_id

    try:
        stage = PipelineStage.objects.select_related("pipeline").get(
            id=stage_id, pipeline__organization_id=org_id,
        )
    except PipelineStage.DoesNotExist:
        return {"action": "error", "message": "Étape de pipeline introuvable."}

    changes: list[dict] = []

    if name is not None and name != stage.name:
        changes.append({"field": "name", "from": stage.name, "to": name})
        stage.name = name

    if position is not None and position != stage.order:
        changes.append({"field": "position", "from": str(stage.order), "to": str(position)})
        stage.order = position

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    stage.save()

    return {
        "action": "pipeline_stage_updated",
        "entity_type": "pipeline_stage",
        "entity_id": str(stage.id),
        "summary": f"Étape '{stage.name}' mise à jour",
        "changes": changes,
        "entity_preview": {
            "name": stage.name,
            "position": stage.order,
            "pipeline": stage.pipeline.name if stage.pipeline else "",
        },
    }


def delete_pipeline_stage(ctx: RunContext[ChatDeps], stage_id: str) -> dict:
    """Supprime une étape du pipeline. Refuse si des deals sont encore dans cette étape."""
    org_id = ctx.deps.organization_id

    try:
        stage = PipelineStage.objects.select_related("pipeline").get(
            id=stage_id, pipeline__organization_id=org_id,
        )
    except PipelineStage.DoesNotExist:
        return {"action": "error", "message": "Étape de pipeline introuvable."}

    deal_count = Deal.objects.filter(stage=stage, organization_id=org_id).count()
    if deal_count > 0:
        return {
            "action": "error",
            "message": f"Impossible de supprimer l'étape '{stage.name}' : {deal_count} deal(s) s'y trouvent encore.",
        }

    preview = {
        "name": stage.name,
        "position": stage.order,
        "pipeline": stage.pipeline.name if stage.pipeline else "",
    }
    stage.delete()

    return {
        "action": "pipeline_stage_deleted",
        "entity_type": "pipeline_stage",
        "entity_id": stage_id,
        "summary": f"Étape '{preview['name']}' supprimée",
        "entity_preview": preview,
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
        "entity_id": str(task.id),
        "description": description,
        "due_date": str(task.due_date),
        "priority": priority,
        "entity_type": "task",
        "summary": "Tâche créée",
        "entity_preview": {
            "description": description,
            "due_date": str(task.due_date),
            "priority": priority,
            "is_done": False,
        },
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
        "entity_id": str(task.id),
        "description": task.description,
        "entity_type": "task",
        "summary": "Tâche terminée",
        "entity_preview": {
            "description": task.description,
            "is_done": True,
        },
    }


def update_task(
    ctx: RunContext[ChatDeps],
    task_id: str,
    description: Optional[str] = None,
    due_date: Optional[str] = None,
    priority: Optional[str] = None,
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
) -> dict:
    """Met à jour une tâche existante. Seuls les champs fournis sont modifiés."""
    org_id = ctx.deps.organization_id
    try:
        task = Task.objects.get(id=task_id, organization_id=org_id)
    except Task.DoesNotExist:
        return {"action": "error", "message": f"Tâche {task_id} introuvable."}

    changes: list[dict] = []

    if description is not None and description != task.description:
        changes.append({"field": "description", "from": task.description, "to": description})
        task.description = description

    if due_date is not None:
        try:
            parsed_date = datetime.fromisoformat(due_date)
            if parsed_date.tzinfo is None:
                parsed_date = timezone.make_aware(parsed_date)
        except (ValueError, TypeError):
            return {"action": "error", "message": "Format de date invalide. Utilisez ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM)."}
        old_due = str(task.due_date) if task.due_date else ""
        changes.append({"field": "due_date", "from": old_due, "to": str(parsed_date)})
        task.due_date = parsed_date

    if priority is not None and priority != task.priority:
        changes.append({"field": "priority", "from": task.priority, "to": priority})
        task.priority = priority

    if contact_id is not None:
        resolved_contact = _resolve_contact_id(org_id, contact_id)
        old_contact = str(task.contact_id) if task.contact_id else ""
        new_contact = resolved_contact or ""
        if old_contact != new_contact:
            changes.append({"field": "contact_id", "from": old_contact, "to": new_contact})
            task.contact_id = resolved_contact

    if deal_id is not None:
        resolved_deal = _resolve_deal_id(org_id, deal_id)
        old_deal = str(task.deal_id) if task.deal_id else ""
        new_deal = resolved_deal or ""
        if old_deal != new_deal:
            changes.append({"field": "deal_id", "from": old_deal, "to": new_deal})
            task.deal_id = resolved_deal

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    task.save()

    return {
        "action": "task_updated",
        "entity_type": "task",
        "entity_id": str(task.id),
        "summary": f"Tâche '{task.description}' mise à jour",
        "changes": changes,
        "entity_preview": {
            "description": task.description,
            "due_date": str(task.due_date) if task.due_date else None,
            "priority": task.priority,
            "is_done": task.is_done,
        },
    }


def delete_task(ctx: RunContext[ChatDeps], task_id: str) -> dict:
    """Supprime une tâche (soft delete). La tâche pourra être restaurée depuis la corbeille."""
    org_id = ctx.deps.organization_id
    try:
        task = Task.objects.get(id=task_id, organization_id=org_id)
    except Task.DoesNotExist:
        return {"action": "error", "message": f"Tâche {task_id} introuvable."}

    preview = {
        "description": task.description,
        "due_date": str(task.due_date) if task.due_date else None,
        "priority": task.priority,
        "is_done": task.is_done,
    }
    task.delete()

    return {
        "action": "task_deleted",
        "entity_type": "task",
        "entity_id": str(task.id),
        "summary": f"Tâche '{preview['description']}' supprimée",
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
    """Recherche des tâches par description. Filtres optionnels par statut, priorité et contact."""
    org_id = ctx.deps.organization_id
    qs = Task.objects.filter(organization_id=org_id)

    if query:
        qs = qs.filter(description__icontains=query)
    if is_done is not None:
        qs = qs.filter(is_done=is_done)
    if priority is not None:
        qs = qs.filter(priority=priority)
    if contact_id is not None:
        resolved_contact = _resolve_contact_id(org_id, contact_id)
        if resolved_contact:
            qs = qs.filter(contact_id=resolved_contact)

    tasks = qs.order_by("due_date")[:20]
    results = [
        {
            "id": str(t.id),
            "description": t.description,
            "due_date": str(t.due_date) if t.due_date else None,
            "priority": t.priority,
            "is_done": t.is_done,
            "contact_id": str(t.contact_id) if t.contact_id else None,
            "deal_id": str(t.deal_id) if t.deal_id else None,
        }
        for t in tasks
    ]
    return {
        "action": "search_tasks",
        "entity_type": "task_list",
        "summary": f"{len(results)} tâche(s) trouvée(s)",
        "count": len(results),
        "results": results,
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
        "entity_type": "note",
        "summary": "Note ajoutée",
        "entity_preview": {"content": content[:100]},
    }


# ---------------------------------------------------------------------------
# Segments
# ---------------------------------------------------------------------------

def list_segments(ctx: RunContext[ChatDeps]) -> dict:
    """Liste tous les segments de l'organisation."""
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
    return {
        "action": "list_segments",
        "entity_type": "segment_list",
        "summary": f"{len(results)} segment(s) trouvé(s)",
        "count": len(results),
        "results": results,
    }


def update_segment(
    ctx: RunContext[ChatDeps],
    segment_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    rules: Optional[dict] = None,
) -> dict:
    """Met à jour un segment existant. Seuls les champs fournis sont modifiés."""
    org_id = ctx.deps.organization_id
    try:
        segment = Segment.objects.get(id=segment_id, organization_id=org_id)
    except Segment.DoesNotExist:
        return {"action": "error", "message": "Segment introuvable."}

    changes: list[dict] = []

    if name is not None and name != segment.name:
        changes.append({"field": "name", "from": segment.name, "to": name})
        segment.name = name

    if description is not None and description != segment.description:
        changes.append({"field": "description", "from": segment.description, "to": description})
        segment.description = description

    if icon is not None and icon != segment.icon:
        changes.append({"field": "icon", "from": segment.icon, "to": icon})
        segment.icon = icon

    if color is not None and color != segment.color:
        changes.append({"field": "color", "from": segment.color, "to": color})
        segment.color = color

    if rules is not None and rules != segment.rules:
        changes.append({"field": "rules", "from": "...", "to": "..."})
        segment.rules = rules

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    segment.save()

    return {
        "action": "segment_updated",
        "entity_type": "segment",
        "entity_id": str(segment.id),
        "summary": f"Segment '{segment.name}' mis à jour",
        "changes": changes,
        "entity_preview": {
            "name": segment.name,
            "description": segment.description,
            "icon": segment.icon,
            "color": segment.color,
        },
        "link": f"/segments/{segment.id}",
    }


def delete_segment(ctx: RunContext[ChatDeps], segment_id: str) -> dict:
    """Supprime un segment."""
    org_id = ctx.deps.organization_id
    try:
        segment = Segment.objects.get(id=segment_id, organization_id=org_id)
    except Segment.DoesNotExist:
        return {"action": "error", "message": "Segment introuvable."}

    preview = {
        "name": segment.name,
        "description": segment.description,
        "icon": segment.icon,
        "color": segment.color,
    }
    segment.delete()

    return {
        "action": "segment_deleted",
        "entity_type": "segment",
        "entity_id": segment_id,
        "summary": f"Segment '{preview['name']}' supprimé",
        "entity_preview": preview,
    }


def get_segment_contacts(ctx: RunContext[ChatDeps], segment_id: str, limit: int = 20) -> dict:
    """Récupère les contacts correspondant aux règles d'un segment."""
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
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}",
            "email": c.email,
            "company": c.company,
        }
        for c in contacts
    ]
    return {
        "action": "segment_contacts",
        "entity_type": "contact_list",
        "summary": f"{total} contact(s) dans le segment '{segment.name}'",
        "count": total,
        "results": results,
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
        "entity_type": "email",
        "summary": f"Email envoyé à {sent.to_email}",
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
        "entity_type": "interaction",
        "summary": f"Interaction '{subject}' enregistrée",
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

    total_companies = Company.objects.filter(organization_id=org_id).count()
    at_risk_companies = Company.objects.filter(organization_id=org_id, health_score="at_risk").count()

    return {
        "action": "dashboard_summary",
        "total_contacts": total_contacts,
        "active_deals": active_deals.count(),
        "pipeline_total": pipeline_total,
        "upcoming_tasks_7d": upcoming_tasks,
        "overdue_tasks": overdue_tasks,
        "total_companies": total_companies,
        "at_risk_companies": at_risk_companies,
        "entity_type": "dashboard",
        "summary": "Résumé du dashboard",
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

    companies = Company.objects.filter(organization_id=org_id).filter(
        Q(name__icontains=query) | Q(domain__icontains=query)
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
        "companies": [
            {"id": str(c.id), "name": c.name, "industry": c.industry}
            for c in companies
        ],
        "entity_type": "search_results",
        "summary": "Résultats de recherche",
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
        "entity_id": str(workflow.id),
        "name": name,
        "trigger": trigger_type,
        "action_count": len(actions),
        "is_active": True,
        "entity_type": "workflow",
        "summary": f"Workflow '{name}' créé",
        "entity_preview": {"name": name, "is_active": True},
        "link": f"/workflows/{workflow.id}",
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
    return {
        "action": "list_workflows",
        "count": len(results),
        "workflows": results,
        "entity_type": "workflow_list",
        "summary": f"{len(results)} workflows",
    }


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
        "entity_id": str(workflow.id),
        "name": workflow.name,
        "is_active": active,
        "message": f"Workflow '{workflow.name}' {status_text}.",
        "entity_type": "workflow",
        "summary": f"Workflow '{workflow.name}' {status_text}",
        "entity_preview": {"name": workflow.name, "is_active": active},
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
        "entity_type": "workflow_executions",
        "summary": f"{len(results)} exécutions récentes",
    }


def update_workflow(
    ctx: RunContext[ChatDeps],
    workflow_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> dict:
    """Met à jour un workflow existant. Seuls les champs fournis sont modifiés."""
    from workflows.models import Workflow

    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": "Workflow introuvable."}

    changes: list[dict] = []

    if name is not None and name != workflow.name:
        changes.append({"field": "name", "from": workflow.name, "to": name})
        workflow.name = name

    if description is not None and description != workflow.description:
        changes.append({"field": "description", "from": workflow.description, "to": description})
        workflow.description = description

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    workflow.save()

    return {
        "action": "workflow_updated",
        "entity_type": "workflow",
        "entity_id": str(workflow.id),
        "summary": f"Workflow '{workflow.name}' mis à jour",
        "changes": changes,
        "entity_preview": {
            "name": workflow.name,
            "description": workflow.description,
            "is_active": workflow.is_active,
        },
        "link": f"/workflows/{workflow.id}",
    }


def delete_workflow(ctx: RunContext[ChatDeps], workflow_id: str) -> dict:
    """Supprime un workflow."""
    from workflows.models import Workflow

    org_id = ctx.deps.organization_id
    try:
        workflow = Workflow.objects.get(id=workflow_id, organization_id=org_id)
    except Workflow.DoesNotExist:
        return {"action": "error", "message": "Workflow introuvable."}

    preview = {
        "name": workflow.name,
        "description": workflow.description,
        "is_active": workflow.is_active,
    }
    workflow.delete()

    return {
        "action": "workflow_deleted",
        "entity_type": "workflow",
        "entity_id": workflow_id,
        "summary": f"Workflow '{preview['name']}' supprimé",
        "entity_preview": preview,
    }


# ---------------------------------------------------------------------------
# Email Templates
# ---------------------------------------------------------------------------

def list_email_templates(ctx: RunContext[ChatDeps]) -> dict:
    """List available email templates for the current organization.
    Use when the user wants to see available email templates or choose a template to send."""
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id
    templates = EmailTemplate.objects.filter(
        Q(created_by_id=user_id, organization_id=org_id)
        | Q(is_shared=True, organization_id=org_id)
    )[:20]

    results = [
        {
            "id": str(t.id),
            "name": t.name,
            "subject": t.subject,
            "tags": t.tags,
            "is_shared": t.is_shared,
        }
        for t in templates
    ]
    return {
        "action": "list_email_templates",
        "count": len(results),
        "templates": results,
        "entity_type": "email_template_list",
        "summary": f"{len(results)} templates",
    }


def send_email_from_template(
    ctx: RunContext[ChatDeps],
    template_id: str,
    contact_id: str,
) -> dict:
    """Send an email to a contact using a pre-defined email template.
    The template's subject and body variables will be automatically resolved with the contact's data.
    Use when the user asks to send an email using a specific template."""
    from accounts.models import User
    from organizations.models import Organization
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    try:
        EmailTemplate.objects.get(
            Q(created_by_id=user_id, organization_id=org_id)
            | Q(is_shared=True, organization_id=org_id),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    account = EmailAccount.objects.filter(
        user_id=user_id, organization_id=org_id, is_active=True,
    ).first()
    if not account:
        return {
            "action": "error",
            "message": "Aucun compte email connecté. Connectez votre Gmail ou Outlook dans Paramètres.",
        }

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=org_id)
        sent = service_send_email(
            user=user,
            organization=org,
            contact_id=contact_id,
            subject="",
            body_html="",
            template_id=template_id,
        )
    except (ValueError, PermissionError) as e:
        return {"action": "error", "message": str(e)}
    except Exception:
        return {"action": "error", "message": "Erreur lors de l'envoi de l'email."}

    return {
        "action": "email_sent_from_template",
        "to": sent.to_email,
        "subject": sent.subject,
        "template_id": template_id,
        "entity_type": "email",
        "summary": "Email envoyé depuis le template",
    }


def create_email_template(
    ctx: RunContext[ChatDeps],
    name: str,
    subject: str,
    body_html: str,
    tags: Optional[list] = None,
    is_shared: bool = False,
) -> dict:
    """Crée un nouveau template d'email."""
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    template = EmailTemplate.objects.create(
        organization_id=org_id,
        created_by_id=user_id,
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
        "summary": f"Template '{name}' créé",
        "entity_preview": {
            "name": template.name,
            "subject": template.subject,
        },
        "link": f"/settings/email-templates/{template.id}",
    }


def update_email_template(
    ctx: RunContext[ChatDeps],
    template_id: str,
    name: Optional[str] = None,
    subject: Optional[str] = None,
    body_html: Optional[str] = None,
    tags: Optional[list] = None,
) -> dict:
    """Met à jour un template d'email existant. Seuls les champs fournis sont modifiés."""
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    try:
        template = EmailTemplate.objects.get(
            Q(created_by_id=user_id, organization_id=org_id)
            | Q(is_shared=True, organization_id=org_id),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    changes: list[dict] = []

    if name is not None and name != template.name:
        changes.append({"field": "name", "from": template.name, "to": name})
        template.name = name

    if subject is not None and subject != template.subject:
        changes.append({"field": "subject", "from": template.subject, "to": subject})
        template.subject = subject

    if body_html is not None and body_html != template.body_html:
        changes.append({"field": "body_html", "from": "...", "to": "..."})
        template.body_html = body_html

    if tags is not None and tags != template.tags:
        changes.append({"field": "tags", "from": str(template.tags), "to": str(tags)})
        template.tags = tags

    if not changes:
        return {"action": "error", "message": "Aucun champ à mettre à jour."}

    template.save()

    return {
        "action": "email_template_updated",
        "entity_type": "email_template",
        "entity_id": str(template.id),
        "summary": f"Template '{template.name}' mis à jour",
        "changes": changes,
        "entity_preview": {
            "name": template.name,
            "subject": template.subject,
        },
        "link": f"/settings/email-templates/{template.id}",
    }


def delete_email_template(ctx: RunContext[ChatDeps], template_id: str) -> dict:
    """Supprime un template d'email."""
    from emails.models import EmailTemplate

    org_id = ctx.deps.organization_id
    user_id = ctx.deps.user_id

    try:
        template = EmailTemplate.objects.get(
            Q(created_by_id=user_id, organization_id=org_id)
            | Q(is_shared=True, organization_id=org_id),
            id=template_id,
        )
    except EmailTemplate.DoesNotExist:
        return {"action": "error", "message": "Template introuvable."}

    preview = {
        "name": template.name,
        "subject": template.subject,
    }
    template.delete()

    return {
        "action": "email_template_deleted",
        "entity_type": "email_template",
        "entity_id": template_id,
        "summary": f"Template '{preview['name']}' supprimé",
        "entity_preview": preview,
    }


# ---------------------------------------------------------------------------
# Timeline / Notes (update, delete, list)
# ---------------------------------------------------------------------------

def update_note(ctx: RunContext[ChatDeps], note_id: str, content: str) -> dict:
    """Met à jour le contenu d'une note existante."""
    org_id = ctx.deps.organization_id
    try:
        entry = TimelineEntry.objects.get(
            id=note_id,
            organization_id=org_id,
            entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        )
    except TimelineEntry.DoesNotExist:
        return {"action": "error", "message": "Note introuvable."}

    changes = [{"field": "content", "from": entry.content[:100], "to": content[:100]}]
    entry.content = content
    entry.save()

    return {
        "action": "note_updated",
        "entity_type": "note",
        "entity_id": str(entry.id),
        "summary": "Note mise à jour",
        "changes": changes,
        "entity_preview": {
            "content": entry.content[:100],
        },
    }


def delete_note(ctx: RunContext[ChatDeps], note_id: str) -> dict:
    """Supprime une note."""
    org_id = ctx.deps.organization_id
    try:
        entry = TimelineEntry.objects.get(
            id=note_id,
            organization_id=org_id,
            entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        )
    except TimelineEntry.DoesNotExist:
        return {"action": "error", "message": "Note introuvable."}

    preview = {
        "content": entry.content[:100],
    }
    entry.delete()

    return {
        "action": "note_deleted",
        "entity_type": "note",
        "entity_id": note_id,
        "summary": "Note supprimée",
        "entity_preview": preview,
    }


def list_timeline(
    ctx: RunContext[ChatDeps],
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Liste les entrées récentes de la timeline, avec filtre optionnel par contact ou deal."""
    org_id = ctx.deps.organization_id
    qs = TimelineEntry.objects.filter(organization_id=org_id)

    if contact_id:
        resolved_contact = _resolve_contact_id(org_id, contact_id)
        if resolved_contact:
            qs = qs.filter(contact_id=resolved_contact)

    if deal_id:
        resolved_deal = _resolve_deal_id(org_id, deal_id)
        if resolved_deal:
            qs = qs.filter(deal_id=resolved_deal)

    entries = qs.order_by("-created_at")[:limit]
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
    return {
        "action": "list_timeline",
        "entity_type": "timeline",
        "summary": f"{len(results)} entrée(s) de timeline",
        "count": len(results),
        "results": results,
    }


# ---------------------------------------------------------------------------
# Transversal tools
# ---------------------------------------------------------------------------

ROUTE_MAP = {
    "contact": {"path": "/contacts", "label": "Contacts"},
    "deal": {"path": "/deals", "label": "Pipeline"},
    "task": {"path": "/tasks", "label": "Tâches"},
    "segment": {"path": "/segments", "label": "Segments"},
    "workflow": {"path": "/workflows", "label": "Workflows"},
    "email_template": {"path": "/settings/email-templates", "label": "Templates email"},
    "dashboard": {"path": "/dashboard", "label": "Dashboard"},
    "reports": {"path": "/reports", "label": "Rapports"},
    "settings": {"path": "/settings", "label": "Paramètres"},
    "pipeline": {"path": "/deals", "label": "Pipeline"},
    "funnel": {"path": "/pipeline/funnel", "label": "Entonnoir"},
    "trash": {"path": "/trash", "label": "Corbeille"},
    "products": {"path": "/products", "label": "Produits"},
    "chat": {"path": "/chat", "label": "Chat"},
    "company": {"path": "/companies", "label": "Entreprises"},
}


def navigate(
    ctx: RunContext[ChatDeps],
    destination: str,
    entity_id: Optional[str] = None,
) -> dict:
    """Navigate the user to a specific page in the CRM.

    destination: one of contact, deal, task, segment, workflow, email_template,
    dashboard, reports, settings, pipeline, funnel, trash, products, chat.
    entity_id: optional UUID to navigate to a specific entity detail page.
    """
    org_id = ctx.deps.organization_id
    route = ROUTE_MAP.get(destination)
    if not route:
        return {
            "action": "error",
            "message": f"Destination inconnue: {destination}. Destinations disponibles: {', '.join(ROUTE_MAP.keys())}",
        }

    path = route["path"]
    title = route["label"]
    description = f"Navigation vers {title}"

    if entity_id:
        path = f"{path}/{entity_id}"
        # Try to resolve entity name for better display
        try:
            if destination == "contact":
                c = Contact.objects.get(id=entity_id, organization_id=org_id)
                name = f"{c.first_name} {c.last_name}".strip()
                parts = [name]
                if c.email:
                    parts.append(c.email)
                if c.company:
                    parts.append(c.company)
                description = " — ".join(parts)
                title = name or title
            elif destination == "deal":
                d = Deal.objects.select_related("stage").get(
                    id=entity_id, organization_id=org_id,
                )
                parts = [d.name]
                if d.amount:
                    parts.append(f"{float(d.amount):.0f} €")
                if d.stage:
                    parts.append(d.stage.name)
                description = " — ".join(parts)
                title = d.name
            elif destination == "segment":
                s = Segment.objects.get(id=entity_id, organization_id=org_id)
                title = s.name
                description = s.description or f"Segment: {s.name}"
            elif destination == "company":
                comp = Company.objects.get(id=entity_id, organization_id=org_id)
                title = comp.name
                description = f"{comp.name} — {comp.industry}" if comp.industry else comp.name
        except Exception:
            pass

    return {
        "action": "navigation",
        "entity_type": destination,
        "link": path,
        "title": title,
        "description": description,
        "summary": f"Navigation vers {title}",
    }


def query_contacts(
    ctx: RunContext[ChatDeps],
    filters: dict,
    sort_by: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Query contacts using dynamic segment-style filters.

    filters should follow the segment rules format:
    {
        "logic": "AND",
        "groups": [{
            "logic": "AND",
            "conditions": [
                {"field": "lead_score", "operator": "equals", "value": "hot"}
            ]
        }]
    }
    Available fields: first_name, last_name, email, company, phone, lead_score,
    source, industry, job_title, city, country, language, categories,
    deals_count, open_deals_count, tasks_count, open_tasks_count,
    last_interaction_date, has_deal_closing_within, created_at, updated_at.
    Operators: equals, not_equals, contains, not_contains, is_empty, is_not_empty,
    in, not_in, greater_than, less_than, between, within_last, within_next, before, after.

    sort_by: optional field to sort results (first_name, last_name, email, company, created_at, lead_score).
    limit: max number of results (default 20).
    """
    org_id = ctx.deps.organization_id

    try:
        org = Organization.objects.get(id=org_id)
        qs = build_segment_queryset(org, filters)
    except Exception as e:
        return {"action": "error", "message": f"Erreur de filtre: {e}"}

    allowed_sort_fields = {
        "first_name", "last_name", "email", "company", "created_at", "lead_score",
    }
    if sort_by and sort_by.lstrip("-") in allowed_sort_fields:
        qs = qs.order_by(sort_by)

    total = qs.count()
    contacts = qs[:limit]
    results = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}".strip(),
            "email": c.email or "",
            "company": c.company or "",
            "lead_score": c.lead_score or "",
        }
        for c in contacts
    ]

    return {
        "action": "contacts_queried",
        "entity_type": "contact_list",
        "summary": f"{total} contacts correspondent aux filtres",
        "count": total,
        "results": results,
        "rules": filters,
        "save_as_segment_available": True,
    }


def generate_chart(
    ctx: RunContext[ChatDeps],
    metric: str,
    chart_type: str = "bar",
    period: Optional[str] = None,
    group_by: Optional[str] = None,
    filters: Optional[dict] = None,
) -> dict:
    """Generate a chart from CRM data.

    metric: one of deals_count, deals_amount, deals_by_stage, contacts_count,
    contacts_by_source, contacts_by_category, tasks_count, tasks_by_priority,
    tasks_completion_rate, revenue_over_time, pipeline_funnel, emails_sent,
    workflow_executions.

    chart_type: bar, line, pie, funnel (default bar).
    period: 7d, 30d, 90d, 12m, ytd, all (default all).
    group_by: month, week, day (default month) — used for date-based truncation.
    filters: optional segment-style filters for additional filtering.
    """
    from django.db.models import Count
    from django.db.models.functions import TruncMonth, TruncWeek, TruncDay

    org_id = ctx.deps.organization_id
    now = timezone.now()

    # --- Period parsing ---
    date_from = None
    if period == "7d":
        date_from = now - timedelta(days=7)
    elif period == "30d":
        date_from = now - timedelta(days=30)
    elif period == "90d":
        date_from = now - timedelta(days=90)
    elif period == "12m":
        date_from = now - timedelta(days=365)
    elif period == "ytd":
        date_from = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # --- Truncation ---
    trunc_fn = TruncMonth
    if group_by == "week":
        trunc_fn = TruncWeek
    elif group_by == "day":
        trunc_fn = TruncDay

    data: list[dict] = []
    title = ""
    series_label = ""
    color = "#6366f1"

    # ----- Metric implementations -----

    if metric == "deals_count":
        title = "Nombre de deals"
        series_label = "Deals"
        color = "#6366f1"
        qs = Deal.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(value=Count("id"))
            .order_by("period")
        )

    elif metric == "deals_amount":
        title = "Montant des deals"
        series_label = "Montant"
        color = "#10b981"
        qs = Deal.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(value=Sum("amount"))
            .order_by("period")
        )

    elif metric == "deals_by_stage":
        title = "Deals par étape"
        series_label = "Deals"
        color = "#f59e0b"
        qs = Deal.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.values("stage__name")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        data = [{"label": r["stage__name"] or "Sans étape", "value": r["value"]} for r in data]

    elif metric == "contacts_count":
        title = "Nombre de contacts"
        series_label = "Contacts"
        color = "#3b82f6"
        qs = Contact.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(value=Count("id"))
            .order_by("period")
        )

    elif metric == "contacts_by_source":
        title = "Contacts par source"
        series_label = "Contacts"
        color = "#8b5cf6"
        qs = Contact.objects.filter(organization_id=org_id).exclude(source="")
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.values("source")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        data = [{"label": r["source"], "value": r["value"]} for r in data]

    elif metric == "contacts_by_category":
        title = "Contacts par catégorie"
        series_label = "Contacts"
        color = "#ec4899"
        qs = Contact.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.values("categories__name")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        data = [{"label": r["categories__name"] or "Sans catégorie", "value": r["value"]} for r in data]

    elif metric == "tasks_count":
        title = "Nombre de tâches"
        series_label = "Tâches"
        color = "#a855f7"
        qs = Task.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(value=Count("id"))
            .order_by("period")
        )

    elif metric == "tasks_by_priority":
        title = "Tâches par priorité"
        series_label = "Tâches"
        color = "#f97316"
        qs = Task.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.values("priority")
            .annotate(value=Count("id"))
            .order_by("-value")
        )
        data = [{"label": r["priority"] or "Non définie", "value": r["value"]} for r in data]

    elif metric == "tasks_completion_rate":
        title = "Taux de complétion des tâches"
        series_label = "% complétées"
        color = "#22c55e"
        qs = Task.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        raw = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(
                total=Count("id"),
                done=Count("id", filter=Q(is_done=True)),
            )
            .order_by("period")
        )
        data = [
            {
                "period": r["period"],
                "value": round(r["done"] / r["total"] * 100, 1) if r["total"] else 0,
            }
            for r in raw
        ]

    elif metric == "revenue_over_time":
        title = "Revenu dans le temps"
        series_label = "Revenu"
        color = "#10b981"
        qs = Deal.objects.filter(organization_id=org_id, stage__name="Gagné")
        if date_from:
            qs = qs.filter(closed_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("closed_at"))
            .values("period")
            .annotate(value=Sum("amount"))
            .order_by("period")
        )

    elif metric == "pipeline_funnel":
        title = "Entonnoir du pipeline"
        series_label = "Deals"
        color = "#6366f1"
        if chart_type == "bar":
            chart_type = "funnel"
        stages = PipelineStage.objects.filter(
            pipeline__organization_id=org_id,
        ).order_by("position")
        qs = Deal.objects.filter(organization_id=org_id)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = []
        for stage in stages:
            count = qs.filter(stage=stage).count()
            data.append({"label": stage.name, "value": count})

    elif metric == "emails_sent":
        title = "Emails envoyés"
        series_label = "Emails"
        color = "#0ea5e9"
        qs = TimelineEntry.objects.filter(
            organization_id=org_id,
            entry_type="email_sent",
        )
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("created_at"))
            .values("period")
            .annotate(value=Count("id"))
            .order_by("period")
        )

    elif metric == "workflow_executions":
        title = "Exécutions de workflows"
        series_label = "Exécutions"
        color = "#14b8a6"
        from workflows.models import WorkflowExecution

        qs = WorkflowExecution.objects.filter(
            workflow__organization_id=org_id,
        )
        if date_from:
            qs = qs.filter(started_at__gte=date_from)
        data = list(
            qs.annotate(period=trunc_fn("started_at"))
            .values("period")
            .annotate(value=Count("id"))
            .order_by("period")
        )

    else:
        return {"action": "error", "message": f"Métrique inconnue: {metric}"}

    # --- Format date-based labels ---
    if data and "period" in data[0]:
        data = [
            {
                "label": r["period"].strftime("%b %Y") if r.get("period") else "N/A",
                "value": float(r["value"]) if r["value"] is not None else 0,
            }
            for r in data
        ]

    if not data:
        return {"action": "error", "message": "Aucune donnée disponible pour cette métrique."}

    return {
        "action": "chart_generated",
        "entity_type": "chart",
        "summary": title,
        "chart": {
            "type": chart_type,
            "title": title,
            "data": data,
            "xKey": "label",
            "series": [{"key": "value", "label": series_label, "color": color}],
        },
    }


# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------

def create_company(
    ctx: RunContext[ChatDeps],
    name: str,
    industry: str = "",
    website: str = "",
    phone: str = "",
    email: str = "",
    domain: str = "",
    address: str = "",
    city: str = "",
    country: str = "",
    annual_revenue: Optional[float] = None,
    employee_count: Optional[int] = None,
    siret: str = "",
    vat_number: str = "",
    legal_status: str = "",
    source: str = "",
    health_score: str = "good",
    parent_name: Optional[str] = None,
    description: str = "",
) -> dict:
    """Create a new company/account in the CRM."""
    org_id = ctx.deps.organization_id
    existing = Company.objects.filter(organization_id=org_id, name__iexact=name).first()
    if existing:
        return {
            "action": "duplicate_found",
            "summary": f"L'entreprise '{name}' existe deja.",
            "entity_id": str(existing.id),
            "entity_type": "company",
            "entity_preview": {"name": existing.name, "industry": existing.industry},
            "link": f"/companies/{existing.id}",
        }
    parent = None
    if parent_name:
        parent = Company.objects.filter(organization_id=org_id, name__icontains=parent_name).first()
    company = Company.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name, industry=industry, website=website, phone=phone,
        email=email, domain=domain, address=address, city=city,
        country=country, annual_revenue=annual_revenue,
        employee_count=employee_count, siret=siret, vat_number=vat_number,
        legal_status=legal_status, source=source, health_score=health_score,
        parent=parent, description=description,
    )
    return {
        "action": "created",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{name}' creee.",
        "entity_preview": {"name": name, "industry": industry},
        "link": f"/companies/{company.id}",
    }


def get_company(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get details of a company by name or ID."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    contacts_count = company.contacts.count()
    deals = company.deals.all()
    open_value = float(deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"]).aggregate(t=Sum("amount"))["t"] or 0)
    won_value = float(deals.filter(stage__name__in=["Gagne", "Gagné"]).aggregate(t=Sum("amount"))["t"] or 0)
    return {
        "action": "found",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise: {company.name}",
        "entity_preview": {
            "name": company.name, "industry": company.industry,
            "health_score": company.health_score, "contacts": contacts_count,
            "open_pipeline": f"{open_value:.0f}", "won_revenue": f"{won_value:.0f}",
            "website": company.website, "phone": company.phone,
            "parent": company.parent.name if company.parent else None,
        },
        "link": f"/companies/{company.id}",
    }


def search_companies(
    ctx: RunContext[ChatDeps],
    query: str = "",
    industry: str = "",
    health_score: str = "",
) -> dict:
    """Search companies by name, industry, health score."""
    org_id = ctx.deps.organization_id
    qs = Company.objects.filter(organization_id=org_id)
    if query:
        for word in query.split():
            qs = qs.filter(Q(name__icontains=word) | Q(domain__icontains=word))
    if industry:
        qs = qs.filter(industry__icontains=industry)
    if health_score:
        qs = qs.filter(health_score=health_score)
    companies = qs[:10]
    return {
        "action": "search_results",
        "entity_type": "company_list",
        "summary": f"{len(companies)} entreprise(s) trouvee(s).",
        "results": [
            {"id": str(c.id), "name": c.name, "industry": c.industry, "health_score": c.health_score}
            for c in companies
        ],
    }


def update_company(
    ctx: RunContext[ChatDeps],
    company_name_or_id: str,
    name: Optional[str] = None,
    industry: Optional[str] = None,
    website: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    health_score: Optional[str] = None,
    annual_revenue: Optional[float] = None,
    employee_count: Optional[int] = None,
    description: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    siret: Optional[str] = None,
    vat_number: Optional[str] = None,
    legal_status: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Update a company's fields."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    changes = []
    for field, value in [
        ("name", name), ("industry", industry), ("website", website),
        ("phone", phone), ("email", email), ("health_score", health_score),
        ("annual_revenue", annual_revenue), ("employee_count", employee_count),
        ("description", description), ("address", address), ("city", city),
        ("country", country), ("siret", siret), ("vat_number", vat_number),
        ("legal_status", legal_status), ("source", source),
    ]:
        if value is not None:
            setattr(company, field, value)
            changes.append(field)
    if changes:
        company.save(update_fields=changes + ["updated_at"])
    return {
        "action": "updated",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{company.name}' mise a jour ({', '.join(changes)}).",
        "link": f"/companies/{company.id}",
    }


def delete_company(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Delete a company (soft delete)."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    company.soft_delete(user_id=ctx.deps.user_id)
    return {
        "action": "deleted",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{company.name}' supprimee.",
    }


def get_company_stats(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get stats for a company: revenue, pipeline, deals, contacts."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    deals = Deal.objects.filter(company=company)
    open_deals = deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"])
    won_deals = deals.filter(stage__name__in=["Gagne", "Gagné"])
    return {
        "action": "company_stats",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Stats de {company.name}",
        "stats": {
            "contacts_count": company.contacts.count(),
            "total_deals": deals.count(),
            "open_deals": open_deals.count(),
            "won_deals": won_deals.count(),
            "open_deals_value": float(open_deals.aggregate(t=Sum("amount"))["t"] or 0),
            "won_deals_value": float(won_deals.aggregate(t=Sum("amount"))["t"] or 0),
            "subsidiaries_count": company.subsidiaries.count(),
        },
        "link": f"/companies/{company.id}",
    }


def get_company_contacts(ctx: RunContext[ChatDeps], company_name_or_id: str, role: str = "") -> dict:
    """List contacts of a company, optionally filtered by decision role."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    contacts = Contact.objects.filter(company_entity=company)
    if role:
        contacts = contacts.filter(decision_role__iexact=role)
    return {
        "action": "company_contacts",
        "entity_type": "contact_list",
        "summary": f"{contacts.count()} contacts chez {company.name}",
        "results": [
            {"id": str(c.id), "name": f"{c.first_name} {c.last_name}", "job_title": c.job_title, "email": c.email, "decision_role": c.decision_role}
            for c in contacts[:20]
        ],
    }


def get_company_deals(ctx: RunContext[ChatDeps], company_name_or_id: str, stage: str = "") -> dict:
    """List deals of a company, optionally filtered by stage."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    deals = Deal.objects.filter(company=company).select_related("stage")
    if stage:
        deals = deals.filter(stage__name__icontains=stage)
    return {
        "action": "company_deals",
        "entity_type": "deal_list",
        "summary": f"{deals.count()} deals chez {company.name}",
        "results": [
            {"id": str(d.id), "name": d.name, "amount": float(d.amount), "stage": d.stage.name if d.stage else ""}
            for d in deals[:20]
        ],
    }


def get_company_hierarchy(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get the full hierarchy tree of a company (root to all descendants)."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    root = company
    while root.parent:
        root = root.parent
    def _tree(node):
        return {
            "id": str(node.id), "name": node.name, "industry": node.industry,
            "children": [_tree(c) for c in Company.objects.filter(parent=node, organization_id=org_id)],
        }
    return {
        "action": "company_hierarchy",
        "entity_type": "company",
        "summary": f"Hierarchie de {company.name}",
        "tree": _tree(root),
    }


def get_company_org_chart(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get contacts with their relationships for a company organigramme."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    contacts = Contact.objects.filter(company_entity=company)
    contact_ids = list(contacts.values_list("id", flat=True))
    relationships = ContactRelationship.objects.filter(
        organization_id=org_id,
        from_contact_id__in=contact_ids, to_contact_id__in=contact_ids,
    )
    return {
        "action": "company_org_chart",
        "entity_type": "company",
        "summary": f"Organigramme de {company.name} ({contacts.count()} contacts, {relationships.count()} relations)",
        "contacts": [
            {"id": str(c.id), "name": f"{c.first_name} {c.last_name}", "job_title": c.job_title}
            for c in contacts
        ],
        "relationships": [
            {"from": f"{r.from_contact.first_name} {r.from_contact.last_name}", "to": f"{r.to_contact.first_name} {r.to_contact.last_name}", "type": r.get_relationship_type_display()}
            for r in relationships.select_related("from_contact", "to_contact")
        ],
    }


def link_contact_to_company(ctx: RunContext[ChatDeps], contact_name_or_id: str, company_name_or_id: str) -> dict:
    """Link a contact to a company."""
    org_id = ctx.deps.organization_id
    contact_id = _resolve_contact_id(org_id, contact_name_or_id)
    if not contact_id:
        return {"error": "Contact non trouve."}
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    Contact.objects.filter(id=contact_id).update(company_entity=company)
    contact = Contact.objects.get(id=contact_id)
    return {
        "action": "linked",
        "summary": f"{contact.first_name} {contact.last_name} lie a {company.name}.",
        "entity_type": "contact",
        "entity_id": str(contact.id),
        "link": f"/contacts/{contact.id}",
    }


def unlink_contact_from_company(ctx: RunContext[ChatDeps], contact_name_or_id: str) -> dict:
    """Remove a contact's company association."""
    org_id = ctx.deps.organization_id
    contact_id = _resolve_contact_id(org_id, contact_name_or_id)
    if not contact_id:
        return {"error": "Contact non trouve."}
    contact = Contact.objects.get(id=contact_id)
    old_name = contact.company_entity.name if contact.company_entity else "aucune"
    contact.company_entity = None
    contact.save(update_fields=["company_entity"])
    return {
        "action": "unlinked",
        "summary": f"{contact.first_name} {contact.last_name} delie de {old_name}.",
    }


def create_contact_relationship_tool(
    ctx: RunContext[ChatDeps],
    from_contact_name_or_id: str,
    to_contact_name_or_id: str,
    relationship_type: str,
    notes: str = "",
) -> dict:
    """Create a typed relationship between two contacts. Types: reports_to, manages, assistant_of, colleague, decision_maker, influencer, champion, blocker."""
    org_id = ctx.deps.organization_id
    from_id = _resolve_contact_id(org_id, from_contact_name_or_id)
    to_id = _resolve_contact_id(org_id, to_contact_name_or_id)
    if not from_id or not to_id:
        return {"error": "Contact(s) non trouve(s)."}
    rel, created = ContactRelationship.objects.get_or_create(
        organization_id=org_id,
        from_contact_id=from_id, to_contact_id=to_id,
        relationship_type=relationship_type,
        defaults={"notes": notes},
    )
    if not created:
        return {"action": "exists", "summary": "Cette relation existe deja."}
    from_c = Contact.objects.get(id=from_id)
    to_c = Contact.objects.get(id=to_id)
    return {
        "action": "created",
        "summary": f"Relation '{relationship_type}' creee: {from_c.first_name} {from_c.last_name} -> {to_c.first_name} {to_c.last_name}",
    }


def remove_contact_relationship(
    ctx: RunContext[ChatDeps],
    from_contact_name_or_id: str,
    to_contact_name_or_id: str,
    relationship_type: str,
) -> dict:
    """Remove a relationship between two contacts."""
    org_id = ctx.deps.organization_id
    from_id = _resolve_contact_id(org_id, from_contact_name_or_id)
    to_id = _resolve_contact_id(org_id, to_contact_name_or_id)
    if not from_id or not to_id:
        return {"error": "Contact(s) non trouve(s)."}
    deleted, _ = ContactRelationship.objects.filter(
        organization_id=org_id,
        from_contact_id=from_id, to_contact_id=to_id,
        relationship_type=relationship_type,
    ).delete()
    return {"action": "deleted" if deleted else "not_found", "summary": f"Relation supprimee." if deleted else "Relation non trouvee."}


def transfer_contacts(ctx: RunContext[ChatDeps], from_company: str, to_company: str) -> dict:
    """Transfer all contacts from one company to another."""
    org_id = ctx.deps.organization_id
    src = _find_company(org_id, from_company)
    dst = _find_company(org_id, to_company)
    if not src:
        return {"error": f"Entreprise source '{from_company}' non trouvee."}
    if not dst:
        return {"error": f"Entreprise destination '{to_company}' non trouvee."}
    count = Contact.objects.filter(company_entity=src).update(company_entity=dst)
    return {"action": "transferred", "summary": f"{count} contact(s) transfere(s) de {src.name} vers {dst.name}."}


def set_parent_company(ctx: RunContext[ChatDeps], company_name_or_id: str, parent_name_or_id: str) -> dict:
    """Set the parent company for hierarchy."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    parent = _find_company(org_id, parent_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    if not parent:
        return {"error": f"Entreprise parente '{parent_name_or_id}' non trouvee."}
    company.parent = parent
    company.save(update_fields=["parent"])
    return {"action": "updated", "summary": f"{company.name} est maintenant filiale de {parent.name}."}


def get_company_summary(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Generate a summary for a company based on its contacts, deals, and activity."""
    org_id = ctx.deps.organization_id
    company = _find_company(org_id, company_name_or_id)
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}
    contacts = Contact.objects.filter(company_entity=company)
    deals = Deal.objects.filter(company=company)
    open_deals = deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"])
    won_deals = deals.filter(stage__name__in=["Gagne", "Gagné"])
    open_val = float(open_deals.aggregate(t=Sum("amount"))["t"] or 0)
    won_val = float(won_deals.aggregate(t=Sum("amount"))["t"] or 0)
    summary_parts = [
        f"Entreprise: {company.name}",
        f"Secteur: {company.industry}" if company.industry else None,
        f"Sante: {company.health_score}",
        f"Contacts: {contacts.count()}",
        f"Deals ouverts: {open_deals.count()} ({open_val:.0f} EUR)",
        f"CA gagne: {won_val:.0f} EUR",
        f"Filiales: {company.subsidiaries.count()}" if company.subsidiaries.exists() else None,
    ]
    summary = "\n".join(p for p in summary_parts if p)
    company.ai_summary = summary
    company.save(update_fields=["ai_summary"])
    return {
        "action": "summary_generated",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": summary,
        "link": f"/companies/{company.id}",
    }


# ---------------------------------------------------------------------------
# Sales Analytics Tools
# ---------------------------------------------------------------------------

def get_forecast(
    ctx: RunContext[ChatDeps],
    period: str = "this_quarter",
    pipeline_name: str = "",
) -> dict:
    """Get revenue forecast categorized by commit/best case/pipeline for a period.
    Period options: this_month, this_quarter, next_quarter, this_year."""
    from deals.analytics import compute_forecast
    org_id = ctx.deps.organization_id
    pipeline_id = None
    if pipeline_name:
        p = Pipeline.objects.filter(organization_id=org_id, name__icontains=pipeline_name).first()
        if p:
            pipeline_id = str(p.id)
    result = compute_forecast(
        Organization.objects.get(id=org_id),
        period=period,
        pipeline_id=pipeline_id,
        user_id=None,
    )
    return result


def get_win_loss_analysis(
    ctx: RunContext[ChatDeps],
    period: str = "this_quarter",
) -> dict:
    """Get win/loss analysis with win rate, loss reasons breakdown, and monthly trend.
    Period options: this_month, this_quarter, last_quarter, this_year."""
    from deals.analytics import compute_win_loss
    org_id = ctx.deps.organization_id
    return compute_win_loss(Organization.objects.get(id=org_id), period=period)


def get_deal_velocity(
    ctx: RunContext[ChatDeps],
    pipeline_name: str = "",
    period: str = "last_6_months",
) -> dict:
    """Get deal velocity: average cycle time, time per stage, stagnant deals.
    Period options: last_3_months, last_6_months, this_year."""
    from deals.analytics import compute_velocity
    org_id = ctx.deps.organization_id
    pipeline = Pipeline.objects.filter(organization_id=org_id)
    if pipeline_name:
        pipeline = pipeline.filter(name__icontains=pipeline_name)
    p = pipeline.first()
    if not p:
        return {"error": "No pipeline found"}
    return compute_velocity(Organization.objects.get(id=org_id), str(p.id), period=period)


def get_leaderboard(
    ctx: RunContext[ChatDeps],
    period: str = "this_month",
) -> dict:
    """Get team leaderboard ranked by quota attainment.
    Period options: this_month, this_quarter, this_year."""
    from deals.analytics import compute_leaderboard
    org_id = ctx.deps.organization_id
    return compute_leaderboard(Organization.objects.get(id=org_id), period=period)


def get_quota_progress(
    ctx: RunContext[ChatDeps],
    user_name: str = "",
    period: str = "this_month",
) -> dict:
    """Get quota progress for a specific sales rep or the current user.
    Returns quota target, revenue closed, and attainment percentage."""
    from deals.analytics import compute_leaderboard
    org_id = ctx.deps.organization_id
    result = compute_leaderboard(Organization.objects.get(id=org_id), period=period)
    if user_name:
        for r in result.get("rankings", []):
            full_name = f"{r['user']['first_name']} {r['user']['last_name']}".lower()
            if user_name.lower() in full_name:
                return r
        return {"error": f"User '{user_name}' not found in leaderboard"}
    # Return current user's progress
    user_id = ctx.deps.user_id
    for r in result.get("rankings", []):
        if r["user"]["id"] == user_id:
            return r
    return {"error": "User not found in leaderboard"}


def get_next_actions(
    ctx: RunContext[ChatDeps],
    deal_name_or_id: str = "",
) -> dict:
    """Get recommended next actions for a deal (heuristic-based suggestions).
    Pass the deal name or ID."""
    org_id = ctx.deps.organization_id
    deal_id = _resolve_deal_id(org_id, deal_name_or_id)
    if not deal_id:
        # Try by name
        deal = Deal.objects.filter(
            organization_id=org_id, name__icontains=deal_name_or_id
        ).first()
        if not deal:
            return {"error": f"Deal '{deal_name_or_id}' not found"}
        deal_id = str(deal.id)
    else:
        deal = Deal.objects.filter(id=deal_id, organization_id=org_id).select_related("stage").first()
        if not deal:
            return {"error": "Deal not found"}

    from deals.next_actions import compute_heuristic_actions
    actions = compute_heuristic_actions(deal, Organization.objects.get(id=org_id))
    return {
        "deal": deal.name,
        "actions": actions,
    }


# All tools to register on the agent
ALL_TOOLS = [
    create_contact,
    search_contacts,
    update_contact,
    update_contact_categories,
    update_custom_field,
    delete_contact,
    get_contact,
    list_contact_categories,
    create_contact_category,
    delete_contact_category,
    create_deal,
    move_deal,
    update_deal,
    delete_deal,
    get_deal,
    search_deals,
    list_pipeline_stages,
    create_pipeline_stage,
    update_pipeline_stage,
    delete_pipeline_stage,
    create_task,
    complete_task,
    update_task,
    delete_task,
    search_tasks,
    add_note,
    log_interaction,
    send_contact_email,
    list_email_templates,
    send_email_from_template,
    get_dashboard_summary,
    search_all,
    # Segments
    list_segments,
    update_segment,
    delete_segment,
    get_segment_contacts,
    # Workflows
    create_workflow,
    list_workflows,
    toggle_workflow,
    get_workflow_executions,
    update_workflow,
    delete_workflow,
    # Email Templates CRUD
    create_email_template,
    update_email_template,
    delete_email_template,
    # Timeline / Notes
    update_note,
    delete_note,
    list_timeline,
    # Transversal
    navigate,
    query_contacts,
    generate_chart,
    # Companies
    create_company,
    get_company,
    search_companies,
    update_company,
    delete_company,
    get_company_stats,
    get_company_contacts,
    get_company_deals,
    get_company_hierarchy,
    get_company_org_chart,
    get_company_summary,
    link_contact_to_company,
    unlink_contact_from_company,
    create_contact_relationship_tool,
    remove_contact_relationship,
    transfer_contacts,
    set_parent_company,
    # Sales Analytics
    get_forecast,
    get_win_loss_analysis,
    get_deal_velocity,
    get_leaderboard,
    get_quota_progress,
    get_next_actions,
]
