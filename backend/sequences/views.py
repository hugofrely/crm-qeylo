from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Sequence, SequenceStep, SequenceEnrollment, SequenceEmail
from .serializers import (
    SequenceSerializer, SequenceStepSerializer,
    SequenceEnrollmentSerializer,
    EnrollContactsSerializer,
)
from .tasks import enroll_contact_in_sequence


class SequenceViewSet(viewsets.ModelViewSet):
    serializer_class = SequenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Sequence.objects.filter(
            organization=self.request.organization,
        ).prefetch_related("steps", "enrollments")

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def steps(self, request, pk=None):
        sequence = self.get_object()
        serializer = SequenceStepSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if "order" not in request.data:
            last_order = sequence.steps.order_by("-order").values_list("order", flat=True).first()
            serializer.save(sequence=sequence, order=(last_order or 0) + 1)
        else:
            serializer.save(sequence=sequence)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        sequence = self.get_object()
        serializer = EnrollContactsSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from contacts.models import Contact
        contact_ids = serializer.validated_data["contact_ids"]
        contacts = Contact.objects.filter(
            id__in=contact_ids,
            organization=request.organization,
        )

        enrolled = []
        for contact in contacts:
            enrollment, created = SequenceEnrollment.objects.get_or_create(
                sequence=sequence,
                contact=contact,
                defaults={
                    "enrolled_by": request.user,
                    "status": SequenceEnrollment.Status.ACTIVE,
                },
            )
            if created:
                enroll_contact_in_sequence.delay(str(enrollment.id))
                enrolled.append(str(enrollment.id))

        return Response({
            "enrolled_count": len(enrolled),
            "enrollment_ids": enrolled,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        sequence = self.get_object()
        enrollments = sequence.enrollments.select_related("contact")
        status_filter = request.query_params.get("status")
        if status_filter:
            enrollments = enrollments.filter(status=status_filter)
        return Response(SequenceEnrollmentSerializer(enrollments, many=True).data)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def step_detail(request, sequence_id, step_id):
    try:
        step = SequenceStep.objects.get(
            id=step_id,
            sequence_id=sequence_id,
            sequence__organization=request.organization,
        )
    except SequenceStep.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        step.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SequenceStepSerializer(step, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unenroll_contact(request, enrollment_id):
    try:
        enrollment = SequenceEnrollment.objects.get(
            id=enrollment_id,
            sequence__organization=request.organization,
        )
    except SequenceEnrollment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    from django.utils import timezone
    enrollment.status = SequenceEnrollment.Status.UNENROLLED
    enrollment.completed_at = timezone.now()
    enrollment.save(update_fields=["status", "completed_at"])

    SequenceEmail.objects.filter(
        enrollment=enrollment,
        status=SequenceEmail.Status.SCHEDULED,
    ).update(status=SequenceEmail.Status.FAILED)

    return Response({"status": "unenrolled"})
