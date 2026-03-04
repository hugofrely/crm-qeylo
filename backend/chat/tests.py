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
        # We need an org for creating messages directly
        from organizations.models import Membership

        user = self.client.post(
            "/api/auth/register/",
            {
                "email": "hist@example.com",
                "password": "securepass123",
                "first_name": "Hist",
                "last_name": "User",
            },
        )
        # Use the original user's setup
        from accounts.models import User
        from organizations.models import Organization

        u = User.objects.get(email="hugo@example.com")
        org = Membership.objects.filter(user=u).first().organization

        ChatMessage.objects.create(
            organization=org, user=u, role="user", content="Message 1"
        )
        ChatMessage.objects.create(
            organization=org, user=u, role="assistant", content="Reply 1"
        )

        response = self.client.get("/api/chat/history/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["content"], "Message 1")
        self.assertEqual(response.data[1]["content"], "Reply 1")
