# Workflows & Automation Design

**Date:** 2026-03-05
**Status:** Approved

## Overview

No-code workflow automation system for Qeylo CRM. Users build visual workflows (trigger → conditions → actions) via a React Flow node-based editor or via natural language through the AI chat. Workflows execute asynchronously via Celery + Redis.

## Architecture

```
Django Signal → Event Dispatcher → Celery Worker
                                       │
                                 ┌─────▼──────┐
                                 │  Evaluate   │
                                 │ conditions  │
                                 └─────┬──────┘
                                       │
                                 ┌─────▼──────┐
                                 │  Execute    │
                                 │  actions    │
                                 └─────┬──────┘
                                       │
                                 ┌─────▼──────┐
                                 │    Log      │
                                 │ execution   │
                                 └────────────┘
```

### Tech Stack Additions

- **Celery** + **Redis** — async task execution, delays, retries
- **React Flow** (`@xyflow/react`) — visual node-based workflow builder
- **Django Signals** — event capture on model mutations
- **Celery Beat** — scheduled/cron triggers

## Data Models

### New Django App: `workflows`

#### Workflow

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| organization | FK → Organization | |
| name | CharField(200) | |
| description | TextField | optional |
| is_active | BooleanField | default=False |
| created_by | FK → User | |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

#### WorkflowNode

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workflow | FK → Workflow | CASCADE |
| node_type | CharField | TRIGGER, CONDITION, ACTION, DELAY |
| node_subtype | CharField | e.g. "deal_stage_changed", "create_task" |
| config | JSONField | Type-specific configuration |
| position_x | FloatField | React Flow canvas position |
| position_y | FloatField | React Flow canvas position |

#### WorkflowEdge

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workflow | FK → Workflow | CASCADE |
| source_node | FK → WorkflowNode | |
| target_node | FK → WorkflowNode | |
| source_handle | CharField | optional, e.g. "yes", "no" |
| label | CharField | optional display label |

#### WorkflowExecution

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workflow | FK → Workflow | |
| trigger_event | CharField | e.g. "deal.stage_changed" |
| trigger_data | JSONField | Event payload |
| status | CharField | RUNNING, COMPLETED, FAILED, CANCELLED |
| started_at | DateTimeField | |
| completed_at | DateTimeField | nullable |
| error | TextField | nullable |

#### WorkflowExecutionStep

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| execution | FK → WorkflowExecution | CASCADE |
| node | FK → WorkflowNode | |
| status | CharField | PENDING, RUNNING, COMPLETED, FAILED, SKIPPED |
| input_data | JSONField | |
| output_data | JSONField | |
| error | TextField | nullable |
| started_at | DateTimeField | |
| completed_at | DateTimeField | nullable |

## Event System

### Supported Events

| Event | Source | Data |
|-------|--------|------|
| `deal.created` | post_save (created=True) | deal, stage, contact |
| `deal.stage_changed` | post_save (stage changed) | deal, old_stage, new_stage, contact |
| `deal.won` | custom signal | deal, contact, amount |
| `deal.lost` | custom signal | deal, contact, amount |
| `contact.created` | post_save (created=True) | contact, source |
| `contact.updated` | post_save (created=False) | contact, changed_fields |
| `contact.lead_score_changed` | custom signal | contact, old_score, new_score |
| `task.created` | post_save (created=True) | task, contact, deal |
| `task.completed` | custom signal | task, contact, deal |
| `task.overdue` | Celery beat (periodic check) | task, contact, deal |
| `email.sent` | post_save on SentEmail | email, contact |
| `note.added` | post_save on TimelineEntry (NOTE_ADDED) | note, contact, deal |

### Django Signals Implementation

```python
# workflows/signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import Signal

# Custom signals
deal_won = Signal()        # sender, deal, contact, amount
deal_lost = Signal()       # sender, deal, contact, amount
task_completed = Signal()  # sender, task, contact, deal
lead_score_changed = Signal()  # sender, contact, old_score, new_score
```

Receivers call `event_dispatcher.emit(event_type, data)` which queries active workflows matching the trigger and dispatches Celery tasks.

### Anti-Loop Protection

