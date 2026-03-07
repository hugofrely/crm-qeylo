import uuid
from django.db import models
from django.conf import settings
from core.models import SoftDeleteModel


class Company(SoftDeleteModel):
    class HealthScore(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        GOOD = "good", "Bon"
        AT_RISK = "at_risk", "A risque"
        CHURNED = "churned", "Perdu"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="companies",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    # Identity
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    industry = models.CharField(max_length=100, blank=True, default="")

    # Hierarchy (unlimited depth)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="subsidiaries",
    )

    # Financial
    annual_revenue = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    employee_count = models.IntegerField(null=True, blank=True)
    siret = models.CharField(max_length=17, blank=True, default="")
    vat_number = models.CharField(max_length=20, blank=True, default="")
    legal_status = models.CharField(max_length=100, blank=True, default="")

    # Relational
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="owned_companies",
    )
    source = models.CharField(max_length=100, blank=True, default="")
    health_score = models.CharField(
        max_length=20, choices=HealthScore.choices, default=HealthScore.GOOD,
    )

    # Contact info
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    website = models.URLField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=100, blank=True, default="")
    zip_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")

    # Meta
    description = models.TextField(blank=True, default="")
    custom_fields = models.JSONField(default=dict, blank=True)
    ai_summary = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name

    def soft_delete(self, user=None, source="direct"):
        super().soft_delete(user=user, source=source)
        from contacts.models import Contact
        Contact.objects.filter(company_entity=self).update(company_entity=None)
        from deals.models import Deal
        Deal.objects.filter(company=self).update(company=None)
        Company.objects.filter(parent=self).update(parent=None)
