from rest_framework import serializers
from .models import Pipeline, PipelineStage, Deal


class PipelineSerializer(serializers.ModelSerializer):
    stage_count = serializers.IntegerField(read_only=True)
    deal_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Pipeline
        fields = ["id", "name", "order", "is_default", "stage_count", "deal_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color", "pipeline"]
        read_only_fields = ["id"]


class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "amount",
            "stage",
            "contact",
            "probability",
            "expected_close",
            "notes",
            "created_at",
            "updated_at",
            "closed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PipelineDealSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "amount",
            "stage",
            "stage_name",
            "contact",
            "contact_name",
            "probability",
            "expected_close",
            "notes",
            "created_at",
        ]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None
