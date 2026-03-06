"""
Execute workflow action nodes: create tasks, send emails, update contacts, etc.

All actions set _workflow_execution=True on created/modified objects to prevent
re-triggering signals and infinite loops.
"""
import logging
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from contacts.models import Contact
from deals.models import Deal, PipelineStage
from notes.models import TimelineEntry
from notifications.helpers import create_notification
from tasks.models import Task

logger = logging.getLogger(__name__)


def execute_action(action_type: str, config: dict, context: dict, organization_id: str, user_id: str | None) -> dict:
    """Execute a single action and return the result."""
    executor = ACTION_REGISTRY.get(action_type)
    if not executor:
        return {"error": f"Unknown action type: {action_type}"}

    try:
        return executor(config, context, organization_id, user_id)
    except Exception as e:
        logger.exception("Action %s failed", action_type)
        return {"error": str(e)}


def _action_create_task(config, context, organization_id, user_id):
    description = config.get("description", "Tâche automatique")
    priority = config.get("priority", "normal").lower()
    offset = config.get("due_date_offset", "+1d")

    # Parse offset like "+3d", "+2h", "+1w"
    due_date = timezone.now()
    if offset:
        amount = int(offset[1:-1]) if len(offset) > 2 else 1
        unit = offset[-1]
        if unit == "d":
            due_date += timedelta(days=amount)
        elif unit == "h":
            due_date += timedelta(hours=amount)
        elif unit == "w":
            due_date += timedelta(weeks=amount)

    task = Task(
        organization_id=organization_id,
        created_by_id=user_id,
        description=description,
        due_date=due_date,
        priority=priority,
        contact_id=config.get("contact_id") or context.get("contact", {}).get("id"),
        deal_id=config.get("deal_id") or context.get("deal", {}).get("id"),
    )
    task._workflow_execution = True
    task.save()

    return {"action": "task_created", "id": str(task.id), "description": description}


def _action_send_notification(config, context, organization_id, user_id):
    from accounts.models import User

    title = config.get("title", "Notification workflow")
    message = config.get("message", "")
    link = config.get("link", "")

    # Determine recipient
    recipient_id = config.get("recipient_id") or user_id
    if not recipient_id:
        return {"error": "No recipient for notification"}

    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return {"error": "Recipient not found"}

    from organizations.models import Organization
    org = Organization.objects.get(id=organization_id)

    create_notification(org, recipient, "deal_update", title, message, link)
    return {"action": "notification_sent", "recipient": str(recipient_id)}


def _action_create_note(config, context, organization_id, user_id):
    content = config.get("content", "Note automatique")
    contact_id = config.get("contact_id") or context.get("contact", {}).get("id")
    deal_id = config.get("deal_id") or context.get("deal", {}).get("id")

    entry = TimelineEntry(
        organization_id=organization_id,
        created_by_id=user_id,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=content,
        metadata={"source": "workflow"},
    )
    entry._workflow_execution = True
    entry.save()

    return {"action": "note_added", "id": str(entry.id)}


def _action_move_deal(config, context, organization_id, user_id):
    deal_id = config.get("deal_id") or context.get("deal", {}).get("id")
    stage_id = config.get("stage_id")
    stage_name = config.get("stage_name")

    if not deal_id:
        return {"error": "No deal_id provided"}

    try:
        deal = Deal.objects.get(id=deal_id, organization_id=organization_id)
    except Deal.DoesNotExist:
        return {"error": f"Deal {deal_id} not found"}

    if stage_id:
        stage = PipelineStage.objects.filter(id=stage_id, organization_id=organization_id).first()
    elif stage_name:
        stage = PipelineStage.objects.filter(name__iexact=stage_name, organization_id=organization_id).first()
    else:
        return {"error": "No stage_id or stage_name provided"}

    if not stage:
        return {"error": "Target stage not found"}

    old_stage_name = deal.stage.name
    deal.stage = stage
    if stage.name.lower() in ("gagné", "gagne"):
        deal.closed_at = timezone.now()
    deal._workflow_execution = True
    deal.save()

    return {"action": "deal_moved", "from": old_stage_name, "to": stage.name}


