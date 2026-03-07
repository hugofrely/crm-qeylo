# Companies Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated Companies/Accounts module with multi-level hierarchy, contact org chart with typed relationships, full CRUD, AI chat tools, and automatic migration from the existing `company` text field.

**Architecture:** New Django app `companies` with `Company` model (SoftDeleteModel), `ContactRelationship` model in contacts app. FK added to Contact and Deal. Frontend follows existing patterns (service layer, hooks, page + components). ~15 new AI chat tools.

**Tech Stack:** Django 5 + DRF (backend), Next.js 16 + shadcn/ui + Tailwind CSS 4 (frontend), React Flow (org chart), Pydantic AI (chat tools)

---

## Task 1: Create Django app `companies` with models

**Files:**
- Create: `backend/companies/__init__.py`
- Create: `backend/companies/models.py`
- Create: `backend/companies/admin.py`
- Create: `backend/companies/apps.py`
- Modify: `backend/config/settings.py:20-50` (add to INSTALLED_APPS)

**Step 1: Create the app directory and files**

```bash
mkdir -p backend/companies/migrations
touch backend/companies/__init__.py
touch backend/companies/migrations/__init__.py
```

**Step 2: Create apps.py**

Create `backend/companies/apps.py`:
```python
from django.apps import AppConfig


class CompaniesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "companies"
```

**Step 3: Create models.py**

Create `backend/companies/models.py`:
```python
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
        # Unlink contacts and deals (don't cascade delete them)
        from contacts.models import Contact
        Contact.objects.filter(company=self).update(company=None)
        from deals.models import Deal
        Deal.objects.filter(company=self).update(company=None)
        # Unlink subsidiaries
        Company.objects.filter(parent=self).update(parent=None)
```

**Step 4: Create admin.py**

Create `backend/companies/admin.py`:
```python
from django.contrib import admin
from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "industry", "health_score", "organization", "created_at"]
    list_filter = ["health_score", "industry"]
    search_fields = ["name", "domain"]
```

**Step 5: Add to INSTALLED_APPS**

Modify `backend/config/settings.py` — add `"companies",` after `"contacts",` (line 34):
```python
    "contacts",
    "companies",
    "segments",
```

**Step 6: Run makemigrations**

```bash
cd backend && python manage.py makemigrations companies
```

**Step 7: Commit**

```bash
git add backend/companies/ backend/config/settings.py
git commit -m "feat(companies): create Company model with hierarchy and soft delete"
```

---

## Task 2: Add ContactRelationship model

**Files:**
- Modify: `backend/contacts/models.py:136` (add after ContactCategory)

**Step 1: Add ContactRelationship model**

Add to `backend/contacts/models.py` after the `ContactCategory` class (after line 156):
```python
class ContactRelationship(models.Model):
    class RelType(models.TextChoices):
        REPORTS_TO = "reports_to", "Rend compte a"
        MANAGES = "manages", "Manage"
        ASSISTANT_OF = "assistant_of", "Assistant de"
        COLLEAGUE = "colleague", "Collegue"
        DECISION_MAKER = "decision_maker", "Decideur"
        INFLUENCER = "influencer", "Influenceur"
        CHAMPION = "champion", "Champion"
        BLOCKER = "blocker", "Bloqueur"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="contact_relationships",
    )
    from_contact = models.ForeignKey(
        Contact, on_delete=models.CASCADE, related_name="relationships_from",
    )
    to_contact = models.ForeignKey(
        Contact, on_delete=models.CASCADE, related_name="relationships_to",
    )
    relationship_type = models.CharField(
        max_length=30, choices=RelType.choices,
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["from_contact", "to_contact", "relationship_type"]

    def __str__(self):
        return f"{self.from_contact} -> {self.relationship_type} -> {self.to_contact}"
```

**Step 2: Run makemigrations**

```bash
cd backend && python manage.py makemigrations contacts
```

**Step 3: Commit**

```bash
git add backend/contacts/
git commit -m "feat(contacts): add ContactRelationship model for typed relationships"
```

---

## Task 3: Add company FK to Contact and Deal models

**Files:**
- Modify: `backend/contacts/models.py:40` (add FK after company CharField)
- Modify: `backend/deals/models.py:126-132` (add FK after contact)

**Step 1: Add company FK to Contact**

In `backend/contacts/models.py`, add after line 40 (`company = models.CharField(...)`):
```python
    company_entity = models.ForeignKey(
        "companies.Company", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="contacts",
    )
```

Note: We keep the old `company` CharField temporarily for migration. The FK is named `company_entity` to avoid conflict. After migration completes, we'll rename.

**Step 2: Add company FK to Deal**

In `backend/deals/models.py`, add after line 132 (after `contact` field):
```python
    company = models.ForeignKey(
        "companies.Company", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="deals",
    )
```

**Step 3: Run makemigrations**

```bash
cd backend && python manage.py makemigrations contacts deals
```

**Step 4: Commit**

```bash
git add backend/contacts/ backend/deals/
git commit -m "feat: add company FK to Contact and Deal models"
```

---

## Task 4: Create migration command

**Files:**
- Create: `backend/companies/management/__init__.py`
- Create: `backend/companies/management/commands/__init__.py`
- Create: `backend/companies/management/commands/migrate_companies.py`

**Step 1: Create directory structure**

```bash
mkdir -p backend/companies/management/commands
touch backend/companies/management/__init__.py
touch backend/companies/management/commands/__init__.py
```

**Step 2: Create migration command**

Create `backend/companies/management/commands/migrate_companies.py`:
```python
from django.core.management.base import BaseCommand
from django.db.models import Count

from companies.models import Company
from contacts.models import Contact
from deals.models import Deal
from organizations.models import Organization


class Command(BaseCommand):
    help = "Migrate existing company text field to Company entities"

    def handle(self, *args, **options):
        total_companies = 0
        total_contacts = 0
        total_deals = 0

        for org in Organization.objects.all():
            # Get distinct non-empty company names
            company_names = (
                Contact.objects.filter(organization=org)
                .exclude(company="")
                .values_list("company", flat=True)
                .distinct()
            )

            for name in company_names:
                company, created = Company.objects.get_or_create(
                    organization=org,
                    name=name,
                    defaults={"created_by": None},
                )
                if created:
                    total_companies += 1

                # Link contacts
                linked = Contact.objects.filter(
                    organization=org, company=name, company_entity__isnull=True,
                ).update(company_entity=company)
                total_contacts += linked

                # Auto-link deals via their contact
                deal_linked = Deal.objects.filter(
                    organization=org,
                    contact__company_entity=company,
                    company__isnull=True,
                ).update(company=company)
                total_deals += deal_linked

            self.stdout.write(
                f"Org {org.name}: {company_names.count()} companies"
            )

        self.stdout.write(self.style.SUCCESS(
            f"Done: {total_companies} companies created, "
            f"{total_contacts} contacts linked, "
            f"{total_deals} deals linked"
        ))
```

