import uuid
from django.conf import settings
from django.db import models


class CalendarAccount(models.Model):
    class Provider(models.TextChoices):
        GOOGLE = "google", "Google"
        OUTLOOK = "outlook", "Outlook"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="calendar_accounts"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="calendar_accounts"
    )
    email_account = models.ForeignKey(
        "emails.EmailAccount", on_delete=models.SET_NULL, null=True, blank=True, related_name="calendar_account"
    )
    provider = models.CharField(max_length=10, choices=Provider.choices)
    calendar_id = models.CharField(max_length=255, default="primary")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "organization", "provider")

    def __str__(self):
        return f"{self.provider} calendar for {self.user.email}"


class Meeting(models.Model):
    class SyncStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SYNCED = "synced", "Synced"
        FAILED = "failed", "Failed"
        NOT_SYNCED = "not_synced", "Not Synced"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, related_name="meetings"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=500, blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.SET_NULL, null=True, blank=True, related_name="meetings"
    )
    contacts = models.ManyToManyField(
        "contacts.Contact", blank=True, related_name="meeting_invitations"
    )
    deal = models.ForeignKey(
        "deals.Deal", on_delete=models.SET_NULL, null=True, blank=True, related_name="meetings"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meetings"
    )
    provider_event_id = models.CharField(max_length=255, blank=True)
    calendar_account = models.ForeignKey(
        CalendarAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name="meetings"
    )
    sync_status = models.CharField(
        max_length=15, choices=SyncStatus.choices, default=SyncStatus.NOT_SYNCED
    )
    attendees = models.JSONField(default=list, blank=True)
    reminder_minutes = models.PositiveIntegerField(default=15)
    timeline_entry = models.OneToOneField(
        "notes.TimelineEntry", on_delete=models.SET_NULL, null=True, blank=True, related_name="meeting"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at"]

    def __str__(self):
        return self.title
