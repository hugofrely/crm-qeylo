import logging
import threading

from django.conf import settings
from django.utils import timezone
from pydantic_ai import Agent

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """Tu es un assistant CRM. Genere un resume concis (3-5 phrases) de ce contact en francais.
Synthetise les informations cles : qui est cette personne, son role, ses besoins, l'historique des interactions et les deals en cours.
Reponds UNIQUEMENT avec le resume, sans titre ni formatage.

Informations du contact:
{contact_info}

Historique des interactions:
{timeline_info}

Deals associes:
{deals_info}"""


def _build_contact_info(contact) -> str:
    lines = [f"Nom: {contact.first_name} {contact.last_name}"]
    if contact.company:
        lines.append(f"Entreprise: {contact.company}")
    if contact.job_title:
        lines.append(f"Poste: {contact.job_title}")
    if contact.industry:
        lines.append(f"Secteur: {contact.industry}")
    if contact.lead_score:
        lines.append(f"Score lead: {contact.get_lead_score_display()}")
    if contact.decision_role:
        lines.append(f"Role: {contact.get_decision_role_display()}")
    if contact.identified_needs:
        lines.append(f"Besoins: {contact.identified_needs}")
    if contact.notes:
        lines.append(f"Notes: {contact.notes}")
    return "\n".join(lines)


def _build_timeline_info(contact) -> str:
    entries = contact.timeline_entries.order_by("-created_at")[:20]
    if not entries:
        return "Aucune interaction"
    lines = []
    for e in entries:
        lines.append(f"- [{e.created_at.strftime('%d/%m/%Y')}] {e.entry_type}: {e.content[:150]}")
    return "\n".join(lines)


def _build_deals_info(contact) -> str:
    deals = contact.deals.select_related("stage").all()
    if not deals:
        return "Aucun deal"
    lines = []
    for d in deals:
        lines.append(f"- {d.name}: {d.amount} EUR ({d.stage.name})")
    return "\n".join(lines)


def generate_ai_summary(contact_id: str) -> None:
    """Generate and save an AI summary for a contact. Runs synchronously."""
    from contacts.models import Contact

    try:
        contact = Contact.objects.get(id=contact_id)
    except Contact.DoesNotExist:
        logger.warning("Contact %s not found for summary generation", contact_id)
        return

    contact_info = _build_contact_info(contact)
    timeline_info = _build_timeline_info(contact)
    deals_info = _build_deals_info(contact)

    prompt = SUMMARY_PROMPT.format(
        contact_info=contact_info,
        timeline_info=timeline_info,
        deals_info=deals_info,
    )

    try:
        agent = Agent(model=settings.AI_MODEL)
        result = agent.run_sync(prompt)
        contact.ai_summary = result.output.strip()
        contact.ai_summary_updated_at = timezone.now()
        contact.save(update_fields=["ai_summary", "ai_summary_updated_at"])
    except Exception:
        logger.exception("AI summary generation failed for contact %s", contact_id)


def trigger_summary_generation(contact_id: str) -> None:
    """Trigger AI summary generation in a background thread."""
    thread = threading.Thread(
        target=generate_ai_summary,
        args=(str(contact_id),),
        daemon=True,
    )
    thread.start()
