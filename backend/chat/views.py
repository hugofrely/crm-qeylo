import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pydantic_ai.messages import ModelResponse, ModelRequest, ToolCallPart, ToolReturnPart

from contacts.models import Contact
from deals.models import Deal
from tasks.models import Task

from .agent import build_agent
from .models import ChatMessage
from .prompts import SYSTEM_PROMPT
from .serializers import ChatInputSerializer, ChatMessageSerializer
from .tools import ChatDeps

logger = logging.getLogger(__name__)


def _build_context(org):
    """Build a summary of recent data for the system prompt."""
    contacts = Contact.objects.filter(organization=org).order_by("-created_at")[:5]
    contacts_summary = ", ".join(
        f"{c.first_name} {c.last_name}" for c in contacts
    ) or "Aucun contact"

    deals = Deal.objects.filter(organization=org).exclude(
        stage__name__in=["Gagne", "Perdu"],
    ).order_by("-created_at")[:5]
    deals_summary = ", ".join(
        f"{d.name} ({d.amount} EUR - {d.stage.name})" for d in deals
    ) or "Aucun deal actif"

    tasks = Task.objects.filter(
        organization=org, is_done=False,
    ).order_by("due_date")[:5]
    tasks_summary = ", ".join(
        f"{t.description} (echeance: {t.due_date.strftime('%d/%m/%Y')})"
        for t in tasks
    ) or "Aucune tache"

    return contacts_summary, deals_summary, tasks_summary


def _extract_actions(messages) -> list[dict]:
    """Extract tool-call actions from the pydantic-ai message history."""
    actions = []
    tool_results = {}

    # First pass: collect tool return values
    for msg in messages:
        if isinstance(msg, ModelRequest):
            for part in msg.parts:
                if isinstance(part, ToolReturnPart):
                    tool_results[part.tool_call_id] = part.content

    # Second pass: build action list from tool calls
    for msg in messages:
        if isinstance(msg, ModelResponse):
            for part in msg.parts:
                if isinstance(part, ToolCallPart):
                    result = tool_results.get(part.tool_call_id)
                    action_info = {
                        "tool": part.tool_name,
                        "args": part.args,
                    }
                    if isinstance(result, dict):
                        action_info["result"] = result
                    actions.append(action_info)
    return actions


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

    # Save user message
    ChatMessage.objects.create(
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
        organization=org,
        user=request.user,
        role=ChatMessage.Role.ASSISTANT,
        content=ai_text,
        actions=actions,
    )

    return Response(ChatMessageSerializer(assistant_msg).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat_history(request):
    """Return the chat history for the current user and organization."""
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    messages = ChatMessage.objects.filter(
        organization=org,
        user=request.user,
    )
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)
