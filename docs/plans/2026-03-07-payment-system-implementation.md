# Payment System & Quotas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Stripe subscriptions with quota enforcement across the CRM, plus a billing UI in organization settings.

**Architecture:** Stripe-centric approach — Stripe manages subscriptions, checkout, and invoices. Django stores a lightweight `Subscription` model for quota enforcement. Frontend adds billing section to `/settings/organization` for owners/admins.

**Tech Stack:** Django 5.1 + DRF, Stripe Python SDK, Next.js 16 + React 19 + TypeScript, Tailwind/shadcn

---

### Task 1: Install stripe package and add env vars

**Files:**
- Modify: `backend/requirements.txt` (or `pyproject.toml` — check which exists)
- Modify: `backend/config/settings.py`
- Modify: `.env`

**Step 1: Check dependency management file**

Run: `ls backend/requirements.txt backend/pyproject.toml 2>/dev/null`

**Step 2: Add stripe dependency**

Add `stripe>=8.0.0,<9.0.0` to the dependency file.

**Step 3: Add Stripe settings to `backend/config/settings.py`**

At the bottom of the file, add:

```python
# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRO_PRICE_ID = os.environ.get("STRIPE_PRO_PRICE_ID", "")
STRIPE_TEAM_PRICE_ID = os.environ.get("STRIPE_TEAM_PRICE_ID", "")
```

**Step 4: Add placeholder env vars to `.env`**

```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_TEAM_PRICE_ID=price_xxx
```

**Step 5: Install dependency**

Run: `cd backend && pip install stripe`

**Step 6: Commit**

```bash
git add -A && git commit -m "chore: add stripe dependency and settings"
```

---

### Task 2: Create subscriptions Django app with Subscription model

**Files:**
- Create: `backend/subscriptions/__init__.py`
- Create: `backend/subscriptions/models.py`
- Create: `backend/subscriptions/admin.py`
- Create: `backend/subscriptions/apps.py`
- Modify: `backend/config/settings.py` (add to INSTALLED_APPS)

**Step 1: Create the app directory**

Run: `cd backend && python manage.py startapp subscriptions`

**Step 2: Write the Subscription model in `backend/subscriptions/models.py`**

```python
import uuid
from django.db import models


class Subscription(models.Model):
    class Plan(models.TextChoices):
        SOLO = "solo", "Solo"
        PRO = "pro", "Pro"
        TEAM = "team", "Equipe"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELED = "canceled", "Canceled"
        UNPAID = "unpaid", "Unpaid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.OneToOneField(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default="")
    plan = models.CharField(
        max_length=10, choices=Plan.choices, default=Plan.SOLO
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE
    )
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name} - {self.plan} ({self.status})"
```

**Step 3: Register in admin `backend/subscriptions/admin.py`**

```python
from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("organization", "plan", "status", "current_period_end")
    list_filter = ("plan", "status")
    search_fields = ("organization__name",)
```

**Step 4: Add `"subscriptions"` to `INSTALLED_APPS` in `backend/config/settings.py`**

Add it after `"ai_usage"` in the Local apps section.

**Step 5: Create and run migration**