- **Max depth**: 10 action nodes per execution
- **Cooldown**: Same workflow cannot re-trigger on same object within 60 seconds
- **Skip flag**: Actions executed by workflows set `_workflow_execution=True` on model instances to prevent re-triggering signals

## Node Configuration (JSON schemas)

### Trigger Configs

```json
// deal_stage_changed
{"filters": {"to_stage_id": "uuid", "from_stage_id": "uuid"}}

// contact_created
{"filters": {"source": "linkedin"}}

// task_overdue
{"filters": {"priority": "HIGH"}}

// scheduled (cron)
{"schedule": "0 9 * * 1", "timezone": "Europe/Paris"}
```

### Condition Configs

```json
{"field": "deal.amount", "operator": "greater_than", "value": 5000}
{"field": "contact.lead_score", "operator": "equals", "value": "HOT"}
{"field": "contact.categories", "operator": "contains", "value": "Prospect"}
```

Operators: `equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `not_contains`, `is_empty`, `is_not_empty`

### Action Configs

```json
// create_task
{"description": "Relancer {{contact.first_name}}", "due_date_offset": "+3d", "priority": "HIGH", "assign_to": "trigger_user"}

// send_email
{"subject": "Suivi {{deal.name}}", "body_template": "...", "to": "{{contact.email}}"}

// update_contact
{"fields": {"lead_score": "HOT"}}

// move_deal
{"stage_id": "uuid"}

// create_note
{"content": "Workflow auto: {{workflow.name}}", "contact_id": "{{contact.id}}"}

// send_notification
{"title": "Deal en négociation", "message": "{{deal.name}} - {{deal.amount}}€", "recipient": "trigger_user"}

// webhook
{"url": "https://hooks.slack.com/...", "method": "POST", "body": {"text": "Deal {{deal.name}} moved"}}
```

### Delay Configs

```json
{"delay_type": "fixed", "duration_seconds": 7200}
{"delay_type": "fixed", "duration_seconds": 259200}
{"delay_type": "relative", "field": "deal.expected_close", "offset_seconds": -86400}
```

### Template Variables

Available in all action configs. Resolved at execution time.

| Variable | Description |
|----------|-------------|
| `{{contact.first_name}}` | Contact first name |
| `{{contact.last_name}}` | Contact last name |
| `{{contact.name}}` | Full name |
| `{{contact.email}}` | Contact email |
| `{{contact.company}}` | Contact company |
| `{{contact.lead_score}}` | Lead score |
| `{{deal.name}}` | Deal name |
| `{{deal.amount}}` | Deal amount |
| `{{deal.stage}}` | Current stage name |
| `{{deal.probability}}` | Deal probability |
| `{{task.description}}` | Task description |
| `{{task.due_date}}` | Task due date |
| `{{trigger.old_stage}}` | Previous stage (for stage_changed) |
| `{{trigger.new_stage}}` | New stage (for stage_changed) |
| `{{trigger.user}}` | User who triggered |
| `{{workflow.name}}` | Workflow name |
| `{{now}}` | Current datetime |

## Frontend: Visual Builder

### Page Structure

- `/settings/workflows` — List all workflows (name, status toggle, trigger, execution count, last run)
- `/settings/workflows/new` — Create new workflow (builder)
- `/settings/workflows/[id]` — Edit workflow (builder)
- `/settings/workflows/[id]/history` — Execution history

### Builder Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Retour    "Suivi Négociation"  [is_active] [Sauver]  │
├─────────┬────────────────────────────────────────────────┤
│ PALETTE │          REACT FLOW CANVAS                     │
│         │                                                │
│ ⚡Trigger │    ┌──────────┐     ┌──────────┐              │
│ ❓Condition│   │ ⚡ Deal   │────▶│ ❓Stage  │              │
│ ⚙️Action  │    │ moved    │     │ = Négo?  │              │
│ ⏱️Delay   │    └──────────┘     └────┬─────┘              │
│         │                    Oui │   │ Non               │
│         │               ┌────────▼┐  ▼                   │
│         │               │ ⚙️Créer  │(fin)                 │
│         │               │ tâche    │                     │
│         │               └────┬─────┘                     │
│         │               ┌────▼─────┐                     │
│         │               │ ⚙️Email  │                     │
│         │               └──────────┘                     │
├─────────┴────────────────────────────────────────────────┤
│  NODE CONFIG PANEL (appears on node click)               │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Description: [Relancer {{contact.name}}        ] │    │
│  │ Échéance:    [+3 jours ▾]                        │    │
│  │ Priorité:    [Haute ▾]                           │    │
│  │ Variables:   {{contact.name}} {{deal.name}} ...  │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### React Flow Node Types

**TriggerNode** — Blue, lightning icon. Single instance per workflow. Selects entity + event + optional filters.

**ConditionNode** — Yellow, question mark icon. Two output handles: "yes" (green) and "no" (red). Configures field/operator/value.

**ActionNode** — Green, gear icon. Configures action type + parameters with template variable support.

**DelayNode** — Gray, clock icon. Configures fixed duration or relative to field.

### Node Configuration Panel

Appears as a bottom drawer or right-side panel when a node is selected. Contains form fields specific to the node type with autocomplete for template variables.

### Execution History View

Table with: execution ID, status badge, trigger event, started_at, duration, step count. Expandable rows show each step with input/output/error. Optional: overlay on the graph canvas with colored nodes (green=completed, red=failed, gray=skipped).

## Chat AI Integration

### New Tools

```python
create_workflow(
    name: str,
    trigger_type: str,          # "deal_stage_changed", "contact_created", etc.
    trigger_filters: dict = {}, # {"to_stage": "Négociation"}
    conditions: list = [],      # [{"field": "deal.amount", "op": ">", "value": 5000}]
    actions: list = [],         # [{"type": "create_task", "description": "...", "due": "+3d"}]
) → workflow summary

