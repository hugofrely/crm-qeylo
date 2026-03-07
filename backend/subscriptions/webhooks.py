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
