from rest_framework import serializers
from .models import EmailAccount


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
