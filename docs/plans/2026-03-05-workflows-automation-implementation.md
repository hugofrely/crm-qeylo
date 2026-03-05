# Workflows & Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a no-code workflow automation system with a visual node-based editor (React Flow), Django Signals event system, and Celery + Redis async execution.

**Architecture:** Django Signals emit events on model mutations → Event dispatcher queries matching workflows → Celery workers traverse workflow graphs, evaluate conditions, and execute actions. Frontend uses React Flow for visual workflow building with drag-and-drop nodes.

**Tech Stack:** Django 5 + Celery + Redis (backend), React Flow + Next.js 16 + shadcn/ui (frontend), Pydantic AI tools (chat integration)

---

## Phase 1: Infrastructure — Redis, Celery, Django App

### Task 1: Add Redis and Celery to Docker Compose

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add Redis service and Celery worker/beat services**

Edit `docker-compose.yml` to add after the `frontend` service:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: celery -A config worker -l info
    volumes:
      - ./backend:/app
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-crm_user}:${POSTGRES_PASSWORD:-crm_pass}@db:5432/${POSTGRES_DB:-crm_qeylo}
      CELERY_BROKER_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./backend:/app
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-crm_user}:${POSTGRES_PASSWORD:-crm_pass}@db:5432/${POSTGRES_DB:-crm_qeylo}
      CELERY_BROKER_URL: redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
```

Also add `CELERY_BROKER_URL: redis://redis:6379/0` to the `backend` service environment and add redis dependency.

**Step 2: Add Python dependencies**

Append to `backend/requirements.txt`:
```
celery>=5.4.0
redis>=5.2.0
django-celery-beat>=2.7.0
```

**Step 3: Commit**

```bash
git add docker-compose.yml backend/requirements.txt
git commit -m "infra: add Redis, Celery worker, and Celery beat to docker-compose"
```

---

### Task 2: Configure Celery in Django

**Files:**
- Create: `backend/config/celery.py`
- Modify: `backend/config/__init__.py`
- Modify: `backend/config/settings.py`

**Step 1: Create Celery configuration**

Create `backend/config/celery.py`:

```python
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

**Step 2: Import Celery in config init**

Create/modify `backend/config/__init__.py`:

```python
from .celery import app as celery_app

__all__ = ("celery_app",)
```

**Step 3: Add Celery settings to settings.py**

Add to `backend/config/settings.py` after the R2 section:

```python
# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
```

Also add `"django_celery_beat"` to `INSTALLED_APPS` after `"corsheaders"`.

**Step 4: Commit**

```bash
git add backend/config/celery.py backend/config/__init__.py backend/config/settings.py
git commit -m "feat: configure Celery with Redis broker and django-celery-beat"
```

---

### Task 3: Create workflows Django app with models

**Files:**
- Create: `backend/workflows/__init__.py`
- Create: `backend/workflows/apps.py`
- Create: `backend/workflows/models.py`
- Create: `backend/workflows/admin.py`
- Modify: `backend/config/settings.py` (add to INSTALLED_APPS)

**Step 1: Create the app boilerplate**

Create `backend/workflows/__init__.py` (empty file).

Create `backend/workflows/apps.py`:

```python
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "workflows"

    def ready(self):
        import workflows.signals  # noqa: F401
```

Create `backend/workflows/admin.py`:

```python
from django.contrib import admin
from .models import Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, WorkflowExecutionStep

admin.site.register(Workflow)
admin.site.register(WorkflowNode)
admin.site.register(WorkflowEdge)
admin.site.register(WorkflowExecution)
admin.site.register(WorkflowExecutionStep)
```

**Step 2: Create models**

Create `backend/workflows/models.py`:

```python
import uuid
from django.db import models
from django.conf import settings


class Workflow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="workflows",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class WorkflowNode(models.Model):
    class NodeType(models.TextChoices):
        TRIGGER = "trigger", "Trigger"
        CONDITION = "condition", "Condition"
        ACTION = "action", "Action"
        DELAY = "delay", "Delay"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="nodes"
    )
    node_type = models.CharField(max_length=20, choices=NodeType.choices)
    node_subtype = models.CharField(max_length=100)
    config = models.JSONField(default=dict, blank=True)
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)

    def __str__(self):
        return f"{self.node_type}:{self.node_subtype}"


class WorkflowEdge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="edges"
    )
    source_node = models.ForeignKey(
        WorkflowNode, on_delete=models.CASCADE, related_name="outgoing_edges"
    )
    target_node = models.ForeignKey(
        WorkflowNode, on_delete=models.CASCADE, related_name="incoming_edges"
    )
    source_handle = models.CharField(max_length=50, blank=True, default="")
    label = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.source_node} -> {self.target_node}"


class WorkflowExecution(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="executions"
    )
    trigger_event = models.CharField(max_length=100)
    trigger_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RUNNING
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.workflow.name} — {self.status}"


