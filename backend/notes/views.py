from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import TimelineEntry
from .serializers import TimelineEntrySerializer, NoteCreateSerializer, ActivityCreateSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def timeline_list(request):
    entries = TimelineEntry.objects.filter(organization=request.organization)
    contact_id = request.query_params.get("contact")
    deal_id = request.query_params.get("deal")
    if contact_id:
        entries = entries.filter(contact_id=contact_id)
    if deal_id:
        entries = entries.filter(deal_id=deal_id)
    return Response(TimelineEntrySerializer(entries, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_note(request):
    serializer = NoteCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    entry = TimelineEntry.objects.create(
        organization=request.organization,
        created_by=request.user,
        contact_id=serializer.validated_data.get("contact"),
        deal_id=serializer.validated_data.get("deal"),
        entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        content=serializer.validated_data["content"],
    )
    return Response(
        TimelineEntrySerializer(entry).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_activity(request):
    serializer = ActivityCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    entry = TimelineEntry.objects.create(
        organization=request.organization,
        created_by=request.user,
        contact_id=data["contact"],
        deal_id=data.get("deal"),
        entry_type=data["entry_type"],
        subject=data.get("subject", ""),
        content=data.get("content", ""),
        metadata=data.get("metadata", {}),
    )
    return Response(
        TimelineEntrySerializer(entry).data,
        status=status.HTTP_201_CREATED,
    )
