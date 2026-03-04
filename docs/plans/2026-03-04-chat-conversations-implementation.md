# Chat Conversations History — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add conversation history so users can have multiple separate chat conversations, navigate between them, start new ones, rename and delete them, with auto-generated titles.

**Architecture:** New `Conversation` model with FK from `ChatMessage`. Backend CRUD API for conversations. Frontend right-side sidebar listing conversations. LLM-based title generation after first exchange.

**Tech Stack:** Django/DRF (backend), Next.js/React (frontend), Pydantic AI (title generation), SSE (streaming)

---

### Task 1: Create the Conversation model and migration

**Files:**
- Modify: `backend/chat/models.py`
- Create: `backend/chat/migrations/0002_conversation.py` (auto-generated)

**Step 1: Write the Conversation model and add FK to ChatMessage**

In `backend/chat/models.py`, add the `Conversation` model before `ChatMessage`, and add a nullable FK on `ChatMessage`:

```python
import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200, default="Nouvelle conversation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title} ({self.user})"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        null=True,
        blank=True,
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    actions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
```

**Step 2: Generate the migration**

Run: `docker compose exec backend python manage.py makemigrations chat`
Expected: Migration file created for Conversation model and conversation FK on ChatMessage.

**Step 3: Apply the migration**

Run: `docker compose exec backend python manage.py migrate chat`
Expected: Migration applied successfully.

**Step 4: Commit**

```bash
git add backend/chat/models.py backend/chat/migrations/
git commit -m "feat(chat): add Conversation model with FK on ChatMessage"
```

---

### Task 2: Data migration for existing messages

**Files:**
- Create: `backend/chat/migrations/0003_migrate_existing_messages.py` (auto-generated data migration)

**Step 1: Create the data migration**

Run: `docker compose exec backend python manage.py makemigrations chat --empty -n migrate_existing_messages`

Then edit the generated file:

```python
from django.db import migrations


def migrate_existing_messages(apps, schema_editor):
    ChatMessage = apps.get_model("chat", "ChatMessage")
    Conversation = apps.get_model("chat", "Conversation")

    # Group orphan messages by (user_id, organization_id)
    orphan_messages = ChatMessage.objects.filter(conversation__isnull=True)
    pairs = orphan_messages.values_list(
        "user_id", "organization_id"
    ).distinct()

    for user_id, org_id in pairs:
        conv = Conversation.objects.create(
            user_id=user_id,
            organization_id=org_id,
            title="Conversation précédente",
        )
        orphan_messages.filter(
            user_id=user_id, organization_id=org_id
        ).update(conversation=conv)


def reverse_migration(apps, schema_editor):
    ChatMessage = apps.get_model("chat", "ChatMessage")
    ChatMessage.objects.all().update(conversation=None)


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_conversation"),
    ]

    operations = [
        migrations.RunPython(migrate_existing_messages, reverse_migration),
    ]
```

**Step 2: Apply the data migration**

Run: `docker compose exec backend python manage.py migrate chat`
Expected: All existing messages now have a conversation.

**Step 3: Make the FK non-nullable**

In `backend/chat/models.py`, change the `conversation` field:

```python
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
```

Remove `null=True, blank=True`.

**Step 4: Generate and apply the migration**

Run: `docker compose exec backend python manage.py makemigrations chat && docker compose exec backend python manage.py migrate chat`
Expected: FK is now non-nullable.

**Step 5: Commit**

```bash
git add backend/chat/
git commit -m "feat(chat): migrate existing messages to conversations, make FK required"
```

---

### Task 3: Backend serializers for Conversation

**Files:**
- Modify: `backend/chat/serializers.py`

**Step 1: Write the failing test**

In `backend/chat/tests.py`, add:

