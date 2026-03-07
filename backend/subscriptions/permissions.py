from rest_framework.exceptions import PermissionDenied
from . import services
from .quotas import PLAN_QUOTAS


def _get_quota(organization):
    return PLAN_QUOTAS[services._get_plan(organization)]


def require_can_create_contact(organization):
    if not services.check_can_create_contact(organization):
        quota = _get_quota(organization)
        from contacts.models import Contact
        current = Contact.objects.filter(organization=organization).count()
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de contacts pour votre plan.",
            "limit": quota["max_contacts"],
            "current": current,
            "upgrade_required": "pro",
        })


def require_can_create_pipeline(organization):
    if not services.check_can_create_pipeline(organization):
        quota = _get_quota(organization)
        from deals.models import Pipeline
        current = Pipeline.objects.filter(organization=organization).count()
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de pipelines pour votre plan.",
            "limit": quota["max_pipelines"],
            "current": current,
            "upgrade_required": "pro",
        })


def require_can_send_ai_message(organization):
    if not services.check_can_send_ai_message(organization):
        quota = _get_quota(organization)
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite de messages IA pour ce mois.",
            "limit": quota["max_ai_messages_per_month"],
            "upgrade_required": "pro",
        })


def require_can_add_member(organization):
    if not services.check_can_add_member(organization):
        quota = _get_quota(organization)
        raise PermissionDenied({
            "error": "quota_exceeded",
            "detail": "Vous avez atteint la limite d'utilisateurs pour votre plan.",
            "limit": quota["max_users"],
            "upgrade_required": "team",
        })


def require_feature(organization, feature, upgrade_to="pro"):
    if not services.check_feature_enabled(organization, feature):
        raise PermissionDenied({
            "error": "feature_not_available",
            "detail": "Cette fonctionnalite n'est pas disponible dans votre plan.",
            "feature": feature,
            "upgrade_required": upgrade_to,
        })