Run: `cd backend && python manage.py makemigrations subscriptions && python manage.py migrate`

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: create subscriptions app with Subscription model"
```

---

### Task 3: Create plan quotas configuration

**Files:**
- Create: `backend/subscriptions/quotas.py`

**Step 1: Write the quotas config**

```python
PLAN_QUOTAS = {
    "solo": {
        "max_contacts": 100,
        "max_pipelines": 1,
        "max_pipeline_stages": 6,
        "max_users": 1,
        "max_ai_messages_per_month": 50,
        "features": {
            "custom_stages": False,
            "dynamic_segments": False,
            "products_catalog": False,
            "duplicate_detection": False,
            "workflows": False,
            "email_templates": False,
            "email_integration": False,
            "csv_import_export": False,
            "advanced_dashboard": False,
            "custom_reports": False,
            "conversion_funnel": False,
            "api_access": False,
            "team_assignment": False,
            "priority_support": False,
            "dedicated_onboarding": False,
        },
    },
    "pro": {
        "max_contacts": None,
        "max_pipelines": None,
        "max_pipeline_stages": None,
        "max_users": 1,
        "max_ai_messages_per_month": None,
        "features": {
            "custom_stages": True,
            "dynamic_segments": True,
            "products_catalog": True,
            "duplicate_detection": True,
            "workflows": True,
            "email_templates": True,
            "email_integration": True,
            "csv_import_export": True,
            "advanced_dashboard": True,
            "custom_reports": True,
            "conversion_funnel": True,
            "api_access": False,
            "team_assignment": False,
            "priority_support": True,
            "dedicated_onboarding": False,
        },
    },
    "team": {
        "max_contacts": None,
        "max_pipelines": None,
        "max_pipeline_stages": None,
        "max_users": None,
        "max_ai_messages_per_month": None,
        "features": {
            "custom_stages": True,
            "dynamic_segments": True,
            "products_catalog": True,
            "duplicate_detection": True,
            "workflows": True,
            "email_templates": True,
            "email_integration": True,
            "csv_import_export": True,
            "advanced_dashboard": True,
            "custom_reports": True,
            "conversion_funnel": True,
            "api_access": True,
            "team_assignment": True,
            "priority_support": True,
            "dedicated_onboarding": True,
        },
    },
}
```

**Step 2: Commit**

```bash
git add backend/subscriptions/quotas.py && git commit -m "feat: add plan quotas configuration"
```

---

### Task 4: Create QuotaService

**Files:**
- Create: `backend/subscriptions/services.py`

**Step 1: Write the QuotaService**

```python
from django.utils import timezone
from contacts.models import Contact
from deals.models import Pipeline
from organizations.models import Membership
from ai_usage.models import AIUsageLog
from .models import Subscription
from .quotas import PLAN_QUOTAS


def _get_plan(organization):
    """Return the plan string for an organization, defaulting to solo."""
    try:
        return organization.subscription.plan
    except Subscription.DoesNotExist:
        return "solo"


def _get_quota(organization):
    """Return the quota dict for an organization's current plan."""
    return PLAN_QUOTAS[_get_plan(organization)]


def check_can_create_contact(organization):
    quota = _get_quota(organization)
    limit = quota["max_contacts"]
    if limit is None:
        return True
    current = Contact.objects.filter(organization=organization).count()
    return current < limit


def check_can_create_pipeline(organization):
    quota = _get_quota(organization)
    limit = quota["max_pipelines"]
    if limit is None:
        return True
    current = Pipeline.objects.filter(organization=organization).count()
    return current < limit