**Step 3: Commit**

```bash
git add backend/companies/management/
git commit -m "feat(companies): add migrate_companies management command"
```

---

## Task 5: Create serializers

**Files:**
- Create: `backend/companies/serializers.py`

**Step 1: Create serializers**

Create `backend/companies/serializers.py`:
```python
from rest_framework import serializers
from django.db.models import Count, Sum, Q

from .models import Company
from contacts.models import ContactRelationship


class CompanySerializer(serializers.ModelSerializer):
    contacts_count = serializers.SerializerMethodField()
    deals_count = serializers.SerializerMethodField()
    open_deals_value = serializers.SerializerMethodField()
    won_deals_value = serializers.SerializerMethodField()
    subsidiaries_count = serializers.SerializerMethodField()
    last_interaction = serializers.SerializerMethodField()
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id", "name", "domain", "logo_url", "industry",
            # Hierarchy
            "parent", "parent_name",
            # Financial
            "annual_revenue", "employee_count", "siret", "vat_number", "legal_status",
            # Relational
            "owner", "owner_name", "source", "health_score",
            # Contact info
            "phone", "email", "website", "address", "city", "state", "zip_code", "country",
            # Meta
            "description", "custom_fields", "ai_summary",
            # Timestamps
            "created_at", "updated_at",
            # Computed
            "contacts_count", "deals_count", "open_deals_value",
            "won_deals_value", "subsidiaries_count", "last_interaction",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_contacts_count(self, obj):
        return obj.contacts.count()

    def get_deals_count(self, obj):
        return obj.deals.count()

    def get_open_deals_value(self, obj):
        result = obj.deals.exclude(
            stage__name__in=["Gagne", "Perdu", "Gagné", "Perdu"]
        ).aggregate(total=Sum("amount"))
        return str(result["total"] or 0)

    def get_won_deals_value(self, obj):
        result = obj.deals.filter(
            stage__name__in=["Gagne", "Gagné"]
        ).aggregate(total=Sum("amount"))
        return str(result["total"] or 0)

    def get_subsidiaries_count(self, obj):
        return obj.subsidiaries.count()

    def get_last_interaction(self, obj):
        from notes.models import TimelineEntry
        entry = TimelineEntry.objects.filter(
            contact__company_entity=obj
        ).order_by("-created_at").first()
        return entry.created_at.isoformat() if entry else None

    def get_owner_name(self, obj):
        if obj.owner:
            name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
            return name or obj.owner.email
        return None


class CompanyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    contacts_count = serializers.IntegerField(read_only=True, default=0)
    deals_count = serializers.IntegerField(read_only=True, default=0)
    open_deals_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True, default=0
    )
    won_deals_value = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True, default=0
    )
    owner_name = serializers.CharField(read_only=True, default=None)
    parent_name = serializers.CharField(read_only=True, default=None)

    class Meta:
        model = Company
        fields = [
            "id", "name", "domain", "industry", "health_score",
            "owner", "owner_name", "parent", "parent_name",
            "contacts_count", "deals_count", "open_deals_value", "won_deals_value",
            "created_at",
        ]


class ContactRelationshipSerializer(serializers.ModelSerializer):
    from_contact_name = serializers.SerializerMethodField()
    to_contact_name = serializers.SerializerMethodField()

    class Meta:
        model = ContactRelationship
        fields = [
            "id", "from_contact", "from_contact_name",
            "to_contact", "to_contact_name",
            "relationship_type", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_from_contact_name(self, obj):
        return f"{obj.from_contact.first_name} {obj.from_contact.last_name}".strip()

    def get_to_contact_name(self, obj):
        return f"{obj.to_contact.first_name} {obj.to_contact.last_name}".strip()
```

**Step 2: Commit**

```bash
git add backend/companies/serializers.py
git commit -m "feat(companies): add Company and ContactRelationship serializers"
```

---

## Task 6: Create views

**Files:**
- Create: `backend/companies/views.py`

**Step 1: Create views**