class WorkflowExecutionStep(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(
        WorkflowExecution, on_delete=models.CASCADE, related_name="steps"
    )
    node = models.ForeignKey(
        WorkflowNode, on_delete=models.CASCADE, related_name="execution_steps"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    input_data = models.JSONField(default=dict, blank=True)
    output_data = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["started_at"]

    def __str__(self):
        return f"{self.node} — {self.status}"
```

**Step 3: Add to INSTALLED_APPS**

In `backend/config/settings.py`, add `"workflows"` after `"uploads"` in `INSTALLED_APPS`.

**Step 4: Create initial migration**

Run: `cd backend && python manage.py makemigrations workflows`

**Step 5: Commit**

```bash
git add backend/workflows/ backend/config/settings.py
git commit -m "feat: create workflows app with Workflow, Node, Edge, Execution models"
```

---

## Phase 2: Event System — Django Signals + Event Dispatcher

### Task 4: Create Django signals for CRM events

**Files:**
- Create: `backend/workflows/signals.py`
- Create: `backend/workflows/event_dispatcher.py`

**Step 1: Create signals file with receivers**

Create `backend/workflows/signals.py`:

```python
"""
Django signal receivers that emit workflow events when CRM models change.

Uses pre_save to capture old state and post_save to detect changes.
Sets _workflow_execution flag on instances to prevent infinite loops.
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from contacts.models import Contact
from deals.models import Deal
from emails.models import SentEmail
from notes.models import TimelineEntry
from tasks.models import Task

from .event_dispatcher import dispatch_event

logger = logging.getLogger(__name__)


# --- Deal signals ---

@receiver(pre_save, sender=Deal)
def deal_pre_save(sender, instance, **kwargs):
    """Capture old stage before save for stage-change detection."""
    if instance.pk:
        try:
            old = Deal.objects.get(pk=instance.pk)
            instance._old_stage_id = old.stage_id
            instance._old_stage_name = old.stage.name
        except Deal.DoesNotExist:
            instance._old_stage_id = None
            instance._old_stage_name = None
    else:
        instance._old_stage_id = None
        instance._old_stage_name = None


@receiver(post_save, sender=Deal)
def deal_post_save(sender, instance, created, **kwargs):
    """Emit deal events after save."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    contact_id = str(instance.contact_id) if instance.contact_id else None

    if created:
        dispatch_event("deal.created", org_id, {
            "deal_id": str(instance.id),
            "deal_name": instance.name,
            "amount": float(instance.amount),
            "stage_id": str(instance.stage_id),
            "stage_name": instance.stage.name,
            "contact_id": contact_id,
        })
        return

    old_stage_id = getattr(instance, "_old_stage_id", None)
    if old_stage_id and str(old_stage_id) != str(instance.stage_id):
        new_stage_name = instance.stage.name
        old_stage_name = getattr(instance, "_old_stage_name", "")

        dispatch_event("deal.stage_changed", org_id, {
            "deal_id": str(instance.id),
            "deal_name": instance.name,
            "amount": float(instance.amount),
            "old_stage_id": str(old_stage_id),
            "old_stage_name": old_stage_name,
            "new_stage_id": str(instance.stage_id),
            "new_stage_name": new_stage_name,
            "contact_id": contact_id,
        })

        if new_stage_name.lower() in ("gagné", "gagne"):
            dispatch_event("deal.won", org_id, {
                "deal_id": str(instance.id),
                "deal_name": instance.name,
                "amount": float(instance.amount),
                "contact_id": contact_id,
            })
        elif new_stage_name.lower() in ("perdu",):
            dispatch_event("deal.lost", org_id, {
                "deal_id": str(instance.id),
                "deal_name": instance.name,
                "amount": float(instance.amount),
                "contact_id": contact_id,
            })


# --- Contact signals ---

@receiver(pre_save, sender=Contact)
def contact_pre_save(sender, instance, **kwargs):
    """Capture old lead score before save."""
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
    """Emit contact events after save."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    contact_data = {
        "contact_id": str(instance.id),
        "contact_name": f"{instance.first_name} {instance.last_name}",
        "email": instance.email,
        "company": instance.company,
        "source": instance.source,
        "lead_score": instance.lead_score,
    }

    if created:
        dispatch_event("contact.created", org_id, contact_data)
        return

    dispatch_event("contact.updated", org_id, contact_data)

    old_score = getattr(instance, "_old_lead_score", None)
    if old_score and old_score != instance.lead_score:
        dispatch_event("contact.lead_score_changed", org_id, {
            **contact_data,
            "old_score": old_score,
            "new_score": instance.lead_score,
        })


# --- Task signals ---

@receiver(post_save, sender=Task)
def task_post_save(sender, instance, created, **kwargs):
    """Emit task events after save."""
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    task_data = {
        "task_id": str(instance.id),
        "description": instance.description,
        "due_date": str(instance.due_date),
        "priority": instance.priority,
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
        "deal_id": str(instance.deal_id) if instance.deal_id else None,
    }

    if created:
        dispatch_event("task.created", org_id, task_data)
    elif instance.is_done:
        dispatch_event("task.completed", org_id, task_data)


# --- Timeline/Note signals ---

@receiver(post_save, sender=TimelineEntry)
def timeline_post_save(sender, instance, created, **kwargs):
    """Emit note.added event when a note is created."""
    if not created:
        return
    if getattr(instance, "_workflow_execution", False):
        return
    if instance.entry_type != TimelineEntry.EntryType.NOTE_ADDED:
        return

    org_id = str(instance.organization_id)
    dispatch_event("note.added", org_id, {
        "note_id": str(instance.id),
        "content": instance.content[:200],
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
        "deal_id": str(instance.deal_id) if instance.deal_id else None,
    })


# --- Email signals ---

@receiver(post_save, sender=SentEmail)
def email_post_save(sender, instance, created, **kwargs):
    """Emit email.sent event when an email is sent."""
    if not created:
        return
    if getattr(instance, "_workflow_execution", False):
        return

    org_id = str(instance.organization_id)
    dispatch_event("email.sent", org_id, {
        "email_id": str(instance.id),
        "to_email": instance.to_email,
        "subject": instance.subject,
        "contact_id": str(instance.contact_id) if instance.contact_id else None,
    })
```

**Step 2: Create event dispatcher**

Create `backend/workflows/event_dispatcher.py`:

```python
"""
Event dispatcher: receives CRM events and triggers matching workflows via Celery.

Anti-loop protections:
- _workflow_execution flag prevents re-triggering from workflow actions
- Cooldown: same workflow + same object within 60s is skipped
- Max depth: 10 action nodes per execution
"""
import hashlib
import logging

from django.core.cache import cache
from django.utils import timezone

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

            # Cooldown check
            cooldown_key = _cooldown_key(workflow.id, event_type, event_data)
            if cache.get(cooldown_key):
                logger.info(
                    "Workflow %s skipped (cooldown) for event %s",
                    workflow.name, event_type,
                )
                continue
            cache.set(cooldown_key, True, COOLDOWN_SECONDS)

            # Dispatch to Celery
            from .tasks import execute_workflow
            execute_workflow.delay(
                str(workflow.id),
                str(trigger_node.id),
                event_type,
                event_data,
            )
            logger.info(
                "Dispatched workflow '%s' for event %s",
                workflow.name, event_type,
            )


def _matches_filters(filters: dict, event_data: dict) -> bool:
    """Check if event data matches the trigger's filter criteria."""
    if not filters:
        return True

    for key, expected in filters.items():
        actual = event_data.get(key)
        if actual is None:
            return False

        # Support both exact match and case-insensitive for strings
        if isinstance(expected, str) and isinstance(actual, str):
            if expected.lower() != actual.lower():
                return False
        elif actual != expected:
            return False

    return True


def _cooldown_key(workflow_id, event_type: str, event_data: dict) -> str:
    """Generate a unique cache key for cooldown based on workflow + event + object."""
    # Use the primary entity ID from event data for object-level cooldown
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
```

**Step 3: Commit**

```bash
git add backend/workflows/signals.py backend/workflows/event_dispatcher.py
git commit -m "feat: add Django signals for CRM events and event dispatcher"
```

---

### Task 5: Create Celery tasks for workflow execution

**Files:**
- Create: `backend/workflows/tasks.py`
- Create: `backend/workflows/actions.py`
- Create: `backend/workflows/conditions.py`
- Create: `backend/workflows/template_vars.py`

**Step 1: Create template variable resolver**

Create `backend/workflows/template_vars.py`:

```python
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
    context = {
        "trigger": event_data,
        "now": str(__import__("django.utils", fromlist=["timezone"]).timezone.now()),
    }

    # Load contact data if available
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

    # Load deal data if available
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
```

**Step 2: Create condition evaluator**

Create `backend/workflows/conditions.py`:

```python
"""
Evaluate workflow conditions against event context data.
"""

OPERATORS = {
    "equals": lambda a, b: str(a).lower() == str(b).lower(),
    "not_equals": lambda a, b: str(a).lower() != str(b).lower(),
    "greater_than": lambda a, b: float(a) > float(b),
    "less_than": lambda a, b: float(a) < float(b),
    "contains": lambda a, b: str(b).lower() in str(a).lower(),
    "not_contains": lambda a, b: str(b).lower() not in str(a).lower(),
    "is_empty": lambda a, b: not a or a == "",
    "is_not_empty": lambda a, b: a and a != "",
}


def evaluate_condition(config: dict, context: dict) -> bool:
    """Evaluate a condition node against the template context.

    Config example: {"field": "deal.amount", "operator": "greater_than", "value": 5000}
    """
    field_path = config.get("field", "")
    operator = config.get("operator", "equals")
    expected = config.get("value", "")

    # Resolve field value from context (e.g., "deal.amount" → context["deal"]["amount"])
    parts = field_path.split(".", 1)
    if len(parts) != 2:
        return False

    entity, field = parts
    actual = context.get(entity, {}).get(field)

    if actual is None:
        return operator in ("is_empty",)

    op_func = OPERATORS.get(operator)
    if not op_func:
        return False

    try:
        return op_func(actual, expected)
    except (ValueError, TypeError):
        return False
```

**Step 3: Create action executor**

Create `backend/workflows/actions.py`:

```python
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
    """Send an email using the workflow creator's email account."""
    if not user_id:
        return {"error": "No user for email sending"}

    from emails.models import EmailAccount
    from emails.service import send_email as service_send_email
    from accounts.models import User
    from organizations.models import Organization

    account = EmailAccount.objects.filter(
        user_id=user_id, organization_id=organization_id, is_active=True
    ).first()
    if not account:
        return {"error": "No connected email account"}

    to_email = config.get("to") or context.get("contact", {}).get("email")
    subject = config.get("subject", "")
    body = config.get("body_template", config.get("body", ""))

    if not to_email:
        return {"error": "No recipient email"}

    body_html = "".join(f"<p>{line}</p>" for line in body.split("\n") if line.strip())
    if not body_html:
        body_html = f"<p>{body}</p>"

    try:
        user = User.objects.get(id=user_id)
        org = Organization.objects.get(id=organization_id)
        contact_id = config.get("contact_id") or context.get("contact", {}).get("id")
        sent = service_send_email(
            user=user,
            organization=org,
            contact_id=contact_id,
            subject=subject,
            body_html=body_html,
        )
        return {"action": "email_sent", "to": sent.to_email, "subject": subject}
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
```

**Step 4: Create the main Celery task for workflow execution**

Create `backend/workflows/tasks.py`:

```python
"""
Celery tasks for asynchronous workflow execution.

The main task `execute_workflow` traverses the workflow graph from the trigger
node, evaluates conditions, executes actions, and handles delays.
"""
import logging

from celery import shared_task
from django.utils import timezone

from .actions import execute_action
from .conditions import evaluate_condition
from .event_dispatcher import MAX_ACTION_DEPTH
from .models import (
    Workflow,
    WorkflowEdge,
    WorkflowExecution,
    WorkflowExecutionStep,
    WorkflowNode,
)
from .template_vars import build_context, resolve_config

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def execute_workflow(self, workflow_id: str, trigger_node_id: str, event_type: str, event_data: dict):
    """Execute a workflow from the trigger node, traversing the graph."""
    try:
        workflow = Workflow.objects.get(id=workflow_id, is_active=True)
    except Workflow.DoesNotExist:
        logger.warning("Workflow %s not found or inactive", workflow_id)
        return

    execution = WorkflowExecution.objects.create(
        workflow=workflow,
        trigger_event=event_type,
        trigger_data=event_data,
        status=WorkflowExecution.Status.RUNNING,
    )

    context = build_context(event_data, str(workflow.organization_id))
    context["workflow"] = {"name": workflow.name, "id": str(workflow.id)}

    try:
        _traverse_graph(
            workflow=workflow,
            execution=execution,
            current_node_id=trigger_node_id,
            context=context,
            depth=0,
        )
        execution.status = WorkflowExecution.Status.COMPLETED
        execution.completed_at = timezone.now()
        execution.save()
    except Exception as e:
        logger.exception("Workflow execution %s failed", execution.id)
        execution.status = WorkflowExecution.Status.FAILED
        execution.error = str(e)
        execution.completed_at = timezone.now()
        execution.save()


def _traverse_graph(workflow, execution, current_node_id, context, depth):
    """Recursively traverse the workflow graph from a given node."""
    if depth > MAX_ACTION_DEPTH:
        raise RuntimeError(f"Max workflow depth ({MAX_ACTION_DEPTH}) exceeded")

    # Get outgoing edges from current node
    edges = WorkflowEdge.objects.filter(
        workflow=workflow,
        source_node_id=current_node_id,
    ).select_related("target_node")

    for edge in edges:
        target_node = edge.target_node

        step = WorkflowExecutionStep.objects.create(
            execution=execution,
            node=target_node,
            status=WorkflowExecutionStep.Status.RUNNING,
            input_data=context,
            started_at=timezone.now(),
        )

        try:
            if target_node.node_type == WorkflowNode.NodeType.CONDITION:
                result = evaluate_condition(target_node.config, context)
                step.output_data = {"result": result}
                step.status = WorkflowExecutionStep.Status.COMPLETED
                step.completed_at = timezone.now()
                step.save()

                # Follow the matching edge (source_handle "yes" or "no")
                condition_edges = WorkflowEdge.objects.filter(
                    workflow=workflow,
                    source_node=target_node,
                ).select_related("target_node")

                for cond_edge in condition_edges:
                    handle = cond_edge.source_handle.lower()
                    if (result and handle in ("yes", "oui", "")) or \
                       (not result and handle in ("no", "non")):
                        _traverse_graph(
                            workflow, execution,
                            str(target_node.id), context, depth + 1,
                        )

            elif target_node.node_type == WorkflowNode.NodeType.ACTION:
                resolved_config = resolve_config(target_node.config, context)
                result = execute_action(
                    target_node.node_subtype,
                    resolved_config,
                    context,
                    str(workflow.organization_id),
                    str(workflow.created_by_id) if workflow.created_by_id else None,
                )
                step.output_data = result
                step.status = WorkflowExecutionStep.Status.COMPLETED
                step.completed_at = timezone.now()
                step.save()

                # Continue traversal
                _traverse_graph(
                    workflow, execution,
                    str(target_node.id), context, depth + 1,
                )

            elif target_node.node_type == WorkflowNode.NodeType.DELAY:
                delay_seconds = target_node.config.get("duration_seconds", 3600)
                step.output_data = {"delay_seconds": delay_seconds}
                step.status = WorkflowExecutionStep.Status.COMPLETED
                step.completed_at = timezone.now()
                step.save()

                # Schedule continuation after delay
                execute_workflow_continuation.apply_async(
                    args=[
                        str(workflow.id),
                        str(execution.id),
                        str(target_node.id),
                        context,
                        depth + 1,
                    ],
                    countdown=delay_seconds,
                )
                return  # Stop current traversal, continuation will resume

            else:
                step.status = WorkflowExecutionStep.Status.SKIPPED
                step.completed_at = timezone.now()
                step.save()

        except Exception as e:
            step.status = WorkflowExecutionStep.Status.FAILED
            step.error = str(e)
            step.completed_at = timezone.now()
            step.save()
            raise


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def execute_workflow_continuation(self, workflow_id, execution_id, from_node_id, context, depth):
    """Continue a workflow execution after a delay node."""
    try:
        workflow = Workflow.objects.get(id=workflow_id, is_active=True)
        execution = WorkflowExecution.objects.get(id=execution_id)
    except (Workflow.DoesNotExist, WorkflowExecution.DoesNotExist):
        return

    try:
        _traverse_graph(workflow, execution, from_node_id, context, depth)
        execution.status = WorkflowExecution.Status.COMPLETED
        execution.completed_at = timezone.now()
        execution.save()
    except Exception as e:
        execution.status = WorkflowExecution.Status.FAILED
        execution.error = str(e)
        execution.completed_at = timezone.now()
        execution.save()


@shared_task
def check_overdue_tasks():
    """Periodic task: check for overdue tasks and emit events.

    Should be scheduled via Celery Beat (e.g., every hour).
    """
    from tasks.models import Task
    from .event_dispatcher import dispatch_event

    now = timezone.now()
    overdue_tasks = Task.objects.filter(
        is_done=False,
        due_date__lt=now,
    ).select_related("organization")

    for task in overdue_tasks:
        dispatch_event("task.overdue", str(task.organization_id), {
            "task_id": str(task.id),
            "description": task.description,
            "due_date": str(task.due_date),
            "priority": task.priority,
            "contact_id": str(task.contact_id) if task.contact_id else None,
            "deal_id": str(task.deal_id) if task.deal_id else None,
        })
```

**Step 5: Add cache backend to settings for cooldown**

In `backend/config/settings.py`, add after the Celery section:

```python
# ---------------------------------------------------------------------------
# Cache (used for workflow cooldowns)
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    }
}
```

**Step 6: Commit**

```bash
git add backend/workflows/tasks.py backend/workflows/actions.py backend/workflows/conditions.py backend/workflows/template_vars.py backend/config/settings.py
git commit -m "feat: add workflow execution engine with Celery tasks, actions, conditions, and template variables"
```

---

## Phase 3: Backend API — Serializers, Views, URLs

### Task 6: Create serializers for workflow models

**Files:**
- Create: `backend/workflows/serializers.py`

**Step 1: Create serializers**

Create `backend/workflows/serializers.py`:

```python
from rest_framework import serializers
from .models import Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution, WorkflowExecutionStep


class WorkflowNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowNode
        fields = [
            "id", "node_type", "node_subtype", "config",
            "position_x", "position_y",
        ]
        read_only_fields = ["id"]


class WorkflowEdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowEdge
        fields = ["id", "source_node", "target_node", "source_handle", "label"]
        read_only_fields = ["id"]


class WorkflowSerializer(serializers.ModelSerializer):
    nodes = WorkflowNodeSerializer(many=True, read_only=True)
    edges = WorkflowEdgeSerializer(many=True, read_only=True)
    execution_count = serializers.IntegerField(read_only=True, default=0)
    last_execution_at = serializers.DateTimeField(read_only=True, default=None)

    class Meta:
        model = Workflow
        fields = [
            "id", "name", "description", "is_active",
            "created_at", "updated_at",
            "nodes", "edges",
            "execution_count", "last_execution_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkflowListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view without full graph data."""
    execution_count = serializers.IntegerField(read_only=True, default=0)
    last_execution_at = serializers.DateTimeField(read_only=True, default=None)
    trigger_type = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            "id", "name", "description", "is_active",
            "created_at", "updated_at",
            "execution_count", "last_execution_at",
            "trigger_type",
        ]

    def get_trigger_type(self, obj):
        trigger = obj.nodes.filter(node_type=WorkflowNode.NodeType.TRIGGER).first()
        return trigger.node_subtype if trigger else None


