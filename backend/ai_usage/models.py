import uuid
from django.db import models
from django.conf import settings


class AIUsageLog(models.Model):
    class CallType(models.TextChoices):
        CHAT = "chat", "Chat"
        CONTACT_SUMMARY = "contact_summary", "Contact Summary"
        TITLE_GENERATION = "title_generation", "Title Generation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    call_type = models.CharField(max_length=30, choices=CallType.choices)
    model_name = models.CharField(max_length=100)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    conversation = models.ForeignKey(
        "chat.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_usage_logs",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["call_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.call_type} - {self.input_tokens}in/{self.output_tokens}out - {self.organization}"