Create `backend/companies/views.py`:
```python
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, Sum, Value, CharField
from django.db.models.functions import Concat

from .models import Company
from .serializers import CompanySerializer, CompanyListSerializer, ContactRelationshipSerializer
from contacts.models import Contact, ContactRelationship
from contacts.serializers import ContactSerializer
from deals.serializers import DealSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return CompanyListSerializer
        return CompanySerializer

    def get_queryset(self):
        qs = Company.objects.filter(organization=self.request.organization)

        if self.action == "list":
            qs = qs.annotate(
                contacts_count=Count("contacts", distinct=True),
                deals_count=Count("deals", distinct=True),
                open_deals_value=Sum(
                    "deals__amount",
                    filter=~Q(deals__stage__name__in=["Gagne", "Perdu", "Gagné"]),
                    default=0,
                ),
                won_deals_value=Sum(
                    "deals__amount",
                    filter=Q(deals__stage__name__in=["Gagne", "Gagné"]),
                    default=0,
                ),
                owner_name=Concat(
                    "owner__first_name", Value(" "), "owner__last_name",
                    output_field=CharField(),
                ),
                parent_name=Value(None, output_field=CharField()),
            )

        # Filters
        search = self.request.query_params.get("search")
        if search:
            for word in search.split():
                qs = qs.filter(
                    Q(name__icontains=word) | Q(domain__icontains=word)
                )

        industry = self.request.query_params.get("industry")
        if industry:
            qs = qs.filter(industry__iexact=industry)

        owner = self.request.query_params.get("owner")
        if owner:
            qs = qs.filter(owner_id=owner)

        health = self.request.query_params.get("health_score")
        if health:
            qs = qs.filter(health_score=health)

        parent = self.request.query_params.get("parent")
        if parent:
            qs = qs.filter(parent_id=parent)

        has_open_deals = self.request.query_params.get("has_open_deals")
        if has_open_deals == "true":
            qs = qs.filter(
                deals__isnull=False,
            ).exclude(
                deals__stage__name__in=["Gagne", "Perdu", "Gagné"],
            ).distinct()

        # Ordering
        ordering = self.request.query_params.get("ordering", "-created_at")
        allowed_orderings = [
            "name", "-name", "created_at", "-created_at",
            "annual_revenue", "-annual_revenue",
            "employee_count", "-employee_count",
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def perform_destroy(self, instance):
        instance.soft_delete(user=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_contacts(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    contacts = Contact.objects.filter(company_entity=company)
    return Response(ContactSerializer(contacts, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_deals(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    from deals.models import Deal
    deals = Deal.objects.filter(company=company).select_related("stage", "contact")
    return Response(DealSerializer(deals, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_subsidiaries(request, pk):
    """Return all subsidiaries recursively."""
    company = Company.objects.get(id=pk, organization=request.organization)

    def _collect(parent, depth=0):
        result = []
        for child in Company.objects.filter(parent=parent):
            data = CompanySerializer(child).data
            data["depth"] = depth
            data["children"] = _collect(child, depth + 1)
            result.append(data)
        return result

    return Response(_collect(company))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_hierarchy(request, pk):
    """Return full hierarchy tree (root -> all descendants)."""
    company = Company.objects.get(id=pk, organization=request.organization)

    # Find root
    root = company
    while root.parent:
        root = root.parent

    def _build_tree(node):
        data = CompanySerializer(node).data
        data["children"] = [_build_tree(c) for c in Company.objects.filter(parent=node)]
        return data

    return Response(_build_tree(root))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_stats(request, pk):
    company = Company.objects.get(id=pk, organization=request.organization)
    from deals.models import Deal
    from django.db.models import Avg

    deals = Deal.objects.filter(company=company)
    open_deals = deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"])
    won_deals = deals.filter(stage__name__in=["Gagne", "Gagné"])
    lost_deals = deals.filter(stage__name__in=["Perdu"])

    return Response({
        "contacts_count": Contact.objects.filter(company_entity=company).count(),
        "total_deals": deals.count(),
        "open_deals": open_deals.count(),
        "won_deals": won_deals.count(),
        "lost_deals": lost_deals.count(),
        "open_deals_value": str(open_deals.aggregate(t=Sum("amount"))["t"] or 0),
        "won_deals_value": str(won_deals.aggregate(t=Sum("amount"))["t"] or 0),
        "avg_deal_value": str(won_deals.aggregate(a=Avg("amount"))["a"] or 0),
        "subsidiaries_count": company.subsidiaries.count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_org_chart(request, pk):
    """Return contacts with their relationships for org chart visualization."""
    company = Company.objects.get(id=pk, organization=request.organization)
    contacts = Contact.objects.filter(company_entity=company)
    contact_ids = list(contacts.values_list("id", flat=True))

    relationships = ContactRelationship.objects.filter(
        organization=request.organization,
        from_contact_id__in=contact_ids,
        to_contact_id__in=contact_ids,
    )

    nodes = [
        {
            "id": str(c.id),
            "name": f"{c.first_name} {c.last_name}".strip(),
            "job_title": c.job_title,
            "email": c.email,
            "phone": c.phone,
        }
        for c in contacts
    ]

    edges = [
        {
            "id": str(r.id),
            "from": str(r.from_contact_id),
            "to": str(r.to_contact_id),
            "type": r.relationship_type,
            "label": r.get_relationship_type_display(),
            "notes": r.notes,
        }
        for r in relationships
    ]

    return Response({"nodes": nodes, "edges": edges})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_timeline(request, pk):
    """Return aggregated timeline from all contacts of this company."""
    company = Company.objects.get(id=pk, organization=request.organization)
    from notes.models import TimelineEntry
    entries = TimelineEntry.objects.filter(
        contact__company_entity=company,
    ).order_by("-created_at")[:50]

    from notes.serializers import TimelineEntrySerializer
    return Response(TimelineEntrySerializer(entries, many=True).data)


# --- ContactRelationship endpoints ---

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def contact_relationships(request, pk):
    contact = Contact.objects.get(id=pk, organization=request.organization)

    if request.method == "GET":
        rels = ContactRelationship.objects.filter(
            Q(from_contact=contact) | Q(to_contact=contact),
            organization=request.organization,
        )
        return Response(ContactRelationshipSerializer(rels, many=True).data)

    # POST
    serializer = ContactRelationshipSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(organization=request.organization)
    return Response(serializer.data, status=201)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_contact_relationship(request, pk):
    rel = ContactRelationship.objects.get(
        id=pk, organization=request.organization,
    )
    rel.delete()
    return Response(status=204)
```

**Step 2: Commit**

```bash
git add backend/companies/views.py
git commit -m "feat(companies): add views with CRUD, stats, hierarchy, org chart, timeline"
```

---

## Task 7: Create URL configuration

**Files:**
- Create: `backend/companies/urls.py`
- Modify: `backend/config/urls.py:9` (add companies URL)
- Modify: `backend/contacts/urls.py` (add relationship endpoints)

**Step 1: Create companies/urls.py**

Create `backend/companies/urls.py`:
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("", views.CompanyViewSet, basename="company")

urlpatterns = [
    path("<uuid:pk>/contacts/", views.company_contacts),
    path("<uuid:pk>/deals/", views.company_deals),
    path("<uuid:pk>/subsidiaries/", views.company_subsidiaries),
    path("<uuid:pk>/hierarchy/", views.company_hierarchy),
    path("<uuid:pk>/stats/", views.company_stats),
    path("<uuid:pk>/org-chart/", views.company_org_chart),
    path("<uuid:pk>/timeline/", views.company_timeline),
    path("", include(router.urls)),
]
```

**Step 2: Add to config/urls.py**

Add after line 9 (`path("api/contacts/", ...)`):
```python
    path("api/companies/", include("companies.urls")),
```

**Step 3: Add relationship endpoints to contacts/urls.py**

Add to `backend/contacts/urls.py` urlpatterns (before the router include):
```python
    path("<uuid:pk>/relationships/", views.contact_relationships),
```

And add the delete endpoint — add a new import in contacts/urls.py and add:
```python
    path("relationships/<uuid:pk>/", views.delete_contact_relationship),
```

Note: Import `contact_relationships` and `delete_contact_relationship` from `companies.views` in contacts/urls.py.

Actually, cleaner approach — add relationship URLs to companies/urls.py:
```python
    path("contact-relationships/<uuid:pk>/", views.delete_contact_relationship),