class WorkflowSaveSerializer(serializers.Serializer):
    """Serializer for saving a complete workflow with nodes and edges."""
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, default="")
    is_active = serializers.BooleanField(required=False, default=False)
    nodes = serializers.ListField(child=serializers.DictField())
    edges = serializers.ListField(child=serializers.DictField())


class WorkflowExecutionStepSerializer(serializers.ModelSerializer):
    node_type = serializers.CharField(source="node.node_type", read_only=True)
    node_subtype = serializers.CharField(source="node.node_subtype", read_only=True)

    class Meta:
        model = WorkflowExecutionStep
        fields = [
            "id", "node_type", "node_subtype", "status",
            "input_data", "output_data", "error",
            "started_at", "completed_at",
        ]


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    steps = WorkflowExecutionStepSerializer(many=True, read_only=True)
    workflow_name = serializers.CharField(source="workflow.name", read_only=True)

    class Meta:
        model = WorkflowExecution
        fields = [
            "id", "workflow_name", "trigger_event", "trigger_data",
            "status", "started_at", "completed_at", "error", "steps",
        ]
```

**Step 2: Commit**

```bash
git add backend/workflows/serializers.py
git commit -m "feat: add workflow serializers for API"
```

---

### Task 7: Create views and URLs

**Files:**
- Create: `backend/workflows/views.py`
- Create: `backend/workflows/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Create views**

