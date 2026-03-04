import uuid
from django.db import models
from django.conf import settings

DEFAULT_STAGES = [
    {"name": "Premier contact", "color": "#6366F1", "order": 1},
    {"name": "En discussion", "color": "#F59E0B", "order": 2},
    {"name": "Devis envoyé", "color": "#3B82F6", "order": 3},
    {"name": "Négociation", "color": "#8B5CF6", "order": 4},
    {"name": "Gagné", "color": "#10B981", "order": 5},
    {"name": "Perdu", "color": "#EF4444", "order": 6},
]


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="pipeline_stages",
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    color = models.CharField(max_length=7, default="#6366F1")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        for stage_data in DEFAULT_STAGES:
            cls.objects.create(organization=organization, **stage_data)


class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deals",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.ForeignKey(
        PipelineStage, on_delete=models.PROTECT, related_name="deals"
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
    )
    probability = models.IntegerField(null=True, blank=True)
    expected_close = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