```

And in config/urls.py, the contacts URL already handles `<uuid:pk>/relationships/` via:
```python
    path("api/contacts/<uuid:pk>/relationships/", include("companies.relationship_urls")),
```

Simpler: just add to contacts/urls.py:
```python
from companies.views import contact_relationships, delete_contact_relationship
```
Then add:
```python
    path("<uuid:pk>/relationships/", contact_relationships),
    path("contact-relationships/<uuid:pk>/", delete_contact_relationship),
```

**Step 4: Commit**

```bash
git add backend/companies/urls.py backend/config/urls.py backend/contacts/urls.py
git commit -m "feat(companies): add URL routing for companies and relationships"
```

---

## Task 8: Update Contact and Deal serializers

**Files:**
- Modify: `backend/contacts/serializers.py` (add company_entity fields)
- Modify: `backend/deals/serializers.py` (add company fields)

**Step 1: Update ContactSerializer**

In `backend/contacts/serializers.py`, add to the `fields` list in `ContactSerializer.Meta`:
```python
"company_entity", "company_entity_name",
```

And add a computed field:
```python
company_entity_name = serializers.CharField(
    source="company_entity.name", read_only=True, default=None
)
```

**Step 2: Update DealSerializer**

In `backend/deals/serializers.py`, add `"company"` and `"company_name"` to the Deal serializer fields, and add:
```python
company_name = serializers.CharField(
    source="company.name", read_only=True, default=None
)
```

**Step 3: Commit**

```bash
git add backend/contacts/serializers.py backend/deals/serializers.py
git commit -m "feat: add company entity fields to Contact and Deal serializers"
```

---

## Task 9: Update trash and search to include companies

**Files:**
- Modify: `backend/trash/views.py:6-15` (add Company to MODEL_MAP)
- Modify: `backend/search/views.py` (add companies to global search)

**Step 1: Update trash MODEL_MAP**

In `backend/trash/views.py`, add import and entry:
```python
from companies.models import Company

MODEL_MAP = {
    "contact": Contact,
    "deal": Deal,
    "task": Task,
    "company": Company,
}
```

Update `trash_empty` order to delete companies before contacts:
```python
for Model in [Task, Deal, Contact, Company]:
```

**Step 2: Update global search**

In `backend/search/views.py`, add companies search after tasks:
```python
from companies.models import Company

# --- Companies ---
companies_qs = Company.objects.filter(organization=org)
for word in words:
    companies_qs = companies_qs.filter(
        Q(name__icontains=word) | Q(domain__icontains=word)
    )
companies = [
    {
        "id": str(c.id),
        "name": c.name,
        "industry": c.industry,
        "domain": c.domain,
        "health_score": c.health_score,
    }
    for c in companies_qs[:MAX_RESULTS]
]
```

And add `"companies": companies` to the response dict. Also update the empty response to include `"companies": []`.

**Step 3: Commit**

```bash
git add backend/trash/views.py backend/search/views.py
git commit -m "feat: add companies to trash and global search"
```

---

## Task 10: Run migrations and test backend

**Step 1: Apply all migrations**

```bash
cd backend && python manage.py migrate
```

**Step 2: Run migration command (if data exists)**

```bash
cd backend && python manage.py migrate_companies
```

**Step 3: Run tests**

```bash
cd backend && python manage.py test
```

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve migration issues"
```

---

## Task 11: Create frontend types

**Files:**
- Create: `frontend/types/companies.ts`
- Modify: `frontend/types/index.ts` (re-export if exists, or check import pattern)

**Step 1: Create company types**

Create `frontend/types/companies.ts`:
```typescript
export interface Company {
  id: string
  name: string
  domain: string
  logo_url: string
  industry: string
  parent: string | null
  parent_name: string | null
  annual_revenue: string | null
  employee_count: number | null
  siret: string
  vat_number: string
  legal_status: string
  owner: string | null
  owner_name: string | null
  source: string
  health_score: "excellent" | "good" | "at_risk" | "churned"
  phone: string
  email: string
  website: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  description: string
  custom_fields: Record<string, unknown>
  ai_summary: string
  created_at: string
  updated_at: string
  // Computed
  contacts_count: number
  deals_count: number
  open_deals_value: string
  won_deals_value: string
  subsidiaries_count: number
  last_interaction: string | null
}

export interface CompanyListItem {
  id: string
  name: string
  domain: string
  industry: string
  health_score: string
  owner: string | null
  owner_name: string | null
  parent: string | null
  parent_name: string | null
  contacts_count: number
  deals_count: number
  open_deals_value: string
  won_deals_value: string
  created_at: string
}

export interface ContactRelationship {
  id: string
  from_contact: string
  from_contact_name: string
  to_contact: string
  to_contact_name: string
  relationship_type: string
  notes: string
  created_at: string
}

export interface CompanyStats {
  contacts_count: number
  total_deals: number
  open_deals: number
  won_deals: number
  lost_deals: number
  open_deals_value: string
  won_deals_value: string
  avg_deal_value: string
  subsidiaries_count: number
}

export interface OrgChartData {
  nodes: OrgChartNode[]
  edges: OrgChartEdge[]
}

export interface OrgChartNode {
  id: string
  name: string
  job_title: string
  email: string
  phone: string
}

export interface OrgChartEdge {
  id: string
  from: string
  to: string
  type: string
  label: string
  notes: string
}

export interface CompanyHierarchyNode extends Company {
  depth: number
  children: CompanyHierarchyNode[]
}
```

**Step 2: Add re-export**

Check if `frontend/types/index.ts` exists and add:
```typescript
export * from "./companies"
```

**Step 3: Commit**

```bash
git add frontend/types/
git commit -m "feat(frontend): add Company and ContactRelationship types"
```

---

## Task 12: Create frontend service layer

**Files:**
- Create: `frontend/services/companies.ts`

**Step 1: Create companies service**

