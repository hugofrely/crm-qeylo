from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from deals.models import Deal, PipelineStage
from tasks.models import Task


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    org = request.organization
    now = timezone.now()

    won_stages = PipelineStage.objects.filter(organization=org, name="Gagné")
    revenue = (
        Deal.objects.filter(
            organization=org,
            stage__in=won_stages,
            closed_at__year=now.year,
            closed_at__month=now.month,
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    excluded_names = ["Gagné", "Perdu"]
    active_deals = Deal.objects.filter(organization=org).exclude(
        stage__name__in=excluded_names
    )
    total_pipeline = (
        active_deals.aggregate(total=Sum("amount"))["total"] or 0
    )

    stages = PipelineStage.objects.filter(organization=org)
    deals_by_stage = []
    for stage in stages:
        stage_deals = Deal.objects.filter(organization=org, stage=stage)
        deals_by_stage.append(
            {
                "stage_id": str(stage.id),
                "stage_name": stage.name,
                "stage_color": stage.color,
                "count": stage_deals.count(),
                "total_amount": float(
                    stage_deals.aggregate(total=Sum("amount"))["total"] or 0
                ),
            }
        )

    week_from_now = now + timezone.timedelta(days=7)
    upcoming_tasks = Task.objects.filter(
        organization=org,
        is_done=False,
        due_date__lte=week_from_now,
    ).count()

    return Response(
        {
            "revenue_this_month": float(revenue),
            "total_pipeline": float(total_pipeline),
            "deals_by_stage": deals_by_stage,
            "upcoming_tasks": upcoming_tasks,
            "active_deals_count": active_deals.count(),
        }
    )
