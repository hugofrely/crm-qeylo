from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import PipelineStage, Deal
from .serializers import (
    PipelineStageSerializer,
    DealSerializer,
    PipelineDealSerializer,
)


class PipelineStageViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PipelineStage.objects.filter(
            organization=self.request.organization
        )

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Deal.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.organization,
            created_by=self.request.user,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pipeline_view(request):
    stages = PipelineStage.objects.filter(
        organization=request.organization
    ).prefetch_related("deals")
    result = []
    for stage in stages:
        deals = stage.deals.filter(organization=request.organization)
        result.append(
            {
                "stage": PipelineStageSerializer(stage).data,
                "deals": PipelineDealSerializer(deals, many=True).data,
                "total_amount": float(sum(d.amount for d in deals)),
            }
        )
    return Response(result)
