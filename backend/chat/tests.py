from unittest.mock import patch, MagicMock

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from .models import ChatMessage


class ChatTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "hugo@example.com",
                "password": "securepass123",
                "first_name": "Hugo",
                "last_name": "Frely",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_chat_history_empty(self):
        response = self.client.get("/api/chat/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    @patch("chat.views.build_agent")
    def test_send_message_saves_messages(self, mock_build):
        # Mock the agent and its run_sync return value
        mock_agent = MagicMock()
        mock_result = MagicMock()
        mock_result.output = "OK, j'ai compris."
        mock_result.all_messages.return_value = []
        mock_agent.run_sync.return_value = mock_result
        mock_build.return_value = mock_agent

        response = self.client.post(
            "/api/chat/message/", {"message": "Salut"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # User message saved
        self.assertEqual(
            ChatMessage.objects.filter(role="user").count(), 1
        )
        # AI message saved
        self.assertEqual(
            ChatMessage.objects.filter(role="assistant").count(), 1
        )
        # Response content matches
        self.assertEqual(response.data["content"], "OK, j'ai compris.")

    @patch("chat.views.build_agent")
    def test_send_message_with_actions(self, mock_build):
        """Verify that tool-call actions are extracted and stored."""
        from pydantic_ai.messages import (
            ModelRequest,
            ModelResponse,
            UserPromptPart,
            ToolCallPart,
            ToolReturnPart,
            TextPart,
        )

        # Build a realistic message history with a tool call
        messages = [
            ModelRequest(parts=[UserPromptPart(content="Cree un contact Marie Dupont")]),
            ModelResponse(parts=[
                ToolCallPart(
                    tool_name="create_contact",
                    args={"first_name": "Marie", "last_name": "Dupont"},
                    tool_call_id="call_1",
                ),
            ]),
            ModelRequest(parts=[
                ToolReturnPart(
                    tool_name="create_contact",
                    content={"action": "contact_created", "id": "abc", "name": "Marie Dupont", "company": ""},
                    tool_call_id="call_1",
                ),
            ]),
            ModelResponse(parts=[
                TextPart(content="J'ai cree le contact Marie Dupont."),
            ]),
        ]

        mock_agent = MagicMock()
        mock_result = MagicMock()
        mock_result.output = "J'ai cree le contact Marie Dupont."
        mock_result.all_messages.return_value = messages
        mock_agent.run_sync.return_value = mock_result
        mock_build.return_value = mock_agent

        response = self.client.post(
            "/api/chat/message/", {"message": "Cree un contact Marie Dupont"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["actions"]), 1)
        self.assertEqual(response.data["actions"][0]["tool"], "create_contact")

    @patch("chat.views.build_agent")
    def test_send_message_agent_error(self, mock_build):
        """If the agent raises, the view should return a graceful error message."""
        mock_agent = MagicMock()
        mock_agent.run_sync.side_effect = RuntimeError("API key missing")
        mock_build.return_value = mock_agent

        response = self.client.post(
            "/api/chat/message/", {"message": "Salut"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("erreur", response.data["content"].lower())
        # Both messages should still be saved
        self.assertEqual(ChatMessage.objects.count(), 2)

    def test_send_message_unauthenticated(self):
        self.client.credentials()
        response = self.client.post(
            "/api/chat/message/", {"message": "Salut"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_chat_history_returns_ordered_messages(self):
        """History endpoint returns messages in chronological order."""
        from organizations.models import Membership
        from accounts.models import User
        from chat.models import Conversation

        u = User.objects.get(email="hugo@example.com")
        org = Membership.objects.filter(user=u).first().organization
        conv = Conversation.objects.create(organization=org, user=u)

        ChatMessage.objects.create(
            conversation=conv, organization=org, user=u, role="user", content="Message 1"
        )
        ChatMessage.objects.create(
            conversation=conv, organization=org, user=u, role="assistant", content="Reply 1"
        )

        response = self.client.get("/api/chat/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["content"], "Message 1")
        self.assertEqual(response.data[1]["content"], "Reply 1")


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

    def test_conversation_messages_empty(self):
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
        from chat.models import Conversation

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


class UpdateContactToolTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "tooltest@example.com",
                "password": "securepass123",
                "first_name": "Tool",
                "last_name": "Test",
            },
        )
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Create a contact to update
        resp = self.client.post(
            "/api/contacts/",
            {"first_name": "Marie", "last_name": "Dupont"},
        )
        self.contact_id = resp.data["id"]

        from accounts.models import User
        from organizations.models import Membership
        self.user = User.objects.get(email="tooltest@example.com")
        self.org = Membership.objects.filter(user=self.user).first().organization

    def test_update_contact_tool(self):
        from chat.tools import update_contact, ChatDeps
        from unittest.mock import MagicMock

        ctx = MagicMock()
        ctx.deps = ChatDeps(
            organization_id=str(self.org.id),
            user_id=str(self.user.id),
        )
        result = update_contact(
            ctx,
            contact_id=str(self.contact_id),
            job_title="CEO",
            lead_score="hot",
            industry="Tech",
        )
        self.assertEqual(result["action"], "contact_updated")
        self.assertIn("job_title", result["changed_fields"])
        self.assertIn("lead_score", result["changed_fields"])

        # Verify persisted
        from contacts.models import Contact
        contact = Contact.objects.get(id=self.contact_id)
        self.assertEqual(contact.job_title, "CEO")
        self.assertEqual(contact.lead_score, "hot")

    def test_update_contact_tool_not_found(self):
        from chat.tools import update_contact, ChatDeps
        from unittest.mock import MagicMock

        ctx = MagicMock()
        ctx.deps = ChatDeps(
            organization_id=str(self.org.id),
            user_id=str(self.user.id),
        )
        result = update_contact(
            ctx,
            contact_id="00000000-0000-0000-0000-000000000000",
            job_title="CEO",
        )
        self.assertEqual(result["action"], "error")
