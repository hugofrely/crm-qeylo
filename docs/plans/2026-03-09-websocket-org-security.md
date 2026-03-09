# WebSocket Organization Security — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Secure WebSocket connections by verifying organization membership and entity ownership, matching the security enforced on HTTP endpoints.

**Architecture:** Extend `JWTAuthMiddleware` to resolve organization from query params and inject `scope["organization"]`. Each consumer validates org membership and entity access on connect. Broadcast functions include org in group names.

**Tech Stack:** Django Channels, channels-redis, Next.js (frontend hooks)

---

### Task 1: Extend middleware to resolve organization

**Files:**
- Modify: `backend/collaboration/middleware.py`

**Step 1: Write the failing test**

Create `backend/collaboration/tests/test_middleware.py`:

```python
import uuid
import pytest
from unittest.mock import AsyncMock, patch
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import re_path
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from collaboration.middleware import JWTAuthMiddleware


class EchoConsumer(AsyncJsonWebsocketConsumer):
    """Test consumer that accepts and echoes scope info."""
    async def connect(self):
        await self.accept()
        await self.send_json({
            "user": str(self.scope.get("user")),
            "organization": str(self.scope.get("organization")),
        })


application = JWTAuthMiddleware(
    URLRouter([re_path(r"ws/test/$", EchoConsumer.as_asgi())])
)


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_middleware_sets_organization_for_valid_membership(user_with_org):
    """Middleware should set scope['organization'] when user has membership."""
    user, org, token = user_with_org
    communicator = WebsocketCommunicator(application, f"/ws/test/?token={token}&org={org.id}")
    connected, _ = await communicator.connect()
    assert connected
    data = await communicator.receive_json_from()
    assert data["organization"] == str(org)
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_middleware_sets_none_org_for_invalid_membership(user_with_org):
    """Middleware should set scope['organization'] to None for wrong org."""
    user, org, token = user_with_org
    fake_org_id = str(uuid.uuid4())
    communicator = WebsocketCommunicator(application, f"/ws/test/?token={token}&org={fake_org_id}")
    connected, _ = await communicator.connect()
    assert connected
    data = await communicator.receive_json_from()
    assert data["organization"] == "None"
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_middleware_sets_none_org_when_no_org_param(user_with_org):
    """Middleware should set scope['organization'] to None when org param missing."""
    user, org, token = user_with_org
    communicator = WebsocketCommunicator(application, f"/ws/test/?token={token}")
    connected, _ = await communicator.connect()
    assert connected
    data = await communicator.receive_json_from()
    assert data["organization"] == "None"
    await communicator.disconnect()
```

**Step 2: Create test conftest**

Create `backend/collaboration/tests/__init__.py` (empty) and `backend/collaboration/tests/conftest.py`:

```python
import pytest
from rest_framework_simplejwt.tokens import AccessToken
from accounts.models import User
from organizations.models import Organization, Membership


@pytest.fixture
def user_with_org(db):
    """Create a user with an organization and return (user, org, token_str)."""
    user = User.objects.create_user(email="ws@test.com", password="testpass123")
    org = Organization.objects.create(name="Test Org")
    Membership.objects.create(user=user, organization=org, role="member")
    token = AccessToken.for_user(user)
    return user, org, str(token)
```

**Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest collaboration/tests/test_middleware.py -v`
Expected: FAIL — `scope["organization"]` not set yet.

**Step 4: Implement middleware changes**

Update `backend/collaboration/middleware.py`:

```python
import uuid as _uuid
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

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
    """Return Organization if user has membership, else None."""
    if not user or not org_id_str:
        return None
    try:
        org_uuid = _uuid.UUID(org_id_str)
    except (ValueError, AttributeError):
        return None
    from organizations.models import Membership
    membership = (
        Membership.objects.filter(user=user, organization_id=org_uuid)
        .select_related("organization")
        .first()
    )
    return membership.organization if membership else None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]
        org_id = params.get("org", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = None

        scope["organization"] = await get_organization_for_user(scope["user"], org_id)

        return await super().__call__(scope, receive, send)
```

**Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest collaboration/tests/test_middleware.py -v`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/collaboration/middleware.py backend/collaboration/tests/
git commit -m "feat(ws): add organization resolution to WebSocket middleware"
```

---

### Task 2: Secure CollaborationConsumer with entity validation

**Files:**
- Modify: `backend/collaboration/consumers.py`

**Step 1: Write the failing test**

Create `backend/collaboration/tests/test_consumers.py`:

```python
import uuid
import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import re_path

from collaboration.middleware import JWTAuthMiddleware
from collaboration.consumers import CollaborationConsumer, NotificationConsumer
from contacts.models import Contact
from organizations.models import Organization, Membership


application = JWTAuthMiddleware(
    URLRouter([
        re_path(
            r"ws/collaboration/(?P<entity_type>\w+)/(?P<entity_id>[0-9a-f-]+)/$",
            CollaborationConsumer.as_asgi(),
        ),
        re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
    ])
)


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_accepts_valid_org_and_entity(user_with_org):
    """Should accept connection when user belongs to org that owns the entity."""
    user, org, token = user_with_org
    contact = await create_contact(org, "Test Contact")
    communicator = WebsocketCommunicator(
        application,
        f"/ws/collaboration/contact/{contact.id}/?token={token}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert connected
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_wrong_org(user_with_org):
    """Should reject connection when entity belongs to different org."""
    user, org, token = user_with_org
    other_org = await create_org("Other Org")
    contact = await create_contact(other_org, "Secret Contact")
    communicator = WebsocketCommunicator(
        application,
        f"/ws/collaboration/contact/{contact.id}/?token={token}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert not connected


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_no_org(user_with_org):
    """Should reject connection when no org provided."""
    user, org, token = user_with_org
    contact = await create_contact(org, "Test Contact")
    communicator = WebsocketCommunicator(
        application,
        f"/ws/collaboration/contact/{contact.id}/?token={token}",
    )
    connected, _ = await communicator.connect()
    assert not connected


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_collaboration_rejects_nonexistent_entity(user_with_org):
    """Should reject connection when entity doesn't exist."""
    user, org, token = user_with_org
    fake_id = uuid.uuid4()
    communicator = WebsocketCommunicator(
        application,
        f"/ws/collaboration/contact/{fake_id}/?token={token}&org={org.id}",
    )
    connected, _ = await communicator.connect()
    assert not connected


# --- Helpers ---

from channels.db import database_sync_to_async

@database_sync_to_async
def create_contact(org, name):
    return Contact.objects.create(organization=org, first_name=name, last_name="Test")

@database_sync_to_async
def create_org(name):
    return Organization.objects.create(name=name)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest collaboration/tests/test_consumers.py -v`
Expected: FAIL — consumers don't check org yet.

**Step 3: Implement consumer changes**

Update `backend/collaboration/consumers.py`:

```python
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.apps import apps


ENTITY_MODELS = {
    "contact": ("contacts", "Contact"),
    "deal": ("deals", "Deal"),
    "task": ("tasks", "Task"),
}


@database_sync_to_async
def get_entity(entity_type, entity_id, organization_id):
    """Return entity if it belongs to the organization, else None."""
    model_info = ENTITY_MODELS.get(entity_type)
    if not model_info:
        return None
    model = apps.get_model(*model_info)
    return model.objects.filter(pk=entity_id, organization_id=organization_id).first()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.organization = self.scope.get("organization")
        if not self.user or not self.organization:
            await self.close()
            return

        self.group_name = f"org_{self.organization.id}_user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send_json(event["data"])


class CollaborationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.organization = self.scope.get("organization")
        if not self.user or not self.organization:
            await self.close()
            return

        self.entity_type = self.scope["url_route"]["kwargs"]["entity_type"]
        self.entity_id = self.scope["url_route"]["kwargs"]["entity_id"]

        # Verify entity belongs to user's organization
        entity = await get_entity(self.entity_type, self.entity_id, self.organization.id)
        if not entity:
            await self.close()
            return

        self.group_name = f"{self.organization.id}_{self.entity_type}_{self.entity_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_event(self, event):
        await self.send_json(event["data"])
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest collaboration/tests/test_consumers.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/collaboration/consumers.py backend/collaboration/tests/test_consumers.py
git commit -m "feat(ws): add org and entity validation to WebSocket consumers"
```

---

### Task 3: Update broadcast functions to use org-scoped group names

**Files:**
- Modify: `backend/collaboration/views.py`

**Step 1: Update `broadcast_to_entity`**

The function needs the `organization_id` parameter. All callers already have `request.organization` or `comment.organization_id` available.

Update `broadcast_to_entity` in `backend/collaboration/views.py`:

```python
def broadcast_to_entity(organization_id, entity_type, entity_id, event_type, data):
    channel_layer = get_channel_layer()
    group_name = f"{organization_id}_{entity_type}_{entity_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {"type": "comment.event", "data": {"event": event_type, **data}},
    )
```

**Step 2: Update `broadcast_to_user`**

```python
def broadcast_to_user(organization_id, user_id, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"org_{organization_id}_user_{user_id}",
        {"type": "notification.message", "data": data},
    )
```

**Step 3: Update all callers of `broadcast_to_entity`**

In `comment_list_create` (line 112):
```python
    broadcast_to_entity(
        str(org.id),
        comment.entity_type,
        str(comment.entity_id),
        "comment_created",
        {"comment": result_safe},
    )
```

In `comment_list_create` mention broadcasts (line 125):
```python
            broadcast_to_user(str(org.id), str(mid), {
```

In `comment_detail` DELETE (line 150):
```python
        broadcast_to_entity(str(request.organization.id), entity_type, entity_id, "comment_deleted", {"comment_id": str(pk)})
```

In `comment_detail` PATCH (line 176):
```python
    broadcast_to_entity(
        str(request.organization.id),
        comment.entity_type,
        str(comment.entity_id),
        "comment_updated",
        {"comment": _json_safe(result)},
    )
```

In `reaction_toggle` — all `broadcast_to_entity` calls (lines 204, 234):
```python
        broadcast_to_entity(
            str(request.organization.id),
            comment.entity_type,
            str(comment.entity_id),
            "reaction_updated",
            {"comment_id": str(comment_id), "reactions": ...},
        )
```

In `reaction_toggle` — `broadcast_to_user` call (line 225):
```python
        broadcast_to_user(str(request.organization.id), str(comment.author.id), {
```

**Step 4: Run existing tests (if any) and verify no regressions**

Run: `cd backend && python -m pytest collaboration/ -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/collaboration/views.py
git commit -m "feat(ws): scope broadcast group names by organization"
```

---

### Task 4: Update frontend to send organization ID in WebSocket URL

**Files:**
- Modify: `frontend/hooks/useWebSocket.ts`

**Step 1: Update useWebSocket hook**

Add `organization_id` cookie to WebSocket connection URL:

```typescript
"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import Cookies from "js-cookie"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

interface UseWebSocketOptions {
  path: string
  onMessage: (data: unknown) => void
  enabled?: boolean
}

export function useWebSocket({ path, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef(onMessage)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined)
  const [connected, setConnected] = useState(false)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return

    const token = Cookies.get("access_token")
    if (!token) return

    const orgId = Cookies.get("organization_id")
    if (!orgId) return

    const url = `${WS_URL}${path}?token=${token}&org=${orgId}`
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current(data)
      } catch {
        // ignore invalid JSON
      }
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [path, enabled])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
```

**Step 2: Commit**

```bash
git add frontend/hooks/useWebSocket.ts
git commit -m "feat(ws): send organization ID in WebSocket connection URL"
```

---

### Task 5: Manual integration test

**Step 1: Start backend and frontend locally**

Run: `docker compose up` (or local dev setup)

**Step 2: Verify collaboration channel**

1. Log in as user in Org A
2. Open a contact detail page (triggers WS connection to `/ws/collaboration/contact/{id}/`)
3. Verify WebSocket connects successfully (browser devtools Network > WS tab)
4. Verify the URL includes `&org={orgId}`

**Step 3: Verify notification channel**

1. Have another user in same org post a comment mentioning you
2. Verify real-time notification arrives via WebSocket

**Step 4: Verify cross-org rejection**

1. Manually craft a WebSocket URL with a different org's entity ID
2. Verify the connection is rejected (closed immediately)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(ws): secure WebSocket connections with organization validation"
```
