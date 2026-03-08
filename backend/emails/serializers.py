from rest_framework import serializers
from .models import EmailAccount, EmailTemplate, Email, EmailThread, EmailSyncState


class EmailAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAccount
        fields = ["id", "provider", "email_address", "is_active", "created_at"]
        read_only_fields = fields


class SendEmailSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    to_email = serializers.EmailField(required=False, allow_blank=True)
    subject = serializers.CharField(max_length=500)
    body_html = serializers.CharField()
    template_id = serializers.UUIDField(required=False, allow_null=True)
    provider = serializers.ChoiceField(
        choices=[("gmail", "Gmail"), ("outlook", "Outlook")],
        required=False,
        allow_blank=True,
    )

    def validate(self, data):
        if not data.get("contact_id") and not data.get("to_email"):
            raise serializers.ValidationError(
                "Fournissez contact_id ou to_email."
            )
        return data


class EmailTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = [
            "id", "name", "subject", "body_html", "tags",
            "is_shared", "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()


class EmailTemplateRenderSerializer(serializers.Serializer):
    contact_id = serializers.UUIDField(required=False, allow_null=True)
    deal_id = serializers.UUIDField(required=False, allow_null=True)


class EmailSerializer(serializers.ModelSerializer):
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Email
        fields = [
            "id", "email_account", "thread", "provider_message_id",
            "direction", "from_address", "from_name",
            "to_addresses", "cc_addresses", "bcc_addresses",
            "subject", "body_html", "body_text", "snippet",
            "is_read", "is_starred", "labels",
            "has_attachments", "attachments_metadata",
            "contact", "contact_name", "deal",
            "sent_at", "created_at",
        ]
        read_only_fields = fields

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None


class EmailThreadSerializer(serializers.ModelSerializer):
    last_email = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = EmailThread
        fields = [
            "id", "provider_thread_id", "subject",
            "last_message_at", "message_count",
            "participants", "last_email", "unread_count",
        ]
        read_only_fields = fields

    def get_last_email(self, obj):
        last = obj.emails.first()
        if last:
            return {
                "id": str(last.id),
                "snippet": last.snippet,
                "from_name": last.from_name or last.from_address,
                "direction": last.direction,
                "sent_at": last.sent_at.isoformat(),
                "is_read": last.is_read,
            }
        return None

    def get_unread_count(self, obj):
        return obj.emails.filter(is_read=False).count()


class EmailSyncStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSyncState
        fields = ["sync_status", "last_sync_at", "error_message"]
        read_only_fields = fields