Create `frontend/services/companies.ts`:
```typescript
import { apiFetch } from "@/lib/api"
import type {
  Company,
  CompanyListItem,
  CompanyStats,
  OrgChartData,
  ContactRelationship,
} from "@/types"
import type { Contact } from "@/types"
import type { Deal } from "@/types"
import type { TimelineEntry } from "@/types"

export async function fetchCompanies(params?: {
  search?: string
  industry?: string
  owner?: string
  health_score?: string
  parent?: string
  has_open_deals?: string
  ordering?: string
  page?: number
}): Promise<{ count: number; results: CompanyListItem[] }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.industry) searchParams.set("industry", params.industry)
  if (params?.owner) searchParams.set("owner", params.owner)
  if (params?.health_score) searchParams.set("health_score", params.health_score)
  if (params?.parent) searchParams.set("parent", params.parent)
  if (params?.has_open_deals) searchParams.set("has_open_deals", params.has_open_deals)
  if (params?.ordering) searchParams.set("ordering", params.ordering)
  if (params?.page) searchParams.set("page", String(params.page))
  const query = searchParams.toString()
  return apiFetch(`/companies/${query ? `?${query}` : ""}`)
}

export async function fetchCompany(id: string): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/`)
}

export async function createCompany(data: Record<string, unknown>): Promise<Company> {
  return apiFetch<Company>("/companies/", { method: "POST", json: data })
}

export async function updateCompany(id: string, data: Record<string, unknown>): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/`, { method: "PATCH", json: data })
}

export async function deleteCompany(id: string): Promise<void> {
  await apiFetch(`/companies/${id}/`, { method: "DELETE" })
}

export async function fetchCompanyContacts(id: string): Promise<Contact[]> {
  return apiFetch<Contact[]>(`/companies/${id}/contacts/`)
}

export async function fetchCompanyDeals(id: string): Promise<Deal[]> {
  return apiFetch<Deal[]>(`/companies/${id}/deals/`)
}

export async function fetchCompanySubsidiaries(id: string): Promise<unknown[]> {
  return apiFetch(`/companies/${id}/subsidiaries/`)
}

export async function fetchCompanyHierarchy(id: string): Promise<unknown> {
  return apiFetch(`/companies/${id}/hierarchy/`)
}

export async function fetchCompanyStats(id: string): Promise<CompanyStats> {
  return apiFetch<CompanyStats>(`/companies/${id}/stats/`)
}

export async function fetchCompanyOrgChart(id: string): Promise<OrgChartData> {
  return apiFetch<OrgChartData>(`/companies/${id}/org-chart/`)
}

export async function fetchCompanyTimeline(id: string): Promise<TimelineEntry[]> {
  return apiFetch<TimelineEntry[]>(`/companies/${id}/timeline/`)
}

// Contact relationships
export async function fetchContactRelationships(contactId: string): Promise<ContactRelationship[]> {
  return apiFetch<ContactRelationship[]>(`/contacts/${contactId}/relationships/`)
}

export async function createContactRelationship(
  contactId: string,
  data: { from_contact: string; to_contact: string; relationship_type: string; notes?: string }
): Promise<ContactRelationship> {
  return apiFetch<ContactRelationship>(`/contacts/${contactId}/relationships/`, {
    method: "POST",
    json: data,
  })
}

export async function deleteContactRelationship(id: string): Promise<void> {
  await apiFetch(`/companies/contact-relationships/${id}/`, { method: "DELETE" })
}
```

**Step 2: Commit**

```bash
git add frontend/services/companies.ts
git commit -m "feat(frontend): add companies service layer"
```

---

## Task 13: Create useCompanies hook

**Files:**
- Create: `frontend/hooks/useCompanies.ts`

**Step 1: Create hook**

Create `frontend/hooks/useCompanies.ts`:
```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchCompanies, fetchCompany } from "@/services/companies"
import type { Company, CompanyListItem } from "@/types"

export function useCompanies(params?: {
  search?: string
  industry?: string
  owner?: string
  health_score?: string
  ordering?: string
  page?: number
}) {
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchCompanies(params)
      setCompanies(res.results)
      setCount(res.count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }, [
    params?.search,
    params?.industry,
    params?.owner,
    params?.health_score,
    params?.ordering,
    params?.page,
  ])

  useEffect(() => {
    load()
  }, [load])

  return { companies, count, loading, error, reload: load }
}

export function useCompany(id: string | null) {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await fetchCompany(id)
      setCompany(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { company, loading, error, reload: load, setCompany }
}
```

**Step 2: Commit**

```bash
git add frontend/hooks/useCompanies.ts
git commit -m "feat(frontend): add useCompanies and useCompany hooks"
```

---

## Task 14: Add "Entreprises" to Sidebar

**Files:**
- Modify: `frontend/components/Sidebar.tsx:10-49`

**Step 1: Add Building2 import**

In `frontend/components/Sidebar.tsx`, add `Building2` to the lucide imports (line 10-36):
```typescript
import {
  MessageSquare,
  Users,
  Building2,
  Kanban,
  // ... rest
} from "lucide-react"
```

**Step 2: Add navigation item**

In the `navigationGroups` array, add after the Contacts entry (line 45):
```typescript
      { name: "Entreprises", href: "/companies", icon: Building2 },
```

So the CRM group becomes:
```typescript
{
    label: "CRM",
    items: [
      { name: "Chat", href: "/chat", icon: MessageSquare },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Entreprises", href: "/companies", icon: Building2 },
      { name: "Segments", href: "/segments", icon: ListFilter },
      { name: "Pipeline", href: "/deals", icon: Kanban },
      { name: "Entonnoir", href: "/pipeline/funnel", icon: Filter },
    ],
},
```

**Step 3: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat(frontend): add Entreprises to sidebar navigation"
```

---

## Task 15: Create CompanyForm dialog

**Files:**
- Create: `frontend/components/companies/CompanyForm.tsx`

**Step 1: Create the form component**

Create `frontend/components/companies/CompanyForm.tsx` — a dialog for creating/editing companies. Follow the same pattern as DealDialog (dialog with form fields, autocomplete for parent company).

The component should include fields for: name (required), industry, website, phone, email, address, city, country, health_score (select), parent (autocomplete), annual_revenue, employee_count, siret, vat_number, legal_status, source, description.

**Step 2: Commit**

```bash
git add frontend/components/companies/
git commit -m "feat(frontend): add CompanyForm dialog component"
```

---

## Task 16: Create companies list page

**Files:**
- Create: `frontend/app/(app)/companies/page.tsx`

**Step 1: Create the page**

Create `frontend/app/(app)/companies/page.tsx` — follows the same pattern as the contacts page:
- Header with "Entreprises" title, count badge, "Nouvelle entreprise" button
- Search bar with debounce
- Filter by industry, health_score
- Table with columns: Nom, Secteur, Contacts, Deals ouverts, CA gagné, Santé
- Rows link to `/companies/{id}`
- Pagination
- CompanyForm dialog for creation

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/companies/
git commit -m "feat(frontend): add companies list page"
```