```python
class ConversationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "conv@example.com",
                "password": "securepass123",
                "first_name": "Conv",
                "last_name": "User",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_list_conversations_empty(self):
        response = self.client.get("/api/chat/conversations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_conversation(self):
        response = self.client.post("/api/chat/conversations/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["title"], "Nouvelle conversation")

    def test_delete_conversation(self):
        create_resp = self.client.post("/api/chat/conversations/")
        conv_id = create_resp.data["id"]
        response = self.client.delete(f"/api/chat/conversations/{conv_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_rename_conversation(self):
        create_resp = self.client.post("/api/chat/conversations/")
        conv_id = create_resp.data["id"]
        response = self.client.patch(
            f"/api/chat/conversations/{conv_id}/",
            {"title": "Mon nouveau titre"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Mon nouveau titre")

    def test_conversation_messages(self):
        create_resp = self.client.post("/api/chat/conversations/")
        conv_id = create_resp.data["id"]
        response = self.client.get(f"/api/chat/conversations/{conv_id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_conversations_ordered_by_updated(self):
        resp1 = self.client.post("/api/chat/conversations/")
        resp2 = self.client.post("/api/chat/conversations/")
        # Rename first to update its updated_at
        self.client.patch(
            f"/api/chat/conversations/{resp1.data['id']}/",
            {"title": "Updated"},
        )
        response = self.client.get("/api/chat/conversations/")
        self.assertEqual(response.data[0]["id"], resp1.data["id"])

    def test_conversation_includes_last_message_preview(self):
        create_resp = self.client.post("/api/chat/conversations/")
        conv_id = create_resp.data["id"]

        from accounts.models import User
        from organizations.models import Membership
        from chat.models import ChatMessage, Conversation

        user = User.objects.get(email="conv@example.com")
        org = Membership.objects.filter(user=user).first().organization
        conv = Conversation.objects.get(id=conv_id)
        ChatMessage.objects.create(
            conversation=conv, organization=org, user=user,
            role="user", content="Bonjour, aide-moi avec les contacts",
        )

        response = self.client.get("/api/chat/conversations/")
        self.assertIn("last_message_preview", response.data[0])
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test chat.tests.ConversationAPITests -v 2`
Expected: FAIL (endpoints don't exist yet)

**Step 3: Add serializers**

In `backend/chat/serializers.py`:

```python
from rest_framework import serializers
from .models import ChatMessage, Conversation


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "actions", "created_at"]
        read_only_fields = fields


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField()
    conversation_id = serializers.UUIDField(required=False)


class ConversationSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at", "last_message_preview"]
        read_only_fields = ["id", "created_at", "updated_at", "last_message_preview"]

    def get_last_message_preview(self, obj):
        last_msg = obj.messages.order_by("-created_at").first()
        if last_msg:
            return last_msg.content[:80]
        return None
```

**Step 4: Commit**

```bash
git add backend/chat/serializers.py backend/chat/tests.py
git commit -m "feat(chat): add Conversation serializer with last_message_preview"
```

---

### Task 4: Backend views and URLs for Conversation CRUD

**Files:**
- Modify: `backend/chat/views.py`
- Modify: `backend/chat/urls.py`

**Step 1: Add conversation views**

In `backend/chat/views.py`, add these views (import `Conversation`, `ConversationSerializer`):

```python
from .models import ChatMessage, Conversation
from .serializers import ChatInputSerializer, ChatMessageSerializer, ConversationSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    """List or create conversations."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    if request.method == "GET":
        conversations = Conversation.objects.filter(
            organization=org, user=request.user,
        )
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    # POST: create a new conversation
    conv = Conversation.objects.create(
        organization=org, user=request.user,
    )
    return Response(
        ConversationSerializer(conv).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conversation_id):
    """Update or delete a conversation."""
    org = request.organization
    if not org:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    try:
        conv = Conversation.objects.get(
            id=conversation_id, organization=org, user=request.user,
        )
    except Conversation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        conv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH: rename
    serializer = ConversationSerializer(conv, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_messages(request, conversation_id):
    """Return messages for a specific conversation."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    try:
        conv = Conversation.objects.get(
            id=conversation_id, organization=org, user=request.user,
        )
    except Conversation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    messages = conv.messages.all()
    return Response(ChatMessageSerializer(messages, many=True).data)
```

**Step 2: Update URLs**

In `backend/chat/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path("message/", views.send_message),
    path("stream/", views.stream_message),
    path("history/", views.chat_history),
    path("conversations/", views.conversation_list),
    path("conversations/<uuid:conversation_id>/", views.conversation_detail),
    path("conversations/<uuid:conversation_id>/messages/", views.conversation_messages),
]
```

**Step 3: Run the tests**

Run: `docker compose exec backend python manage.py test chat.tests.ConversationAPITests -v 2`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add backend/chat/views.py backend/chat/urls.py
git commit -m "feat(chat): add conversation CRUD endpoints"
```

---

### Task 5: Update stream and send_message to use conversation_id

**Files:**
- Modify: `backend/chat/views.py`

**Step 1: Write the failing test**

In `backend/chat/tests.py`, add:

```python
class ChatWithConversationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "chatconv@example.com",
                "password": "securepass123",
                "first_name": "Chat",
                "last_name": "Conv",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    @patch("chat.views.build_agent")
    def test_send_message_with_conversation_id(self, mock_build):
        mock_agent = MagicMock()
        mock_result = MagicMock()
        mock_result.output = "Bonjour!"
        mock_result.all_messages.return_value = []
        mock_agent.run_sync.return_value = mock_result
        mock_build.return_value = mock_agent

        # Create conversation first
        conv_resp = self.client.post("/api/chat/conversations/")
        conv_id = conv_resp.data["id"]

        response = self.client.post(
            "/api/chat/message/",
            {"message": "Salut", "conversation_id": conv_id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify messages are linked to conversation
        from chat.models import ChatMessage
        msgs = ChatMessage.objects.filter(conversation_id=conv_id)
        self.assertEqual(msgs.count(), 2)  # user + assistant

    @patch("chat.views.build_agent")
    def test_send_message_creates_conversation_if_missing(self, mock_build):
        mock_agent = MagicMock()
        mock_result = MagicMock()
        mock_result.output = "Bonjour!"
        mock_result.all_messages.return_value = []
        mock_agent.run_sync.return_value = mock_result
        mock_build.return_value = mock_agent

        response = self.client.post(
            "/api/chat/message/",
            {"message": "Salut"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # A conversation should have been auto-created
        from chat.models import Conversation
        self.assertEqual(Conversation.objects.count(), 1)

    def test_conversation_messages_only_returns_own(self):
        """Messages from one conversation don't leak into another."""
        conv1 = self.client.post("/api/chat/conversations/").data["id"]
        conv2 = self.client.post("/api/chat/conversations/").data["id"]

        from accounts.models import User
        from organizations.models import Membership
        from chat.models import ChatMessage, Conversation

        user = User.objects.get(email="chatconv@example.com")
        org = Membership.objects.filter(user=user).first().organization

        ChatMessage.objects.create(
            conversation_id=conv1, organization=org, user=user,
            role="user", content="Message in conv1",
        )
        ChatMessage.objects.create(
            conversation_id=conv2, organization=org, user=user,
            role="user", content="Message in conv2",
        )

        resp1 = self.client.get(f"/api/chat/conversations/{conv1}/messages/")
        self.assertEqual(len(resp1.data), 1)
        self.assertEqual(resp1.data[0]["content"], "Message in conv1")
```

**Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test chat.tests.ChatWithConversationTests -v 2`
Expected: FAIL

**Step 3: Update send_message view**

In `backend/chat/views.py`, modify `send_message` to accept `conversation_id` and link messages:

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a message and get an AI response."""
    org = request.organization
    if not org:
        return Response(
            {"detail": "No organization found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = ChatInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user_message = serializer.validated_data["message"]
    conversation_id = serializer.validated_data.get("conversation_id")

    # Get or create conversation
    if conversation_id:
        try:
            conv = Conversation.objects.get(
                id=conversation_id, organization=org, user=request.user,
            )
        except Conversation.DoesNotExist:
            return Response(
                {"detail": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        conv = Conversation.objects.create(
            organization=org, user=request.user,
        )

    # Save user message
    ChatMessage.objects.create(
        conversation=conv,
        organization=org,
        user=request.user,
        role=ChatMessage.Role.USER,
        content=user_message,
    )

    # Build context for the system prompt
    contacts_summary, deals_summary, tasks_summary = _build_context(org)
    user_name = f"{request.user.first_name} {request.user.last_name}".strip()
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=user_name or request.user.email,
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
    )

    # Build and run the agent
    agent = build_agent()
    deps = ChatDeps(
        organization_id=str(org.id),
        user_id=str(request.user.id),
    )

    try:
        result = agent.run_sync(
            user_message,
            deps=deps,
            model=settings.AI_MODEL,
            instructions=formatted_prompt,
        )
        ai_text = result.output
        actions = _extract_actions(result.all_messages())
    except Exception:
        logger.exception("AI agent error")
        ai_text = "Desole, une erreur est survenue. Veuillez reessayer."
        actions = []

    # Save assistant message
    assistant_msg = ChatMessage.objects.create(
        conversation=conv,
        organization=org,
        user=request.user,
        role=ChatMessage.Role.ASSISTANT,
        content=ai_text,
        actions=actions,
    )

    return Response(ChatMessageSerializer(assistant_msg).data)
```

**Step 4: Update stream_message similarly**

In `stream_message`, parse `conversation_id` from the body, get-or-create conversation, and pass it to `ChatMessage.objects.acreate()` calls. Also update the conversation's `updated_at` by saving it after the assistant message:

```python
# In stream_message, after parsing body:
    conversation_id = body.get("conversation_id")
    if conversation_id:
        try:
            conv = await Conversation.objects.aget(
                id=conversation_id, organization=org, user=user,
            )
        except Conversation.DoesNotExist:
            return StreamingHttpResponse(status=404)
    else:
        conv = await Conversation.objects.acreate(
            organization=org, user=user,
        )

    # Save user message (add conversation=conv)
    await ChatMessage.objects.acreate(
        conversation=conv,
        organization=org,
        user=user,
        role=ChatMessage.Role.USER,
        content=user_message,
    )

    # In event_generator, when saving assistant message, add conversation=conv:
    assistant_msg = await ChatMessage.objects.acreate(
        conversation=conv,
        organization=org,
        user=user,
        role=ChatMessage.Role.ASSISTANT,
        content=full_text,
        actions=actions,
    )
    # Touch conversation updated_at
    conv.updated_at = assistant_msg.created_at
    await conv.asave(update_fields=["updated_at"])

    # Include conversation_id in the done event:
    yield _sse_event("done", {
        "message_id": str(assistant_msg.id),
        "conversation_id": str(conv.id),
        "actions": actions,
    })
```

**Step 5: Run tests**

Run: `docker compose exec backend python manage.py test chat -v 2`
Expected: All tests PASS (including old ChatTests — update them to work with conversations).

**Step 6: Fix existing ChatTests**

The existing `ChatTests` will need the `ChatMessage.objects.create` calls in `test_chat_history_returns_ordered_messages` updated to include a `conversation`. Update the test to create a conversation first. Also update `test_send_message_saves_messages` since it now auto-creates a conversation.

**Step 7: Commit**

```bash
git add backend/chat/
git commit -m "feat(chat): link messages to conversations in send/stream endpoints"
```

---

### Task 6: Title auto-generation via LLM

**Files:**
- Modify: `backend/chat/views.py`
- Modify: `backend/chat/prompts.py`

**Step 1: Add title generation prompt**

In `backend/chat/prompts.py`, add:

```python
TITLE_GENERATION_PROMPT = """Genere un titre tres court (5 mots maximum) pour cette conversation CRM.
Le titre doit resumer le sujet principal de maniere claire et concise.
Reponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.

Echange:
Utilisateur: {user_message}
Assistant: {assistant_message}"""
```

**Step 2: Add title generation helper**

In `backend/chat/views.py`, add a helper function:

```python
from pydantic_ai import Agent as PydanticAgent

async def _generate_title(user_message: str, assistant_message: str) -> str:
    """Generate a short conversation title using the LLM."""
    from .prompts import TITLE_GENERATION_PROMPT
    try:
        agent = PydanticAgent(model=settings.AI_MODEL)
        result = await agent.run(
            TITLE_GENERATION_PROMPT.format(
                user_message=user_message[:200],
                assistant_message=assistant_message[:200],
            ),
        )
        title = result.output.strip()[:200]
        return title if title else "Nouvelle conversation"
    except Exception:
        logger.exception("Title generation error")
        return "Nouvelle conversation"
```

**Step 3: Call title generation after first exchange**

In `stream_message`'s `event_generator`, after saving the assistant message, check if this is the first exchange and generate a title:

```python
    # After saving assistant_msg and before the done event:
    # Generate title if this is the first exchange
    msg_count = await conv.messages.acount()
    if msg_count == 2:  # First user + first assistant
        title = await _generate_title(user_message, full_text)
        conv.title = title
        await conv.asave(update_fields=["title", "updated_at"])

    yield _sse_event("done", {
        "message_id": str(assistant_msg.id),
        "conversation_id": str(conv.id),
        "conversation_title": conv.title,
        "actions": actions,
    })
```

Do the same in `send_message` (sync version):

```python
    # After saving assistant_msg:
    if conv.messages.count() == 2:
        from .prompts import TITLE_GENERATION_PROMPT
        try:
            title_agent = PydanticAgent(model=settings.AI_MODEL)
            title_result = title_agent.run_sync(
                TITLE_GENERATION_PROMPT.format(
                    user_message=user_message[:200],
                    assistant_message=ai_text[:200],
                ),
            )
            conv.title = title_result.output.strip()[:200] or "Nouvelle conversation"
            conv.save(update_fields=["title", "updated_at"])
        except Exception:
            logger.exception("Title generation error")
```

**Step 4: Run all tests**

Run: `docker compose exec backend python manage.py test chat -v 2`
Expected: All PASS.

**Step 5: Commit**

```bash
git add backend/chat/views.py backend/chat/prompts.py
git commit -m "feat(chat): auto-generate conversation titles via LLM"
```

---

### Task 7: Frontend API functions for conversations

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add conversation API types and functions**

At the bottom of `frontend/lib/api.ts`, add:

```typescript
export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message_preview: string | null
}

export async function fetchConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/chat/conversations/")
}

export async function createConversation(): Promise<Conversation> {
  return apiFetch<Conversation>("/chat/conversations/", {
    method: "POST",
  })
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/chat/conversations/${id}/`, {
    method: "DELETE",
  })
}

export async function renameConversation(
  id: string,
  title: string
): Promise<Conversation> {
  return apiFetch<Conversation>(`/chat/conversations/${id}/`, {
    method: "PATCH",
    json: { title },
  })
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<ApiMessage[]> {
  return apiFetch<ApiMessage[]>(
    `/chat/conversations/${conversationId}/messages/`
  )
}
```

Also export `ApiMessage` type (move it from ChatWindow or define here):

```typescript
export interface ApiMessage {
  id: string
  role: "user" | "assistant"
  content: string
  actions?: Array<{
    tool?: string
    args?: Record<string, unknown>
    result?: Record<string, unknown>
  }>
  created_at: string
}
```

**Step 2: Update `streamChat` to accept `conversation_id`**

```typescript
export async function streamChat(
  message: string,
  callbacks: SSECallbacks,
  conversationId?: string
): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = Cookies.get("access_token")

  const body: Record<string, string> = { message }
  if (conversationId) {
    body.conversation_id = conversationId
  }

  const response = await fetch(`${API_URL}/chat/stream/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  // ... rest stays the same
```

**Step 3: Update `SSECallbacks.onDone` to include conversation info**

```typescript
export interface SSECallbacks {
  onTextDelta: (content: string) => void
  onToolCallStart: (data: {
    tool_name: string
    tool_call_id: string
    args: Record<string, unknown>
  }) => void
  onToolResult: (data: {
    tool_call_id: string
    result: Record<string, unknown>
  }) => void
  onDone: (data: {
    message_id: string
    conversation_id: string
    conversation_title?: string
    actions: Array<Record<string, unknown>>
  }) => void
  onError: (message: string) => void
}
```

**Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(chat): add conversation API functions and update streamChat"
```

---

### Task 8: Frontend ConversationSidebar component

**Files:**
- Create: `frontend/components/chat/ConversationSidebar.tsx`

**Step 1: Create the sidebar component**

```tsx
"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil, MessageSquare, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  type Conversation,
  deleteConversation,
  renameConversation,
} from "@/lib/api"

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDeleted: (id: string) => void
  onRenamed: (id: string, title: string) => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDeleted,
  onRenamed,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await renameConversation(id, editTitle.trim())
      onRenamed(id, editTitle.trim())
    } catch {
      // silently fail
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id)
      onDeleted(id)
    } catch {
      // silently fail
    }
    setDeletingId(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `il y a ${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `il y a ${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `il y a ${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <div className="flex h-full w-64 flex-col border-l bg-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Conversations</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                activeConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
              onClick={() => {
                if (editingId !== conv.id && deletingId !== conv.id) {
                  onSelect(conv.id)
                }
              }}
            >
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
              <div className="min-w-0 flex-1">
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(conv.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="w-full rounded border bg-background px-1 py-0.5 text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleRename(conv.id) }}>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : deletingId === conv.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Supprimer ?</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}>
                      <Check className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(null) }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.last_message_preview || "Nouvelle conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {formatDate(conv.updated_at)}
                    </p>
                  </>
                )}
              </div>
              {editingId !== conv.id && deletingId !== conv.id && (
                <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditTitle(conv.title)
                      setEditingId(conv.id)
                    }}
                    className="rounded p-1 hover:bg-muted-foreground/10"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingId(conv.id)
                    }}
                    className="rounded p-1 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Aucune conversation
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ConversationSidebar.tsx
git commit -m "feat(chat): add ConversationSidebar component"
```

---

### Task 9: Update ChatWindow to use conversations

**Files:**
- Modify: `frontend/components/chat/ChatWindow.tsx`

**Step 1: Rewrite ChatWindow to manage conversations**

The ChatWindow component needs to:
1. Load conversations on mount
2. Track `activeConversationId`
3. Load messages when switching conversations
4. Pass `conversationId` to `streamChat`
5. Render the `ConversationSidebar` on the right
6. Handle new conversation, rename, delete
7. Update conversation title from `onDone` event

```tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageSquare } from "lucide-react"
import { useAuth } from "@/lib/auth"
import {
  apiFetch,
  streamChat,
  type Conversation,
  type ApiMessage,
  fetchConversations,
  createConversation,
  fetchConversationMessages,
} from "@/lib/api"
import { ChatInput } from "@/components/chat/ChatInput"
import {
  ChatMessage,
  TypingIndicator,
  messageToParts,
  type Message,
  type MessagePart,
} from "@/components/chat/ChatMessage"
import { ConversationSidebar } from "@/components/chat/ConversationSidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export function ChatWindow() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const userInitials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  const firstName = user?.first_name || "there"

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [])

  // Load conversations on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const convs = await fetchConversations()
        if (cancelled) return
        setConversations(convs)
        if (convs.length > 0) {
          setActiveConversationId(convs[0].id)
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      setIsHistoryLoaded(true)
      return
    }

    let cancelled = false
    setIsHistoryLoaded(false)

    async function loadMessages() {
      try {
        const history = await fetchConversationMessages(activeConversationId!)
        if (cancelled) return
        setMessages(
          history.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: messageToParts(msg),
            created_at: msg.created_at,
          }))
        )
        setIsHistoryLoaded(true)
      } catch {
        if (!cancelled) setIsHistoryLoaded(true)
      }
    }

    loadMessages()
    return () => { cancelled = true }
  }, [activeConversationId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isHistoryLoaded) scrollToBottom()
  }, [messages, isLoading, isHistoryLoaded, scrollToBottom])

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await createConversation()
      setConversations((prev) => [conv, ...prev])
      setActiveConversationId(conv.id)
    } catch {
      // ignore
    }
  }, [])

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
      }
    },
    [activeConversationId, conversations]
  )

  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      )
    },
    []
  )

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeConversationId

      // Auto-create conversation if none active
      if (!convId) {
        try {
          const conv = await createConversation()
          setConversations((prev) => [conv, ...prev])
          convId = conv.id
          setActiveConversationId(conv.id)
        } catch {
          return
        }
      }

      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        parts: [{ type: "text", content: text }],
        created_at: new Date().toISOString(),
      }

      const assistantId = `streaming-${Date.now()}`
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        parts: [],
        isStreaming: true,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsLoading(true)

      try {
        await streamChat(
          text,
          {
            onTextDelta: (content) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  const parts = [...msg.parts]
                  const lastPart = parts[parts.length - 1]
                  if (lastPart && lastPart.type === "text") {
                    parts[parts.length - 1] = {
                      ...lastPart,
                      content: lastPart.content + content,
                    }
                  } else {
                    parts.push({ type: "text", content })
                  }
                  return { ...msg, parts }
                })
              )
            },

            onToolCallStart: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: [
                      ...msg.parts,
                      {
                        type: "tool_call" as const,
                        toolName: data.tool_name,
                        toolCallId: data.tool_call_id,
                        args: data.args,
                        status: "running" as const,
                      },
                    ],
                  }
                })
              )
            },

            onToolResult: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: msg.parts.map((part) => {
                      if (
                        part.type === "tool_call" &&
                        part.toolCallId === data.tool_call_id
                      ) {
                        return { ...part, status: "completed" as const, result: data.result }
                      }
                      return part
                    }),
                  }
                })
              )
            },

            onDone: (data) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return { ...msg, id: data.message_id, isStreaming: false }
                })
              )
              // Update conversation title if provided
              if (data.conversation_title) {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convId
                      ? { ...c, title: data.conversation_title!, updated_at: new Date().toISOString() }
                      : c
                  )
                )
              }
              // Move conversation to top
              setConversations((prev) => {
                const conv = prev.find((c) => c.id === convId)
                if (!conv) return prev
                return [
                  { ...conv, updated_at: new Date().toISOString(), last_message_preview: text },
                  ...prev.filter((c) => c.id !== convId),
                ]
              })
            },

            onError: (errorMessage) => {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantId) return msg
                  return {
                    ...msg,
                    parts: [{ type: "text", content: errorMessage }],
                    isStreaming: false,
                  }
                })
              )
            },
          },
          convId
        )
      } catch (error) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantId) return msg
            return {
              ...msg,
              parts: [
                {
                  type: "text",
                  content: "Désolé, une erreur est survenue. Veuillez réessayer.",
                },
              ],
              isStreaming: false,
            }
          })
        )
        console.error("Chat error:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [activeConversationId]
  )

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="mx-auto max-w-3xl px-4 py-6">
            {isHistoryLoaded && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">
                  Bonjour {firstName} !
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Dis-moi ce que tu veux faire. Je peux créer des contacts,
                  gérer tes deals, organiser tes tâches, et bien plus encore.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-5">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userInitials={userInitials}
                />
              ))}
              {isLoading && !messages.some((m) => m.isStreaming) && (
                <TypingIndicator />
              )}
            </div>

            <div ref={bottomRef} className="h-1" />
          </div>
        </ScrollArea>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Conversations sidebar (right) */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewConversation}
        onDeleted={handleDeleteConversation}
        onRenamed={handleRenameConversation}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ChatWindow.tsx
git commit -m "feat(chat): integrate conversation sidebar into ChatWindow"
```

---

### Task 10: Update existing backend tests

**Files:**
- Modify: `backend/chat/tests.py`

**Step 1: Fix existing ChatTests to work with conversations**

The existing tests that create `ChatMessage` directly need to also create a `Conversation`. Update `test_chat_history_returns_ordered_messages` and adjust `test_send_message_saves_messages` assertions for the auto-created conversation.

```python
# In test_chat_history_returns_ordered_messages, after getting org:
from chat.models import Conversation
conv = Conversation.objects.create(organization=org, user=u)

ChatMessage.objects.create(
    conversation=conv, organization=org, user=u, role="user", content="Message 1"
)
ChatMessage.objects.create(
    conversation=conv, organization=org, user=u, role="assistant", content="Reply 1"
)
```

Also update `test_send_message_saves_messages` to verify a Conversation was auto-created:

```python
# After existing assertions:
from chat.models import Conversation
self.assertEqual(Conversation.objects.count(), 1)
```

**Step 2: Run all tests**

Run: `docker compose exec backend python manage.py test chat -v 2`
Expected: All PASS.

**Step 3: Commit**

```bash
git add backend/chat/tests.py
git commit -m "test(chat): update existing tests for conversation support"
```

---

### Task 11: Final integration testing

**Step 1: Run all backend tests**

Run: `docker compose exec backend python manage.py test -v 2`
Expected: All PASS.

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: Manual smoke test**

1. Open the chat page
2. Verify conversations sidebar appears on the right
3. Send a first message — verify conversation appears with auto-generated title
4. Click "+ New" — verify new conversation created with empty chat
5. Switch between conversations — verify messages load correctly
6. Rename a conversation
7. Delete a conversation

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(chat): complete conversation history feature"
```
