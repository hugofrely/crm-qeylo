from rest_framework import serializers
from .models import Segment


class SegmentSerializer(serializers.ModelSerializer):
    contact_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Segment
        fields = [
            "id", "name", "description", "icon", "color",
            "rules", "is_pinned", "order",
            "contact_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
