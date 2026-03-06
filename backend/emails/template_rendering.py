"""
Render email templates by substituting {{entity.field}} variables.
"""
import re

VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\.(\w+)\}\}")


def render_email_template(
    subject: str, body_html: str, context: dict
) -> tuple[str, str]:
    """Replace {{entity.field}} placeholders with values from context.

    context example:
        {"contact": {"first_name": "Jean", ...}, "deal": {"name": "X", ...}}

    Unresolved variables are replaced with an empty string.
    Returns (rendered_subject, rendered_body_html).
    """

    def replacer(match: re.Match) -> str:
        entity = match.group(1)
        field = match.group(2)
        value = context.get(entity, {}).get(field)
        if value is None:
            return ""
        return str(value) if value else ""

    rendered_subject = VARIABLE_PATTERN.sub(replacer, subject)
    rendered_body = VARIABLE_PATTERN.sub(replacer, body_html)
    return rendered_subject, rendered_body


def build_template_context(contact=None, deal=None) -> dict:
    """Build a context dict from Django model instances."""
    context = {}
    if contact:
        context["contact"] = {
            "first_name": contact.first_name or "",
            "last_name": contact.last_name or "",
            "email": contact.email or "",
            "company": contact.company or "",
            "phone": contact.phone or "",
        }
    if deal:
        context["deal"] = {
            "name": deal.name or "",
            "amount": str(deal.amount) if deal.amount else "",
            "stage": deal.stage.name if deal.stage else "",
        }
    return context
