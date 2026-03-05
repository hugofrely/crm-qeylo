from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    qs = Notification.objects.filter(
        organization=request.organization,
        recipient=request.user,
    ).order_by("is_read", "-created_at")
    page = request.query_params.get("page", 1)
    try:
        page = int(page)
    except ValueError:
        page = 1
    start = (page - 1) * 20
    end = start + 20
    notifications = qs[start:end]
    return Response(NotificationSerializer(notifications, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_read(request):
    ids = request.data.get("ids", [])
    if not ids:
        return Response({"detail": "ids is required"}, status=status.HTTP_400_BAD_REQUEST)
    Notification.objects.filter(
        id__in=ids, recipient=request.user, organization=request.organization,
    ).update(is_read=True)
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(
        recipient=request.user, organization=request.organization, is_read=False,
    ).update(is_read=True)
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    count = Notification.objects.filter(
        recipient=request.user, organization=request.organization, is_read=False,
    ).count()
    return Response({"count": count})
