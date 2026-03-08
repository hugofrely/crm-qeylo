# Collaboration Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add @mentions, internal comments with emoji reactions, real-time WebSocket notifications, and note sharing with privacy controls to the CRM.

**Architecture:** New Django app `collaboration` with `Comment`, `Mention`, `Reaction` models. Django Channels + Redis for WebSocket (notifications + live comment updates). Frontend extends existing Tiptap editor with mention autocomplete. Comments displayed as a new tab on contact/deal/task detail pages.

**Tech Stack:** Django Channels, channels-redis, Tiptap Mention extension, WebSocket API (browser native), existing Redis infrastructure.

---

## Task 1: Backend — Create `collaboration` Django app with models

**Files:**
- Create: `backend/collaboration/__init__.py`
- Create: `backend/collaboration/apps.py`
- Create: `backend/collaboration/models.py`
- Create: `backend/collaboration/admin.py`
- Modify: `backend/config/settings.py:20-54` (add to INSTALLED_APPS)

**Step 1: Create the Django app structure**

```bash
cd backend && python manage.py startapp collaboration
```

**Step 2: Write models**

Replace `backend/collaboration/models.py` with:

```python
import uuid
from django.db import models
from django.conf import settings


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField()
    is_private = models.BooleanField(default=False)

    # Linked entity (one of these will be set)
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )

    mentioned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Mention",
        related_name="mentioned_in_comments",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.created_at:%Y-%m-%d}"

    @property
    def entity_type(self):
        if self.contact_id:
            return "contact"
        if self.deal_id:
            return "deal"
        if self.task_id:
            return "task"
        return None

    @property
    def entity_id(self):
        return self.contact_id or self.deal_id or self.task_id


class Mention(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="mentions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="mentions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("comment", "user")

    def __str__(self):
        return f"@{self.user} in comment {self.comment_id}"


class Reaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("comment", "user", "emoji")

    def __str__(self):
        return f"{self.emoji} by {self.user} on comment {self.comment_id}"
```

**Step 3: Register in admin**

Replace `backend/collaboration/admin.py`:

```python
from django.contrib import admin
from .models import Comment, Mention, Reaction

admin.site.register(Comment)
admin.site.register(Mention)
admin.site.register(Reaction)
```

**Step 4: Add to INSTALLED_APPS**

In `backend/config/settings.py`, add `"collaboration"` after `"calendars"` in INSTALLED_APPS.

**Step 5: Run migrations**

```bash
cd backend && python manage.py makemigrations collaboration && python manage.py migrate
```

**Step 6: Commit**

```bash
git add backend/collaboration/ backend/config/settings.py
git commit -m "feat(collaboration): add Comment, Mention, Reaction models"
```

---

## Task 2: Backend — Serializers for collaboration

**Files:**
- Create: `backend/collaboration/serializers.py`

**Step 1: Write serializers**

```python
import re
from rest_framework import serializers
from .models import Comment, Mention, Reaction


class ReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Reaction
        fields = ["id", "user", "user_name", "emoji", "created_at"]
        read_only_fields = ["id", "user", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class MentionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Mention
        fields = ["id", "user", "user_name", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.CharField(source="author.email", read_only=True)
    reactions = serializers.SerializerMethodField()
    mentions = MentionSerializer(source="mentions.all", many=True, read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "author", "author_name", "author_email",
            "content", "is_private",
            "contact", "deal", "task",
            "reactions", "mentions",
            "created_at", "updated_at", "edited_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at", "edited_at"]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email

    def get_reactions(self, obj):
        """Group reactions by emoji with count and user list."""
        reactions = obj.reactions.select_related("user").all()
        grouped = {}
        for r in reactions:
            if r.emoji not in grouped:
                grouped[r.emoji] = {"emoji": r.emoji, "count": 0, "users": []}
            grouped[r.emoji]["count"] += 1
            grouped[r.emoji]["users"].append({
                "id": str(r.user.id),
                "name": f"{r.user.first_name} {r.user.last_name}".strip() or r.user.email,
            })
        return list(grouped.values())


class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField()
    is_private = serializers.BooleanField(default=False)
    contact = serializers.UUIDField(required=False, allow_null=True)
    deal = serializers.UUIDField(required=False, allow_null=True)
    task = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        entity_fields = [data.get("contact"), data.get("deal"), data.get("task")]
        set_fields = [f for f in entity_fields if f is not None]
        if len(set_fields) != 1:
            raise serializers.ValidationError(
                "Exactement un champ parmi 'contact', 'deal', 'task' doit etre fourni."
            )
        return data


class ReactionCreateSerializer(serializers.Serializer):
    emoji = serializers.CharField(max_length=10)
```

