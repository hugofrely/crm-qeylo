# Products & Quotes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a product catalog, structured quote line items on deals, and PDF quote generation.

**Architecture:** New `products` Django app for the catalog (Product, ProductCategory). Quote/QuoteLine models in `deals` app. New `/deals/[id]` detail page with quote management. WeasyPrint for PDF generation. Frontend product catalog page at `/products`.

**Tech Stack:** Django 5.1.4, DRF 3.15.2, WeasyPrint (new dep), Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Lucide icons

---

## Task 1: Create `products` Django app with models

**Files:**
- Create: `backend/products/__init__.py`
- Create: `backend/products/apps.py`
- Create: `backend/products/models.py`
- Create: `backend/products/admin.py`
- Modify: `backend/config/settings.py` (add to INSTALLED_APPS)

**Step 1: Create the app directory and files**

```bash
cd /Users/hugofrely/dev/crm-qeylo/backend
mkdir -p products
touch products/__init__.py
```

**Step 2: Create `backend/products/apps.py`**

```python
from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "products"
```

**Step 3: Create `backend/products/models.py`**

```python
import uuid
from django.db import models


UNIT_CHOICES = [
    ("unit", "Unité"),
    ("hour", "Heure"),
    ("day", "Jour"),
    ("fixed", "Forfait"),
]


class ProductCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="product_categories",
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "product categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    reference = models.CharField(max_length=50, blank=True, default="")
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default="unit")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
```

**Step 4: Create `backend/products/admin.py`**

```python
from django.contrib import admin
from .models import Product, ProductCategory

admin.site.register(Product)
admin.site.register(ProductCategory)
```

**Step 5: Add to INSTALLED_APPS in `backend/config/settings.py`**

Add `"products",` after `"deals",` in the INSTALLED_APPS list (around line 37).

**Step 6: Generate and apply migration**

```bash
docker compose exec backend python manage.py makemigrations products
docker compose exec backend python manage.py migrate
```

**Step 7: Commit**

```bash
git add backend/products/ backend/config/settings.py
git commit -m "feat(products): add Product and ProductCategory models"
```

---

## Task 2: Products API (serializers, views, URLs)

**Files:**
- Create: `backend/products/serializers.py`
- Create: `backend/products/views.py`
- Create: `backend/products/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Create `backend/products/serializers.py`**

```python
from rest_framework import serializers
from .models import Product, ProductCategory


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "reference", "category", "category_name",
            "unit_price", "unit", "tax_rate", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

**Step 2: Create `backend/products/views.py`**

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Product, ProductCategory
from .serializers import ProductSerializer, ProductCategorySerializer


class ProductCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ProductCategory.objects.filter(
            organization=self.request.organization
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.filter(organization=self.request.organization)
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        active = self.request.query_params.get("active")
        if active is not None:
            qs = qs.filter(is_active=active.lower() == "true")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(reference__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)
```

**Step 3: Create `backend/products/urls.py`**

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.ProductViewSet, basename="product")

urlpatterns = [
    path("categories/", views.ProductCategoryViewSet.as_view({"get": "list", "post": "create"})),
    path("categories/<uuid:pk>/", views.ProductCategoryViewSet.as_view({"patch": "partial_update", "delete": "destroy"})),
    path("", include(router.urls)),
]
```

**Step 4: Register in `backend/config/urls.py`**

Add before the deals path:
```python
path("api/products/", include("products.urls")),
```

**Step 5: Commit**

```bash
git add backend/products/serializers.py backend/products/views.py backend/products/urls.py backend/config/urls.py
git commit -m "feat(products): add products API with CRUD endpoints"
```

---

## Task 3: Products API tests

**Files:**
- Create: `backend/products/tests.py`

**Step 1: Create `backend/products/tests.py`**

```python
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class ProductTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "test@example.com",
                "password": "securepass123",
                "first_name": "Test",
                "last_name": "User",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_category(self):
        response = self.client.post(
            "/api/products/categories/",
            {"name": "Services", "order": 1},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Services")

    def test_create_product(self):
        response = self.client.post(
            "/api/products/",
            {
                "name": "Développement web",
                "unit_price": "500.00",
                "unit": "day",
                "tax_rate": "20.00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Développement web")
        self.assertEqual(response.data["unit"], "day")

    def test_create_product_with_category(self):
        cat = self.client.post(
            "/api/products/categories/",
            {"name": "Dev"},
        ).data
        response = self.client.post(
            "/api/products/",
            {
                "name": "API REST",
                "unit_price": "600.00",
                "unit": "day",
                "category": cat["id"],
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["category"], cat["id"])
        self.assertEqual(response.data["category_name"], "Dev")

    def test_list_products_filter_active(self):
        self.client.post("/api/products/", {"name": "Active", "unit_price": "100"})
        p2 = self.client.post("/api/products/", {"name": "Archived", "unit_price": "200"}).data
        self.client.patch(f"/api/products/{p2['id']}/", {"is_active": False})

        active = self.client.get("/api/products/?active=true")
        self.assertEqual(len(active.data["results"]), 1)
        self.assertEqual(active.data["results"][0]["name"], "Active")

    def test_search_products(self):
        self.client.post("/api/products/", {"name": "Design UI", "unit_price": "100", "reference": "DES-001"})
        self.client.post("/api/products/", {"name": "Backend API", "unit_price": "200", "reference": "BKD-001"})

        response = self.client.get("/api/products/?search=design")
        self.assertEqual(len(response.data["results"]), 1)

        response = self.client.get("/api/products/?search=BKD")
        self.assertEqual(len(response.data["results"]), 1)

    def test_update_product(self):
        p = self.client.post("/api/products/", {"name": "Old", "unit_price": "100"}).data
        response = self.client.patch(f"/api/products/{p['id']}/", {"name": "New", "unit_price": "150"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "New")
        self.assertEqual(response.data["unit_price"], "150.00")

    def test_delete_product(self):
        p = self.client.post("/api/products/", {"name": "ToDelete", "unit_price": "100"}).data
        response = self.client.delete(f"/api/products/{p['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
```

**Step 2: Run tests**

```bash
docker compose exec backend python manage.py test products -v 2
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add backend/products/tests.py
git commit -m "test(products): add product API tests"
```

---

## Task 4: Quote and QuoteLine models

**Files:**
- Modify: `backend/deals/models.py`

**Step 1: Add Quote and QuoteLine models to `backend/deals/models.py`**

Add after the `Deal` class:

```python
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
    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="quotes",
    )
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
        "products.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
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
```

**Step 2: Generate and apply migration**

```bash
docker compose exec backend python manage.py makemigrations deals
docker compose exec backend python manage.py migrate
```

**Step 3: Commit**

```bash
git add backend/deals/models.py backend/deals/migrations/
git commit -m "feat(deals): add Quote and QuoteLine models"
```

---

## Task 5: Quote API (serializers, views, URLs)

**Files:**
- Modify: `backend/deals/serializers.py`
- Modify: `backend/deals/views.py`
- Create: `backend/deals/quote_urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Add quote serializers to `backend/deals/serializers.py`**

Add at the end of the file:

```python
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
        fields = [
            "id", "deal", "number", "status", "total_ttc",
            "line_count", "valid_until", "created_at",
        ]
```

**Step 2: Add quote views to `backend/deals/views.py`**

Add at the end of the file:

```python
from .models import Quote, QuoteLine
from .serializers import QuoteSerializer, QuoteListSerializer
from django.db.models import Count


class QuoteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return QuoteListSerializer
        return QuoteSerializer

    def get_queryset(self):
        qs = Quote.objects.filter(organization=self.request.organization)
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        if self.action == "list":
            qs = qs.annotate(line_count=Count("lines"))
        return qs

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quote_duplicate(request, pk):
    try:
        quote = Quote.objects.get(pk=pk, organization=request.organization)
    except Quote.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    lines = list(quote.lines.all().values(
        "product_id", "description", "quantity", "unit_price",
        "unit", "tax_rate", "discount_percent", "discount_amount", "order",
    ))
    new_quote = Quote.objects.create(
        organization=quote.organization,
        deal=quote.deal,
        status="draft",
        global_discount_percent=quote.global_discount_percent,
        global_discount_amount=quote.global_discount_amount,
        notes=quote.notes,
        valid_until=quote.valid_until,
    )
    for line_data in lines:
        QuoteLine.objects.create(quote=new_quote, **line_data)

    return Response(QuoteSerializer(new_quote).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quote_status_change(request, pk, new_status):
    if new_status not in ("sent", "accepted", "refused"):
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quote = Quote.objects.get(pk=pk, organization=request.organization)
    except Quote.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    quote.status = new_status
    quote.save(update_fields=["status", "updated_at"])

    if new_status == "accepted":
        quote.deal.amount = quote.total_ttc
        quote.deal.save(update_fields=["amount", "updated_at"])

    return Response(QuoteSerializer(quote).data)
```

**Step 3: Create `backend/deals/quote_urls.py`**

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.QuoteViewSet, basename="quote")

urlpatterns = [
    path("<uuid:pk>/duplicate/", views.quote_duplicate),
    path("<uuid:pk>/send/", views.quote_status_change, {"new_status": "sent"}),
    path("<uuid:pk>/accept/", views.quote_status_change, {"new_status": "accepted"}),
    path("<uuid:pk>/refuse/", views.quote_status_change, {"new_status": "refused"}),
    path("", include(router.urls)),
]
```

**Step 4: Register in `backend/config/urls.py`**

Add before the deals path:
```python
path("api/quotes/", include("deals.quote_urls")),
```

**Step 5: Commit**

```bash
git add backend/deals/serializers.py backend/deals/views.py backend/deals/quote_urls.py backend/config/urls.py
git commit -m "feat(deals): add Quote API with CRUD, duplicate, and status actions"
```

---

## Task 6: Quote API tests

**Files:**
- Modify: `backend/deals/tests.py`

**Step 1: Add quote tests to `backend/deals/tests.py`**

Add after the existing `DealTests` class:

```python
class QuoteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "quoteuser@example.com",
                "password": "securepass123",
                "first_name": "Quote",
                "last_name": "User",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")
        stages = self.client.get("/api/pipeline-stages/").data
        self.deal = self.client.post(
            "/api/deals/",
            {"name": "Test Deal", "amount": "0", "stage": stages[0]["id"]},
        ).data
        self.product = self.client.post(
            "/api/products/",
            {"name": "Dev Web", "unit_price": "500.00", "unit": "day", "tax_rate": "20.00"},
        ).data

    def test_create_quote_with_lines(self):
        response = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "notes": "Valable 30 jours",
                "lines": [
                    {
                        "product": self.product["id"],
                        "description": "Dev Web",
                        "quantity": "5",
                        "unit_price": "500.00",
                        "unit": "day",
                        "tax_rate": "20.00",
                    },
                    {
                        "description": "Frais de déplacement",
                        "quantity": "1",
                        "unit_price": "150.00",
                        "unit": "fixed",
                        "tax_rate": "20.00",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["lines"]), 2)
        self.assertTrue(response.data["number"].startswith("DEV-"))
        self.assertEqual(response.data["total_ht"], "2650.00")

    def test_create_quote_empty(self):
        response = self.client.post(
            "/api/quotes/",
            {"deal": self.deal["id"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_ttc"], "0.00")

    def test_update_quote_lines(self):
        quote = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "lines": [
                    {"description": "Line 1", "quantity": "1", "unit_price": "100.00"},
                ],
            },
            format="json",
        ).data
        response = self.client.patch(
            f"/api/quotes/{quote['id']}/",
            {
                "lines": [
                    {"description": "Line A", "quantity": "2", "unit_price": "200.00"},
                    {"description": "Line B", "quantity": "3", "unit_price": "300.00"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["lines"]), 2)

    def test_duplicate_quote(self):
        quote = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "lines": [
                    {"description": "Service", "quantity": "1", "unit_price": "1000.00"},
                ],
            },
            format="json",
        ).data
        response = self.client.post(f"/api/quotes/{quote['id']}/duplicate/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(response.data["id"], quote["id"])
        self.assertNotEqual(response.data["number"], quote["number"])
        self.assertEqual(response.data["status"], "draft")
        self.assertEqual(len(response.data["lines"]), 1)

    def test_accept_quote_updates_deal_amount(self):
        quote = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "lines": [
                    {"description": "Service", "quantity": "10", "unit_price": "100.00", "tax_rate": "20.00"},
                ],
            },
            format="json",
        ).data
        self.client.post(f"/api/quotes/{quote['id']}/accept/")
        deal = self.client.get(f"/api/deals/{self.deal['id']}/").data
        self.assertEqual(deal["amount"], "1200.00")

    def test_quote_with_line_discount(self):
        response = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "lines": [
                    {
                        "description": "Service",
                        "quantity": "10",
                        "unit_price": "100.00",
                        "tax_rate": "20.00",
                        "discount_percent": "10.00",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_ht"], "900.00")

    def test_quote_with_global_discount(self):
        response = self.client.post(
            "/api/quotes/",
            {
                "deal": self.deal["id"],
                "global_discount_percent": "5.00",
                "lines": [
                    {"description": "A", "quantity": "1", "unit_price": "1000.00", "tax_rate": "0"},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_ht"], "950.00")

    def test_list_quotes_for_deal(self):
        self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json")
        self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json")
        response = self.client.get(f"/api/quotes/?deal={self.deal['id']}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_delete_quote(self):
        quote = self.client.post("/api/quotes/", {"deal": self.deal["id"]}, format="json").data
        response = self.client.delete(f"/api/quotes/{quote['id']}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
```

**Step 2: Run tests**

```bash
docker compose exec backend python manage.py test deals -v 2
```

Expected: All tests pass (existing + new).

**Step 3: Commit**

```bash
git add backend/deals/tests.py
git commit -m "test(deals): add quote API tests"
```

---

## Task 7: Frontend types and services for Products & Quotes

**Files:**
- Create: `frontend/types/products.ts`
- Modify: `frontend/types/deals.ts`
- Create: `frontend/services/products.ts`
- Create: `frontend/services/quotes.ts`

**Step 1: Create `frontend/types/products.ts`**

```typescript
export interface ProductCategory {
  id: string
  name: string
  order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  reference: string
  category: string | null
  category_name: string | null
  unit_price: string
  unit: "unit" | "hour" | "day" | "fixed"
  tax_rate: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

**Step 2: Add quote types to `frontend/types/deals.ts`**

Add at the end:

```typescript
export interface QuoteLine {
  id?: string
  product?: string | null
  product_name?: string | null
  description: string
  quantity: string | number
  unit_price: string | number
  unit: "unit" | "hour" | "day" | "fixed"
  tax_rate: string | number
  discount_percent: string | number
  discount_amount: string | number
  order: number
  line_subtotal?: string
  line_discount?: string
  line_ht?: string
  line_tax?: string
  line_ttc?: string
}

export interface Quote {
  id: string
  deal: string
  number: string
  status: "draft" | "sent" | "accepted" | "refused"
  global_discount_percent: string | number
  global_discount_amount: string | number
  notes: string
  valid_until: string | null
  lines: QuoteLine[]
  subtotal_ht?: string
  total_discount?: string
  total_ht?: string
  total_tax?: string
  total_ttc?: string
  created_at: string
  updated_at: string
}

export interface QuoteListItem {
  id: string
  deal: string
  number: string
  status: "draft" | "sent" | "accepted" | "refused"
  total_ttc: string
  line_count: number
  valid_until: string | null
  created_at: string
}
```

**Step 3: Create `frontend/services/products.ts`**

```typescript
import { apiFetch } from "@/lib/api"
import type { Product, ProductCategory } from "@/types/products"

export async function fetchProducts(params?: Record<string, string>): Promise<{ results: Product[]; count: number }> {
  const query = params ? "?" + new URLSearchParams(params).toString() : ""
  return apiFetch(`/products/${query}`)
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return apiFetch("/products/", { method: "POST", json: data })
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return apiFetch(`/products/${id}/`, { method: "PATCH", json: data })
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}/`, { method: "DELETE" })
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return apiFetch("/products/categories/")
}

export async function createProductCategory(data: { name: string; order?: number }): Promise<ProductCategory> {
  return apiFetch("/products/categories/", { method: "POST", json: data })
}

export async function updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  return apiFetch(`/products/categories/${id}/`, { method: "PATCH", json: data })
}

export async function deleteProductCategory(id: string): Promise<void> {
  await apiFetch(`/products/categories/${id}/`, { method: "DELETE" })
}
```

**Step 4: Create `frontend/services/quotes.ts`**

```typescript
import { apiFetch } from "@/lib/api"
import type { Quote, QuoteListItem } from "@/types/deals"

export async function fetchQuotes(dealId: string): Promise<QuoteListItem[]> {
  return apiFetch(`/quotes/?deal=${dealId}`)
}

export async function fetchQuote(id: string): Promise<Quote> {
  return apiFetch(`/quotes/${id}/`)
}

export async function createQuote(data: { deal: string; lines?: unknown[]; notes?: string }): Promise<Quote> {
  return apiFetch("/quotes/", { method: "POST", json: data })
}

export async function updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
  return apiFetch(`/quotes/${id}/`, { method: "PATCH", json: data })
}

export async function deleteQuote(id: string): Promise<void> {
  await apiFetch(`/quotes/${id}/`, { method: "DELETE" })
}

export async function duplicateQuote(id: string): Promise<Quote> {
  return apiFetch(`/quotes/${id}/duplicate/`, { method: "POST" })
}

export async function sendQuote(id: string): Promise<Quote> {
  return apiFetch(`/quotes/${id}/send/`, { method: "POST" })
}

export async function acceptQuote(id: string): Promise<Quote> {
  return apiFetch(`/quotes/${id}/accept/`, { method: "POST" })
}

export async function refuseQuote(id: string): Promise<Quote> {
  return apiFetch(`/quotes/${id}/refuse/`, { method: "POST" })
}

export async function downloadQuotePdf(id: string): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quotes/${id}/pdf/`, {
    headers: {
      Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] || ""}`,
      "X-Organization": document.cookie.match(/organization_id=([^;]+)/)?.[1] || "",
    },
  })
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `devis-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
```

**Step 5: Verify TypeScript compiles**

```bash
cd /Users/hugofrely/dev/crm-qeylo/frontend && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add frontend/types/products.ts frontend/types/deals.ts frontend/services/products.ts frontend/services/quotes.ts
git commit -m "feat(frontend): add types and services for products and quotes"
```

---

## Task 8: Frontend Products page (`/products`)

**Files:**
- Create: `frontend/app/(app)/products/page.tsx`
- Modify: `frontend/components/Sidebar.tsx` (add Products nav item)

**Step 1: Add "Produits" to sidebar navigation in `frontend/components/Sidebar.tsx`**

In the `navigation` array (line 35-43), add after the Pipeline entry:

```typescript
{ name: "Produits", href: "/products", icon: Package },
```

Add `Package` to the lucide-react import.

**Step 2: Create `frontend/app/(app)/products/page.tsx`**

This page should have:
- Header with title "Produits" and "+ Nouveau produit" button
- Search input + category filter dropdown + active/archived toggle
- Table with columns: Référence, Nom, Catégorie, Prix unitaire, Unité, TVA, Statut
- Each row clickable to edit in a dialog
- Dialog for create/edit product with all fields: name, description, reference, category (select), unit_price, unit (select), tax_rate, is_active toggle
- Delete button in edit dialog
- Category management: small "Gérer" link next to category filter that opens a dialog to add/edit/delete categories

The component should:
- Use `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct` from `@/services/products`
- Use `fetchProductCategories`, `createProductCategory` from `@/services/products`
- Use shadcn Dialog, Input, Button, Label, Select, Card components
- Format prices as EUR with `Intl.NumberFormat`
- Show unit labels in French (Unité, Heure, Jour, Forfait)
- Pagination via DRF default pagination

**Step 3: Verify build**

```bash
cd /Users/hugofrely/dev/crm-qeylo/frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/products/page.tsx frontend/components/Sidebar.tsx
git commit -m "feat(frontend): add Products catalog page with CRUD"
```

---

## Task 9: Frontend Deal detail page (`/deals/[id]`)

**Files:**
- Create: `frontend/app/(app)/deals/[id]/page.tsx`
- Modify: `frontend/components/deals/DealCard.tsx` (make clickable to deal page)
- Modify: `frontend/components/deals/KanbanBoard.tsx` (navigate instead of dialog on click)

**Step 1: Create `frontend/app/(app)/deals/[id]/page.tsx`**

This page should have:
- Back button to `/deals`
- Two-column layout: left 2/3, right 1/3
- **Right sidebar**: Card with deal info (name editable inline, stage select, contact, probability, expected close, amount display). Save button for changes. Delete deal button.
- **Left content**: Two tabs using simple button tabs (like pipeline tabs) — "Devis" and "Notes"
- **Devis tab**:
  - List of quotes as cards with: number, status badge (colored: draft=gray, sent=blue, accepted=green, refused=red), date, total TTC
  - "+ Nouveau devis" button
  - Click on a quote card expands it inline showing the QuoteEditor
- **Notes tab**: Show the deal's notes field with RichTextEditor (reuse existing)

Use services: `fetchQuotes`, `createQuote` from `@/services/quotes`, deal services from `@/services/deals`

**Step 2: Modify `frontend/components/deals/DealCard.tsx`**

Make the card navigate to `/deals/${deal.id}` on click instead of calling `onDealClick`.

**Step 3: Modify `frontend/components/deals/KanbanBoard.tsx`**

Replace `handleDealClick` with `router.push(/deals/${deal.id})`. Remove the DealDialog from the board (keep it only for creation via the `dialogOpen` prop).

**Step 4: Verify build**

```bash
cd /Users/hugofrely/dev/crm-qeylo/frontend && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add frontend/app/\(app\)/deals/\[id\]/page.tsx frontend/components/deals/DealCard.tsx frontend/components/deals/KanbanBoard.tsx
git commit -m "feat(frontend): add deal detail page with quotes list"
```

---

## Task 10: Frontend QuoteEditor component

**Files:**
- Create: `frontend/components/deals/QuoteEditor.tsx`

**Step 1: Create `frontend/components/deals/QuoteEditor.tsx`**

This is the inline quote editor shown when a quote is expanded on the deal detail page. It should have:

- Quote header: number (read-only), status badge, valid_until date picker
- Line items table with columns: Produit/Description, Qté, Prix unit., Unité, TVA%, Remise, Total HT
  - Each row: product autocomplete (search products API) or free-form description input, quantity input, unit_price input, unit select, tax_rate input, discount_percent input, calculated line_ht display
  - "+ Ajouter une ligne" button adds empty row
  - Trash icon to remove a line
  - Drag handle for reordering (optional, can skip for v1)
- Global discount section: toggle between percent and amount, input field
- Totals section: Sous-total HT, Remise globale, Total HT, TVA, Total TTC — all calculated client-side
- Notes textarea for terms/conditions
- Action buttons: "Enregistrer" (save), "Dupliquer", status actions (Envoyer/Accepter/Refuser based on current status), "Télécharger PDF", "Supprimer"

The component should:
- Receive `quote: Quote` and `onUpdate: () => void` props
- Use `updateQuote`, `deleteQuote`, `duplicateQuote`, `sendQuote`, `acceptQuote`, `refuseQuote`, `downloadQuotePdf` from `@/services/quotes`
- Use `fetchProducts` for product autocomplete
- Calculate totals client-side for immediate feedback
- Send full lines array on save (replace-all strategy)

**Step 2: Integrate in deal detail page**

Import and use `QuoteEditor` in the deal detail page when a quote is expanded.

**Step 3: Verify build**

```bash
cd /Users/hugofrely/dev/crm-qeylo/frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/components/deals/QuoteEditor.tsx frontend/app/\(app\)/deals/\[id\]/page.tsx
git commit -m "feat(frontend): add QuoteEditor with line items and totals"
```

---

## Task 11: PDF generation with WeasyPrint

**Files:**
- Modify: `backend/requirements.txt` (add weasyprint)
- Modify: `backend/Dockerfile.dev` (add system deps for weasyprint)
- Create: `backend/deals/quote_pdf.py`
- Modify: `backend/deals/quote_urls.py` (add pdf endpoint)

**Step 1: Add WeasyPrint to requirements**

Add to `backend/requirements.txt`:
```
weasyprint==62.3
```

**Step 2: Update `backend/Dockerfile.dev`**

WeasyPrint needs system libraries. Add before `pip install`:
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libffi-dev libcairo2 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*
```

**Step 3: Create `backend/deals/quote_pdf.py`**

```python
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from weasyprint import HTML
from django.template.loader import render_to_string
from .models import Quote


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quote_pdf(request, pk):
    try:
        quote = Quote.objects.select_related(
            "deal", "deal__contact", "organization"
        ).prefetch_related("lines", "lines__product").get(
            pk=pk, organization=request.organization
        )
    except Quote.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    lines = []
    for line in quote.lines.all():
        lines.append({
            "description": line.description,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "unit": line.get_unit_display(),
            "tax_rate": line.tax_rate,
            "discount_percent": line.discount_percent,
            "discount_amount": line.discount_amount,
            "line_ht": line.line_ht,
            "line_ttc": line.line_ttc,
        })

    context = {
        "quote": quote,
        "lines": lines,
        "org": quote.organization,
        "contact": quote.deal.contact,
        "deal": quote.deal,
        "subtotal_ht": quote.subtotal_ht,
        "total_discount": quote.total_discount,
        "total_ht": quote.total_ht,
        "total_tax": quote.total_tax,
        "total_ttc": quote.total_ttc,
    }

    html_string = render_to_string("deals/quote_pdf.html", context)
    pdf = HTML(string=html_string).write_pdf()

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="devis-{quote.number}.pdf"'
    return response
```

**Step 4: Create the HTML template `backend/deals/templates/deals/quote_pdf.html`**

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 40px; }
  h1 { font-size: 24px; color: #111; margin-bottom: 5px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .header-left { max-width: 50%; }
  .header-right { text-align: right; }
  .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
  .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .address-block { width: 45%; }
  .address-block h3 { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #f8f8f8; border-bottom: 2px solid #ddd; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .text-right { text-align: right; }
  .totals { width: 300px; margin-left: auto; }
  .totals td { padding: 6px 12px; }
  .totals .total-row { font-weight: bold; font-size: 14px; border-top: 2px solid #333; }
  .notes { margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 4px; font-size: 11px; color: #666; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
  .status-draft { background: #e5e7eb; color: #374151; }
  .status-sent { background: #dbeafe; color: #1d4ed8; }
  .status-accepted { background: #d1fae5; color: #065f46; }
  .status-refused { background: #fee2e2; color: #991b1b; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Devis {{ quote.number }}</h1>
      <span class="status-badge status-{{ quote.status }}">{{ quote.get_status_display }}</span>
    </div>
    <div class="header-right">
      <p class="meta">
        Date : {{ quote.created_at|date:"d/m/Y" }}<br>
        {% if quote.valid_until %}Valable jusqu'au : {{ quote.valid_until|date:"d/m/Y" }}{% endif %}
      </p>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Emetteur</h3>
      <strong>{{ org.name }}</strong><br>
      {% if org.siret %}SIRET : {{ org.siret }}{% endif %}
    </div>
    <div class="address-block">
      <h3>Client</h3>
      {% if contact %}
        <strong>{{ contact.first_name }} {{ contact.last_name }}</strong><br>
        {% if contact.company %}{{ contact.company }}<br>{% endif %}
        {% if contact.email %}{{ contact.email }}<br>{% endif %}
        {% if contact.phone %}{{ contact.phone }}{% endif %}
      {% else %}
        <em>Aucun contact associé</em>
      {% endif %}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Qté</th>
        <th>Unité</th>
        <th class="text-right">Prix unit. HT</th>
        <th class="text-right">TVA</th>
        <th class="text-right">Remise</th>
        <th class="text-right">Total HT</th>
      </tr>
    </thead>
    <tbody>
      {% for line in lines %}
      <tr>
        <td>{{ line.description }}</td>
        <td class="text-right">{{ line.quantity }}</td>
        <td>{{ line.unit }}</td>
        <td class="text-right">{{ line.unit_price|floatformat:2 }} €</td>
        <td class="text-right">{{ line.tax_rate }}%</td>
        <td class="text-right">
          {% if line.discount_percent %}{{ line.discount_percent }}%{% elif line.discount_amount %}-{{ line.discount_amount|floatformat:2 }} €{% else %}-{% endif %}
        </td>
        <td class="text-right">{{ line.line_ht|floatformat:2 }} €</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Sous-total HT</td>
      <td class="text-right">{{ subtotal_ht|floatformat:2 }} €</td>
    </tr>
    {% if total_discount %}
    <tr>
      <td>Remise</td>
      <td class="text-right">-{{ total_discount|floatformat:2 }} €</td>
    </tr>
    {% endif %}
    <tr>
      <td>Total HT</td>
      <td class="text-right">{{ total_ht|floatformat:2 }} €</td>
    </tr>
    <tr>
      <td>TVA</td>
      <td class="text-right">{{ total_tax|floatformat:2 }} €</td>
    </tr>
    <tr class="total-row">
      <td>Total TTC</td>
      <td class="text-right">{{ total_ttc|floatformat:2 }} €</td>
    </tr>
  </table>

  {% if quote.notes %}
  <div class="notes">
    <strong>Conditions :</strong><br>
    {{ quote.notes|linebreaksbr }}
  </div>
  {% endif %}
</body>
</html>
```

**Step 5: Add PDF endpoint to `backend/deals/quote_urls.py`**

Add before the router include:
```python
from .quote_pdf import quote_pdf

# Add to urlpatterns:
path("<uuid:pk>/pdf/", quote_pdf),
```

**Step 6: Add templates dir to settings**

In `backend/config/settings.py`, ensure the TEMPLATES `DIRS` includes the app templates (Django does this by default with `APP_DIRS: True`, which is already set).

**Step 7: Rebuild Docker and verify**

```bash
docker compose build backend
docker compose up -d backend
```

**Step 8: Commit**

```bash
git add backend/requirements.txt backend/Dockerfile.dev backend/deals/quote_pdf.py backend/deals/templates/ backend/deals/quote_urls.py
git commit -m "feat(deals): add PDF quote generation with WeasyPrint"
```

---

## Task 12: Integration testing and polish

**Step 1: Run all backend tests**

```bash
docker compose exec backend python manage.py test -v 2
```

Ensure all tests pass.

**Step 2: Run frontend type check**

```bash
cd /Users/hugofrely/dev/crm-qeylo/frontend && npx tsc --noEmit
```

**Step 3: Manual testing checklist**

- [ ] Create a product category
- [ ] Create a product with all fields
- [ ] Edit and archive a product
- [ ] Create a deal from Kanban
- [ ] Click deal card -> navigates to deal detail page
- [ ] Create a quote with product lines and free-form lines
- [ ] Apply line discount and global discount
- [ ] Verify totals calculate correctly
- [ ] Duplicate a quote
- [ ] Send, accept, refuse quote status changes
- [ ] Verify accepted quote updates deal amount
- [ ] Download PDF and verify content
- [ ] Search and filter products

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: products catalog, structured quotes, and PDF generation"
```
