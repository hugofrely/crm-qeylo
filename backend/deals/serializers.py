from rest_framework import serializers
from .models import Pipeline, PipelineStage, Deal


class PipelineSerializer(serializers.ModelSerializer):
    stage_count = serializers.IntegerField(read_only=True)
    deal_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Pipeline
        fields = ["id", "name", "order", "is_default", "stage_count", "deal_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStage
        fields = ["id", "name", "order", "color", "pipeline", "is_won", "is_lost"]
        read_only_fields = ["id"]


class DealSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name", read_only=True, default=None
    )

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "amount",
            "stage",
            "contact",
            "company",
            "company_name",
            "probability",
            "expected_close",
            "notes",
            "created_at",
            "updated_at",
            "closed_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PipelineDealSerializer(serializers.ModelSerializer):
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "amount",
            "stage",
            "stage_name",
            "contact",
            "contact_name",
            "probability",
            "expected_close",
            "notes",
            "created_at",
        ]

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None


from .models import Quote, QuoteLine


class QuoteLineSerializer(serializers.ModelSerializer):
    line_subtotal = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_discount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_ht = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_ttc = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)

    class Meta:
        model = QuoteLine
        fields = [
            "id", "product", "product_name", "description", "quantity",
            "unit_price", "unit", "tax_rate", "discount_percent",
            "discount_amount", "order", "line_subtotal", "line_discount",
            "line_ht", "line_tax", "line_ttc",
        ]
        read_only_fields = ["id"]


class QuoteSerializer(serializers.ModelSerializer):
    lines = QuoteLineSerializer(many=True, required=False)
    subtotal_ht = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_discount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_ht = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_ttc = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Quote
        fields = [
            "id", "deal", "number", "status", "global_discount_percent",
            "global_discount_amount", "notes", "valid_until",
            "lines", "subtotal_ht", "total_discount", "total_ht",
            "total_tax", "total_ttc", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "number", "created_at", "updated_at"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        quote = Quote.objects.create(**validated_data)
        for i, line_data in enumerate(lines_data):
            line_data["order"] = line_data.get("order", i)
            QuoteLine.objects.create(quote=quote, **line_data)
        return quote

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            for i, line_data in enumerate(lines_data):
                line_data["order"] = line_data.get("order", i)
                QuoteLine.objects.create(quote=instance, **line_data)
        return instance


class QuoteListSerializer(serializers.ModelSerializer):
    total_ttc = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quote
        fields = ["id", "deal", "number", "status", "total_ttc", "line_count", "valid_until", "created_at"]
