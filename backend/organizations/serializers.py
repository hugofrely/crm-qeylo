from rest_framework import serializers
from .models import Organization, Membership, Invitation, OrganizationSettings


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "siret", "logo_url", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]


class MemberSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(source="user.id")
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    role = serializers.CharField()
    joined_at = serializers.DateTimeField()


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["id", "email", "role", "status", "created_at", "expires_at"]
        read_only_fields = ["id", "status", "created_at", "expires_at"]


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = ["task_reminder_offsets", "scoring_hot_threshold", "scoring_warm_threshold"]
