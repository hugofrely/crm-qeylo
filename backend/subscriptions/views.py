import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
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
    if not request.organization:
        return False
    return Membership.objects.filter(
        organization=request.organization,
        user=request.user,
        role__in=["owner", "admin"],
    ).exists()


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

    if sub.stripe_subscription_id:
        session = stripe.billing_portal.Session.create(
            customer=sub.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings/organization",
        )
        return Response({"url": session.url})

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

    sub = Subscription.objects.filter(organization=request.organization).first()
    if not sub or not sub.stripe_subscription_id:
        return Response(
            {"detail": "Aucun abonnement actif."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_plan = request.data.get("plan", "solo")

    if target_plan == "solo":
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )
        sub.cancel_at_period_end = True
        sub.save(update_fields=["cancel_at_period_end"])
    elif target_plan == "pro" and sub.plan == "team":
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

    sub = Subscription.objects.filter(organization=request.organization).first()
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

    sub = Subscription.objects.filter(organization=request.organization).first()
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

    sub = Subscription.objects.filter(organization=request.organization).first()
    if not sub or not sub.stripe_customer_id:
        return Response([])

    stripe_invoices = stripe.Invoice.list(customer=sub.stripe_customer_id, limit=12)
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

    sub = Subscription.objects.filter(organization=request.organization).first()
    if not sub or not sub.stripe_customer_id:
        return Response(None)

    methods = stripe.PaymentMethod.list(customer=sub.stripe_customer_id, type="card")
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

    sub = Subscription.objects.filter(organization=request.organization).first()
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
