"""
Event dispatcher: receives CRM events and triggers matching workflows via Celery.

Anti-loop protections:
- _workflow_execution flag prevents re-triggering from workflow actions
- Cooldown: same workflow + same object within 60 seconds is skipped
- Max depth: 10 action nodes per execution
"""
import hashlib
import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

COOLDOWN_SECONDS = 60
MAX_ACTION_DEPTH = 10


def dispatch_event(event_type: str, organization_id: str, event_data: dict):
    """Find active workflows matching this event and dispatch Celery tasks."""
    from .models import Workflow, WorkflowNode

    workflows = Workflow.objects.filter(
        organization_id=organization_id,
        is_active=True,
    ).prefetch_related("nodes")

    for workflow in workflows:
        trigger_nodes = workflow.nodes.filter(
            node_type=WorkflowNode.NodeType.TRIGGER,
            node_subtype=event_type,
        )
        for trigger_node in trigger_nodes:
            if not _matches_filters(trigger_node.config.get("filters", {}), event_data):
                continue

            cooldown_key = _cooldown_key(workflow.id, event_type, event_data)
            if cache.get(cooldown_key):
                logger.info(
                    "Workflow %s skipped (cooldown) for event %s",
                    workflow.name, event_type,
                )
                continue
            cache.set(cooldown_key, True, COOLDOWN_SECONDS)

            from .tasks import execute_workflow
            execute_workflow.delay(
                str(workflow.id), str(trigger_node.id), event_type, event_data,
            )
            logger.info(
                "Dispatched workflow '%s' for event %s", workflow.name, event_type,
            )


def _matches_filters(filters: dict, event_data: dict) -> bool:
    """Check if event data matches the trigger's filter criteria."""
    if not filters:
        return True

    for key, expected in filters.items():
        actual = event_data.get(key)
        if actual is None:
            return False
        if isinstance(expected, str) and isinstance(actual, str):
            if expected.lower() != actual.lower():
                return False
        elif actual != expected:
            return False

    return True


def _cooldown_key(workflow_id, event_type: str, event_data: dict) -> str:
    object_id = (
        event_data.get("deal_id")
        or event_data.get("contact_id")
        or event_data.get("task_id")
        or event_data.get("note_id")
        or event_data.get("email_id")
        or ""
    )
    raw = f"wf_cooldown:{workflow_id}:{event_type}:{object_id}"
    return hashlib.md5(raw.encode()).hexdigest()
