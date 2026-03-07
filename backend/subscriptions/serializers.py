from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            "plan",
            "status",
            "current_period_end",
            "cancel_at_period_end",
            "created_at",
        ]
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=["pro", "team"])
