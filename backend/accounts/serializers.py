from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    organization_name = serializers.CharField(max_length=255, required=False, default="")
    invite_token = serializers.CharField(max_length=255, required=False, default="")

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "email_notifications", "preferred_language", "date_joined", "is_superuser",
            "email_notify_task_reminder", "email_notify_task_assigned",
            "email_notify_task_due", "email_notify_daily_digest",
            "email_notify_deal_update", "email_notify_mention",
            "email_notify_new_comment", "email_notify_reaction",
            "email_notify_import_complete", "email_notify_invitation",
            "email_notify_workflow",
        ]
        read_only_fields = fields
