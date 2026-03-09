import uuid

from django.utils.functional import SimpleLazyObject
from organizations.models import Membership


def _get_organization(request):
    """Resolve the organization for the current request.

    Called lazily so that JWT authentication (which runs in the DRF view
    layer, after all middleware) has already set ``request.user``.
    """
    if not hasattr(request, "user") or not request.user.is_authenticated:
        return None

    org_id = request.headers.get("X-Organization")
    if org_id:
        try:
            uuid.UUID(org_id)
        except (ValueError, AttributeError):
            org_id = None

    if org_id:
        membership = Membership.objects.filter(
            user=request.user, organization_id=org_id
        ).select_related("organization").first()
        if membership:
            return membership.organization

    membership = (
        Membership.objects.filter(user=request.user)
        .select_related("organization")
        .first()
    )
    if membership:
        return membership.organization

    return None


class OrganizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = SimpleLazyObject(
            lambda: _get_organization(request)
        )
        return self.get_response(request)
