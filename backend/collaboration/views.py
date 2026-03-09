import json

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from accounts.models import User
from notifications.helpers import create_notification
from .models import Comment, Mention, Reaction
from .serializers import (
    CommentSerializer,
    CommentCreateSerializer,
    ReactionCreateSerializer,
)
from .utils import extract_mention_ids, strip_html_tags


def _json_safe(data):
    """Convert DRF serializer data (with UUIDs, datetimes) to JSON-safe Python dicts."""
    return json.loads(JSONRenderer().render(data))


def broadcast_to_entity(entity_type, entity_id, event_type, data):
    channel_layer = get_channel_layer()
    group_name = f"{entity_type}_{entity_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {"type": "comment.event", "data": {"event": event_type, **data}},
    )


def broadcast_to_user(user_id, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "notification.message", "data": data},
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def comment_list_create(request):
    org = request.organization

    if request.method == "GET":
        qs = Comment.objects.filter(organization=org).select_related("author").prefetch_related("reactions__user", "mentions__user")

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
        from django.db.models import Q
        qs = qs.filter(Q(is_private=False) | Q(is_private=True, author=request.user))

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
        plain_content = strip_html_tags(comment.content)[:200]
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
                    message=plain_content,
                    link=f"/{entity_type}s/{entity_id}",
                )

    result = CommentSerializer(comment).data
    result_safe = _json_safe(result)

    # Broadcast new comment to entity viewers
    broadcast_to_entity(
        comment.entity_type,
        str(comment.entity_id),
        "comment_created",
        {"comment": result_safe},
    )

    # Broadcast notification to mentioned users via WebSocket
    if mention_ids:
        plain_content_ws = strip_html_tags(comment.content)[:200]
    for mid in mention_ids:
        if str(mid) != str(request.user.id):
            author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
            broadcast_to_user(str(mid), {
                "type": "mention",
                "title": f"{author_name} vous a mentionne",
                "message": plain_content_ws,
                "link": f"/{comment.entity_type}s/{comment.entity_id}",
            })

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
        entity_type = comment.entity_type
        entity_id = str(comment.entity_id)
        comment.delete()
        broadcast_to_entity(entity_type, entity_id, "comment_deleted", {"comment_id": str(pk)})
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    content = request.data.get("content")
    is_private = request.data.get("is_private")

    if content is not None:
        comment.content = content
        comment.edited_at = timezone.now()

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
    result = CommentSerializer(comment).data
    broadcast_to_entity(
        comment.entity_type,
        str(comment.entity_id),
        "comment_updated",
        {"comment": _json_safe(result)},
    )
    return Response(result)


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

    existing = Reaction.objects.filter(comment=comment, user=request.user, emoji=emoji).first()
    if existing:
        existing.delete()
        # Refresh comment for updated reactions
        comment.refresh_from_db()
        broadcast_to_entity(
            comment.entity_type,
            str(comment.entity_id),
            "reaction_updated",
            {"comment_id": str(comment_id), "reactions": _json_safe(CommentSerializer(comment).data["reactions"])},
        )
        return Response({"action": "removed"})

    Reaction.objects.create(comment=comment, user=request.user, emoji=emoji)

    if comment.author != request.user:
        author_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.email
        plain_content = strip_html_tags(comment.content)[:100]
        create_notification(
            organization=request.organization,
            recipient=comment.author,
            type="reaction",
            title=f"{author_name} a reagi {emoji} a votre commentaire",
            message=plain_content,
            link=f"/{comment.entity_type}s/{comment.entity_id}",
        )
        broadcast_to_user(str(comment.author.id), {
            "type": "reaction",
            "title": f"{author_name} a reagi {emoji}",
            "message": plain_content,
            "link": f"/{comment.entity_type}s/{comment.entity_id}",
        })

    # Refresh comment for updated reactions
    comment.refresh_from_db()
    broadcast_to_entity(
        comment.entity_type,
        str(comment.entity_id),
        "reaction_updated",
        {"comment_id": str(comment_id), "reactions": _json_safe(CommentSerializer(comment).data["reactions"])},
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