---

## Task 17: Create company detail page — layout and header

**Files:**
- Create: `frontend/app/(app)/companies/[id]/page.tsx`
- Create: `frontend/components/companies/CompanyHeader.tsx`
- Create: `frontend/components/companies/CompanyInfo.tsx`

**Step 1: Create CompanyHeader**

Create `frontend/components/companies/CompanyHeader.tsx` — displays company name, industry badge, health score badge, action buttons (edit, delete). Follow ContactHeader pattern.

**Step 2: Create CompanyInfo**

Create `frontend/components/companies/CompanyInfo.tsx` — sidebar with editable fields (same pattern as ContactInfo). Sections: Coordonnees, Financier, Relationnel, Custom fields.

**Step 3: Create detail page**

Create `frontend/app/(app)/companies/[id]/page.tsx` — 2-column layout:
- Left: CompanyHeader + Tabs (Resume, Contacts, Deals, Organigramme, Hierarchie, Timeline)
- Right: CompanyInfo sidebar

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/companies/\[id\]/ frontend/components/companies/
git commit -m "feat(frontend): add company detail page with header and info sidebar"
```

---

## Task 18: Create company detail tabs — Contacts, Deals, Timeline

**Files:**
- Create: `frontend/components/companies/CompanyContacts.tsx`
- Create: `frontend/components/companies/CompanyDeals.tsx`
- Create: `frontend/components/companies/CompanyTimeline.tsx`
- Create: `frontend/components/companies/CompanyStats.tsx`

**Step 1: Create CompanyStats**

Summary tab content — displays key metrics (CA gagne, pipeline ouvert, nb contacts, nb deals) in card grid. Uses `fetchCompanyStats()`.

**Step 2: Create CompanyContacts**

Tab showing contacts linked to this company. List with name, job_title, email, phone. Button to link existing contact or create new one. Button to unlink.

**Step 3: Create CompanyDeals**

Tab showing deals linked to this company. Table with name, amount, stage, contact. Button to create new deal.

**Step 4: Create CompanyTimeline**

Tab showing aggregated timeline from all contacts. Uses `fetchCompanyTimeline()`. Reuses timeline entry rendering pattern.

**Step 5: Commit**

```bash
git add frontend/components/companies/
git commit -m "feat(frontend): add company contacts, deals, timeline, and stats tabs"
```

---

## Task 19: Create org chart tab (React Flow)

**Files:**
- Create: `frontend/components/companies/CompanyOrgChart.tsx`
- Create: `frontend/components/companies/RelationshipDialog.tsx`

**Step 1: Create RelationshipDialog**

Dialog for creating/editing a relationship between two contacts. Fields: from_contact (autocomplete), to_contact (autocomplete), relationship_type (select), notes.

**Step 2: Create CompanyOrgChart**

Interactive org chart using React Flow (already a project dependency used for workflows). Renders contacts as nodes with job_title, and relationships as labeled edges. Supports:
- Drag to reposition nodes
- Click edge to see relationship details
- Button to add new relationship (opens RelationshipDialog)
- Button to remove relationship

**Step 3: Commit**

```bash
git add frontend/components/companies/
git commit -m "feat(frontend): add interactive org chart with React Flow"
```

---

## Task 20: Create hierarchy tab

**Files:**
- Create: `frontend/components/companies/CompanyHierarchy.tsx`

**Step 1: Create hierarchy tree**

Tree view of parent company -> subsidiaries (multi-level). Each node shows company name, industry, contacts count, deals count. Clicking a node navigates to that company's detail page. Uses `fetchCompanyHierarchy()`.

Can be implemented as a simple recursive component with indentation, or using React Flow for a visual tree.

**Step 2: Commit**

```bash
git add frontend/components/companies/CompanyHierarchy.tsx
git commit -m "feat(frontend): add company hierarchy tree view"
```

---

## Task 21: Update ContactInfo and ContactHeader for company link

**Files:**
- Modify: `frontend/components/contacts/ContactInfo.tsx` (replace company text input with autocomplete)
- Modify: `frontend/components/contacts/ContactHeader.tsx` (make company name a link)

**Step 1: Update ContactHeader**

In `frontend/components/contacts/ContactHeader.tsx`, make the company display a clickable link to `/companies/{company_entity}`.

**Step 2: Update ContactInfo**

In `frontend/components/contacts/ContactInfo.tsx`, replace the company text input with an autocomplete component that searches companies. On selection, updates `company_entity` FK.

**Step 3: Update Contact type**

Add to `frontend/types/contacts.ts`:
```typescript
  company_entity: string | null
  company_entity_name: string | null
```

**Step 4: Commit**

```bash
git add frontend/components/contacts/ frontend/types/contacts.ts
git commit -m "feat(frontend): link contact company field to Company entity"
```

---

## Task 22: Update DealForm for company field

**Files:**
- Modify: `frontend/components/deals/DealDialog.tsx` (add company autocomplete)

**Step 1: Add company field**

Add company autocomplete to DealDialog. When a contact is selected, auto-fill the company field from the contact's company_entity.

**Step 2: Commit**

```bash
git add frontend/components/deals/
git commit -m "feat(frontend): add company field to deal form"
```

---

## Task 23: Update global search to include companies

**Files:**
- Modify: `frontend/components/shared/SearchHeader.tsx` or wherever global search renders results

**Step 1: Add companies to search results**

Add a "Companies" section to the global search results dropdown, showing matching companies with Building2 icon. Clicking navigates to `/companies/{id}`.

**Step 2: Commit**

```bash
git add frontend/components/
git commit -m "feat(frontend): include companies in global search results"
```

---

## Task 24: Add Company AI chat tools — CRUD

**Files:**
- Modify: `backend/chat/tools.py` (add after existing tools, before ALL_TOOLS)

**Step 1: Add helper function and imports**

Add after the existing `_resolve_deal_id` function:
```python
from companies.models import Company

def _resolve_company_id(org_id: str, raw_id: str | None) -> str | None:
    """Return a valid company UUID or None."""
    if not raw_id:
        return None
    if _is_valid_uuid(raw_id):
        if Company.objects.filter(id=raw_id, organization_id=org_id).exists():
            return raw_id
    latest = Company.objects.filter(organization_id=org_id).order_by("-created_at").first()
    return str(latest.id) if latest else None
