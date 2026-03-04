from rest_framework import serializers
from .models import TimelineEntry


class TimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEntry
        fields = [
            "id",
            "contact",
            "deal",
            "entry_type",
            "content",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "entry_type", "created_at"]


class NoteCreateSerializer(serializers.Serializer):
    contact = serializers.UUIDField(required=False, allow_null=True)
    deal = serializers.UUIDField(required=False, allow_null=True)
    content = serializers.CharField()
