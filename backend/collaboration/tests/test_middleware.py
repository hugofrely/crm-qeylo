import uuid

import pytest
from channels.testing import WebsocketCommunicator
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.routing import URLRouter
from django.test import override_settings
from django.urls import re_path

from collaboration.middleware import JWTAuthMiddleware

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

pytestmark = pytest.mark.usefixtures("_channel_layers")


@pytest.fixture
def _channel_layers(settings):
    settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS


class EchoConsumer(AsyncJsonWebsocketConsumer):
    """Simple consumer that accepts and echoes back scope info."""

    async def connect(self):
        await self.accept()
        await self.send_json(
            {
                "user": str(self.scope["user"]) if self.scope.get("user") else None,
                "organization": (
                    str(self.scope["organization"].id)
                    if self.scope.get("organization")
                    else None
                ),
            }
        )


def _make_application():
    return JWTAuthMiddleware(
        URLRouter([re_path(r"^ws/test/$", EchoConsumer.as_asgi())])
    )


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_valid_membership_sets_organization(user_with_org):
    user, org, token_str = user_with_org
    app = _make_application()
    communicator = WebsocketCommunicator(
        app, f"/ws/test/?token={token_str}&org={org.id}"
    )
    connected, _ = await communicator.connect()
    assert connected

    response = await communicator.receive_json_from()
    assert response["organization"] == str(org.id)

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_invalid_org_uuid_sets_none(user_with_org):
    _user, _org, token_str = user_with_org
    app = _make_application()
    communicator = WebsocketCommunicator(
        app, f"/ws/test/?token={token_str}&org=not-a-uuid"
    )
    connected, _ = await communicator.connect()
    assert connected

    response = await communicator.receive_json_from()
    assert response["organization"] is None

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_wrong_org_uuid_sets_none(user_with_org):
    _user, _org, token_str = user_with_org
    random_uuid = str(uuid.uuid4())
    app = _make_application()
    communicator = WebsocketCommunicator(
        app, f"/ws/test/?token={token_str}&org={random_uuid}"
    )
    connected, _ = await communicator.connect()
    assert connected

    response = await communicator.receive_json_from()
    assert response["organization"] is None

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_no_org_param_sets_none(user_with_org):
    _user, _org, token_str = user_with_org
    app = _make_application()
    communicator = WebsocketCommunicator(
        app, f"/ws/test/?token={token_str}"
    )
    connected, _ = await communicator.connect()
    assert connected

    response = await communicator.receive_json_from()
    assert response["organization"] is None

    await communicator.disconnect()
