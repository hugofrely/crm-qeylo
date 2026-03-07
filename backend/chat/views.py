import json
import logging
from datetime import datetime

from django.conf import settings
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from asgiref.sync import sync_to_async
from pydantic_ai.messages import (
    ModelResponse,
    ModelRequest,
    SystemPromptPart,
    UserPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    PartStartEvent,
    PartDeltaEvent,
    TextPartDelta,
)
from pydantic_ai import Agent as PydanticAgent

from contacts.models import Contact, ContactCategory, CustomFieldDefinition
from deals.models import Deal
from tasks.models import Task

from .agent import build_agent
from .models import ChatMessage, Conversation
from .prompts import SYSTEM_PROMPT
from .serializers import ChatInputSerializer, ChatMessageSerializer, ConversationSerializer
from .tools import ChatDeps
from ai_usage.tracking import log_ai_usage, alog_ai_usage
from ai_usage.models import AIUsageLog

logger = logging.getLogger(__name__)


def _build_context(org):
    """Build a summary of recent data for the system prompt."""
    contacts = Contact.objects.filter(organization=org).order_by("-created_at")[:5]
    contact_parts = []
    for c in contacts:
        parts = [f"{c.first_name} {c.last_name}"]
        if c.company:
            parts.append(f"({c.company})")
        if c.lead_score:
            parts.append(f"[{c.get_lead_score_display()}]")
        contact_parts.append(" ".join(parts))
    contacts_summary = ", ".join(contact_parts) or "Aucun contact"

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

    # Email account status
    from emails.models import EmailAccount
    email_account = EmailAccount.objects.filter(
        organization=org, is_active=True,
    ).first()
    if email_account:
        email_status = f"Compte {email_account.get_provider_display()} connecte ({email_account.email_address}). Tu peux envoyer des emails."
    else:
        email_status = "Aucun compte email connecte. Suggere a l'utilisateur de connecter son email dans Parametres."

    # Categories
    categories = ContactCategory.objects.filter(organization=org)
    categories_list = ", ".join(c.name for c in categories) if categories else "Aucune"

    # Custom fields
    custom_fields = CustomFieldDefinition.objects.filter(organization=org)
    custom_fields_list = ", ".join(
        f"{cf.label} ({cf.get_field_type_display()})" for cf in custom_fields
    ) if custom_fields else "Aucun"

    return contacts_summary, deals_summary, tasks_summary, email_status, categories_list, custom_fields_list


def _build_message_history(conversation, system_prompt: str) -> list:
    """Build pydantic-ai message history from conversation DB records.

    Includes the system prompt as the first message so the LLM keeps
    the same instructions across the whole conversation.
    Reconstructs tool calls and tool results from the ``actions`` JSON
    field so the LLM can see returned IDs in subsequent turns.
    """
    history = []

    previous_messages = list(
        conversation.messages.order_by("created_at").values_list("role", "content", "actions")
    )

    # Exclude the last user message (it will be passed as the current prompt)
    if previous_messages and previous_messages[-1][0] == ChatMessage.Role.USER:
        previous_messages = previous_messages[:-1]

    if not previous_messages:
        return []

    first_user_done = False
    for role, content, actions in previous_messages:
        if role == ChatMessage.Role.USER:
            if not first_user_done:
                history.append(ModelRequest(parts=[
                    SystemPromptPart(content=system_prompt),
                    UserPromptPart(content=content),
                ]))
                first_user_done = True
            else:
                history.append(ModelRequest(parts=[UserPromptPart(content=content)]))
        elif role == ChatMessage.Role.ASSISTANT:
            if actions:
                # Rebuild tool-call / tool-result pairs so the LLM sees
                # the IDs returned by previous tool invocations.
                for idx, action in enumerate(actions):
                    tool_call_id = f"hist_{id(action)}_{idx}"
                    # ModelResponse with ToolCallPart
                    history.append(ModelResponse(parts=[
                        ToolCallPart(
                            tool_name=action["tool"],
                            args=action.get("args", {}),
                            tool_call_id=tool_call_id,
                        ),
                    ]))
                    # ModelRequest with ToolReturnPart
                    history.append(ModelRequest(parts=[
                        ToolReturnPart(
                            tool_name=action["tool"],
                            content=action.get("result", {}),
                            tool_call_id=tool_call_id,
                        ),
                    ]))
            # Final text response
            history.append(ModelResponse(parts=[TextPart(content=content)]))

    return history