**Step 2: Commit**

```bash
git add backend/collaboration/serializers.py
git commit -m "feat(collaboration): add serializers for comments and reactions"
```

---

## Task 3: Backend — Views and URL routing for collaboration

**Files:**
- Create: `backend/collaboration/views.py`
- Create: `backend/collaboration/urls.py`
- Create: `backend/collaboration/utils.py`
- Modify: `backend/config/urls.py:4-38` (add collaboration URL)
- Modify: `backend/notifications/models.py:7-14` (add new notification types)

**Step 1: Add notification types**

In `backend/notifications/models.py`, add these to the `Type` class:

```python
MENTION = "mention"
REACTION = "reaction"
NEW_COMMENT = "new_comment"
```

**Step 2: Create mention extraction utility**

Create `backend/collaboration/utils.py`:

```python
import re


def extract_mention_ids(html_content):
    """Extract user UUIDs from data-mention-id attributes in HTML content."""
    pattern = r'data-mention-id="([0-9a-f-]+)"'
    return list(set(re.findall(pattern, html_content)))
```

**Step 3: Write views**

Create `backend/collaboration/views.py`:

```python
import re
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from notifications.helpers import create_notification
from .models import Comment, Mention, Reaction
from .serializers import (
    CommentSerializer,
    CommentCreateSerializer,
    ReactionCreateSerializer,
)
from .utils import extract_mention_ids


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def comment_list_create(request):
    org = request.organization

    if request.method == "GET":
        qs = Comment.objects.filter(organization=org).select_related("author").prefetch_related("reactions__user", "mentions__user")

        # Filter by entity
        contact_id = request.query_params.get("contact")
        deal_id = request.query_params.get("deal")
        task_id = request.query_params.get("task")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        elif deal_id:
            qs = qs.filter(deal_id=deal_id)
        elif task_id:
            qs = qs.filter(task_id=task_id)

        # Exclude private comments from other users
        qs = qs.exclude(is_private=True).union(
            qs.filter(is_private=True, author=request.user)
        ).order_by("created_at")

        return Response(CommentSerializer(qs, many=True).data)

    # POST
    serializer = CommentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    comment = Comment.objects.create(
        organization=org,
        author=request.user,
        content=data["content"],
        is_private=data.get("is_private", False),
        contact_id=data.get("contact"),
        deal_id=data.get("deal"),
        task_id=data.get("task"),
    )

    # Extract and create mentions
    mention_ids = extract_mention_ids(data["content"])
    if mention_ids:
        mentioned_users = User.objects.filter(
            id__in=mention_ids,
            memberships__organization=org,
        )
        for user in mentioned_users:
            Mention.objects.create(comment=comment, user=user)
            if user != request.user:
                author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
                entity_type = comment.entity_type
                entity_id = comment.entity_id
                create_notification(
                    organization=org,
                    recipient=user,
                    type="mention",
                    title=f"{author_name} vous a mentionne",
                    message=comment.content[:200],
                    link=f"/{entity_type}s/{entity_id}",
                )

    result = CommentSerializer(comment).data
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def comment_detail(request, pk):
    try:
        comment = Comment.objects.get(pk=pk, organization=request.organization)
    except Comment.DoesNotExist:
        return Response({"detail": "Commentaire introuvable."}, status=status.HTTP_404_NOT_FOUND)

    if comment.author != request.user:
        return Response({"detail": "Non autorise."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    content = request.data.get("content")
    is_private = request.data.get("is_private")

    if content is not None:
        comment.content = content
        comment.edited_at = timezone.now()

        # Re-process mentions
        comment.mentions.all().delete()
        mention_ids = extract_mention_ids(content)
        if mention_ids:
            mentioned_users = User.objects.filter(
                id__in=mention_ids,
                memberships__organization=request.organization,
            )
            for user in mentioned_users:
                Mention.objects.create(comment=comment, user=user)

    if is_private is not None:
        comment.is_private = is_private

    comment.save()
    return Response(CommentSerializer(comment).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reaction_toggle(request, comment_id):
    try:
        comment = Comment.objects.get(pk=comment_id, organization=request.organization)
    except Comment.DoesNotExist:
        return Response({"detail": "Commentaire introuvable."}, status=status.HTTP_404_NOT_FOUND)

    serializer = ReactionCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    emoji = serializer.validated_data["emoji"]

    # Toggle: remove if exists, add if not
    existing = Reaction.objects.filter(comment=comment, user=request.user, emoji=emoji).first()
    if existing:
        existing.delete()
        return Response({"action": "removed"})

    Reaction.objects.create(comment=comment, user=request.user, emoji=emoji)

    # Notify comment author
    if comment.author != request.user:
        author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        create_notification(
            organization=request.organization,
            recipient=comment.author,
            type="reaction",
            title=f"{author_name} a reagi {emoji} a votre commentaire",
            message=comment.content[:100],
            link=f"/{comment.entity_type}s/{comment.entity_id}",
        )

    return Response({"action": "added"}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_mentions(request):
    mentions = Mention.objects.filter(
        user=request.user,
        comment__organization=request.organization,
    ).select_related("comment", "comment__author").order_by("-created_at")[:50]

    results = []
    for m in mentions:
        results.append({
            "id": str(m.id),
            "comment_id": str(m.comment_id),
            "author_name": f"{m.comment.author.first_name} {m.comment.author.last_name}".strip() or m.comment.author.email,
            "content": m.comment.content[:200],
            "entity_type": m.comment.entity_type,
            "entity_id": str(m.comment.entity_id),
            "created_at": m.created_at.isoformat(),
        })

    return Response(results)
```

