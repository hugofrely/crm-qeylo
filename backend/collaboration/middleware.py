import uuid
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

from organizations.models import Membership

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token["user_id"])
    except Exception:
        return None


@database_sync_to_async
def get_organization_for_user(user, org_id_str):
    if not user or not org_id_str:
        return None
    try:
        org_uuid = uuid.UUID(org_id_str)
    except (ValueError, AttributeError):
        return None
    membership = (
        Membership.objects.filter(user=user, organization_id=org_uuid)
        .select_related("organization")
        .first()
    )
    if membership:
        return membership.organization
    return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = None

        org_id_str = params.get("org", [None])[0]
        scope["organization"] = await get_organization_for_user(
            scope["user"], org_id_str
        )

        return await super().__call__(scope, receive, send)