list_workflows() → active/inactive workflows with stats

toggle_workflow(workflow_id: str, active: bool) → confirmation

get_workflow_executions(workflow_id: str, limit: int = 5) → recent executions
```

### Usage Examples

User: "Quand un deal passe en Négociation, crée une tâche de suivi dans 3 jours"
→ AI calls `create_workflow` with appropriate params

User: "Montre-moi les workflows actifs"
→ AI calls `list_workflows`

User: "Désactive le workflow de suivi négociation"
→ AI calls `toggle_workflow`

## Predefined Templates

Available as quick-start options when creating a new workflow:

1. **Suivi de négociation** — Deal → Négociation → Tâche de suivi J+3
2. **Bienvenue prospect** — Contact créé (source=web) → Email de bienvenue
3. **Relance deal inactif** — Deal sans activité 7j → Notification + Tâche
4. **Félicitations deal gagné** — Deal → Gagné → Note + Notification équipe
5. **Tâche en retard** — Task overdue → Notification + Email de relance

## HubSpot/Salesforce-Inspired Enhancements

1. **Lead Scoring automatique** — Workflows that adjust lead score based on interactions (email opened → +5, meeting → +20, no activity 30d → -10)

2. **Email Sequences** — Chain of send_email + delay nodes for nurturing campaigns

3. **Lead Rotation** — Round-robin assignment of new contacts to team members

4. **SLA Alerting** — Notification when a deal stays in a stage too long (e.g., 14 days in "Devis envoyé")

5. **Outbound Webhooks** — Send data to external services (Slack, Zapier, Make) on events

6. **Workflow Analytics** — Dashboard with success rate, avg execution time, most used actions

## API Endpoints

```
GET    /api/workflows/                    — List workflows
POST   /api/workflows/                    — Create workflow
GET    /api/workflows/{id}/               — Get workflow with nodes and edges
PATCH  /api/workflows/{id}/               — Update workflow
DELETE /api/workflows/{id}/               — Delete workflow
POST   /api/workflows/{id}/toggle/        — Activate/deactivate
POST   /api/workflows/{id}/test/          — Test run with mock data
GET    /api/workflows/{id}/executions/    — Execution history
GET    /api/workflows/executions/{id}/    — Execution detail with steps
GET    /api/workflows/templates/          — List available templates
POST   /api/workflows/from-template/{id}/ — Create from template
```

## Infrastructure Changes

- Add **Redis** to docker-compose.yml
- Add **Celery** worker service to docker-compose.yml
- Add **Celery Beat** service for scheduled triggers
- Add `celery.py` config in `backend/config/`
- Add `django-celery-beat` for periodic task scheduling