**Step 4: Create URL routing**

Create `backend/collaboration/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("comments/", views.comment_list_create, name="comment-list-create"),
    path("comments/<uuid:pk>/", views.comment_detail, name="comment-detail"),
    path("comments/<uuid:comment_id>/reactions/", views.reaction_toggle, name="reaction-toggle"),
    path("mentions/me/", views.my_mentions, name="my-mentions"),
]
```

**Step 5: Register in main URL config**

In `backend/config/urls.py`, add after the calendars line:

```python
path("api/collaboration/", include("collaboration.urls")),
```

**Step 6: Run migrations for notification type changes, then commit**

```bash
cd backend && python manage.py makemigrations notifications && python manage.py migrate
git add backend/collaboration/ backend/config/urls.py backend/notifications/
git commit -m "feat(collaboration): add views, URLs, and mention notification support"
```

---

## Task 4: Backend — Member search endpoint

**Files:**
- Modify: `backend/organizations/views.py` (add search endpoint)
- Modify: `backend/organizations/urls.py` (add search URL)

**Step 1: Add member search view**

Add to `backend/organizations/views.py`:

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def member_search(request, org_id):
    """Search organization members for @mention autocomplete."""
    q = request.query_params.get("q", "").strip()
    members = Membership.objects.filter(
        organization_id=org_id,
    ).select_related("user")

    if q:
        members = members.filter(
            models.Q(user__first_name__icontains=q)
            | models.Q(user__last_name__icontains=q)
            | models.Q(user__email__icontains=q)
        )

    results = []
    for m in members[:20]:
        u = m.user
        results.append({
            "id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "name": f"{u.first_name} {u.last_name}".strip() or u.email,
        })

    return Response(results)
```

**Step 2: Add URL**

In `backend/organizations/urls.py`, add:

```python
path("<uuid:org_id>/members/search/", views.member_search, name="member-search"),
```

**Step 3: Commit**

```bash
git add backend/organizations/views.py backend/organizations/urls.py
git commit -m "feat(collaboration): add member search endpoint for @mention autocomplete"
```

---

## Task 5: Backend — Django Channels & WebSocket setup

**Files:**
- Modify: `backend/requirements.txt` (add channels + channels-redis)
- Modify: `backend/config/settings.py` (add channels config)
- Modify: `backend/config/asgi.py` (add WebSocket routing)
- Create: `backend/collaboration/consumers.py`
- Create: `backend/collaboration/routing.py`
- Create: `backend/collaboration/middleware.py`

**Step 1: Add dependencies**

Add to `backend/requirements.txt`:

```
channels==4.2.0
channels-redis==4.2.1
```

Then run:

```bash
cd backend && pip install channels==4.2.0 channels-redis==4.2.1
```

**Step 2: Configure channels in settings**

In `backend/config/settings.py`:

Add `"daphne"` at the TOP of INSTALLED_APPS (before `django.contrib.admin`).

Add after the CELERY section:

```python
# ---------------------------------------------------------------------------
# Channels (WebSocket)
# ---------------------------------------------------------------------------
ASGI_APPLICATION = "config.asgi.application"
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")],
        },
    },
}
```

**Step 3: Create JWT WebSocket middleware**

Create `backend/collaboration/middleware.py`:

```python
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


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = None

        return await super().__call__(scope, receive, send)
