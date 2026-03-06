from rest_framework import serializers
from organizations.models import Membership
from .models import Task, TaskAssignment


class TaskAssigneeSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id")
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")

    class Meta:
        model = TaskAssignment
        fields = ["user_id", "email", "first_name", "last_name", "assigned_at"]
        read_only_fields = fields


class TaskSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    deal_name = serializers.SerializerMethodField()
    assignees = TaskAssigneeSerializer(source="assignments", many=True, read_only=True)
    assigned_to = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False, default=list
    )

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
            "assignees",
            "assigned_to",
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

    def validate_assigned_to(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if not request:
            return value
        org = request.organization
        valid_user_ids = set(
            Membership.objects.filter(organization=org, user_id__in=value)
            .values_list("user_id", flat=True)
        )
        invalid = [str(uid) for uid in value if uid not in valid_user_ids]
        if invalid:
            raise serializers.ValidationError(
                f"Users not members of this organization: {', '.join(invalid)}"
            )
        return value

    def _sync_assignments(self, task, assigned_to_ids, assigned_by):
        from notifications.helpers import create_notification
        from django.contrib.auth import get_user_model
        User = get_user_model()

        current_ids = set(task.assignments.values_list("user_id", flat=True))
        new_ids = set(assigned_to_ids)

        # Remove unassigned
        task.assignments.filter(user_id__in=current_ids - new_ids).delete()

        # Add new assignments + notifications
        ids_to_add = new_ids - current_ids
        if ids_to_add:
            users_map = {u.id: u for u in User.objects.filter(id__in=ids_to_add)}
            assigner_name = f"{assigned_by.first_name} {assigned_by.last_name}".strip()
            for user_id in ids_to_add:
                TaskAssignment.objects.create(
                    task=task, user_id=user_id, assigned_by=assigned_by
                )
                if user_id != assigned_by.id and user_id in users_map:
                    create_notification(
                        organization=task.organization,
                        recipient=users_map[user_id],
                        type="task_assigned",
                        title="Nouvelle tâche assignée",
                        message=f"{assigner_name} vous a assigné : {task.description}",
                        link="/tasks",
                    )

    def create(self, validated_data):
        assigned_to = validated_data.pop("assigned_to", [])
        task = super().create(validated_data)
        if assigned_to:
            request = self.context.get("request")
            self._sync_assignments(task, assigned_to, request.user)
        return task

    def update(self, instance, validated_data):
        assigned_to = validated_data.pop("assigned_to", None)

        # Clear reminders if due_date is changing
        new_due_date = validated_data.get("due_date")
        if new_due_date and new_due_date != instance.due_date:
            instance.reminders.all().delete()

        task = super().update(instance, validated_data)
        if assigned_to is not None:
            request = self.context.get("request")
            self._sync_assignments(task, assigned_to, request.user)
        return task