Create `backend/workflows/views.py`:

```python
from django.db.models import Count, Max
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workflow, WorkflowNode, WorkflowEdge, WorkflowExecution
from .serializers import (
    WorkflowSerializer,
    WorkflowListSerializer,
    WorkflowSaveSerializer,
    WorkflowExecutionSerializer,
)


class WorkflowViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == "list":
            return WorkflowListSerializer
        return WorkflowSerializer

    def get_queryset(self):
        return (
            Workflow.objects.filter(organization=self.request.organization)
            .annotate(
                execution_count=Count("executions"),
                last_execution_at=Max("executions__started_at"),
            )
            .prefetch_related("nodes", "edges")
        )

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def create(self, request, *args, **kwargs):
        """Create a workflow with its nodes and edges in one request."""
        save_serializer = WorkflowSaveSerializer(data=request.data)
        save_serializer.is_valid(raise_exception=True)
        data = save_serializer.validated_data

        workflow = Workflow.objects.create(
            organization=request.organization,
            created_by=request.user,
            name=data["name"],
            description=data.get("description", ""),
            is_active=data.get("is_active", False),
        )

        # Create nodes — map frontend temp IDs to real UUIDs
        node_id_map = {}
        for node_data in data.get("nodes", []):
            temp_id = node_data.get("id", "")
            node = WorkflowNode.objects.create(
                workflow=workflow,
                node_type=node_data.get("node_type", "action"),
                node_subtype=node_data.get("node_subtype", ""),
                config=node_data.get("config", {}),
                position_x=node_data.get("position_x", 0),
                position_y=node_data.get("position_y", 0),
            )
            node_id_map[temp_id] = str(node.id)

        # Create edges using mapped node IDs
        for edge_data in data.get("edges", []):
            source_id = node_id_map.get(edge_data.get("source_node", ""))
            target_id = node_id_map.get(edge_data.get("target_node", ""))
            if source_id and target_id:
                WorkflowEdge.objects.create(
                    workflow=workflow,
                    source_node_id=source_id,
                    target_node_id=target_id,
                    source_handle=edge_data.get("source_handle", ""),
                    label=edge_data.get("label", ""),
                )

        return Response(
            WorkflowSerializer(workflow).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        """Update a workflow: replace all nodes and edges."""
        workflow = self.get_object()
        save_serializer = WorkflowSaveSerializer(data=request.data)
        save_serializer.is_valid(raise_exception=True)
        data = save_serializer.validated_data

        workflow.name = data["name"]
        workflow.description = data.get("description", "")
        workflow.is_active = data.get("is_active", False)
        workflow.save()

        # Replace nodes and edges
        workflow.nodes.all().delete()
        workflow.edges.all().delete()

        node_id_map = {}
        for node_data in data.get("nodes", []):
            temp_id = node_data.get("id", "")
            node = WorkflowNode.objects.create(
                workflow=workflow,
                node_type=node_data.get("node_type", "action"),
                node_subtype=node_data.get("node_subtype", ""),
                config=node_data.get("config", {}),
                position_x=node_data.get("position_x", 0),
                position_y=node_data.get("position_y", 0),
            )
            node_id_map[temp_id] = str(node.id)

        for edge_data in data.get("edges", []):
            source_id = node_id_map.get(edge_data.get("source_node", ""))
            target_id = node_id_map.get(edge_data.get("target_node", ""))
            if source_id and target_id:
                WorkflowEdge.objects.create(
                    workflow=workflow,
                    source_node_id=source_id,
                    target_node_id=target_id,
                    source_handle=edge_data.get("source_handle", ""),
                    label=edge_data.get("label", ""),
                )

        return Response(WorkflowSerializer(workflow).data)

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        """Activate or deactivate a workflow."""
        workflow = self.get_object()
        workflow.is_active = not workflow.is_active
        workflow.save(update_fields=["is_active"])
        return Response({"is_active": workflow.is_active})

    @action(detail=True, methods=["get"])
    def executions(self, request, pk=None):
        """Get execution history for a workflow."""
        workflow = self.get_object()
        executions = WorkflowExecution.objects.filter(
            workflow=workflow
        ).prefetch_related("steps", "steps__node")[:50]
        return Response(
            WorkflowExecutionSerializer(executions, many=True).data
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def workflow_templates(request):
    """Return predefined workflow templates."""
    templates = [
        {
            "id": "follow_up_negotiation",
            "name": "Suivi de négociation",
            "description": "Quand un deal passe en Négociation → créer une tâche de suivi dans 3 jours",
            "trigger_type": "deal.stage_changed",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "deal.stage_changed", "config": {"filters": {"new_stage_name": "Négociation"}}, "position_x": 250, "position_y": 50},
                {"id": "a1", "node_type": "action", "node_subtype": "create_task", "config": {"description": "Suivre {{contact.name}} pour {{deal.name}}", "due_date_offset": "+3d", "priority": "high"}, "position_x": 250, "position_y": 200},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "a1"},
            ],
        },
        {
            "id": "welcome_prospect",
            "name": "Bienvenue prospect",
            "description": "Contact créé → envoyer un email de bienvenue",
            "trigger_type": "contact.created",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "contact.created", "config": {}, "position_x": 250, "position_y": 50},
                {"id": "a1", "node_type": "action", "node_subtype": "send_email", "config": {"subject": "Bienvenue {{contact.first_name}} !", "body_template": "Bonjour {{contact.first_name}},\n\nMerci pour votre intérêt."}, "position_x": 250, "position_y": 200},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "a1"},
            ],
        },
        {
            "id": "deal_won_celebration",
            "name": "Félicitations deal gagné",
            "description": "Deal gagné → note + notification équipe",
            "trigger_type": "deal.won",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "deal.won", "config": {}, "position_x": 250, "position_y": 50},
                {"id": "a1", "node_type": "action", "node_subtype": "create_note", "config": {"content": "🎉 Deal {{deal.name}} gagné pour {{deal.amount}}€ !"}, "position_x": 100, "position_y": 200},
                {"id": "a2", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Deal gagné !", "message": "{{deal.name}} — {{deal.amount}}€"}, "position_x": 400, "position_y": 200},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "a1"},
                {"source_node": "t1", "target_node": "a2"},
            ],
        },
        {
            "id": "overdue_task_reminder",
            "name": "Tâche en retard",
            "description": "Tâche en retard → notification + relance",
            "trigger_type": "task.overdue",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "task.overdue", "config": {}, "position_x": 250, "position_y": 50},
                {"id": "a1", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Tâche en retard", "message": "{{task.description}} est en retard !"}, "position_x": 250, "position_y": 200},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "a1"},
            ],
        },
        {
            "id": "sla_deal_stale",
            "name": "SLA deal inactif",
            "description": "Deal créé → attendre 7 jours → si toujours au même stage → notification",
            "trigger_type": "deal.created",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "deal.created", "config": {}, "position_x": 250, "position_y": 50},
                {"id": "d1", "node_type": "delay", "node_subtype": "wait", "config": {"duration_seconds": 604800}, "position_x": 250, "position_y": 175},
                {"id": "a1", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Deal sans activité", "message": "{{deal.name}} n'a pas bougé depuis 7 jours"}, "position_x": 250, "position_y": 300},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "d1"},
                {"source_node": "d1", "target_node": "a1"},
            ],
        },
    ]
    return Response(templates)
```

