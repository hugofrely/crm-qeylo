from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from contacts.models import Contact
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
    type_filter = request.query_params.get("type")
    if type_filter == "interactions":
        entries = entries.filter(entry_type__in=[
            "call", "email_sent", "email_received", "meeting", "custom",
        ])
    elif type_filter == "journal":
        entries = entries.filter(entry_type__in=[
            "contact_created", "deal_created", "deal_moved",
            "note_added", "task_created", "chat_action", "contact_updated",
        ])
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


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def update_or_delete_note(request, pk):
    try:
        entry = TimelineEntry.objects.get(
            pk=pk,
            organization=request.organization,
            entry_type=TimelineEntry.EntryType.NOTE_ADDED,
        )
    except TimelineEntry.DoesNotExist:
        return Response(
            {"detail": "Note introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    content = request.data.get("content")
    if content is not None:
        entry.content = content
        entry.save(update_fields=["content"])
    return Response(TimelineEntrySerializer(entry).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_activity(request):
    serializer = ActivityCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    if not Contact.objects.filter(id=data["contact"], organization=request.organization).exists():
        return Response(
            {"contact": "Contact introuvable dans votre organisation."},
            status=status.HTTP_404_NOT_FOUND,
        )
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