```

**Step 4: Create WebSocket consumers**

Create `backend/collaboration/consumers.py`:

```python
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"
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
        if not self.user:
            await self.close()
            return

        self.entity_type = self.scope["url_route"]["kwargs"]["entity_type"]
        self.entity_id = self.scope["url_route"]["kwargs"]["entity_id"]
        self.group_name = f"{self.entity_type}_{self.entity_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def comment_event(self, event):
        await self.send_json(event["data"])
```

**Step 5: Create routing**

Create `backend/collaboration/routing.py`:

```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
    re_path(
        r"ws/collaboration/(?P<entity_type>\w+)/(?P<entity_id>[0-9a-f-]+)/$",
        consumers.CollaborationConsumer.as_asgi(),
    ),
]
```

**Step 6: Update ASGI config**

Replace `backend/config/asgi.py`:

```python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from collaboration.middleware import JWTAuthMiddleware
from collaboration.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
```

**Step 7: Commit**

```bash
git add backend/requirements.txt backend/config/settings.py backend/config/asgi.py backend/collaboration/
git commit -m "feat(collaboration): add Django Channels WebSocket with JWT auth"
```

---

## Task 6: Backend — WebSocket broadcast from views

**Files:**
- Modify: `backend/collaboration/views.py` (add channel layer broadcasts)

**Step 1: Add broadcast helper**

Add at the top of `backend/collaboration/views.py`:

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
```

Add helper function:

```python
def broadcast_to_entity(entity_type, entity_id, event_type, data):
    """Send a WebSocket event to all users viewing an entity."""
    channel_layer = get_channel_layer()
    group_name = f"{entity_type}_{entity_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {"type": "comment.event", "data": {"event": event_type, **data}},
    )


def broadcast_to_user(user_id, data):
    """Send a WebSocket notification to a specific user."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "notification.message", "data": data},
    )
```

**Step 2: Add broadcasts in comment_list_create POST handler**

After `result = CommentSerializer(comment).data`, add:

```python
# Broadcast new comment to entity viewers
broadcast_to_entity(
    comment.entity_type,
    str(comment.entity_id),
    "comment_created",
    {"comment": result},
)

# Broadcast notification to mentioned users via WebSocket
for mention_id in mention_ids:
    if str(mention_id) != str(request.user.id):
        author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        broadcast_to_user(mention_id, {
            "type": "mention",
            "title": f"{author_name} vous a mentionne",
            "message": comment.content[:200],
            "link": f"/{comment.entity_type}s/{comment.entity_id}",
        })
```

**Step 3: Add broadcasts in comment_detail PATCH and DELETE**

After successful PATCH response, add:

```python
broadcast_to_entity(
    comment.entity_type,
    str(comment.entity_id),
    "comment_updated",
    {"comment": CommentSerializer(comment).data},
)
```

Before DELETE response, add:

```python
broadcast_to_entity(
    comment.entity_type,
    str(comment.entity_id),
    "comment_deleted",
    {"comment_id": str(pk)},
)
```

**Step 4: Add broadcasts in reaction_toggle**

After adding a reaction:

```python
broadcast_to_entity(
    comment.entity_type,
    str(comment.entity_id),
    "reaction_updated",
    {"comment_id": str(comment_id), "reactions": CommentSerializer(comment).data["reactions"]},
)
```

After removing a reaction, same broadcast.

After notifying comment author of reaction, also:

```python
broadcast_to_user(str(comment.author.id), {
    "type": "reaction",
    "title": f"{author_name} a reagi {emoji}",
    "message": comment.content[:100],
    "link": f"/{comment.entity_type}s/{comment.entity_id}",
})
```

**Step 5: Commit**

```bash
git add backend/collaboration/views.py
git commit -m "feat(collaboration): add WebSocket broadcasts for comments and reactions"
```

---

## Task 7: Frontend — TypeScript types and API service

**Files:**
- Create: `frontend/types/collaboration.ts`
- Create: `frontend/services/collaboration.ts`

**Step 1: Create types**

Create `frontend/types/collaboration.ts`:

```typescript
export interface ReactionGroup {
  emoji: string
  count: number
  users: { id: string; name: string }[]
}

export interface CommentMention {
  id: string
  user: string
  user_name: string
  created_at: string
}

export interface Comment {
  id: string
  author: string
  author_name: string
  author_email: string
  content: string
  is_private: boolean
  contact: string | null
  deal: string | null
  task: string | null
  reactions: ReactionGroup[]
  mentions: CommentMention[]
  created_at: string
  updated_at: string
  edited_at: string | null
}

export interface MemberSearchResult {
  id: string
  first_name: string
  last_name: string
  email: string
  name: string
}

export interface MentionItem {
  id: string
  comment_id: string
  author_name: string
  content: string
  entity_type: string
  entity_id: string
  created_at: string
}
```