```

**Step 2: Add CRUD tools**

Add before `ALL_TOOLS`:
```python
# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------

async def create_company(
    ctx: RunContext[ChatDeps],
    name: str,
    industry: str = "",
    website: str = "",
    phone: str = "",
    email: str = "",
    domain: str = "",
    address: str = "",
    city: str = "",
    country: str = "",
    annual_revenue: Optional[float] = None,
    employee_count: Optional[int] = None,
    siret: str = "",
    vat_number: str = "",
    legal_status: str = "",
    source: str = "",
    health_score: str = "good",
    parent_name: Optional[str] = None,
    description: str = "",
) -> dict:
    """Create a new company/account in the CRM."""
    org_id = ctx.deps.organization_id

    # Check for duplicates
    existing = Company.objects.filter(organization_id=org_id, name__iexact=name).first()
    if existing:
        return {
            "action": "duplicate_found",
            "summary": f"L'entreprise '{name}' existe deja.",
            "entity_id": str(existing.id),
            "entity_preview": {"name": existing.name, "industry": existing.industry},
            "link": f"/companies/{existing.id}",
        }

    # Resolve parent
    parent = None
    if parent_name:
        parent = Company.objects.filter(
            organization_id=org_id, name__icontains=parent_name
        ).first()

    company = Company.objects.create(
        organization_id=org_id,
        created_by_id=ctx.deps.user_id,
        name=name,
        industry=industry,
        website=website,
        phone=phone,
        email=email,
        domain=domain,
        address=address,
        city=city,
        country=country,
        annual_revenue=annual_revenue,
        employee_count=employee_count,
        siret=siret,
        vat_number=vat_number,
        legal_status=legal_status,
        source=source,
        health_score=health_score,
        parent=parent,
        description=description,
    )

    return {
        "action": "created",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{name}' creee.",
        "entity_preview": {"name": name, "industry": industry},
        "link": f"/companies/{company.id}",
    }


async def get_company(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get details of a company by name or ID."""
    org_id = ctx.deps.organization_id
    company = None

    if _is_valid_uuid(company_name_or_id):
        company = Company.objects.filter(id=company_name_or_id, organization_id=org_id).first()

    if not company:
        company = Company.objects.filter(
            organization_id=org_id, name__icontains=company_name_or_id
        ).first()

    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}

    contacts_count = company.contacts.count()
    deals = company.deals.all()
    open_value = sum(d.amount for d in deals.exclude(stage__name__in=["Gagne", "Perdu", "Gagné"]))
    won_value = sum(d.amount for d in deals.filter(stage__name__in=["Gagne", "Gagné"]))

    return {
        "action": "found",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise: {company.name}",
        "entity_preview": {
            "name": company.name,
            "industry": company.industry,
            "health_score": company.health_score,
            "contacts": contacts_count,
            "open_pipeline": str(open_value),
            "won_revenue": str(won_value),
            "website": company.website,
            "phone": company.phone,
            "parent": company.parent.name if company.parent else None,
        },
        "link": f"/companies/{company.id}",
    }


async def search_companies(
    ctx: RunContext[ChatDeps],
    query: str = "",
    industry: str = "",
    health_score: str = "",
    has_open_deals: bool = False,
) -> dict:
    """Search companies by name, industry, health score."""
    org_id = ctx.deps.organization_id
    qs = Company.objects.filter(organization_id=org_id)

    if query:
        for word in query.split():
            qs = qs.filter(Q(name__icontains=word) | Q(domain__icontains=word))
    if industry:
        qs = qs.filter(industry__icontains=industry)
    if health_score:
        qs = qs.filter(health_score=health_score)
    if has_open_deals:
        qs = qs.filter(deals__isnull=False).exclude(
            deals__stage__name__in=["Gagne", "Perdu", "Gagné"]
        ).distinct()

    companies = qs[:10]
    return {
        "action": "search_results",
        "entity_type": "company",
        "summary": f"{len(companies)} entreprise(s) trouvee(s).",
        "results": [
            {
                "id": str(c.id),
                "name": c.name,
                "industry": c.industry,
                "health_score": c.health_score,
                "contacts_count": c.contacts.count(),
            }
            for c in companies
        ],
    }


async def update_company(
    ctx: RunContext[ChatDeps],
    company_name_or_id: str,
    name: Optional[str] = None,
    industry: Optional[str] = None,
    website: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    health_score: Optional[str] = None,
    annual_revenue: Optional[float] = None,
    employee_count: Optional[int] = None,
    description: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    siret: Optional[str] = None,
    vat_number: Optional[str] = None,
    legal_status: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Update a company's fields."""
    org_id = ctx.deps.organization_id
    company = None

    if _is_valid_uuid(company_name_or_id):
        company = Company.objects.filter(id=company_name_or_id, organization_id=org_id).first()
    if not company:
        company = Company.objects.filter(
            organization_id=org_id, name__icontains=company_name_or_id
        ).first()
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}

    changes = []
    for field, value in [
        ("name", name), ("industry", industry), ("website", website),
        ("phone", phone), ("email", email), ("health_score", health_score),
        ("annual_revenue", annual_revenue), ("employee_count", employee_count),
        ("description", description), ("address", address), ("city", city),
        ("country", country), ("siret", siret), ("vat_number", vat_number),
        ("legal_status", legal_status), ("source", source),
    ]:
        if value is not None:
            setattr(company, field, value)
            changes.append(field)

    if changes:
        company.save(update_fields=changes + ["updated_at"])

    return {
        "action": "updated",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{company.name}' mise a jour ({', '.join(changes)}).",
        "link": f"/companies/{company.id}",
    }


