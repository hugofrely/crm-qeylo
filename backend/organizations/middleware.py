from organizations.models import Membership


class OrganizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        if hasattr(request, "user") and request.user.is_authenticated:
            org_id = request.headers.get("X-Organization")
            if org_id:
                membership = Membership.objects.filter(
                    user=request.user, organization_id=org_id
                ).select_related("organization").first()
                if membership:
                    request.organization = membership.organization
            if request.organization is None:
                membership = (
                    Membership.objects.filter(user=request.user)
                    .select_related("organization")
                    .first()
                )
                if membership:
                    request.organization = membership.organization
        return self.get_response(request)
