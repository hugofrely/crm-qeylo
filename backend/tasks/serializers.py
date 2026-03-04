from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "description",
            "due_date",
            "contact",
            "deal",
            "priority",
            "is_done",
            "is_recurring",
            "recurrence_rule",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