async def delete_company(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Delete a company (soft delete)."""
    org_id = ctx.deps.organization_id
    company = None

    if _is_valid_uuid(company_name_or_id):
        company = Company.objects.filter(id=company_name_or_id, organization_id=org_id).first()
    if not company:
        company = Company.objects.filter(
            organization_id=org_id, name__icontains=company_name_or_id
        ).first()
    if not company:
        return {"error": f"Entreprise '{company_name_or_id}' non trouvee."}

    company.soft_delete(user_id=ctx.deps.user_id)
    return {
        "action": "deleted",
        "entity_type": "company",
        "entity_id": str(company.id),
        "summary": f"Entreprise '{company.name}' supprimee.",
    }
```

**Step 3: Add to ALL_TOOLS**

Add to the `ALL_TOOLS` list:
```python
    # Companies
    create_company,
    get_company,
    search_companies,
    update_company,
    delete_company,
```

**Step 4: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add company CRUD tools for AI agent"
```

---

## Task 25: Add Company AI chat tools — Intelligence & Actions

**Files:**
- Modify: `backend/chat/tools.py` (add after CRUD tools)

**Step 1: Add intelligence tools**

Add after `delete_company`:
```python
async def get_company_stats(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get stats for a company: revenue, pipeline, deals, contacts."""
    # ... resolve company, return stats dict

async def get_company_contacts(
    ctx: RunContext[ChatDeps], company_name_or_id: str, role: str = ""
) -> dict:
    """List contacts of a company, optionally filtered by decision role."""
    # ... resolve company, filter contacts, return list

async def get_company_deals(
    ctx: RunContext[ChatDeps], company_name_or_id: str, stage: str = ""
) -> dict:
    """List deals of a company, optionally filtered by stage."""
    # ... resolve company, filter deals, return list

async def get_company_hierarchy(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get the full hierarchy tree of a company."""
    # ... resolve company, find root, build tree

async def get_company_org_chart(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Get contacts with their relationships for a company."""
    # ... resolve company, get contacts and relationships

async def get_company_summary(ctx: RunContext[ChatDeps], company_name_or_id: str) -> dict:
    """Generate or update the AI summary for a company."""
    # ... resolve company, build summary from stats and contacts
```

**Step 2: Add action tools**

```python
async def link_contact_to_company(
    ctx: RunContext[ChatDeps], contact_name_or_id: str, company_name_or_id: str
) -> dict:
    """Link a contact to a company."""
    # ... resolve both, update contact.company_entity

async def unlink_contact_from_company(ctx: RunContext[ChatDeps], contact_name_or_id: str) -> dict:
    """Remove a contact's company association."""
    # ... resolve contact, set company_entity = None

async def create_contact_relationship(
    ctx: RunContext[ChatDeps],
    from_contact_name_or_id: str,
    to_contact_name_or_id: str,
    relationship_type: str,
    notes: str = "",
) -> dict:
    """Create a typed relationship between two contacts."""
    # ... resolve contacts, create ContactRelationship

async def remove_contact_relationship(
    ctx: RunContext[ChatDeps],
    from_contact_name_or_id: str,
    to_contact_name_or_id: str,
    relationship_type: str,
) -> dict:
    """Remove a relationship between two contacts."""
    # ... resolve contacts, delete ContactRelationship

async def transfer_contacts(
    ctx: RunContext[ChatDeps], from_company: str, to_company: str
) -> dict:
    """Transfer all contacts from one company to another."""
    # ... resolve companies, bulk update contacts

async def set_parent_company(
    ctx: RunContext[ChatDeps], company_name_or_id: str, parent_name_or_id: str
) -> dict:
    """Set the parent company for hierarchy."""
    # ... resolve both, update parent FK
```

**Step 3: Add all new tools to ALL_TOOLS**

```python
    get_company_stats,
    get_company_contacts,
    get_company_deals,
    get_company_hierarchy,
    get_company_org_chart,
    get_company_summary,
    link_contact_to_company,
    unlink_contact_from_company,
    create_contact_relationship,
    remove_contact_relationship,
    transfer_contacts,
    set_parent_company,
```

**Step 4: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): add company intelligence and action tools for AI agent"
```

---

## Task 26: Update existing chat tools for company support

**Files:**
- Modify: `backend/chat/tools.py` (update create_contact, search_contacts, create_deal, search_all, get_dashboard_summary)

**Step 1: Update create_contact**

Add `company_name: str = ""` parameter. If provided, search or create Company and set `company_entity`.

**Step 2: Update search_contacts**

Add `company_name: str = ""` parameter. If provided, filter by `company_entity__name__icontains`.

**Step 3: Update create_deal**

Add `company_name: str = ""` parameter. If provided, search Company and set FK. Auto-fill from contact's company_entity if not specified.

**Step 4: Update search_all**

Add companies to the search results.

**Step 5: Update get_dashboard_summary**

Add company stats: total companies, top 5 by open pipeline, companies at_risk.

**Step 6: Update navigate tool**

Add company navigation support.

**Step 7: Commit**

```bash
git add backend/chat/tools.py
git commit -m "feat(chat): update existing tools with company support"
```

---

## Task 27: Update AI system prompt

**Files:**
- Modify: `backend/chat/prompts.py`
- Modify: `backend/chat/views.py:45-93` (update _build_context)

**Step 1: Update system prompt**

Add to capabilities in `SYSTEM_PROMPT`:
```
- Gerer les entreprises/comptes (creer, modifier, rechercher, hierarchie, organigramme)
- Lier des contacts a des entreprises et gerer les relations entre contacts
```

Add context placeholder:
```
## Entreprises
{companies_summary}
```

**Step 2: Update _build_context**

Add companies context building:
```python
# Companies
companies = Company.objects.filter(organization=org).order_by("-created_at")[:5]
companies_summary = ", ".join(
    f"{c.name} ({c.industry})" for c in companies
) or "Aucune entreprise"
```

Return and use it in the prompt formatting.

**Step 3: Commit**

```bash
git add backend/chat/prompts.py backend/chat/views.py
git commit -m "feat(chat): update system prompt with company context"
```

---

## Task 28: Final integration testing

**Step 1: Run all backend tests**

```bash
cd backend && python manage.py test
```

**Step 2: Start backend and verify API**

```bash
cd backend && python manage.py runserver
```

Test with curl:
```bash
# List companies
curl -H "Authorization: Bearer $TOKEN" -H "X-Organization: $ORG_ID" http://localhost:8000/api/companies/

# Create company
curl -X POST -H "Authorization: Bearer $TOKEN" -H "X-Organization: $ORG_ID" -H "Content-Type: application/json" -d '{"name":"Test Company","industry":"Tech"}' http://localhost:8000/api/companies/
```

**Step 3: Start frontend and verify pages**

```bash
cd frontend && npm run dev
```

Navigate to:
- `/companies` — list page
- `/companies/{id}` — detail page
- Check sidebar link
- Check global search includes companies
- Test chat AI tools

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A && git commit -m "feat(companies): complete companies module with all integrations"
```
