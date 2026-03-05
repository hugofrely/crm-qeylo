"""
Resolve template variables like {{contact.first_name}} in workflow action configs.
"""
import re

from contacts.models import Contact
from deals.models import Deal

VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\.(\w+)\}\}")


def resolve_template(text: str, context: dict) -> str:
    """Replace {{entity.field}} placeholders with actual values from context."""
    if not isinstance(text, str):
        return text

    def replacer(match):
        entity = match.group(1)
        field = match.group(2)
        value = context.get(entity, {}).get(field, match.group(0))
        return str(value) if value is not None else ""

    return VARIABLE_PATTERN.sub(replacer, text)


def resolve_config(config: dict, context: dict) -> dict:
    """Recursively resolve template variables in a config dict."""
    resolved = {}
    for key, value in config.items():
        if isinstance(value, str):
            resolved[key] = resolve_template(value, context)
        elif isinstance(value, dict):
            resolved[key] = resolve_config(value, context)
        elif isinstance(value, list):
            resolved[key] = [
                resolve_template(v, context) if isinstance(v, str) else v
                for v in value
            ]
        else:
            resolved[key] = value
    return resolved


def build_context(event_data: dict, organization_id: str) -> dict:
    """Build the template variable context from event data."""
    from django.utils import timezone

    context = {
        "trigger": event_data,
        "now": str(timezone.now()),
    }

    contact_id = event_data.get("contact_id")
    if contact_id:
        try:
            contact = Contact.objects.get(id=contact_id, organization_id=organization_id)
            context["contact"] = {
                "id": str(contact.id),
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "name": f"{contact.first_name} {contact.last_name}",
                "email": contact.email,
                "company": contact.company,
                "phone": contact.phone,
                "lead_score": contact.lead_score or "",
            }
        except Contact.DoesNotExist:
            pass

    deal_id = event_data.get("deal_id")
    if deal_id:
        try:
            deal = Deal.objects.select_related("stage").get(
                id=deal_id, organization_id=organization_id
            )
            context["deal"] = {
                "id": str(deal.id),
                "name": deal.name,
                "amount": str(deal.amount),
                "stage": deal.stage.name,
                "probability": str(deal.probability or ""),
            }
        except Deal.DoesNotExist:
            pass

    return context
