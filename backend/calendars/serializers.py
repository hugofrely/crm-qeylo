from rest_framework import serializers
from .models import CalendarAccount, Meeting


class CalendarAccountSerializer(serializers.ModelSerializer):
    email_address = serializers.SerializerMethodField()

    class Meta:
        model = CalendarAccount
        fields = ["id", "provider", "calendar_id", "is_active", "email_account", "email_address", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_email_address(self, obj):
        if obj.email_account:
            return obj.email_account.email_address
        return None


class MeetingSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "description", "location",
            "start_at", "end_at", "is_all_day",
            "contact", "contact_name", "deal",
            "created_by", "calendar_account", "sync_status",
            "attendees", "reminder_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "sync_status", "created_at", "updated_at"]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None


class MeetingCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    is_all_day = serializers.BooleanField(default=False)
    contact = serializers.UUIDField(required=False, allow_null=True)
    contact_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    deal = serializers.UUIDField(required=False, allow_null=True)
    calendar_account = serializers.UUIDField(required=False, allow_null=True)
    attendees = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    reminder_minutes = serializers.IntegerField(default=15, min_value=0)

    def validate(self, data):
        if data["end_at"] <= data["start_at"]:
            raise serializers.ValidationError("end_at doit être après start_at.")
        return data