def check_can_send_ai_message(organization):
    quota = _get_quota(organization)
    limit = quota["max_ai_messages_per_month"]
    if limit is None:
        return True
    now = timezone.now()
    current = AIUsageLog.objects.filter(
        organization=organization,
        call_type=AIUsageLog.CallType.CHAT,
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()
    return current < limit


def check_can_add_member(organization):
    quota = _get_quota(organization)
    limit = quota["max_users"]
    if limit is None:
        return True
    current = Membership.objects.filter(organization=organization).count()
    return current < limit


def check_feature_enabled(organization, feature):
    quota = _get_quota(organization)
    return quota["features"].get(feature, False)


def get_usage_summary(organization):
    """Return current usage vs limits for the frontend."""
    quota = _get_quota(organization)
    now = timezone.now()

    contact_count = Contact.objects.filter(organization=organization).count()
    pipeline_count = Pipeline.objects.filter(organization=organization).count()
    member_count = Membership.objects.filter(organization=organization).count()
    ai_message_count = AIUsageLog.objects.filter(
        organization=organization,
        call_type=AIUsageLog.CallType.CHAT,
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()

    return {
        "plan": _get_plan(organization),
        "contacts": {
            "current": contact_count,
            "limit": quota["max_contacts"],
        },
        "pipelines": {
            "current": pipeline_count,
            "limit": quota["max_pipelines"],
        },
        "users": {
            "current": member_count,
            "limit": quota["max_users"],
        },
        "ai_messages": {
            "current": ai_message_count,
            "limit": quota["max_ai_messages_per_month"],
        },
        "features": quota["features"],
    }
```

**Step 2: Commit**

```bash
git add backend/subscriptions/services.py && git commit -m "feat: add QuotaService for plan enforcement"
```

---

### Task 5: Create Subscription auto-creation on Organization creation

**Files:**
- Modify: `backend/organizations/views.py:60-64` (in `organization_list` POST handler)

**Step 1: Add Subscription creation after Organization creation**

In `backend/organizations/views.py`, after line 63 (`OrganizationSettings.objects.create(organization=org)`), add:

```python
from subscriptions.models import Subscription
Subscription.objects.create(organization=org)
```

Move the import to the top of the file with the other imports.

**Step 2: Create a data migration to create Subscription for existing organizations**

Run: `cd backend && python manage.py makemigrations subscriptions --empty -n create_subscriptions_for_existing_orgs`

Edit the generated migration:

```python
from django.db import migrations


def create_subscriptions(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Subscription = apps.get_model("subscriptions", "Subscription")
    for org in Organization.objects.all():
        Subscription.objects.get_or_create(
            organization=org,
            defaults={"plan": "solo", "status": "active"},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_initial"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_subscriptions, migrations.RunPython.noop),
    ]
```

Run: `cd backend && python manage.py migrate`

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: auto-create Subscription on org creation + backfill"
```

---

### Task 6: Enforce quotas in existing views

**Files:**
- Modify: `backend/contacts/views.py:22-26` (ContactViewSet.perform_create)
- Modify: `backend/deals/views.py:29-57` (PipelineViewSet.create)
- Modify: `backend/chat/views.py` (chat message sending endpoint)
- Modify: `backend/organizations/views.py:84-100` (invite_member)
- Modify: `backend/segments/views.py` (SegmentViewSet — gate with `dynamic_segments` feature)
- Modify: `backend/workflows/views.py` (WorkflowViewSet — gate with `workflows` feature)
- Modify: `backend/products/views.py` (ProductViewSet — gate with `products_catalog` feature)
- Modify: `backend/emails/views.py` (email views — gate with `email_integration` feature)

**Step 1: Create a reusable quota check helper**

Create `backend/subscriptions/permissions.py`:

```python
from rest_framework.exceptions import PermissionDenied
from . import services


def require_can_create_contact(organization):
    if not services.check_can_create_contact(organization):
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de contacts pour votre plan.",
            "limit": services._get_quota(organization)["max_contacts"],
            "current": services._get_quota(organization)["max_contacts"],
            "upgrade_required": "pro",
        })


def require_can_create_pipeline(organization):
    if not services.check_can_create_pipeline(organization):
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de pipelines pour votre plan.",
            "limit": services._get_quota(organization)["max_pipelines"],
            "current": services._get_quota(organization)["max_pipelines"],
            "upgrade_required": "pro",
        })


def require_can_send_ai_message(organization):
    if not services.check_can_send_ai_message(organization):
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de messages IA pour ce mois.",
            "limit": services._get_quota(organization)["max_ai_messages_per_month"],
            "upgrade_required": "pro",
        })


def require_can_add_member(organization):
    if not services.check_can_add_member(organization):
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite d'utilisateurs pour votre plan.",
            "limit": services._get_quota(organization)["max_users"],
            "upgrade_required": "team",
        })


def require_feature(organization, feature, upgrade_to="pro"):
    if not services.check_feature_enabled(organization, feature):
        raise PermissionDenied({
            "error": "feature_not_available",
            "detail": f"Cette fonctionnalite n'est pas disponible dans votre plan.",
            "feature": feature,
            "upgrade_required": upgrade_to,
        })
```

**Step 2: Add quota check to ContactViewSet.perform_create**

In `backend/contacts/views.py`, modify `perform_create`:

```python
def perform_create(self, serializer):
    from subscriptions.permissions import require_can_create_contact
    require_can_create_contact(self.request.organization)
    serializer.save(
        organization=self.request.organization,
        created_by=self.request.user,
    )
```

**Step 3: Add quota check to PipelineViewSet.create**

In `backend/deals/views.py`, at the top of the `create` method (line 30), add:

```python
from subscriptions.permissions import require_can_create_pipeline
require_can_create_pipeline(request.organization)
```

**Step 4: Add quota check to chat message sending**

Find the chat message creation endpoint in `backend/chat/views.py`. Before the AI call, add:

```python
from subscriptions.permissions import require_can_send_ai_message
require_can_send_ai_message(request.organization)
```

**Step 5: Add quota check to invite_member**

In `backend/organizations/views.py`, after the role validation (line 99), add:

```python
from subscriptions.permissions import require_can_add_member
require_can_add_member(org)
```

**Step 6: Add feature gates to segments, workflows, products, emails**

For each feature-gated view, add a check in the `create` method or `perform_create`:

- `backend/segments/views.py` — add `require_feature(self.request.organization, "dynamic_segments")` in `perform_create`
- `backend/workflows/views.py` — add `require_feature(self.request.organization, "workflows")` in create
- `backend/products/views.py` — add `require_feature(self.request.organization, "products_catalog")` in `perform_create`
- `backend/emails/views.py` — add `require_feature(self.request.organization, "email_integration")` in the connect endpoint

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: enforce plan quotas across all views"
```

---

### Task 7: Create Stripe checkout and subscription API endpoints

**Files:**
- Create: `backend/subscriptions/views.py`
- Create: `backend/subscriptions/serializers.py`
- Create: `backend/subscriptions/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Write serializers in `backend/subscriptions/serializers.py`**

```python
from rest_framework import serializers
from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = [
            "plan",
            "status",
            "current_period_end",
            "cancel_at_period_end",
            "created_at",
        ]
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=["pro", "team"])
```

**Step 2: Write views in `backend/subscriptions/views.py`**

```python
import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from organizations.models import Membership
from .models import Subscription
from .serializers import SubscriptionSerializer, CheckoutSerializer
from . import services

stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_MAP = {
    "pro": settings.STRIPE_PRO_PRICE_ID,
    "team": settings.STRIPE_TEAM_PRICE_ID,
}


def _check_owner_or_admin(request):
    """Return True if user is owner or admin of current org."""
    membership = Membership.objects.filter(
        organization=request.organization, user=request.user
    ).first()
    return membership and membership.role in ("owner", "admin")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def subscription_detail(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    sub, _ = Subscription.objects.get_or_create(
        organization=request.organization,
        defaults={"plan": "solo", "status": "active"},
    )
    return Response(SubscriptionSerializer(sub).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_summary(request):
    summary = services.get_usage_summary(request.organization)
    return Response(summary)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    serializer = CheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    plan = serializer.validated_data["plan"]
    price_id = PRICE_MAP[plan]

    sub, _ = Subscription.objects.get_or_create(
        organization=request.organization,
        defaults={"plan": "solo", "status": "active"},
    )

    # Create or retrieve Stripe customer
    if not sub.stripe_customer_id:
        customer = stripe.Customer.create(
            email=request.user.email,
            metadata={
                "organization_id": str(request.organization.id),
                "organization_name": request.organization.name,
            },
        )
        sub.stripe_customer_id = customer.id
        sub.save(update_fields=["stripe_customer_id"])
    else:
        customer_id = sub.stripe_customer_id

    # If already subscribed, create a billing portal session for plan change
    if sub.stripe_subscription_id:
        session = stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings/organization",
        )
        return Response({"url": session.url})

    # Create checkout session for new subscription
    frontend_url = settings.FRONTEND_URL
    session = stripe.checkout.Session.create(
        customer=sub.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{frontend_url}/settings/organization?checkout=success",
        cancel_url=f"{frontend_url}/settings/organization?checkout=cancel",
        metadata={
            "organization_id": str(request.organization.id),
            "plan": plan,
        },
    )
    return Response({"url": session.url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def downgrade(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_subscription_id:
        return Response(
            {"detail": "Aucun abonnement actif."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_plan = request.data.get("plan", "solo")

    if target_plan == "solo":
        # Cancel at period end
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        sub.cancel_at_period_end = True
        sub.save(update_fields=["cancel_at_period_end"])
    elif target_plan == "pro" and sub.plan == "team":
        # Downgrade from team to pro at period end
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[{
                "id": stripe_sub["items"]["data"][0].id,
                "price": PRICE_MAP["pro"],
            }],
            proration_behavior="none",
        )

    return Response({"detail": "Downgrade programme en fin de cycle."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_subscription_id:
        return Response(
            {"detail": "Aucun abonnement actif."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        cancel_at_period_end=True,
    )
    sub.cancel_at_period_end = True
    sub.save(update_fields=["cancel_at_period_end"])
    return Response({"detail": "Abonnement annule en fin de cycle."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reactivate_subscription(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_subscription_id:
        return Response(
            {"detail": "Aucun abonnement actif."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    stripe.Subscription.modify(
        sub.stripe_subscription_id,
        cancel_at_period_end=False,
    )
    sub.cancel_at_period_end = False
    sub.save(update_fields=["cancel_at_period_end"])
    return Response({"detail": "Abonnement reactive."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def invoices(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_customer_id:
        return Response([])

    stripe_invoices = stripe.Invoice.list(
        customer=sub.stripe_customer_id, limit=12
    )
    result = []
    for inv in stripe_invoices.data:
        result.append({
            "id": inv.id,
            "date": inv.created,
            "amount": inv.amount_paid / 100,
            "currency": inv.currency,
            "status": inv.status,
            "pdf_url": inv.invoice_pdf,
        })
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_method(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_customer_id:
        return Response(None)

    methods = stripe.PaymentMethod.list(
        customer=sub.stripe_customer_id, type="card"
    )
    if not methods.data:
        return Response(None)

    card = methods.data[0].card
    return Response({
        "brand": card.brand,
        "last4": card.last4,
        "exp_month": card.exp_month,
        "exp_year": card.exp_year,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_payment_method(request):
    if not _check_owner_or_admin(request):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sub = Subscription.objects.filter(
        organization=request.organization
    ).first()
    if not sub or not sub.stripe_customer_id:
        return Response(
            {"detail": "Aucun client Stripe."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings/organization",
    )
    return Response({"url": session.url})
```

**Step 3: Write URLs in `backend/subscriptions/urls.py`**

```python
from django.urls import path
from . import views

urlpatterns = [
    path("", views.subscription_detail, name="subscription-detail"),
    path("usage/", views.usage_summary, name="subscription-usage"),
    path("checkout/", views.create_checkout_session, name="subscription-checkout"),
    path("downgrade/", views.downgrade, name="subscription-downgrade"),
    path("cancel/", views.cancel_subscription, name="subscription-cancel"),
    path("reactivate/", views.reactivate_subscription, name="subscription-reactivate"),
    path("invoices/", views.invoices, name="subscription-invoices"),
    path("payment-method/", views.payment_method, name="subscription-payment-method"),
    path("update-payment-method/", views.update_payment_method, name="subscription-update-payment-method"),
]
```

**Step 4: Add to `backend/config/urls.py`**

Add before the last entry:

```python
path("api/subscriptions/", include("subscriptions.urls")),
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add subscription API endpoints (checkout, downgrade, invoices, etc.)"
```

---

### Task 8: Create Stripe webhook handler

**Files:**
- Create: `backend/subscriptions/webhooks.py`
- Modify: `backend/subscriptions/urls.py`
- Modify: `backend/config/urls.py`

**Step 1: Write webhook handler in `backend/subscriptions/webhooks.py`**

```python
import stripe
from datetime import datetime, timezone as tz

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Subscription

stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_TO_PLAN = {}


def _build_price_to_plan():
    """Lazily build price-to-plan mapping from settings."""
    if not PRICE_TO_PLAN:
        if settings.STRIPE_PRO_PRICE_ID:
            PRICE_TO_PLAN[settings.STRIPE_PRO_PRICE_ID] = "pro"
        if settings.STRIPE_TEAM_PRICE_ID:
            PRICE_TO_PLAN[settings.STRIPE_TEAM_PRICE_ID] = "team"


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    _build_price_to_plan()
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data)
    elif event_type == "invoice.paid":
        _handle_invoice_paid(data)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_payment_failed(data)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data)

    return HttpResponse(status=200)


def _handle_checkout_completed(session):
    org_id = session.get("metadata", {}).get("organization_id")
    plan = session.get("metadata", {}).get("plan")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not org_id or not plan:
        return

    sub = Subscription.objects.filter(organization_id=org_id).first()
    if not sub:
        return

    sub.stripe_customer_id = customer_id
    sub.stripe_subscription_id = subscription_id
    sub.plan = plan
    sub.status = "active"
    sub.cancel_at_period_end = False

    # Fetch subscription to get period end
    stripe_sub = stripe.Subscription.retrieve(subscription_id)
    sub.current_period_end = datetime.fromtimestamp(
        stripe_sub.current_period_end, tz=tz.utc
    )
    sub.save()


def _handle_invoice_paid(invoice):
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    sub = Subscription.objects.filter(
        stripe_subscription_id=subscription_id
    ).first()
    if not sub:
        return

    stripe_sub = stripe.Subscription.retrieve(subscription_id)
    sub.status = "active"
    sub.current_period_end = datetime.fromtimestamp(
        stripe_sub.current_period_end, tz=tz.utc
    )
    sub.save(update_fields=["status", "current_period_end"])


def _handle_invoice_payment_failed(invoice):
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    sub = Subscription.objects.filter(
        stripe_subscription_id=subscription_id
    ).first()
    if sub:
        sub.status = "past_due"
        sub.save(update_fields=["status"])


def _handle_subscription_updated(stripe_sub):
    sub = Subscription.objects.filter(
        stripe_subscription_id=stripe_sub["id"]
    ).first()
    if not sub:
        return

    # Update plan based on price
    price_id = stripe_sub["items"]["data"][0]["price"]["id"]
    plan = PRICE_TO_PLAN.get(price_id, sub.plan)

    sub.plan = plan
    sub.status = stripe_sub["status"]
    sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
    sub.current_period_end = datetime.fromtimestamp(
        stripe_sub["current_period_end"], tz=tz.utc
    )
    sub.save()


def _handle_subscription_deleted(stripe_sub):
    sub = Subscription.objects.filter(
        stripe_subscription_id=stripe_sub["id"]
    ).first()
    if not sub:
        return

    sub.plan = "solo"
    sub.status = "active"
    sub.stripe_subscription_id = ""
    sub.current_period_end = None
    sub.cancel_at_period_end = False
    sub.save()
```

**Step 2: Add webhook URL to `backend/config/urls.py`**

Add before the subscriptions path:

```python
path("api/webhooks/stripe/", include("subscriptions.webhook_urls")),
```

**Step 3: Create `backend/subscriptions/webhook_urls.py`**

```python
from django.urls import path
from .webhooks import stripe_webhook

urlpatterns = [
    path("", stripe_webhook, name="stripe-webhook"),
]
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Stripe webhook handler"
```

---

### Task 9: Add FRONTEND_URL setting

**Files:**
- Modify: `backend/config/settings.py`

**Step 1: Check if FRONTEND_URL already exists in settings**

Run: `grep -n "FRONTEND_URL" backend/config/settings.py`

If it doesn't exist, add to settings:

```python
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
```

Also ensure it's in `.env`:
```
FRONTEND_URL=http://localhost:3000
```

**Step 2: Commit**

```bash
git add -A && git commit -m "chore: add FRONTEND_URL setting"
```

---

### Task 10: Create frontend subscription service

**Files:**
- Create: `frontend/services/subscriptions.ts`
- Create: `frontend/types/subscriptions.ts`

**Step 1: Write types in `frontend/types/subscriptions.ts`**

```typescript
export type Plan = "solo" | "pro" | "team"

export interface SubscriptionDetail {
  plan: Plan
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export interface UsageItem {
  current: number
  limit: number | null
}

export interface UsageSummary {
  plan: Plan
  contacts: UsageItem
  pipelines: UsageItem
  users: UsageItem
  ai_messages: UsageItem
  features: Record<string, boolean>
}

export interface Invoice {
  id: string
  date: number
  amount: number
  currency: string
  status: string
  pdf_url: string | null
}

export interface PaymentMethod {
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}
```

**Step 2: Write service in `frontend/services/subscriptions.ts`**

```typescript
import { apiFetch } from "@/lib/api"
import type {
  SubscriptionDetail,
  UsageSummary,
  Invoice,
  PaymentMethod,
} from "@/types/subscriptions"

export async function fetchSubscription(): Promise<SubscriptionDetail> {
  return apiFetch<SubscriptionDetail>("/subscriptions/")
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  return apiFetch<UsageSummary>("/subscriptions/usage/")
}

export async function createCheckoutSession(plan: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/subscriptions/checkout/", {
    method: "POST",
    body: JSON.stringify({ plan }),
  })
}

export async function downgradeSubscription(plan: string): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/downgrade/", {
    method: "POST",
    body: JSON.stringify({ plan }),
  })
}

export async function cancelSubscription(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/cancel/", {
    method: "POST",
  })
}

export async function reactivateSubscription(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/reactivate/", {
    method: "POST",
  })
}

export async function fetchInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>("/subscriptions/invoices/")
}

export async function fetchPaymentMethod(): Promise<PaymentMethod | null> {
  return apiFetch<PaymentMethod | null>("/subscriptions/payment-method/")
}

export async function updatePaymentMethod(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/subscriptions/update-payment-method/", {
    method: "POST",
  })
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add frontend subscription service and types"
```

---

### Task 11: Create billing section components

**Files:**
- Create: `frontend/components/settings/BillingSection.tsx`
- Create: `frontend/components/settings/PlanCard.tsx`
- Create: `frontend/components/settings/UsageBars.tsx`
- Create: `frontend/components/settings/PaymentMethodCard.tsx`
- Create: `frontend/components/settings/InvoiceList.tsx`
- Create: `frontend/components/settings/UpgradeModal.tsx`

**Step 1: Create PlanCard component**

`frontend/components/settings/PlanCard.tsx`:

Displays the current plan name, badge (Solo/Pro/Equipe), status, renewal date, cancel_at_period_end warning, and buttons:
- If Solo: "Passer a Pro" and "Passer a Equipe" buttons
- If Pro: "Passer a Equipe" button and "Annuler" link
- If Team: "Annuler" link
- If cancel_at_period_end: show "Reactiver" button

Use shadcn `Card`, `Badge`, `Button` components. Style with Tailwind.

**Step 2: Create UsageBars component**

`frontend/components/settings/UsageBars.tsx`:

Displays progress bars for each quota metric (contacts, pipelines, users, AI messages).
For each metric: show label, current/limit text, and a progress bar.
If limit is null, show "Illimite" instead of a bar.
Use shadcn `Progress` component if available, or a styled div.

**Step 3: Create PaymentMethodCard component**

`frontend/components/settings/PaymentMethodCard.tsx`:

Shows the current card brand icon, last 4 digits, expiry date.
Button "Modifier" that calls `updatePaymentMethod()` and redirects to Stripe portal.

**Step 4: Create InvoiceList component**

`frontend/components/settings/InvoiceList.tsx`:

Table with columns: Date, Montant, Statut, PDF.
Date formatted in French locale.
PDF link opens in new tab.
Use shadcn `Table` components.

**Step 5: Create UpgradeModal component**

`frontend/components/settings/UpgradeModal.tsx`:

Dialog with plan comparison (reuse data from pricing component).
Two columns: Pro and Equipe with features and price.
"Choisir" button calls `createCheckoutSession(plan)` and redirects to returned URL.
Use shadcn `Dialog` component.

**Step 6: Create BillingSection wrapper**

`frontend/components/settings/BillingSection.tsx`:

Fetches subscription, usage, payment method, and invoices on mount.
Renders PlanCard, UsageBars, PaymentMethodCard (if has payment method), InvoiceList (if has invoices).
Only renders for owner/admin (receives `userRole` prop).

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add billing section UI components"
```

---

### Task 12: Integrate billing section into organization settings page

**Files:**
- Modify: `frontend/app/(app)/settings/organization/page.tsx`

**Step 1: Add BillingSection to the page**

Import BillingSection and fetch user membership role. Add BillingSection as the first section, conditionally rendered for owner/admin roles:

```tsx
import BillingSection from "@/components/settings/BillingSection"
```

Inside the component, fetch the current user's membership to check role. Add before MembersSection:

```tsx
{orgId && userRole && ["owner", "admin"].includes(userRole) && (
  <BillingSection orgId={orgId} />
)}
```

Also add UsageBars (separate from billing) visible to all users, showing current quotas.

**Step 2: Handle checkout success/cancel URL params**

Check for `?checkout=success` or `?checkout=cancel` in URL params and show a toast notification.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: integrate billing section in organization settings"
```

---

### Task 13: Create upgrade wall component for quota errors

**Files:**
- Create: `frontend/components/UpgradeWall.tsx`
- Modify: `frontend/lib/api.ts` (optional: add global 403 handler)

**Step 1: Create UpgradeWall component**

A reusable toast/modal that appears when a 403 `quota_exceeded` error is returned.

```tsx
// Shows a toast with the error message and a "Voir les plans" button
// that navigates to /settings/organization
```

Use `sonner` toast (already in the project) for the notification.

**Step 2: Add quota error handling in API layer**

In relevant hooks/components that call create actions, catch 403 errors with `error.error === "quota_exceeded"` and show the UpgradeWall toast.

Alternatively, create a utility:

```typescript
export function handleQuotaError(error: any): boolean {
  if (error?.error === "quota_exceeded" || error?.error === "feature_not_available") {
    toast.error(error.detail, {
      action: {
        label: "Voir les plans",
        onClick: () => window.location.href = "/settings/organization",
      },
    })
    return true
  }
  return false
}
```

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add upgrade wall for quota exceeded errors"
```

---

### Task 14: Test the full flow manually

**Step 1: Set up Stripe test keys**

Configure real Stripe test keys in `.env`. Create products and prices in Stripe Dashboard (test mode).

**Step 2: Test upgrade flow**

1. Login as owner
2. Go to `/settings/organization`
3. Click upgrade to Pro
4. Complete Stripe Checkout with test card `4242 4242 4242 4242`
5. Verify webhook updates the subscription
6. Verify quotas are now Pro-level

**Step 3: Test quota enforcement**

1. Create a Solo account
2. Try to create more than 100 contacts — should get blocked
3. Try to access segments — should get feature blocked
4. Send 50+ AI messages — should get blocked

**Step 4: Test downgrade flow**

1. From Pro, click downgrade to Solo
2. Verify cancel_at_period_end is set
3. Verify data remains accessible in read-only mode

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: address issues found during manual testing"
```