**Step 2: Create API service**

Create `frontend/services/collaboration.ts`:

```typescript
import { apiFetch } from "@/lib/api"
import type { Comment, MemberSearchResult, MentionItem } from "@/types/collaboration"

export async function fetchComments(params: { contact?: string; deal?: string; task?: string }): Promise<Comment[]> {
  const searchParams = new URLSearchParams()
  if (params.contact) searchParams.set("contact", params.contact)
  if (params.deal) searchParams.set("deal", params.deal)
  if (params.task) searchParams.set("task", params.task)
  return apiFetch<Comment[]>(`/collaboration/comments/?${searchParams}`)
}

export async function createComment(data: {
  content: string
  is_private?: boolean
  contact?: string
  deal?: string
  task?: string
}): Promise<Comment> {
  return apiFetch<Comment>("/collaboration/comments/", { method: "POST", json: data })
}

export async function updateComment(id: string, data: { content?: string; is_private?: boolean }): Promise<Comment> {
  return apiFetch<Comment>(`/collaboration/comments/${id}/`, { method: "PATCH", json: data })
}

export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/collaboration/comments/${id}/`, { method: "DELETE" })
}

export async function toggleReaction(commentId: string, emoji: string): Promise<{ action: string }> {
  return apiFetch<{ action: string }>(`/collaboration/comments/${commentId}/reactions/`, {
    method: "POST",
    json: { emoji },
  })
}

export async function fetchMyMentions(): Promise<MentionItem[]> {
  return apiFetch<MentionItem[]>("/collaboration/mentions/me/")
}

export async function searchMembers(orgId: string, query: string): Promise<MemberSearchResult[]> {
  return apiFetch<MemberSearchResult[]>(`/organizations/${orgId}/members/search/?q=${encodeURIComponent(query)}`)
}
```

**Step 3: Export types from index**

If `frontend/types/index.ts` exists, add `export * from "./collaboration"`. Otherwise, skip.

**Step 4: Commit**

```bash
git add frontend/types/collaboration.ts frontend/services/collaboration.ts
git commit -m "feat(collaboration): add frontend types and API service"
```

---

## Task 8: Frontend — WebSocket hook

**Files:**
- Create: `frontend/hooks/useWebSocket.ts`

**Step 1: Create WebSocket hook**

Create `frontend/hooks/useWebSocket.ts`:

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const [connected, setConnected] = useState(false)

  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return

    const token = Cookies.get("access_token")
    if (!token) return

    const url = `${WS_URL}${path}?token=${token}`
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
      // Reconnect after 3 seconds
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
git commit -m "feat(collaboration): add useWebSocket hook with auto-reconnect"
```

---

## Task 9: Frontend — CommentItem component

**Files:**
- Create: `frontend/components/collaboration/CommentItem.tsx`

**Step 1: Create CommentItem**

Create `frontend/components/collaboration/CommentItem.tsx`:

```tsx
"use client"

import { useState } from "react"
import type { Comment } from "@/types/collaboration"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { Button } from "@/components/ui/button"
import { Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toggleReaction, deleteComment, updateComment } from "@/services/collaboration"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { apiUploadImage } from "@/lib/api"
import { cn } from "@/lib/utils"

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "😄", "🤔", "👀"]

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr))
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onUpdated: () => void
  onDeleted: (commentId: string) => void
}

export function CommentItem({ comment, currentUserId, onUpdated, onDeleted }: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isAuthor = comment.author === currentUserId

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction(comment.id, emoji)
      onUpdated()
    } catch (err) {
      console.error("Failed to toggle reaction:", err)
    }
    setShowEmojiPicker(false)
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer ce commentaire ?")) return
    try {
      await deleteComment(comment.id)
      onDeleted(comment.id)
    } catch (err) {
      console.error("Failed to delete comment:", err)
    }
    setShowMenu(false)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    try {
      await updateComment(comment.id, { content: editContent })
      setEditing(false)
      onUpdated()
    } catch (err) {
      console.error("Failed to update comment:", err)
    }
  }

  return (
    <div className="group flex gap-3 py-3">
      {/* Avatar */}
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
        {getInitials(comment.author_name)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-[family-name:var(--font-body)]">
            {comment.author_name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDateTime(comment.created_at)}
          </span>
          {comment.edited_at && (
            <span className="text-[10px] text-muted-foreground italic">
              (modifie)
            </span>
          )}
          {comment.is_private && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}

          {/* Menu */}
          {isAuthor && (
            <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-secondary"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => { setEditing(true); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-secondary"
                  >
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {editing ? (
          <div className="mt-2 space-y-2">
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="Modifier le commentaire..."
              minHeight="80px"
              onImageUpload={apiUploadImage}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim()}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm font-[family-name:var(--font-body)]">
            <MarkdownContent content={comment.content} />
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              title={r.users.map((u) => u.name).join(", ")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                r.users.some((u) => u.id === currentUserId)
                  ? "border-primary/30 bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <span>{r.emoji}</span>
              <span className="text-muted-foreground">{r.count}</span>
            </button>
          ))}

          {/* Add reaction */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              +
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 bottom-full mb-1 flex gap-1 bg-card border border-border rounded-lg shadow-lg p-1.5 z-10">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1 hover:bg-secondary rounded text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/collaboration/
git commit -m "feat(collaboration): add CommentItem component with reactions"
```

