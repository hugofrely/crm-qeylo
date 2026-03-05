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

PIPELINE_TEMPLATES = {
    "prospection": [
        {"name": "Premier contact", "color": "#6366F1", "order": 1},
        {"name": "Qualification", "color": "#F59E0B", "order": 2},
        {"name": "Proposition", "color": "#3B82F6", "order": 3},
        {"name": "Négociation", "color": "#8B5CF6", "order": 4},
        {"name": "Gagné", "color": "#10B981", "order": 5},
        {"name": "Perdu", "color": "#EF4444", "order": 6},
    ],
    "upsell": [
        {"name": "Identification", "color": "#6366F1", "order": 1},
        {"name": "Proposition", "color": "#F59E0B", "order": 2},
        {"name": "Décision", "color": "#3B82F6", "order": 3},
        {"name": "Gagné", "color": "#10B981", "order": 4},
        {"name": "Perdu", "color": "#EF4444", "order": 5},
    ],
    "partenariats": [
        {"name": "Prise de contact", "color": "#6366F1", "order": 1},
        {"name": "Évaluation", "color": "#F59E0B", "order": 2},
        {"name": "Négociation", "color": "#3B82F6", "order": 3},
        {"name": "Signé", "color": "#10B981", "order": 4},
        {"name": "Abandonné", "color": "#EF4444", "order": 5},
    ],
}


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="pipelines",
    )
    name = models.CharField(max_length=150)
    order = models.IntegerField(default=0)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.name

    @classmethod
    def create_defaults(cls, organization):
        pipeline = cls.objects.create(
            organization=organization,
            name="Principal",
            is_default=True,
            order=0,
        )
        for stage_data in DEFAULT_STAGES:
            PipelineStage.objects.create(pipeline=pipeline, **stage_data)
        return pipeline

    @classmethod
    def create_from_template(cls, organization, name, template_key):
        max_order = (
            cls.objects.filter(organization=organization)
            .aggregate(m=models.Max("order"))["m"]
            or -1
        )
        pipeline = cls.objects.create(
            organization=organization,
            name=name,
            order=max_order + 1,
        )
        stages = PIPELINE_TEMPLATES.get(template_key, [])
        for stage_data in stages:
            PipelineStage.objects.create(pipeline=pipeline, **stage_data)
        return pipeline


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(
        Pipeline,
        on_delete=models.CASCADE,
        related_name="stages",
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
        Pipeline.create_defaults(organization)


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
