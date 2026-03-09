# WebSocket Organization Security

**Date**: 2026-03-09
**Status**: Approved

## Problem

WebSocket connections only verify JWT authentication but do not check organization membership. An authenticated user can connect to any entity's collaboration channel regardless of organization, bypassing the isolation enforced by HTTP endpoints via `request.organization`.

### Current state

- `JWTAuthMiddleware` validates token and sets `scope["user"]`
- `CollaborationConsumer` joins group `{entity_type}_{entity_id}` without org check
- `NotificationConsumer` joins group `user_{user_id}` without org check
- HTTP endpoints filter all queries by `request.organization` (set via `X-Organization` header)

## Design

### Approach: Organization-aware WebSocket middleware

Extend `JWTAuthMiddleware` to resolve organization from query params and inject `scope["organization"]`, then validate in each consumer.

### 1. Middleware (`collaboration/middleware.py`)

- Frontend passes `org` query param alongside `token`: `?token=xxx&org=uuid`
- New async helper `get_organization_for_user(user, org_id)` checks `Membership` exists
- Sets `scope["organization"]` to the `Organization` object or `None`

### 2. CollaborationConsumer

- Check `scope["organization"]` exists, otherwise `close()`
- Resolve entity via mapping `entity_type` -> Django model
- Verify `entity.organization_id == scope["organization"].id`
- If mismatch -> `close()`
- Group name becomes `{org_id}_{entity_type}_{entity_id}` to prevent collision

Entity model mapping:
```python
ENTITY_MODELS = {
    "contact": ("contacts", "Contact"),
    "deal": ("deals", "Deal"),
    "task": ("tasks", "Task"),
}
```

### 3. NotificationConsumer

- Check `scope["organization"]` exists, otherwise `close()`
- Group name becomes `org_{org_id}_user_{user_id}`

### 4. Frontend (`hooks/useWebSocket.ts`)

- Read `organization_id` from cookie (same source as `apiFetch`)
- Append `&org={orgId}` to WebSocket URL

### 5. Broadcast updates

Update `broadcast_to_entity()` in `views.py` to use new group name format `{org_id}_{entity_type}_{entity_id}`.

Update notification sends to use `org_{org_id}_user_{user_id}`.

## Out of scope

- Private comment filtering (separate concern)
- WebSocket rate limiting (future improvement)