**Step 2: Create URLs**

Create `backend/workflows/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"", views.WorkflowViewSet, basename="workflow")

urlpatterns = [
    path("templates/", views.workflow_templates, name="workflow-templates"),
    path("", include(router.urls)),
]
```

**Step 3: Register in main urls.py**

Add to `backend/config/urls.py`:

```python
path("api/workflows/", include("workflows.urls")),
```

**Step 4: Commit**

```bash
git add backend/workflows/views.py backend/workflows/urls.py backend/config/urls.py
git commit -m "feat: add workflow API endpoints with CRUD, toggle, executions, and templates"
```

---

## Phase 4: Chat AI Integration

### Task 8: Add workflow tools to the AI chat agent

**Files:**
- Modify: `backend/chat/tools.py`

**Step 1: Add workflow tool functions**

Add these functions before `ALL_TOOLS` in `backend/chat/tools.py`:

```python
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
```

**Step 2: Add to ALL_TOOLS list**

Add the 4 new tools to the `ALL_TOOLS` list at the end of `tools.py`:

```python
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
```

**Step 3: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat: add workflow tools to AI chat agent (create, list, toggle, executions)"
```

---

## Phase 5: Frontend — Workflow List Page

### Task 9: Install React Flow and add sidebar navigation

**Files:**
- Modify: `frontend/package.json` (install @xyflow/react)
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Install React Flow**

Run: `cd frontend && npm install @xyflow/react`

**Step 2: Add Workflows link to sidebar**

In `frontend/components/Sidebar.tsx`, add the import:
```typescript
import { Workflow } from "lucide-react"
```

And add to the navigation array after Tâches:
```typescript
{ name: "Workflows", href: "/workflows", icon: Workflow },
```

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/components/Sidebar.tsx
git commit -m "feat: install React Flow and add workflows link to sidebar navigation"
```

