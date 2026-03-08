from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from contacts.models import Contact
from .models import TimelineEntry, Call
from .serializers import TimelineEntrySerializer, NoteCreateSerializer, ActivityCreateSerializer, CallSerializer, CallCreateSerializer


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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def call_list_create(request):
    org = request.organization

    if request.method == "GET":
        calls = Call.objects.filter(organization=org)
        contact_id = request.query_params.get("contact")
        if contact_id:
            calls = calls.filter(contact_id=contact_id)
        deal_id = request.query_params.get("deal")
        if deal_id:
            calls = calls.filter(deal_id=deal_id)
        return Response(CallSerializer(calls, many=True).data)

    serializer = CallCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contact_id = data["contact"]

    if not Contact.objects.filter(id=contact_id, organization=org).exists():
        return Response(
            {"contact": "Contact introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )

    duration_text = ""
    if data.get("duration_seconds"):
        mins = data["duration_seconds"] // 60
        secs = data["duration_seconds"] % 60
        duration_text = f" ({mins}:{secs:02d})"

    timeline_entry = TimelineEntry.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=data.get("deal"),
        entry_type=TimelineEntry.EntryType.CALL,
        subject=f"Appel {data['direction']}",
        content=data.get("notes", ""),
        metadata={
            "direction": data["direction"],
            "outcome": data["outcome"],
            "duration_seconds": data.get("duration_seconds"),
        },
    )

    call = Call.objects.create(
        organization=org,
        contact_id=contact_id,
        deal_id=data.get("deal"),
        direction=data["direction"],
        outcome=data["outcome"],
        duration_seconds=data.get("duration_seconds"),
        started_at=data["started_at"],
        notes=data.get("notes", ""),
        logged_by=request.user,
        timeline_entry=timeline_entry,
    )

    return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def call_detail(request, pk):
    try:
        call = Call.objects.get(pk=pk, organization=request.organization)
    except Call.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(CallSerializer(call).data)

    if request.method == "DELETE":
        if call.timeline_entry:
            call.timeline_entry.delete()
        call.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = CallCreateSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    for field, value in serializer.validated_data.items():
        if field != "contact":
            setattr(call, field, value)
    call.save()

    if call.timeline_entry:
        call.timeline_entry.metadata = {
            "direction": call.direction,
            "outcome": call.outcome,
            "duration_seconds": call.duration_seconds,
        }
        call.timeline_entry.content = call.notes
        call.timeline_entry.save(update_fields=["metadata", "content"])

    return Response(CallSerializer(call).data)
