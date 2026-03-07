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
        from subscriptions.permissions import require_feature
        require_feature(request.organization, "workflows")
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
            "description": "Quand un deal passe en Négociation \u2192 créer une tâche de suivi dans 3 jours",
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
            "description": "Contact créé \u2192 envoyer un email de bienvenue",
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
            "description": "Deal gagné \u2192 note + notification équipe",
            "trigger_type": "deal.won",
            "nodes": [
                {"id": "t1", "node_type": "trigger", "node_subtype": "deal.won", "config": {}, "position_x": 250, "position_y": 50},
                {"id": "a1", "node_type": "action", "node_subtype": "create_note", "config": {"content": "Deal {{deal.name}} gagné pour {{deal.amount}}\u20ac !"}, "position_x": 100, "position_y": 200},
                {"id": "a2", "node_type": "action", "node_subtype": "send_notification", "config": {"title": "Deal gagné !", "message": "{{deal.name}} \u2014 {{deal.amount}}\u20ac"}, "position_x": 400, "position_y": 200},
            ],
            "edges": [
                {"source_node": "t1", "target_node": "a1"},
                {"source_node": "t1", "target_node": "a2"},
            ],
        },
        {
            "id": "overdue_task_reminder",
            "name": "Tâche en retard",
            "description": "Tâche en retard \u2192 notification + relance",
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
            "description": "Deal créé \u2192 attendre 7 jours \u2192 si toujours au même stage \u2192 notification",
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
