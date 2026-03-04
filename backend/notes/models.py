import uuid
from django.db import models
from django.conf import settings


class TimelineEntry(models.Model):
    class EntryType(models.TextChoices):
        CONTACT_CREATED = "contact_created"
        DEAL_CREATED = "deal_created"
        DEAL_MOVED = "deal_moved"
        NOTE_ADDED = "note_added"
        TASK_CREATED = "task_created"
        CHAT_ACTION = "chat_action"
        CONTACT_UPDATED = "contact_updated"
        CALL = "call"
        EMAIL_SENT = "email_sent"
        EMAIL_RECEIVED = "email_received"
        MEETING = "meeting"
        CUSTOM = "custom"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="timeline_entries",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="timeline_entries",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="timeline_entries",
    )
    entry_type = models.CharField(
        max_length=50, choices=EntryType.choices
    )
    content = models.TextField()
    subject = models.CharField(max_length=255, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entry_type}: {self.content[:50]}"
