from rest_framework import serializers
from .models import TimelineEntry


class TimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineEntry
        fields = [
            "id",
            "contact",
            "deal",
            "entry_type",
            "subject",
            "content",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "entry_type", "subject", "created_at"]


class NoteCreateSerializer(serializers.Serializer):
    contact = serializers.UUIDField(required=False, allow_null=True)
    deal = serializers.UUIDField(required=False, allow_null=True)
    content = serializers.CharField()


class ActivityCreateSerializer(serializers.Serializer):
    ACTIVITY_TYPES = ["call", "email_sent", "email_received", "meeting", "custom"]

    entry_type = serializers.ChoiceField(choices=[(t, t) for t in ACTIVITY_TYPES])
    contact = serializers.UUIDField()
    deal = serializers.UUIDField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    metadata = serializers.JSONField(required=False, default=dict)

    def validate(self, data):
        entry_type = data["entry_type"]
        metadata = data.get("metadata", {})

        if entry_type == "call":
            if "direction" not in metadata:
                raise serializers.ValidationError({"metadata": "Le champ 'direction' est requis pour un appel."})
            if metadata["direction"] not in ("inbound", "outbound"):
                raise serializers.ValidationError({"metadata": "'direction' doit être 'inbound' ou 'outbound'."})
            if "outcome" not in metadata:
                raise serializers.ValidationError({"metadata": "Le champ 'outcome' est requis pour un appel."})
            if metadata["outcome"] not in ("answered", "voicemail", "no_answer", "busy"):
                raise serializers.ValidationError({"metadata": "'outcome' doit être 'answered', 'voicemail', 'no_answer' ou 'busy'."})

        elif entry_type in ("email_sent", "email_received"):
            if not metadata.get("subject"):
                raise serializers.ValidationError({"metadata": "Le champ 'subject' est requis pour un email."})

        elif entry_type == "meeting":
            if not metadata.get("title"):
                raise serializers.ValidationError({"metadata": "Le champ 'title' est requis pour une réunion."})
            if not metadata.get("scheduled_at"):
                raise serializers.ValidationError({"metadata": "Le champ 'scheduled_at' est requis pour une réunion."})

        elif entry_type == "custom":
            if not metadata.get("custom_type_label"):
                raise serializers.ValidationError({"metadata": "Le champ 'custom_type_label' est requis pour un type custom."})

        return data
