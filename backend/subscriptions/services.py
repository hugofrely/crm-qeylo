from django.utils import timezone
from contacts.models import Contact
from deals.models import Pipeline
from organizations.models import Membership
from ai_usage.models import AIUsageLog
from .models import Subscription
from .quotas import PLAN_QUOTAS


def _get_plan(organization):
    try:
        return organization.subscription.plan
    except Subscription.DoesNotExist:
        return "solo"


def _get_quota(organization):
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
        "contacts": {"current": contact_count, "limit": quota["max_contacts"]},
        "pipelines": {"current": pipeline_count, "limit": quota["max_pipelines"]},
        "users": {"current": member_count, "limit": quota["max_users"]},
        "ai_messages": {"current": ai_message_count, "limit": quota["max_ai_messages_per_month"]},
        "features": quota["features"],
    }
