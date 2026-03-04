from rest_framework import serializers
from .models import PipelineStage, Deal


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color"]
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

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "amount",
            "stage",
            "stage_name",
            "contact",
            "probability",
            "expected_close",
            "created_at",
        ]
