from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id", "name", "description", "is_template", "is_dashboard",
            "widgets", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_template", "is_dashboard", "created_at", "updated_at"]
