from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Report
from .serializers import ReportSerializer
from .aggregation import aggregate


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Report.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_template:
            return Response(
                {"detail": "Cannot delete a template report."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def aggregate_view(request):
    data = request.data
    source = data.get("source")
    metric = data.get("metric")
    group_by = data.get("group_by")

    if not source or not metric:
        return Response(
            {"detail": "source and metric are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = aggregate(
        organization=request.organization,
        source=source,
        metric=metric,
        group_by=group_by,
        date_field=data.get("date_field"),
        date_range=data.get("date_range"),
        date_from=data.get("date_from"),
        date_to=data.get("date_to"),
        filters=data.get("filters"),
    )

    if "error" in result:
        return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result)