---

### Task 10: Create workflow list page

**Files:**
- Create: `frontend/app/(app)/workflows/page.tsx`

**Step 1: Create the workflows list page**

Create `frontend/app/(app)/workflows/page.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  Loader2,
  Zap,
  ZapOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  History,
  LayoutTemplate,
} from "lucide-react"
import { toast } from "sonner"

interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string | null
  execution_count: number
  last_execution_at: string | null
  created_at: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  trigger_type: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

const TRIGGER_LABELS: Record<string, string> = {
  "deal.stage_changed": "Deal change de stage",
  "deal.created": "Deal créé",
  "deal.won": "Deal gagné",
  "deal.lost": "Deal perdu",
  "contact.created": "Contact créé",
  "contact.updated": "Contact mis à jour",
  "contact.lead_score_changed": "Lead score changé",
  "task.created": "Tâche créée",
  "task.completed": "Tâche complétée",
  "task.overdue": "Tâche en retard",
  "email.sent": "Email envoyé",
  "note.added": "Note ajoutée",
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await apiFetch<Workflow[]>("/workflows/")
      setWorkflows(data)
    } catch {
      console.error("Failed to fetch workflows")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<WorkflowTemplate[]>("/workflows/templates/")
      setTemplates(data)
    } catch {
      console.error("Failed to fetch templates")
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
    fetchTemplates()
  }, [fetchWorkflows, fetchTemplates])

  const handleCreateBlank = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const data = await apiFetch<Workflow>("/workflows/", {
        method: "POST",
        json: {
          name: newName.trim(),
          nodes: [],
          edges: [],
        },
      })
      setCreateDialogOpen(false)
      setNewName("")
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      const data = await apiFetch<Workflow>("/workflows/", {
        method: "POST",
        json: {
          name: template.name,
          description: template.description,
          nodes: template.nodes,
          edges: template.edges,
        },
      })
      setTemplateDialogOpen(false)
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la création")
    }
  }

  const handleToggle = async (workflow: Workflow) => {
    try {
      const data = await apiFetch<{ is_active: boolean }>(
        `/workflows/${workflow.id}/toggle/`,
        { method: "POST" }
      )
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: data.is_active } : w
        )
      )
      toast.success(data.is_active ? "Workflow activé" : "Workflow désactivé")
    } catch {
      toast.error("Erreur")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/workflows/${id}/`, { method: "DELETE" })
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success("Workflow supprimé")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
    setMenuOpenId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Automatisez vos processus CRM avec des workflows visuels
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setTemplateDialogOpen(true)}
            className="gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Workflows list */}
      {workflows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 space-y-3">
          <Zap className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucun workflow. Créez votre premier workflow ou utilisez un template.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
              Voir les templates
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              Créer un workflow
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-xl border border-border bg-card overflow-hidden hover:bg-secondary/10 transition-colors"
            >
              <div className="p-4 flex items-center gap-4 font-[family-name:var(--font-body)]">
                {/* Status indicator */}
                <button
                  onClick={() => handleToggle(workflow)}
                  className="shrink-0"
                  title={workflow.is_active ? "Désactiver" : "Activer"}
                >
                  {workflow.is_active ? (
                    <Zap className="h-5 w-5 text-primary" />
                  ) : (
                    <ZapOff className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </button>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/workflows/${workflow.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {workflow.name}
                    </span>
                    {workflow.is_active && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {workflow.trigger_type && (
                      <span className="text-xs text-muted-foreground">
                        {TRIGGER_LABELS[workflow.trigger_type] || workflow.trigger_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                      {workflow.execution_count} exécution{workflow.execution_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === workflow.id ? null : workflow.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpenId === workflow.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                        <button
                          onClick={() => {
                            router.push(`/workflows/${workflow.id}`)
                            setMenuOpenId(null)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/workflows/${workflow.id}?tab=history`)
                            setMenuOpenId(null)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                        >
                          <History className="h-3.5 w-3.5" />
                          Historique
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create blank dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nom
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Suivi de négociation"
                className="h-11 bg-secondary/30 border-border/60"
                onKeyDown={(e) => e.key === "Enter" && handleCreateBlank()}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateBlank}
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Templates de workflows</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 font-[family-name:var(--font-body)] max-h-[60vh] overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateFromTemplate(template)}
                className="w-full text-left rounded-lg border border-border p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {template.description}
                </p>
                <span className="text-[10px] text-muted-foreground/60 ml-6 mt-1 block">
                  {TRIGGER_LABELS[template.trigger_type] || template.trigger_type}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/workflows/
git commit -m "feat: add workflows list page with create, templates, toggle, and delete"
```

---

## Phase 6: Frontend — Visual Workflow Builder

### Task 11: Create the React Flow workflow builder page

**Files:**
- Create: `frontend/app/(app)/workflows/[id]/page.tsx`
- Create: `frontend/components/workflows/nodes/TriggerNode.tsx`
- Create: `frontend/components/workflows/nodes/ConditionNode.tsx`
- Create: `frontend/components/workflows/nodes/ActionNode.tsx`
- Create: `frontend/components/workflows/nodes/DelayNode.tsx`
- Create: `frontend/components/workflows/NodeConfigPanel.tsx`
- Create: `frontend/components/workflows/WorkflowBuilder.tsx`

This is a large task. The key files are:

**Step 1: Create custom React Flow nodes**

These are the 4 custom node components that render in the canvas. Each has specific colors, icons, and handle configurations. Create them in `frontend/components/workflows/nodes/`.

**TriggerNode.tsx** — Blue node with lightning icon, 1 output handle.
**ConditionNode.tsx** — Yellow node with question mark icon, 1 input handle, 2 output handles (yes/no).
**ActionNode.tsx** — Green node with gear icon, 1 input handle, 1 output handle.
**DelayNode.tsx** — Gray node with clock icon, 1 input handle, 1 output handle.

Each node renders a card-like element with the node type label and subtype description.

**Step 2: Create the node configuration panel**

`NodeConfigPanel.tsx` — Renders a side panel when a node is clicked with form fields specific to the node type (trigger config, condition fields, action params with template variables). Includes a variable picker showing available `{{contact.name}}`, `{{deal.amount}}`, etc.

**Step 3: Create the main WorkflowBuilder component**

`WorkflowBuilder.tsx` — Main component that:
- Initializes React Flow with custom node types
- Manages nodes/edges state
- Handles drag from palette to canvas (add new nodes)
- Handles node click (open config panel)
- Handles edge connections
- Saves the workflow graph to the API

**Step 4: Create the builder page**

`frontend/app/(app)/workflows/[id]/page.tsx` — Page that:
- Fetches the workflow by ID
- Renders the WorkflowBuilder component
- Has a header with back button, workflow name (editable), active toggle, and save button
- Has a left palette panel with draggable node types
- Has the React Flow canvas in the center
- Has the config panel on the right/bottom when a node is selected

**Step 5: Commit**

```bash
git add frontend/components/workflows/ frontend/app/\(app\)/workflows/\[id\]/
git commit -m "feat: add visual workflow builder with React Flow, custom nodes, and config panel"
```

---

### Task 12: Create execution history view

**Files:**
- Create: `frontend/components/workflows/ExecutionHistory.tsx`

**Step 1: Create execution history component**

Component that fetches and displays workflow executions in a table with:
- Status badge (colored: green=completed, red=failed, blue=running, gray=cancelled)
- Trigger event label
- Start time (relative)
- Duration
- Expandable rows showing each step with input/output/error

**Step 2: Integrate into builder page**

Add a tab or toggleable section in the builder page that shows the execution history.

**Step 3: Commit**

```bash
git add frontend/components/workflows/ExecutionHistory.tsx
git commit -m "feat: add workflow execution history component"
```

---

## Phase 7: Migration & Final Integration

### Task 13: Run migrations and test

**Step 1: Run database migrations**

```bash
cd backend && python manage.py makemigrations && python manage.py migrate
```

**Step 2: Verify Docker services start correctly**

```bash
docker compose up --build
```

Verify: Redis, Celery worker, Celery beat, backend, frontend all start without errors.

**Step 3: Test workflow creation via API**

```bash
curl -X POST http://localhost:8000/api/workflows/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test workflow","nodes":[{"id":"t1","node_type":"trigger","node_subtype":"deal.stage_changed","config":{"filters":{}},"position_x":250,"position_y":50}],"edges":[]}'
```

**Step 4: Test workflow creation via chat**

In the chat, say: "Quand un deal passe en Négociation, crée une tâche de suivi dans 3 jours"

Verify the AI creates a workflow using the `create_workflow` tool.

**Step 5: Test workflow execution**

1. Create a deal in the pipeline
2. Move it to "Négociation"
3. Check that the Django signal fires, the event dispatcher matches the workflow, and Celery creates the task

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve issues found during integration testing"
```

---

## Summary of All Files

### Backend (New)
- `backend/config/celery.py` — Celery configuration
- `backend/config/__init__.py` — Export celery app
- `backend/workflows/__init__.py` — App init
- `backend/workflows/apps.py` — App config with signal registration
- `backend/workflows/admin.py` — Admin registration
- `backend/workflows/models.py` — Workflow, Node, Edge, Execution, Step
- `backend/workflows/serializers.py` — API serializers
- `backend/workflows/views.py` — ViewSet + templates endpoint
- `backend/workflows/urls.py` — URL routing
- `backend/workflows/signals.py` — Django signal receivers
- `backend/workflows/event_dispatcher.py` — Event matching + Celery dispatch
- `backend/workflows/tasks.py` — Celery tasks for execution
- `backend/workflows/actions.py` — Action executors (7 types)
- `backend/workflows/conditions.py` — Condition evaluator
- `backend/workflows/template_vars.py` — Template variable resolver

### Backend (Modified)
- `backend/config/settings.py` — Add Celery config, cache, workflows app
- `backend/config/urls.py` — Add workflows URL
- `backend/requirements.txt` — Add celery, redis, django-celery-beat
- `backend/chat/tools.py` — Add 4 workflow tools

### Frontend (New)
- `frontend/app/(app)/workflows/page.tsx` — Workflow list page
- `frontend/app/(app)/workflows/[id]/page.tsx` — Workflow builder page
- `frontend/components/workflows/WorkflowBuilder.tsx` — Main builder
- `frontend/components/workflows/NodeConfigPanel.tsx` — Node config
- `frontend/components/workflows/ExecutionHistory.tsx` — History view
- `frontend/components/workflows/nodes/TriggerNode.tsx` — Trigger node
- `frontend/components/workflows/nodes/ConditionNode.tsx` — Condition node
- `frontend/components/workflows/nodes/ActionNode.tsx` — Action node
- `frontend/components/workflows/nodes/DelayNode.tsx` — Delay node

### Frontend (Modified)
- `frontend/package.json` — Add @xyflow/react
- `frontend/components/Sidebar.tsx` — Add Workflows nav link

### Infrastructure (Modified)
- `docker-compose.yml` — Add Redis, Celery worker, Celery beat services
