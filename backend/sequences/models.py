import uuid
from django.conf import settings
from django.db import models


class Sequence(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="sequences",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    email_account = models.ForeignKey(
        "emails.EmailAccount",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sequences",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sequences",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class SequenceStep(models.Model):
    class StepType(models.TextChoices):
        EMAIL = "email", "Email"
        MANUAL_TASK = "manual_task", "Manual Task"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name="steps")
    order = models.PositiveIntegerField()
    delay_days = models.PositiveIntegerField(default=1)
    delay_hours = models.PositiveIntegerField(default=0)
    subject = models.CharField(max_length=500, blank=True)
    body_html = models.TextField(blank=True)
    body_text = models.TextField(blank=True)
    step_type = models.CharField(max_length=15, choices=StepType.choices, default=StepType.EMAIL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("sequence", "order")

    def __str__(self):
        return f"Step {self.order}: {self.subject[:50]}"

    @property
    def delay_total_hours(self):
        return self.delay_days * 24 + self.delay_hours


class SequenceEnrollment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        REPLIED = "replied", "Replied"
        BOUNCED = "bounced", "Bounced"
        OPTED_OUT = "opted_out", "Opted Out"
        PAUSED = "paused", "Paused"
        UNENROLLED = "unenrolled", "Unenrolled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(Sequence, on_delete=models.CASCADE, related_name="enrollments")
    contact = models.ForeignKey(
        "contacts.Contact", on_delete=models.CASCADE, related_name="sequence_enrollments"
    )
    current_step = models.ForeignKey(SequenceStep, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    enrolled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sequence_enrollments"
    )

    class Meta:
        unique_together = ("sequence", "contact")
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.contact} in {self.sequence.name}"


class SequenceEmail(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        SENT = "sent", "Sent"
        OPENED = "opened", "Opened"
        CLICKED = "clicked", "Clicked"
        BOUNCED = "bounced", "Bounced"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(SequenceEnrollment, on_delete=models.CASCADE, related_name="emails")
    step = models.ForeignKey(SequenceStep, on_delete=models.CASCADE, related_name="sent_emails")
    email = models.ForeignKey(
        "emails.Email", on_delete=models.SET_NULL, null=True, blank=True, related_name="sequence_emails"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_at"]

    def __str__(self):
        return f"Email for {self.enrollment.contact} - Step {self.step.order}"