---

## Task 10: Frontend — Tiptap Mention extension

**Files:**
- Create: `frontend/components/collaboration/MentionList.tsx`
- Modify: `frontend/components/ui/RichTextEditor.tsx` (add mention support)

**Step 1: Install Tiptap mention extension**

```bash
cd frontend && npm install @tiptap/extension-mention
```

**Step 2: Create MentionList component**

Create `frontend/components/collaboration/MentionList.tsx`:

```tsx
"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"

export interface MentionSuggestion {
  id: string
  name: string
  email: string
}

interface MentionListProps {
  items: MentionSuggestion[]
  command: (item: { id: string; label: string }) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex]
          if (item) command({ id: item.id, label: item.name })
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-2 text-xs text-muted-foreground">
          Aucun membre trouve
        </div>
      )
    }

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto z-50">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.id, label: item.name })}
            className={`flex flex-col w-full px-3 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-primary/10" : "hover:bg-secondary"
            }`}
          >
            <span className="font-medium text-xs">{item.name}</span>
            <span className="text-[11px] text-muted-foreground">{item.email}</span>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = "MentionList"
```

**Step 3: Update RichTextEditor to support mentions**

In `frontend/components/ui/RichTextEditor.tsx`, add the mention extension. The key changes:

1. Add import for `Mention` from `@tiptap/extension-mention`
2. Add `onMentionQuery` prop to the component interface
3. Add the Mention extension to the editor config with suggestion handling
4. Add mention styling in the editor

Add to the `RichTextEditorProps` interface:

```typescript
onMentionQuery?: (query: string) => Promise<{ id: string; name: string; email: string }[]>
```

Add to the extensions array (after `Markdown`), when `onMentionQuery` is provided:

```typescript
...(onMentionQuery
  ? [
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
          "data-type": "mention",
        },
        renderHTML({ options, node }) {
          return [
            "span",
            {
              ...options.HTMLAttributes,
              "data-mention-id": node.attrs.id,
              class: "mention bg-primary/15 text-primary rounded px-1 py-0.5 text-sm font-medium",
            },
            `@${node.attrs.label ?? node.attrs.id}`,
          ]
        },
        suggestion: {
          items: async ({ query }: { query: string }) => {
            return await onMentionQuery(query)
          },
          render: () => {
            let component: ReactDOM.Root | null = null
            let popup: HTMLDivElement | null = null
            let ref: MentionListRef | null = null

            return {
              onStart: (props: SuggestionProps) => {
                popup = document.createElement("div")
                popup.style.position = "absolute"
                popup.style.zIndex = "50"
                document.body.appendChild(popup)

                const rect = props.clientRect?.()
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`
                  popup.style.top = `${rect.bottom + 4}px`
                }

                component = ReactDOM.createRoot(popup)
                component.render(
                  <MentionList
                    ref={(r) => { ref = r }}
                    items={props.items}
                    command={props.command}
                  />
                )
              },
              onUpdate: (props: SuggestionProps) => {
                const rect = props.clientRect?.()
                if (rect && popup) {
                  popup.style.left = `${rect.left}px`
                  popup.style.top = `${rect.bottom + 4}px`
                }
                component?.render(
                  <MentionList
                    ref={(r) => { ref = r }}
                    items={props.items}
                    command={props.command}
                  />
                )
              },
              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === "Escape") {
                  popup?.remove()
                  component?.unmount()
                  return true
                }
                return ref?.onKeyDown(props) ?? false
              },
              onExit: () => {
                popup?.remove()
                component?.unmount()
              },
            }
          },
        },
      }),
    ]
  : []),
