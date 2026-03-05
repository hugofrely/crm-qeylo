"""
Django signal receivers for workflow events.

Captures CRM model changes (Deal, Contact, Task, TimelineEntry, SentEmail)
and dispatches workflow events via the event_dispatcher.

Anti-loop: instances with ``_workflow_execution = True`` are silently ignored
so that actions executed by the workflow engine do not re-trigger signals.
"""
import logging

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from contacts.models import Contact
from deals.models import Deal
from emails.models import SentEmail
from notes.models import TimelineEntry
from tasks.models import Task

from .event_dispatcher import dispatch_event

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Deal signals
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=Deal)
def deal_pre_save(sender, instance, **kwargs):
    """Capture the old stage before a deal is saved."""
    if instance.pk:
        try:
            old = Deal.objects.select_related("stage").get(pk=instance.pk)
            instance._old_stage_id = str(old.stage_id)
            instance._old_stage_name = old.stage.name
        except Deal.DoesNotExist:
            instance._old_stage_id = None
            instance._old_stage_name = None
    else:
        instance._old_stage_id = None
        instance._old_stage_name = None


@receiver(post_save, sender=Deal)
def deal_post_save(sender, instance, created, **kwargs):
    """Emit deal.created, deal.stage_changed, deal.won, deal.lost events."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    base_data = {
        "deal_id": str(instance.id),
        "deal_name": instance.name,
        "amount": str(instance.amount),
        "stage_name": instance.stage.name if instance.stage_id else "",
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
    }

    if created:
        dispatch_event("deal.created", org_id, base_data)
        return

    old_stage_id = getattr(instance, "_old_stage_id", None)
    new_stage_id = str(instance.stage_id) if instance.stage_id else None

    if old_stage_id and new_stage_id and old_stage_id != new_stage_id:
        old_stage_name = getattr(instance, "_old_stage_name", "")
        event_data = {
            **base_data,
            "old_stage_id": old_stage_id,
            "new_stage_id": new_stage_id,
            "old_stage_name": old_stage_name,
            "new_stage_name": instance.stage.name,
        }
        dispatch_event("deal.stage_changed", org_id, event_data)

        new_name_lower = instance.stage.name.lower()
        if "gagné" in new_name_lower or "gagne" in new_name_lower:
            dispatch_event("deal.won", org_id, event_data)
        elif new_name_lower == "perdu":
            dispatch_event("deal.lost", org_id, event_data)


# ---------------------------------------------------------------------------
# Contact signals
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=Contact)
def contact_pre_save(sender, instance, **kwargs):
    """Capture the old lead_score before a contact is saved."""
    if instance.pk:
        try:
            old = Contact.objects.get(pk=instance.pk)
            instance._old_lead_score = old.lead_score
        except Contact.DoesNotExist:
            instance._old_lead_score = None
    else:
        instance._old_lead_score = None


@receiver(post_save, sender=Contact)
def contact_post_save(sender, instance, created, **kwargs):
    """Emit contact.created, contact.updated, contact.lead_score_changed events."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    base_data = {
        "contact_id": str(instance.id),
        "first_name": instance.first_name,
        "last_name": instance.last_name,
        "email": instance.email,
        "company": instance.company,
        "lead_score": instance.lead_score,
    }

    if created:
        dispatch_event("contact.created", org_id, base_data)
        return

    dispatch_event("contact.updated", org_id, base_data)

    old_lead_score = getattr(instance, "_old_lead_score", None)
    if old_lead_score is not None and old_lead_score != instance.lead_score:
        event_data = {
            **base_data,
            "old_lead_score": old_lead_score,
            "new_lead_score": instance.lead_score,
        }
        dispatch_event("contact.lead_score_changed", org_id, event_data)


# ---------------------------------------------------------------------------
# Task signals
# ---------------------------------------------------------------------------

@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    """Capture the old is_done value before a task is saved."""
    if instance.pk:
        try:
            old = Task.objects.get(pk=instance.pk)
            instance._old_is_done = old.is_done
        except Task.DoesNotExist:
            instance._old_is_done = None
    else:
        instance._old_is_done = None


@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Emit task.created, task.completed events."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    base_data = {
        "task_id": str(instance.id),
        "description": instance.description,
        "due_date": str(instance.due_date),
        "priority": instance.priority,
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
        "deal_id": str(instance.deal_id) if instance.deal_id else None,
    }

    if created:
        dispatch_event("task.created", org_id, base_data)
        return

    old_is_done = getattr(instance, "_old_is_done", None)
    if old_is_done is False and instance.is_done is True:
        dispatch_event("task.completed", org_id, base_data)


# ---------------------------------------------------------------------------
# TimelineEntry (note) signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=TimelineEntry)
def timeline_entry_post_save(sender, instance, created, **kwargs):
    """Emit note.added when a NOTE_ADDED entry is created."""
    if getattr(instance, "_workflow_execution", False):
        return

    if not created:
        return

    if instance.entry_type != TimelineEntry.EntryType.NOTE_ADDED:
        return

    org_id = str(instance.organization_id)
    event_data = {
        "note_id": str(instance.id),
        "content": instance.content[:500],
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
        "deal_id": str(instance.deal_id) if instance.deal_id else None,
    }
    dispatch_event("note.added", org_id, event_data)


# ---------------------------------------------------------------------------
# SentEmail signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=SentEmail)
def sent_email_post_save(sender, instance, created, **kwargs):
    """Emit email.sent when a SentEmail is created."""
    if getattr(instance, "_workflow_execution", False):
        return

    if not created:
        return

    org_id = str(instance.organization_id)
    event_data = {
        "email_id": str(instance.id),
        "to_email": instance.to_email,
        "subject": instance.subject,
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
    }
    dispatch_event("email.sent", org_id, event_data)
