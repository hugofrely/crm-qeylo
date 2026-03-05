from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count
from .models import Pipeline, PipelineStage, Deal, PIPELINE_TEMPLATES
from .serializers import (
    PipelineSerializer,
    PipelineStageSerializer,
    DealSerializer,
    PipelineDealSerializer,
)


class PipelineViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Pipeline.objects.filter(
            organization=self.request.organization
        ).annotate(
            stage_count=Count("stages"),
            deal_count=Count("stages__deals"),
        )

    def create(self, request, *args, **kwargs):
        template = request.data.get("template")
        name = request.data.get("name", "").strip()
        if not name:
            return Response(
                {"name": ["Ce champ est obligatoire."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if template and template in PIPELINE_TEMPLATES:
            pipeline = Pipeline.create_from_template(
                request.organization, name, template
            )
        else:
            max_order = (
                Pipeline.objects.filter(organization=request.organization)
                .aggregate(m=models.Max("order"))["m"]
                or -1
            )
            pipeline = Pipeline.objects.create(
                organization=request.organization,
                name=name,
                order=max_order + 1,
            )
        # Re-fetch with annotations for serialization
        pipeline = self.get_queryset().get(id=pipeline.id)
        return Response(
            PipelineSerializer(pipeline).data,
            status=status.HTTP_201_CREATED,
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        # When setting a pipeline as default, unset others
        if instance.is_default:
            Pipeline.objects.filter(
                organization=self.request.organization
            ).exclude(id=instance.id).update(is_default=False)

    def destroy(self, request, *args, **kwargs):
        pipeline = self.get_object()
        org_pipeline_count = Pipeline.objects.filter(
            organization=request.organization
        ).count()

        if org_pipeline_count <= 1:
            return Response(
                {"detail": "Impossible de supprimer le dernier pipeline."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deal_count = Deal.objects.filter(stage__pipeline=pipeline).count()
        migrate_to = request.query_params.get("migrate_to")

        if deal_count > 0 and not migrate_to:
            return Response(
                {"deal_count": deal_count, "detail": "Pipeline has deals. Provide migrate_to parameter."},
                status=status.HTTP_409_CONFLICT,
            )

        if deal_count > 0 and migrate_to:
            try:
                target_pipeline = Pipeline.objects.get(
                    id=migrate_to, organization=request.organization
                )
            except Pipeline.DoesNotExist:
                return Response(
                    {"detail": "Target pipeline not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            first_stage = target_pipeline.stages.order_by("order").first()
            if not first_stage:
                return Response(
                    {"detail": "Target pipeline has no stages."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            Deal.objects.filter(stage__pipeline=pipeline).update(stage=first_stage)

        was_default = pipeline.is_default
        pipeline.delete()
        if was_default:
            next_pipeline = Pipeline.objects.filter(
                organization=request.organization
            ).first()
            if next_pipeline:
                next_pipeline.is_default = True
                next_pipeline.save(update_fields=["is_default"])

        return Response(status=status.HTTP_204_NO_CONTENT)


class PipelineStageViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        pipeline_id = self.request.query_params.get("pipeline")
        if pipeline_id:
            return PipelineStage.objects.filter(
                pipeline_id=pipeline_id,
                pipeline__organization=self.request.organization,
            )
        return PipelineStage.objects.filter(
            pipeline__organization=self.request.organization
        )

    def perform_create(self, serializer):
        pipeline_id = self.request.data.get("pipeline")
        pipeline = Pipeline.objects.get(
            id=pipeline_id, organization=self.request.organization
        )
        serializer.save(pipeline=pipeline)

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
                    id=migrate_to, pipeline__organization=request.organization
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
    pipeline_id = request.query_params.get("pipeline")
    if pipeline_id:
        pipeline = Pipeline.objects.filter(
            id=pipeline_id, organization=request.organization
        ).first()
    else:
        pipeline = Pipeline.objects.filter(
            organization=request.organization, is_default=True
        ).first()

    if not pipeline:
        return Response([])

    stages = pipeline.stages.prefetch_related("deals", "deals__contact")
    result = []
    for stage in stages:
        deals = stage.deals.select_related("contact")
        result.append(
            {
                "stage": PipelineStageSerializer(stage).data,
                "deals": PipelineDealSerializer(deals, many=True).data,
                "total_amount": float(sum(d.amount for d in deals)),
            }
        )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reorder_pipelines(request):
    order = request.data.get("order", [])
    for index, pipeline_id in enumerate(order):
        Pipeline.objects.filter(
            id=pipeline_id, organization=request.organization
        ).update(order=index)
    return Response({"status": "ok"})