```

Add required imports at the top of the file:

```typescript
import Mention from "@tiptap/extension-mention"
import ReactDOM from "react-dom/client"
import { MentionList, type MentionListRef } from "@/components/collaboration/MentionList"
import type { SuggestionProps } from "@tiptap/suggestion"
```

**Step 4: Commit**

```bash
git add frontend/components/collaboration/MentionList.tsx frontend/components/ui/RichTextEditor.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(collaboration): add @mention extension to Tiptap editor"
```

---

## Task 11: Frontend — CommentSection component

**Files:**
- Create: `frontend/components/collaboration/CommentSection.tsx`

**Step 1: Create CommentSection**

Create `frontend/components/collaboration/CommentSection.tsx`:

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import type { Comment } from "@/types/collaboration"
import { fetchComments, createComment, searchMembers } from "@/services/collaboration"
import { CommentItem } from "./CommentItem"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { Button } from "@/components/ui/button"
import { Lock, Unlock, Loader2, MessageSquare } from "lucide-react"
import { apiUploadImage } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import Cookies from "js-cookie"

interface CommentSectionProps {
  entityType: "contact" | "deal" | "task"
  entityId: string
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const currentUserId = Cookies.get("user_id") || ""
  const orgId = Cookies.get("organization_id") || ""

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments({ [entityType]: entityId })
      setComments(data)
    } catch (err) {
      console.error("Failed to load comments:", err)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // WebSocket for live updates
  useWebSocket({
    path: `/ws/collaboration/${entityType}/${entityId}/`,
    onMessage: (data: unknown) => {
      const event = data as { event: string; comment?: Comment; comment_id?: string; reactions?: Comment["reactions"] }

      switch (event.event) {
        case "comment_created":
          if (event.comment) {
            setComments((prev) => {
              if (prev.some((c) => c.id === event.comment!.id)) return prev
              return [...prev, event.comment!]
            })
          }
          break
        case "comment_updated":
          if (event.comment) {
            setComments((prev) =>
              prev.map((c) => (c.id === event.comment!.id ? event.comment! : c))
            )
          }
          break
        case "comment_deleted":
          if (event.comment_id) {
            setComments((prev) => prev.filter((c) => c.id !== event.comment_id))
          }
          break
        case "reaction_updated":
          if (event.comment_id && event.reactions) {
            setComments((prev) =>
              prev.map((c) =>
                c.id === event.comment_id ? { ...c, reactions: event.reactions! } : c
              )
            )
          }
          break
      }
    },
  })

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      await createComment({
        content: newComment,
        is_private: isPrivate,
        [entityType]: entityId,
      })
      setNewComment("")
      setIsPrivate(false)
      // Comment will arrive via WebSocket, but also reload as fallback
      loadComments()
    } catch (err) {
      console.error("Failed to create comment:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMentionQuery = async (query: string) => {
    if (!orgId) return []
    try {
      const members = await searchMembers(orgId, query)
      return members.map((m) => ({ id: m.id, name: m.name, email: m.email }))
    } catch {
      return []
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
          Commentaires ({comments.length})
        </h2>
      </div>

      {/* Comment input */}
      <div className="mb-6 space-y-2">
        <RichTextEditor
          content={newComment}
          onChange={setNewComment}
          placeholder="Ecrire un commentaire... Utilisez @ pour mentionner"
          minHeight="80px"
          onImageUpload={apiUploadImage}
          onMentionQuery={handleMentionQuery}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={isPrivate ? "Commentaire prive (visible uniquement par vous)" : "Commentaire visible par tous"}
          >
            {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span className="font-[family-name:var(--font-body)]">
              {isPrivate ? "Prive" : "Visible par tous"}
            </span>
          </button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            <span className="font-[family-name:var(--font-body)]">Commenter</span>
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <MessageSquare className="h-5 w-5 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            Aucun commentaire
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onUpdated={loadComments}
              onDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/collaboration/CommentSection.tsx
git commit -m "feat(collaboration): add CommentSection with WebSocket live updates"
```

---

## Task 12: Frontend — Integrate CommentSection into contact detail page

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx:419-450` (add Comments tab)

**Step 1: Add import**

At the top of `frontend/app/(app)/contacts/[id]/page.tsx`, add:

```typescript
import { CommentSection } from "@/components/collaboration/CommentSection"
import { Users } from "lucide-react"
```

**Step 2: Add Comments tab trigger**

In the `TabsList`, add a new `TabsTrigger` after the "notes" tab:

```tsx
<TabsTrigger value="comments" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
  <Users className="h-3.5 w-3.5" />
  <span>Commentaires</span>
</TabsTrigger>
```

**Step 3: Add Comments tab content**

After the `<TabsContent value="notes">` block, add:

```tsx
<TabsContent value="comments" className="p-6">
  <CommentSection entityType="contact" entityId={id} />
