import uuid
from django.db import models
from django.conf import settings
from core.models import SoftDeleteModel


class Contact(SoftDeleteModel):
    class LeadScore(models.TextChoices):
        HOT = "hot", "Chaud"
        WARM = "warm", "Tiede"
        COLD = "cold", "Froid"

    class DecisionRole(models.TextChoices):
        DECISION_MAKER = "decision_maker", "Decideur"
        INFLUENCER = "influencer", "Influenceur"
        USER = "user", "Utilisateur"
        OTHER = "other", "Autre"

    class PreferredChannel(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Telephone"
        LINKEDIN = "linkedin", "LinkedIn"
        OTHER = "other", "Autre"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    # Basic info (existing)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    company = models.CharField(max_length=255, blank=True, default="")
    source = models.CharField(max_length=100, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")

    # Profile
    job_title = models.CharField(max_length=150, blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    industry = models.CharField(max_length=150, blank=True, default="")

    # Qualification
    lead_score = models.CharField(
        max_length=10, choices=LeadScore.choices, blank=True, default=""
    )
    estimated_budget = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    identified_needs = models.TextField(blank=True, default="")
    decision_role = models.CharField(
        max_length=20, choices=DecisionRole.choices, blank=True, default=""
    )

    # Preferences
    preferred_channel = models.CharField(
        max_length=10, choices=PreferredChannel.choices, blank=True, default=""
    )
    timezone = models.CharField(max_length=50, blank=True, default="")
    language = models.CharField(max_length=10, blank=True, default="")
    interests = models.JSONField(default=list, blank=True)
    birthday = models.DateField(null=True, blank=True)

    # Categories & custom fields
    categories = models.ManyToManyField(
        "contacts.ContactCategory",
        blank=True,
        related_name="contacts",
    )
    custom_fields = models.JSONField(default=dict, blank=True)

    # Address fields
    city = models.CharField(max_length=100, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")

    # Additional contact fields
    secondary_email = models.EmailField(blank=True, default="")
    secondary_phone = models.CharField(max_length=20, blank=True, default="")
    mobile_phone = models.CharField(max_length=20, blank=True, default="")
    twitter_url = models.URLField(blank=True, default="")
    siret = models.CharField(max_length=14, blank=True, default="")

    # AI Summary
    ai_summary = models.TextField(blank=True, default="")
    ai_summary_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def soft_delete(self, user=None, source="direct"):
        super().soft_delete(user=user, source=source)
        cascade_source = f"cascade_contact:{self.id}"
        # Cascade to deals
        from deals.models import Deal
        for deal in Deal.objects.filter(contact=self):
            deal.soft_delete(user=user, source=cascade_source)
        # Cascade to tasks linked directly to this contact (not via deal)
        from tasks.models import Task
        Task.objects.filter(contact=self).update(
            deleted_at=self.deleted_at,
            deleted_by=user,
            deletion_source=cascade_source,
        )

    def restore(self):
        cascade_source = f"cascade_contact:{self.id}"
        # Restore cascaded deals
        from deals.models import Deal
        Deal.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        # Restore cascaded tasks (from contact AND from deals)
        from tasks.models import Task
        Task.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        super().restore()


class ContactCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contact_categories",
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default="#3b82f6")
    icon = models.CharField(max_length=50, blank=True, default="")
    order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class CustomFieldDefinition(models.Model):
    class FieldType(models.TextChoices):
        TEXT = "text", "Texte"
        LONG_TEXT = "long_text", "Texte long"
        NUMBER = "number", "Nombre"
        DATE = "date", "Date"
        SELECT = "select", "Sélection"
        EMAIL = "email", "Email"
        PHONE = "phone", "Téléphone"
        URL = "url", "URL"
        CHECKBOX = "checkbox", "Case à cocher"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="custom_field_definitions",
    )
    label = models.CharField(max_length=150)
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
        default=FieldType.TEXT,
    )
    is_required = models.BooleanField(default=False)
    options = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=0)
    section = models.CharField(max_length=50, default="custom")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "label"]

    def __str__(self):
        return f"{self.label} ({self.field_type})"


class DuplicateDetectionSettings(models.Model):
    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="duplicate_detection_settings",
    )
    enabled = models.BooleanField(default=True)
    match_email = models.BooleanField(default=True)
    match_name = models.BooleanField(default=True)
    match_phone = models.BooleanField(default=False)
    match_siret = models.BooleanField(default=False)
    match_company = models.BooleanField(default=False)
    similarity_threshold = models.FloatField(default=0.6)

    def __str__(self):
        return f"DuplicateDetectionSettings({self.organization})"
