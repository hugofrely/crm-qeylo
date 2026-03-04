from rest_framework import serializers
from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "company",
            "source",
            "tags",
            "notes",
            # Profile
            "job_title",
            "linkedin_url",
            "website",
            "address",
            "industry",
            # Qualification
            "lead_score",
            "estimated_budget",
            "identified_needs",
            "decision_role",
            # Preferences
            "preferred_channel",
            "timezone",
            "language",
            "interests",
            "birthday",
            # AI Summary
            "ai_summary",
            "ai_summary_updated_at",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "ai_summary_updated_at", "created_at", "updated_at"]