</TabsContent>
```

**Step 4: Repeat for deal detail page**

Find `frontend/app/(app)/deals/[id]/page.tsx` (or wherever the deal detail page is) and add the same `CommentSection` with `entityType="deal"`.

**Step 5: Repeat for task detail page**

Find the task detail page and add `CommentSection` with `entityType="task"`.

**Step 6: Commit**

```bash
git add frontend/app/
git commit -m "feat(collaboration): integrate CommentSection into contact/deal/task detail pages"
```

---

## Task 13: Frontend — Real-time NotificationBell with WebSocket

**Files:**
- Modify: `frontend/hooks/useNotifications.ts` (add WebSocket)
- Modify: `frontend/components/NotificationBell.tsx` (add toast)

**Step 1: Update useNotifications hook**

In `frontend/hooks/useNotifications.ts`, integrate WebSocket:

Add import at the top:

```typescript
import { useWebSocket } from "@/hooks/useWebSocket"
```

Inside the `useNotifications` function, add WebSocket connection:

```typescript
// WebSocket for real-time notification updates
useWebSocket({
  path: "/ws/notifications/",
  onMessage: (data: unknown) => {
    const event = data as { type: string; title: string; message: string; link?: string }
    // Increment unread count
    setUnreadCount((prev) => prev + 1)
    // Show toast notification
    if (typeof window !== "undefined" && "Notification" in window) {
      // Use sonner toast instead of browser notification
      import("sonner").then(({ toast }) => {
        toast(event.title, { description: event.message })
      })
    }
  },
})
```

Remove the polling interval (the `setInterval` for `refreshUnreadCount`), since WebSocket now handles real-time updates. Keep the initial `refreshUnreadCount()` call.

**Step 2: Commit**

```bash
git add frontend/hooks/useNotifications.ts
git commit -m "feat(collaboration): replace notification polling with WebSocket real-time updates"
```

---

## Task 14: Frontend — Store user_id in cookie on login

**Files:**
- Check and modify the login/auth flow to ensure `user_id` is stored in cookies

**Step 1: Find the auth login handler**

Look in `frontend/services/auth.ts` or `frontend/app/(auth)/login/page.tsx` for where tokens are set after login. After the `setTokens(access, refresh)` call, add:

```typescript
// Decode user_id from JWT and store in cookie
const payload = JSON.parse(atob(access.split(".")[1]))
Cookies.set("user_id", payload.user_id, { expires: 7 })
```

**Step 2: Commit**

```bash
git add frontend/
git commit -m "feat(collaboration): store user_id in cookie on login for comment ownership"
```

---

## Task 15: Docker — Add Daphne/Channels to docker-compose

**Files:**
- Modify: `docker-compose.yml` (update backend to use daphne instead of uvicorn)

**Step 1: Update backend service command**

In `docker-compose.yml`, update the backend service command from:

```yaml
command: uvicorn config.asgi:application --host 0.0.0.0 --port 8000
```

to:

```yaml
command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

**Step 2: Add NEXT_PUBLIC_WS_URL to frontend environment**

In the frontend service environment, add:

```yaml
NEXT_PUBLIC_WS_URL: ws://localhost:8000
```

For production, this should be `wss://your-domain.com`.

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(collaboration): configure Daphne ASGI server for WebSocket support"
```

---

## Task 16: Final integration test

**Step 1: Run backend migrations**

```bash
cd backend && python manage.py migrate
```

**Step 2: Start backend with Daphne**

```bash
cd backend && daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

**Step 3: Start frontend**

```bash
cd frontend && npm run dev
```

**Step 4: Manual test checklist**

- [ ] Navigate to a contact detail page
- [ ] Click "Commentaires" tab
- [ ] Write a comment and submit → comment appears
- [ ] Type `@` → member autocomplete popup appears
- [ ] Select a member → mention chip inserted
- [ ] Submit comment with mention → notification created for mentioned user
- [ ] Click emoji reaction on a comment → reaction appears with count
- [ ] Click reaction again → reaction removed (toggle)
- [ ] Edit own comment → shows "modifie" badge
- [ ] Delete own comment → comment removed
- [ ] Toggle "Prive" → private comment only visible to author
- [ ] Open same contact in two browser tabs → comments sync in real-time via WebSocket
- [ ] Check NotificationBell → unread count updates via WebSocket
- [ ] Repeat on a deal detail page
- [ ] Repeat on a task detail page

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(collaboration): complete @mentions, comments, reactions, and WebSocket notifications"
```
