import uuid
from django.db import models
from django.conf import settings
from core.models import SoftDeleteModel

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


class Deal(SoftDeleteModel):
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

    def soft_delete(self, user=None, source="direct"):
        super().soft_delete(user=user, source=source)
        cascade_source = source if source.startswith("cascade_contact:") else f"cascade_deal:{self.id}"
        from tasks.models import Task
        Task.objects.filter(deal=self).update(
            deleted_at=self.deleted_at,
            deleted_by=user,
            deletion_source=cascade_source,
        )

    def restore(self):
        cascade_source = f"cascade_deal:{self.id}"
        from tasks.models import Task
        Task.all_objects.filter(deletion_source=cascade_source).update(
            deleted_at=None, deleted_by=None, deletion_source=None
        )
        super().restore()


class DealStageTransition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="transitions")
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="deal_transitions",
    )
    from_stage = models.ForeignKey(
        PipelineStage, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    to_stage = models.ForeignKey(
        PipelineStage, on_delete=models.CASCADE, related_name="+"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    transitioned_at = models.DateTimeField(auto_now_add=True)
    duration_in_previous = models.DurationField(null=True, blank=True)

    class Meta:
        ordering = ["-transitioned_at"]
        indexes = [
            models.Index(fields=["organization", "to_stage", "transitioned_at"]),
            models.Index(fields=["deal", "transitioned_at"]),
        ]

    def __str__(self):
        from_name = self.from_stage.name if self.from_stage else "New"
        return f"{self.deal.name}: {from_name} -> {self.to_stage.name}"


QUOTE_STATUS_CHOICES = [
    ("draft", "Brouillon"),
    ("sent", "Envoyé"),
    ("accepted", "Accepté"),
    ("refused", "Refusé"),
]


class Quote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="quotes",
    )
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="quotes")
    number = models.CharField(max_length=50)
    status = models.CharField(max_length=10, choices=QUOTE_STATUS_CHOICES, default="draft")
    global_discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    global_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default="")
    valid_until = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} - {self.deal.name}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        super().save(*args, **kwargs)

    def _generate_number(self):
        from django.utils import timezone
        year = timezone.now().year
        count = Quote.objects.filter(
            organization=self.organization,
            number__startswith=f"DEV-{year}-",
        ).count()
        return f"DEV-{year}-{count + 1:03d}"

    @property
    def subtotal_ht(self):
        return sum(line.line_ht for line in self.lines.all())

    @property
    def total_discount(self):
        line_discounts = sum(line.line_discount for line in self.lines.all())
        subtotal = self.subtotal_ht
        global_disc = (
            subtotal * self.global_discount_percent / 100
            if self.global_discount_percent
            else self.global_discount_amount
        )
        return line_discounts + global_disc

    @property
    def total_ht(self):
        subtotal = self.subtotal_ht
        global_disc = (
            subtotal * self.global_discount_percent / 100
            if self.global_discount_percent
            else self.global_discount_amount
        )
        return subtotal - global_disc

    @property
    def total_tax(self):
        return sum(line.line_tax for line in self.lines.all())

    @property
    def total_ttc(self):
        return self.total_ht + self.total_tax


class QuoteLine(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True,
    )
    description = models.TextField(blank=True, default="")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(
        max_length=10,
        choices=[("unit", "Unité"), ("hour", "Heure"), ("day", "Jour"), ("fixed", "Forfait")],
        default="unit",
    )
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    @property
    def line_subtotal(self):
        return self.quantity * self.unit_price

    @property
    def line_discount(self):
        subtotal = self.line_subtotal
        if self.discount_percent:
            return subtotal * self.discount_percent / 100
        return self.discount_amount

    @property
    def line_ht(self):
        return self.line_subtotal - self.line_discount

    @property
    def line_tax(self):
        return self.line_ht * self.tax_rate / 100

    @property
    def line_ttc(self):
        return self.line_ht + self.line_tax
