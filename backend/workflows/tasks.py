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
