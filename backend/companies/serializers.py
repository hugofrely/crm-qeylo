from rest_framework import serializers
from django.db.models import Sum

from .models import Company
from contacts.models import ContactRelationship


class CompanySerializer(serializers.ModelSerializer):
    contacts_count = serializers.SerializerMethodField()
    deals_count = serializers.SerializerMethodField()
    open_deals_value = serializers.SerializerMethodField()
    won_deals_value = serializers.SerializerMethodField()
    subsidiaries_count = serializers.SerializerMethodField()
    last_interaction = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id", "name", "domain", "logo_url", "industry",
            "parent", "parent_name",
            "annual_revenue", "employee_count", "siret", "vat_number", "legal_status",
            "owner", "owner_name", "source", "health_score",
            "phone", "email", "website", "address", "city", "state", "zip_code", "country",
            "description", "custom_fields", "ai_summary",
            "created_at", "updated_at",
            "contacts_count", "deals_count", "open_deals_value",
            "won_deals_value", "subsidiaries_count", "last_interaction",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contacts_count(self, obj):
        return obj.contacts.count()

    def get_deals_count(self, obj):
        return obj.deals.count()

    def get_open_deals_value(self, obj):
        result = obj.deals.exclude(
            stage__name__in=["Gagne", "Perdu", "Gagné"]
        ).aggregate(total=Sum("amount"))
        return str(result["total"] or 0)

    def get_won_deals_value(self, obj):
        result = obj.deals.filter(
            stage__name__in=["Gagne", "Gagné"]
        ).aggregate(total=Sum("amount"))
        return str(result["total"] or 0)

    def get_subsidiaries_count(self, obj):
        return obj.subsidiaries.count()

    def get_last_interaction(self, obj):
        from notes.models import TimelineEntry
        entry = TimelineEntry.objects.filter(
            contact__company_entity=obj
        ).order_by("-created_at").first()
        return entry.created_at.isoformat() if entry else None

    def get_owner_name(self, obj):
        if obj.owner:
            name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
            return name or obj.owner.email
        return None


class CompanyListSerializer(serializers.ModelSerializer):
    contacts_count = serializers.IntegerField(read_only=True, default=0)
    deals_count = serializers.IntegerField(read_only=True, default=0)
    open_deals_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True, default=0
    )
    won_deals_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True, default=0
    )
    owner_name = serializers.CharField(read_only=True, default=None)
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)

    class Meta:
        model = Company
        fields = [
            "id", "name", "domain", "industry", "health_score",
            "owner", "owner_name", "parent", "parent_name",
            "contacts_count", "deals_count", "open_deals_value", "won_deals_value",
            "created_at",
        ]


class ContactRelationshipSerializer(serializers.ModelSerializer):
    from_contact_name = serializers.SerializerMethodField()
    to_contact_name = serializers.SerializerMethodField()

    class Meta:
        model = ContactRelationship
        fields = [
            "id", "from_contact", "from_contact_name",
            "to_contact", "to_contact_name",
            "relationship_type", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_from_contact_name(self, obj):
        return f"{obj.from_contact.first_name} {obj.from_contact.last_name}".strip()

    def get_to_contact_name(self, obj):
        return f"{obj.to_contact.first_name} {obj.to_contact.last_name}".strip()
