from rest_framework import serializers
from .models import (
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    WorkflowExecution,
    WorkflowExecutionStep,
)


class WorkflowNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowNode
        fields = [
            "id",
            "node_type",
            "node_subtype",
            "config",
            "position_x",
            "position_y",
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
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "nodes",
            "edges",
            "execution_count",
            "last_execution_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class WorkflowListSerializer(serializers.ModelSerializer):
    execution_count = serializers.IntegerField(read_only=True, default=0)
    last_execution_at = serializers.DateTimeField(read_only=True, default=None)
    trigger_type = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "execution_count",
            "last_execution_at",
            "trigger_type",
        ]

    def get_trigger_type(self, obj):
        trigger = obj.nodes.filter(node_type=WorkflowNode.NodeType.TRIGGER).first()
        return trigger.node_subtype if trigger else None


class WorkflowSaveSerializer(serializers.Serializer):
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
            "id",
            "node_type",
            "node_subtype",
            "status",
            "input_data",
            "output_data",
            "error",
            "started_at",
            "completed_at",
        ]


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    steps = WorkflowExecutionStepSerializer(many=True, read_only=True)
    workflow_name = serializers.CharField(source="workflow.name", read_only=True)

    class Meta:
        model = WorkflowExecution
        fields = [
            "id",
            "workflow_name",
            "trigger_event",
            "trigger_data",
            "status",
            "started_at",
            "completed_at",
            "error",
            "steps",
        ]
