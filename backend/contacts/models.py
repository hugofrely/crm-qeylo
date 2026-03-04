import uuid
from django.db import models
from django.conf import settings


class Contact(models.Model):
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

    # AI Summary
    ai_summary = models.TextField(blank=True, default="")
    ai_summary_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