async def _build_message_history_async(conversation, system_prompt: str) -> list:
    """Async version of _build_message_history."""
    history = []

    previous_messages = []
    async for msg in conversation.messages.order_by("created_at").values("role", "content", "actions"):
        previous_messages.append((msg["role"], msg["content"], msg.get("actions", [])))

    # Exclude the last user message (it will be passed as the current prompt)
    if previous_messages and previous_messages[-1][0] == ChatMessage.Role.USER:
        previous_messages = previous_messages[:-1]

    if not previous_messages:
        return []

    first_user_done = False
    for role, content, actions in previous_messages:
        if role == ChatMessage.Role.USER:
            if not first_user_done:
                history.append(ModelRequest(parts=[
                    SystemPromptPart(content=system_prompt),
                    UserPromptPart(content=content),
                ]))
                first_user_done = True
            else:
                history.append(ModelRequest(parts=[UserPromptPart(content=content)]))
        elif role == ChatMessage.Role.ASSISTANT:
            if actions:
                for idx, action in enumerate(actions):
                    tool_call_id = f"hist_{id(action)}_{idx}"
                    history.append(ModelResponse(parts=[
                        ToolCallPart(
                            tool_name=action["tool"],
                            args=action.get("args", {}),
                            tool_call_id=tool_call_id,
                        ),
                    ]))
                    history.append(ModelRequest(parts=[
                        ToolReturnPart(
                            tool_name=action["tool"],
                            content=action.get("result", {}),
                            tool_call_id=tool_call_id,
                        ),
                    ]))
            history.append(ModelResponse(parts=[TextPart(content=content)]))

    return history


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

    # Second pass: build action list from tool calls with text_before
    for msg in messages:
        if isinstance(msg, ModelResponse):
            text_before = ""
            for part in msg.parts:
                if isinstance(part, TextPart):
                    text_before += part.content
                elif isinstance(part, ToolCallPart):
                    result = tool_results.get(part.tool_call_id)
                    action_info = {
                        "tool": part.tool_name,
                        "args": part.args,
                        "text_before": text_before,
                    }
                    text_before = ""
                    if isinstance(result, dict):
                        action_info["result"] = result
                    actions.append(action_info)
    return actions


async def _generate_title_async(user_message: str, assistant_message: str, org=None, user_obj=None, conv=None) -> str:
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
        if org and user_obj:
            usage = result.usage()
            await alog_ai_usage(
                organization=org,
                user=user_obj,
                call_type=AIUsageLog.CallType.TITLE_GENERATION,
                model=settings.AI_MODEL,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                conversation=conv,
            )
        title = result.output.strip()[:200]
        return title if title else "Nouvelle conversation"
    except Exception:
        logger.exception("Title generation error")
        return "Nouvelle conversation"


