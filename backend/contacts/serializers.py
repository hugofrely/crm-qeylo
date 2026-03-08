from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

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
    company_entity_name = serializers.CharField(
        source="company_entity.name", read_only=True, default=None
    )
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            # Existing fields
            "id", "first_name", "last_name", "email", "phone",
            "company", "company_entity", "company_entity_name", "source", "tags", "notes",
            # Profile
            "job_title", "linkedin_url", "website", "address", "industry",
            # Qualification
            "lead_score", "numeric_score", "estimated_budget", "identified_needs", "decision_role",
            # Preferences
            "preferred_channel", "timezone", "language", "interests", "birthday",
            # AI Summary
            "ai_summary", "ai_summary_updated_at",
            # Owner
            "owner", "owner_name",
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
        read_only_fields = ["id", "lead_score", "numeric_score", "ai_summary_updated_at", "owner_name", "created_at", "updated_at"]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip()
        return None

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
                    _("Champ personnalisé inconnu: {field_id}").format(field_id=field_id)
                )
            defn = definitions[field_id]
            if defn.field_type == "number" and field_value is not None:
                try:
                    float(field_value)
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        _("Le champ '{label}' doit être un nombre.").format(label=defn.label)
                    )
            if defn.field_type == "select" and field_value:
                if field_value not in defn.options:
                    raise serializers.ValidationError(
                        _("Valeur invalide pour '{label}'. Options: {options}").format(label=defn.label, options=defn.options)
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


from .models import DuplicateDetectionSettings, ScoringRule, LeadRoutingRule, RoundRobinState


class ScoringRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoringRule
        fields = ["id", "event_type", "points", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class DuplicateDetectionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DuplicateDetectionSettings
        fields = [
            "enabled", "match_email", "match_name", "match_phone",
            "match_siret", "match_company", "similarity_threshold",
        ]


class LeadRoutingRuleSerializer(serializers.ModelSerializer):
    assign_to_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadRoutingRule
        fields = ["id", "name", "priority", "conditions", "assign_to", "assign_to_name", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_assign_to_name(self, obj):
        if obj.assign_to:
            return f"{obj.assign_to.first_name} {obj.assign_to.last_name}".strip()
        return None


class RoundRobinStateSerializer(serializers.ModelSerializer):
    eligible_user_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )

    class Meta:
        model = RoundRobinState
        fields = ["eligible_user_ids", "last_assigned_index"]
        read_only_fields = ["last_assigned_index"]

    def update(self, instance, validated_data):
        user_ids = validated_data.pop("eligible_user_ids", None)
        if user_ids is not None:
            instance.eligible_users.set(user_ids)
        return instance


class BulkActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["delete", "export", "categorize", "assign_company"]
    )
    ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=500,
    )
    params = serializers.DictField(required=False, default=dict)
