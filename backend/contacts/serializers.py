from rest_framework import serializers
from .models import Contact, ContactCategory, CustomFieldDefinition


class ContactCategorySerializer(serializers.ModelSerializer):
    contact_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = ContactCategory
        fields = ["id", "name", "color", "icon", "order", "is_default", "contact_count", "created_at"]
        read_only_fields = ["id", "is_default", "created_at"]


class CustomFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFieldDefinition
        fields = ["id", "label", "field_type", "is_required", "options", "order", "section", "created_at"]
        read_only_fields = ["id", "created_at"]


class ContactSerializer(serializers.ModelSerializer):
    categories = ContactCategorySerializer(many=True, read_only=True)
    category_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Contact
        fields = [
            # Existing fields
            "id", "first_name", "last_name", "email", "phone",
            "company", "source", "tags", "notes",
            # Profile
            "job_title", "linkedin_url", "website", "address", "industry",
            # Qualification
            "lead_score", "estimated_budget", "identified_needs", "decision_role",
            # Preferences
            "preferred_channel", "timezone", "language", "interests", "birthday",
            # AI Summary
            "ai_summary", "ai_summary_updated_at",
            # Timestamps
            "created_at", "updated_at",
            # Categories & custom fields
            "categories", "category_ids", "custom_fields",
            # Address fields
            "city", "postal_code", "country", "state",
            # Additional contact fields
            "secondary_email", "secondary_phone", "mobile_phone",
            "twitter_url", "siret",
        ]
        read_only_fields = ["id", "ai_summary_updated_at", "created_at", "updated_at"]

    def validate_custom_fields(self, value):
        if not value:
            return value
        request = self.context.get("request")
        if not request:
            return value
        definitions = {
            str(d.id): d
            for d in CustomFieldDefinition.objects.filter(
                organization=request.organization
            )
        }
        for field_id, field_value in value.items():
            if field_id not in definitions:
                raise serializers.ValidationError(
                    f"Champ personnalisé inconnu: {field_id}"
                )
            defn = definitions[field_id]
            if defn.field_type == "number" and field_value is not None:
                try:
                    float(field_value)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f"Le champ '{defn.label}' doit être un nombre."
                    )
            if defn.field_type == "select" and field_value:
                if field_value not in defn.options:
                    raise serializers.ValidationError(
                        f"Valeur invalide pour '{defn.label}'. Options: {defn.options}"
                    )
        return value

    def create(self, validated_data):
        category_ids = validated_data.pop("category_ids", [])
        instance = super().create(validated_data)
        if category_ids:
            instance.categories.set(category_ids)
        return instance

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        instance = super().update(instance, validated_data)
        if category_ids is not None:
            instance.categories.set(category_ids)
        return instance
