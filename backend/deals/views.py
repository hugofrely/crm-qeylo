from rest_framework import viewsets, status
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

    def destroy(self, request, *args, **kwargs):
        stage = self.get_object()
        deal_count = stage.deals.count()

        migrate_to = request.query_params.get("migrate_to")

        if deal_count > 0 and not migrate_to:
            return Response(
                {"deal_count": deal_count, "detail": "Stage has deals. Provide migrate_to parameter."},
                status=status.HTTP_409_CONFLICT,
            )

        if deal_count > 0 and migrate_to:
            try:
                target_stage = PipelineStage.objects.get(
                    id=migrate_to, organization=request.organization
                )
            except PipelineStage.DoesNotExist:
                return Response(
                    {"detail": "Target stage not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            stage.deals.update(stage=target_stage)

        stage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Deal.objects.filter(organization=self.request.organization)
        contact_id = self.request.query_params.get("contact")
        if contact_id:
            qs = qs.filter(contact_id=contact_id)
        return qs

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
    ).prefetch_related("deals", "deals__contact")
    result = []
    for stage in stages:
        deals = stage.deals.filter(organization=request.organization).select_related("contact")
        result.append(
            {
                "stage": PipelineStageSerializer(stage).data,
                "deals": PipelineDealSerializer(deals, many=True).data,
                "total_amount": float(sum(d.amount for d in deals)),
            }
        )
    return Response(result)
