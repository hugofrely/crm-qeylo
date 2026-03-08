import uuid
from django.conf import settings
from django.db import models


class EmailAccount(models.Model):
    class Provider(models.TextChoices):
        GMAIL = "gmail", "Gmail"
        OUTLOOK = "outlook", "Outlook"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_accounts",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_accounts",
    )
    provider = models.CharField(max_length=10, choices=Provider.choices)
    email_address = models.EmailField()
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "organization", "provider")

    def __str__(self):
        return f"{self.email_address} ({self.get_provider_display()})"


class SentEmail(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="sent_emails",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_emails",
    )
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_emails",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_emails",
    )
    template = models.ForeignKey(
        "EmailTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_emails",
    )
    to_email = models.EmailField()
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    provider_message_id = models.CharField(max_length=255, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]

    def __str__(self):
        return f"To: {self.to_email} — {self.subject[:50]}"


class EmailTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_templates",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_templates",
    )
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=500)
    body_html = models.TextField()
    tags = models.JSONField(default=list, blank=True)
    is_shared = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class EmailThread(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="email_threads",
    )
    provider_thread_id = models.CharField(max_length=255, db_index=True)
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="threads",
    )
    subject = models.CharField(max_length=500, blank=True)
    last_message_at = models.DateTimeField(null=True)
    message_count = models.PositiveIntegerField(default=0)
    contacts = models.ManyToManyField(
        "contacts.Contact",
        blank=True,
        related_name="email_threads",
    )
    participants = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at"]
        unique_together = ("email_account", "provider_thread_id")

    def __str__(self):
        return f"Thread: {self.subject[:50]}"


class Email(models.Model):
    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="emails",
    )
    email_account = models.ForeignKey(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="emails",
    )
    thread = models.ForeignKey(
        "EmailThread",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="emails",
    )
    provider_message_id = models.CharField(max_length=255, db_index=True)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    from_address = models.EmailField()
    from_name = models.CharField(max_length=255, blank=True)
    to_addresses = models.JSONField(default=list)
    cc_addresses = models.JSONField(default=list, blank=True)
    bcc_addresses = models.JSONField(default=list, blank=True)
    subject = models.CharField(max_length=500, blank=True)
    body_html = models.TextField(blank=True)
    body_text = models.TextField(blank=True)
    snippet = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    labels = models.JSONField(default=list, blank=True)
    has_attachments = models.BooleanField(default=False)
    attachments_metadata = models.JSONField(default=list, blank=True)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails",
    )
    sent_at = models.DateTimeField()
    synced_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-sent_at"]
        unique_together = ("email_account", "provider_message_id")
        indexes = [
            models.Index(fields=["organization", "-sent_at"]),
            models.Index(fields=["contact", "-sent_at"]),
        ]

    def __str__(self):
        return f"{self.direction}: {self.subject[:50]}"


class EmailSyncState(models.Model):
    class SyncStatus(models.TextChoices):
        IDLE = "idle", "Idle"
        SYNCING = "syncing", "Syncing"
        ERROR = "error", "Error"

    email_account = models.OneToOneField(
        EmailAccount,
        on_delete=models.CASCADE,
        related_name="sync_state",
    )
    last_history_id = models.CharField(max_length=255, blank=True)
    last_delta_token = models.CharField(max_length=1000, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    sync_status = models.CharField(
        max_length=10,
        choices=SyncStatus.choices,
        default=SyncStatus.IDLE,
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sync: {self.email_account.email_address} ({self.sync_status})"