def _action_update_contact(config, context, organization_id, user_id):
    contact_id = config.get("contact_id") or context.get("contact", {}).get("id")
    if not contact_id:
        return {"error": "No contact_id provided"}

    try:
        contact = Contact.objects.get(id=contact_id, organization_id=organization_id)
    except Contact.DoesNotExist:
        return {"error": f"Contact {contact_id} not found"}

    fields = config.get("fields", {})
    changed = []
    for field, value in fields.items():
        if hasattr(contact, field):
            setattr(contact, field, value)
            changed.append(field)

    if changed:
        contact._workflow_execution = True
        contact.save()

    return {"action": "contact_updated", "changed": changed}


def _action_send_email(config, context, organization_id, user_id):
    """Send an email using the workflow creator's email account.

    Supports multiple recipients via ``config["recipients"]`` (comma-separated
    emails) and/or the trigger contact's email when ``send_to_contact`` is true.
    """
    if not user_id:
        return {"error": "No user for email sending"}

    from emails.service import send_email as service_send_email
    from accounts.models import User
    from organizations.models import Organization

    subject = config.get("subject", "")
    body = config.get("body_template", config.get("body", ""))

    body_html = "".join(f"<p>{line}</p>" for line in body.split("\n") if line.strip())
    if not body_html:
        body_html = f"<p>{body}</p>"

    # If a template_id is provided, load and render it
    template_id = config.get("template_id")
    if template_id:
        from emails.models import EmailTemplate
        from emails.template_rendering import render_email_template
        try:
            template = EmailTemplate.objects.get(id=template_id)
            subject, body_html = render_email_template(template.subject, template.body_html, context)
        except EmailTemplate.DoesNotExist:
            pass  # Fall back to config subject/body

    # Build recipient list
    to_addresses: list[str] = []

    # Explicit recipients (comma / semicolon / newline separated)
    raw_recipients = config.get("recipients", "")
    if raw_recipients:
        for addr in raw_recipients.replace(";", ",").replace("\n", ",").split(","):
            addr = addr.strip()
            if addr and "@" in addr:
                to_addresses.append(addr)

    # Optionally include the trigger contact's email
    send_to_contact = config.get("send_to_contact", not raw_recipients)
    contact_email = context.get("contact", {}).get("email")
    if send_to_contact and contact_email and contact_email not in to_addresses:
        to_addresses.append(contact_email)

    if not to_addresses:
        return {"error": "No recipient email"}

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=organization_id)
        contact_id = config.get("contact_id") or context.get("contact", {}).get("id")

        sent_to = []
        for addr in to_addresses:
            sent = service_send_email(
                user=user,
                organization=org,
                contact_id=contact_id if addr == contact_email else None,
                subject=subject,
                body_html=body_html,
                to_email=addr,
            )
            sent_to.append(sent.to_email)

        return {"action": "email_sent", "to": sent_to, "subject": subject}
    except Exception as e:
        return {"error": f"Email failed: {str(e)}"}


def _action_webhook(config, context, organization_id, user_id):
    """Send an outbound webhook."""
    import httpx

    url = config.get("url")
    method = config.get("method", "POST").upper()
    body = config.get("body", {})

    if not url:
        return {"error": "No webhook URL"}

    try:
        with httpx.Client(timeout=10) as client:
            response = client.request(method, url, json=body)
            return {
                "action": "webhook_sent",
                "status_code": response.status_code,
                "url": url,
            }
    except Exception as e:
        return {"error": f"Webhook failed: {str(e)}"}


ACTION_REGISTRY = {
    "create_task": _action_create_task,
    "send_notification": _action_send_notification,
    "create_note": _action_create_note,
    "move_deal": _action_move_deal,
    "update_contact": _action_update_contact,
    "send_email": _action_send_email,
    "webhook": _action_webhook,
}
