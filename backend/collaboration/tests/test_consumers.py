import uuid

import pytest
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.urls import re_path

from collaboration.consumers import CollaborationConsumer, NotificationConsumer
from collaboration.middleware import JWTAuthMiddleware
from contacts.models import Contact
from organizations.models import Organization

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

pytestmark = pytest.mark.usefixtures("_channel_layers")


@pytest.fixture
def _channel_layers(settings):
    settings.CHANNEL_LAYERS = TEST_CHANNEL_LAYERS


def _make_application():
    return JWTAuthMiddleware(
        URLRouter(
            [
                re_path(
                    r"^ws/notifications/$",
                    NotificationConsumer.as_asgi(),
                ),
                re_path(
                    r"^ws/collaboration/(?P<entity_type>\w+)/(?P<entity_id>[0-9a-f-]+)/$",
                    CollaborationConsumer.as_asgi(),
                ),
            ]
        )
    )


# ── CollaborationConsumer tests ──────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_accepts_valid_org_and_entity(user_with_org):
    user, org, token_str = user_with_org
    contact = await _create_contact(org, user)

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/collaboration/contact/{contact.id}/?token={token_str}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert connected

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_wrong_org(user_with_org):
    user, org, token_str = user_with_org
    other_org = await _create_org("Other Org", "other-org")
    contact = await _create_contact(other_org, user)

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/collaboration/contact/{contact.id}/?token={token_str}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert not connected

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_no_org(user_with_org):
    user, org, token_str = user_with_org
    contact = await _create_contact(org, user)

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/collaboration/contact/{contact.id}/?token={token_str}",
    )
    connected, _ = await communicator.connect()
    assert not connected

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_nonexistent_entity(user_with_org):
    _user, org, token_str = user_with_org
    fake_id = uuid.uuid4()

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/collaboration/contact/{fake_id}/?token={token_str}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert not connected

    await communicator.disconnect()


# ── NotificationConsumer tests ───────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_accepts_valid_org(user_with_org):
    _user, org, token_str = user_with_org

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/notifications/?token={token_str}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert connected

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_notification_rejects_no_org(user_with_org):
    _user, _org, token_str = user_with_org

    app = _make_application()
    communicator = WebsocketCommunicator(
        app,
        f"/ws/notifications/?token={token_str}",
    )
    connected, _ = await communicator.connect()
    assert not connected

    await communicator.disconnect()


# ── Helpers ──────────────────────────────────────────────────────────────

from channels.db import database_sync_to_async  # noqa: E402


@database_sync_to_async
def _create_contact(org, user):
    return Contact.objects.create(
        organization=org,
        created_by=user,
        first_name="Test",
        last_name="Contact",
    )


@database_sync_to_async
def _create_org(name, slug):
    return Organization.objects.create(name=name, slug=slug)
