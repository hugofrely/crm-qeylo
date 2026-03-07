import uuid
from django.db import models


class Subscription(models.Model):
    class Plan(models.TextChoices):
        SOLO = "solo", "Solo"
        PRO = "pro", "Pro"
        TEAM = "team", "Equipe"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELED = "canceled", "Canceled"
        UNPAID = "unpaid", "Unpaid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default="")
    plan = models.CharField(
        max_length=10, choices=Plan.choices, default=Plan.SOLO
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name} - {self.plan} ({self.status})"