def _generate_title_sync(user_message: str, assistant_message: str, org=None, user_obj=None, conv=None) -> str:
    """Generate a short conversation title using the LLM (sync version)."""
    from .prompts import TITLE_GENERATION_PROMPT
    try:
        agent = PydanticAgent(model=settings.AI_MODEL)
        result = agent.run_sync(
            TITLE_GENERATION_PROMPT.format(
                user_message=user_message[:200],
                assistant_message=assistant_message[:200],
            ),
        )
        if org and user_obj:
            usage = result.usage()
            log_ai_usage(
                organization=org,
                user=user_obj,
                call_type=AIUsageLog.CallType.TITLE_GENERATION,
                model=settings.AI_MODEL,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                conversation=conv,
            )
        title = result.output.strip()[:200]
        return title if title else "Nouvelle conversation"
    except Exception:
        logger.exception("Title generation error")
        return "Nouvelle conversation"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a message and get an AI response."""
    from subscriptions.permissions import require_can_send_ai_message
    org = request.organization
    if not org:
        return Response(
            {"detail": "No organization found."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    require_can_send_ai_message(org)

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
    contacts_summary, deals_summary, tasks_summary, email_status, categories_list, custom_fields_list = _build_context(org)
    user_name = f"{request.user.first_name} {request.user.last_name}".strip()
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=user_name or request.user.email,
        current_datetime=datetime.now().strftime("%d/%m/%Y %H:%M"),
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
        email_status=email_status,
        categories_list=categories_list,
        custom_fields_list=custom_fields_list,
    )

    # Build and run the agent
    agent = build_agent()
    deps = ChatDeps(
        organization_id=str(org.id),
        user_id=str(request.user.id),
    )

    # Build conversation history for multi-turn context
    message_history = _build_message_history(conv, formatted_prompt)

    try:
        run_kwargs = dict(
            deps=deps,
            model=settings.AI_MODEL,
        )
        if message_history:
            run_kwargs["message_history"] = message_history
        else:
            run_kwargs["instructions"] = formatted_prompt

        result = agent.run_sync(
            user_message,
            **run_kwargs,
        )
        ai_text = result.output
        # Log AI usage
        usage = result.usage()
        log_ai_usage(
            organization=org,
            user=request.user,
            call_type=AIUsageLog.CallType.CHAT,
            model=settings.AI_MODEL,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            conversation=conv,
        )
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

    # Generate title if this is the first exchange
    if conv.messages.count() == 2:
        conv.title = _generate_title_sync(user_message, ai_text, org=org, user_obj=request.user, conv=conv)
        conv.save(update_fields=["title"])

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


def _sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@csrf_exempt
async def stream_message(request):
    """Stream an AI response as Server-Sent Events."""
    if request.method != "POST":
        return StreamingHttpResponse(status=405)

    from rest_framework_simplejwt.authentication import JWTAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    jwt_auth = JWTAuthentication()
    try:
        auth_result = await sync_to_async(jwt_auth.authenticate)(request)
        if auth_result is None:
            return StreamingHttpResponse(status=401)
        user, _ = auth_result
    except AuthenticationFailed:
        return StreamingHttpResponse(status=401)

    # Get organization
    from organizations.models import Membership
    membership = await Membership.objects.select_related("organization").filter(
        user=user
    ).afirst()
    if not membership:
        return StreamingHttpResponse(status=400)
    org = membership.organization

    # Parse body
    try:
        body = json.loads(request.body)
        user_message = body.get("message", "").strip()
    except (json.JSONDecodeError, AttributeError):
        return StreamingHttpResponse(status=400)

    if not user_message:
        return StreamingHttpResponse(status=400)

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

    # Save user message
    await ChatMessage.objects.acreate(
        conversation=conv,
        organization=org,
        user=user,
        role=ChatMessage.Role.USER,
        content=user_message,
    )

    # Build context
    contacts_summary, deals_summary, tasks_summary, email_status, categories_list, custom_fields_list = await sync_to_async(_build_context)(org)
    user_name = f"{user.first_name} {user.last_name}".strip()
    formatted_prompt = SYSTEM_PROMPT.format(
        user_name=user_name or user.email,
        current_datetime=datetime.now().strftime("%d/%m/%Y %H:%M"),
        contacts_summary=contacts_summary,
        deals_summary=deals_summary,
        tasks_summary=tasks_summary,
        email_status=email_status,
        categories_list=categories_list,
        custom_fields_list=custom_fields_list,
    )

    agent = build_agent()
    deps = ChatDeps(
        organization_id=str(org.id),
        user_id=str(user.id),
    )

    # Build conversation history for multi-turn context
    message_history = await _build_message_history_async(conv, formatted_prompt)

    async def event_generator():
        full_text = ""
        actions = []
        pending_tool_calls = {}  # tool_call_id -> args
        text_since_last_action = ""  # track text before each tool call

        run_kwargs = dict(
            deps=deps,
            model=settings.AI_MODEL,
        )
        if message_history:
            run_kwargs["message_history"] = message_history
        else:
            run_kwargs["instructions"] = formatted_prompt

        from pydantic_ai.usage import RunUsage
        run_usage = RunUsage()
        run_kwargs["usage"] = run_usage

        try:
            async for event in agent.run_stream_events(
                user_message,
                **run_kwargs,
            ):
                if isinstance(event, PartStartEvent):
                    # When a new text part starts (e.g. after tool calls),
                    # it may contain initial text content
                    if isinstance(event.part, TextPart) and event.part.content:
                        delta = event.part.content
                        full_text += delta
                        text_since_last_action += delta
                        yield _sse_event("text_delta", {"content": delta})

                elif isinstance(event, PartDeltaEvent):
                    if isinstance(event.delta, TextPartDelta):
                        delta = event.delta.content_delta
                        full_text += delta
                        text_since_last_action += delta
                        yield _sse_event("text_delta", {"content": delta})

                elif isinstance(event, FunctionToolCallEvent):
                    call_args = event.part.args if isinstance(event.part.args, dict) else {}
                    pending_tool_calls[event.part.tool_call_id] = call_args
                    yield _sse_event("tool_call_start", {
                        "tool_name": event.part.tool_name,
                        "tool_call_id": event.part.tool_call_id,
                        "args": call_args,
                    })

                elif isinstance(event, FunctionToolResultEvent):
                    result_content = event.result.content if isinstance(event.result, ToolReturnPart) else None
                    tool_call_id = event.result.tool_call_id if isinstance(event.result, ToolReturnPart) else ""
                    if isinstance(result_content, dict):
                        actions.append({
                            "tool": event.result.tool_name,
                            "args": pending_tool_calls.pop(tool_call_id, {}),
                            "result": result_content,
                            "text_before": text_since_last_action,
                        })
                        text_since_last_action = ""
                    yield _sse_event("tool_result", {
                        "tool_call_id": tool_call_id,
                        "result": result_content if isinstance(result_content, dict) else {},
                    })

            # Save assistant message
            assistant_msg = await ChatMessage.objects.acreate(
                conversation=conv,
                organization=org,
                user=user,
                role=ChatMessage.Role.ASSISTANT,
                content=full_text,
                actions=actions,
            )

            # Log AI usage
            await alog_ai_usage(
                organization=org,
                user=user,
                call_type=AIUsageLog.CallType.CHAT,
                model=settings.AI_MODEL,
                input_tokens=run_usage.input_tokens,
                output_tokens=run_usage.output_tokens,
                conversation=conv,
            )

            # Generate title if this is the first exchange
            msg_count = await conv.messages.acount()
            if msg_count == 2:
                title = await _generate_title_async(user_message, full_text, org=org, user_obj=user, conv=conv)
                conv.title = title
                await conv.asave(update_fields=["title"])

            yield _sse_event("done", {
                "message_id": str(assistant_msg.id),
                "conversation_id": str(conv.id),
                "conversation_title": conv.title,
                "actions": actions,
            })

        except Exception:
            logger.exception("Streaming AI agent error")
            error_text = "Desole, une erreur est survenue. Veuillez reessayer."
            yield _sse_event("error", {"message": error_text})
            await ChatMessage.objects.acreate(
                conversation=conv,
                organization=org,
                user=user,
                role=ChatMessage.Role.ASSISTANT,
                content=error_text,
                actions=[],
            )

    response = StreamingHttpResponse(
        event_generator(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


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
