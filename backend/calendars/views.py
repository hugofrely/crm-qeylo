from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notes.models import TimelineEntry
from .models import CalendarAccount, Meeting
from .serializers import CalendarAccountSerializer, MeetingSerializer, MeetingCreateSerializer
from .tasks import sync_meeting_to_calendar, delete_meeting_from_calendar


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def calendar_account_list(request):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    if request.method == "GET":
        accounts = CalendarAccount.objects.filter(user=request.user, organization=org)
        return Response(CalendarAccountSerializer(accounts, many=True).data)

    email_account_id = request.data.get("email_account")
    if not email_account_id:
        return Response({"detail": "email_account requis."}, status=status.HTTP_400_BAD_REQUEST)

    from emails.models import EmailAccount
    try:
        email_account = EmailAccount.objects.get(id=email_account_id, user=request.user, organization=org)
    except EmailAccount.DoesNotExist:
        return Response({"detail": "Compte email introuvable."}, status=status.HTTP_404_NOT_FOUND)

    provider = "google" if email_account.provider == "gmail" else "outlook"

    account, created = CalendarAccount.objects.get_or_create(
        user=request.user,
        organization=org,
        provider=provider,
        defaults={"email_account": email_account, "calendar_id": "primary"},
    )
    return Response(
        CalendarAccountSerializer(account).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def meeting_list_create(request):
    org = request.organization
    if not org:
        return Response([], status=status.HTTP_200_OK)

    if request.method == "GET":
        meetings = Meeting.objects.filter(organization=org, created_by=request.user).select_related("contact")
        contact_id = request.query_params.get("contact")
        if contact_id:
            meetings = meetings.filter(contact_id=contact_id)
        deal_id = request.query_params.get("deal")
        if deal_id:
            meetings = meetings.filter(deal_id=deal_id)
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            meetings = meetings.filter(end_at__gte=start)
        if end:
            meetings = meetings.filter(start_at__lte=end)
        return Response(MeetingSerializer(meetings, many=True).data)

    serializer = MeetingCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    contact_id = data.pop("contact", None)
    contact_ids = data.pop("contact_ids", [])
    calendar_account_id = data.pop("calendar_account", None)
    deal_id = data.pop("deal", None)

    calendar_account = None
    if calendar_account_id:
        try:
            calendar_account = CalendarAccount.objects.get(
                id=calendar_account_id, user=request.user, organization=org,
            )
        except CalendarAccount.DoesNotExist:
            pass

    timeline_entry = TimelineEntry.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=deal_id,
        entry_type=TimelineEntry.EntryType.MEETING,
        subject=data["title"],
        content=data.get("description", ""),
        metadata={
            "scheduled_at": data["start_at"].isoformat(),
            "end_at": data["end_at"].isoformat(),
            "location": data.get("location", ""),
            "title": data["title"],
        },
    )

    meeting = Meeting.objects.create(
        organization=org,
        created_by=request.user,
        contact_id=contact_id,
        deal_id=deal_id,
        calendar_account=calendar_account,
        sync_status=Meeting.SyncStatus.PENDING if calendar_account else Meeting.SyncStatus.NOT_SYNCED,
        timeline_entry=timeline_entry,
        **{k: v for k, v in data.items() if k in [
            "title", "description", "location", "start_at", "end_at",
            "is_all_day", "attendees", "reminder_minutes",
        ]},
    )

    if contact_ids:
        from contacts.models import Contact
        contacts = Contact.objects.filter(id__in=contact_ids, organization=org)
        meeting.contacts.set(contacts)

    if calendar_account:
        sync_meeting_to_calendar.delay(str(meeting.id))

    return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def meeting_detail(request, pk):
    try:
        meeting = Meeting.objects.get(pk=pk, organization=request.organization)
    except Meeting.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(MeetingSerializer(meeting).data)

    if request.method == "DELETE":
        if meeting.provider_event_id and meeting.calendar_account:
            delete_meeting_from_calendar.delay(
                str(meeting.id),
                meeting.calendar_account.provider,
                meeting.provider_event_id,
                str(meeting.calendar_account.email_account_id),
            )
        if meeting.timeline_entry:
            meeting.timeline_entry.delete()
        meeting.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = MeetingCreateSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    for field in ["title", "description", "location", "start_at", "end_at", "is_all_day", "attendees", "reminder_minutes"]:
        if field in data:
            setattr(meeting, field, data[field])

    if "contact" in data:
        meeting.contact_id = data["contact"]
    if "deal" in data:
        meeting.deal_id = data["deal"]
    if "calendar_account" in data:
        try:
            meeting.calendar_account = CalendarAccount.objects.get(id=data["calendar_account"])
        except CalendarAccount.DoesNotExist:
            pass

    meeting.save()

    if meeting.calendar_account:
        meeting.sync_status = Meeting.SyncStatus.PENDING
        meeting.save(update_fields=["sync_status"])
        sync_meeting_to_calendar.delay(str(meeting.id))

    return Response(MeetingSerializer(meeting).data)
