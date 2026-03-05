from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    deal_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "description",
            "due_date",
            "contact",
            "contact_name",
            "deal",
            "deal_name",
            "priority",
            "is_done",
            "is_recurring",
            "recurrence_rule",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

    def get_deal_name(self, obj):
        if obj.deal:
            return obj.deal.name
        return None
