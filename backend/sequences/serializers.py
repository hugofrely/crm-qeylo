from rest_framework import serializers
from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail


class SequenceStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = SequenceStep
        fields = [
            "id", "order", "delay_days", "delay_hours",
            "subject", "body_html", "body_text", "step_type",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SequenceSerializer(serializers.ModelSerializer):
    steps = SequenceStepSerializer(many=True, read_only=True)
    stats = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Sequence
        fields = [
            "id", "name", "description", "status",
            "email_account", "created_by", "created_by_name",
            "steps", "stats",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "steps", "stats", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()

    def get_stats(self, obj):
        enrollments = obj.enrollments.all()
        total = enrollments.count()
        active = enrollments.filter(status="active").count()
        completed = enrollments.filter(status="completed").count()
        replied = enrollments.filter(status="replied").count()
        return {
            "total_enrolled": total,
            "active": active,
            "completed": completed,
            "replied": replied,
            "reply_rate": round(replied / total * 100, 1) if total > 0 else 0,
        }


class SequenceEnrollmentSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()
    contact_email = serializers.SerializerMethodField()

    class Meta:
        model = SequenceEnrollment
        fields = [
            "id", "sequence", "contact", "contact_name", "contact_email",
            "current_step", "status",
            "enrolled_at", "completed_at", "enrolled_by",
        ]
        read_only_fields = ["id", "enrolled_at", "completed_at", "enrolled_by", "current_step"]

    def get_contact_name(self, obj):
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()

    def get_contact_email(self, obj):
        return obj.contact.email


class EnrollContactsSerializer(serializers.Serializer):
    contact_ids = serializers.ListField(child=serializers.UUIDField(), min_length=1)
