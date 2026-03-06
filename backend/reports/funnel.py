from django.db.models import Avg, Sum
from deals.models import Deal, DealStageTransition, Pipeline
from .aggregation import _resolve_date_range


def compute_funnel(organization, pipeline_id, filter_mode=None,
                   date_range=None, date_from=None, date_to=None):
    try:
        pipeline = Pipeline.objects.get(id=pipeline_id, organization=organization)
    except Pipeline.DoesNotExist:
        return {"error": "Pipeline not found"}

    stages = list(pipeline.stages.order_by("order"))
    if not stages:
        return {"error": "Pipeline has no stages"}

    qs = DealStageTransition.objects.filter(
        organization=organization,
        to_stage__pipeline=pipeline,
    )

    start, end = _resolve_date_range(date_range, date_from, date_to)

    if filter_mode == "cohort" and start and end:
        deal_ids_in_pipeline = DealStageTransition.objects.filter(
            organization=organization,
            to_stage__pipeline=pipeline,
            deal__created_at__gte=start,
            deal__created_at__lt=end,
        ).values_list("deal_id", flat=True).distinct()
        qs = qs.filter(deal_id__in=deal_ids_in_pipeline)
    elif filter_mode == "activity" and start and end:
        qs = qs.filter(transitioned_at__gte=start, transitioned_at__lt=end)

    result_stages = []

    for i, stage in enumerate(stages):
        entered = qs.filter(to_stage=stage).values("deal_id").distinct().count()

        exited_to_next = 0
        if i + 1 < len(stages):
            next_stage = stages[i + 1]
            exited_to_next = qs.filter(
                to_stage=next_stage,
                from_stage=stage,
            ).values("deal_id").distinct().count()

        conversion_rate = round((exited_to_next / entered) * 100, 1) if entered > 0 else 0

        avg_dur = qs.filter(
            from_stage=stage,
        ).exclude(duration_in_previous__isnull=True).aggregate(
            avg=Avg("duration_in_previous")
        )["avg"]

        avg_duration_iso = None
        if avg_dur:
            total_seconds = int(avg_dur.total_seconds())
            days = total_seconds // 86400
            hours = (total_seconds % 86400) // 3600
            avg_duration_iso = f"P{days}DT{hours}H"

        deal_ids_entered = list(
            qs.filter(to_stage=stage).values_list("deal_id", flat=True).distinct()
        )
        total_amount = float(
            Deal.objects.filter(id__in=deal_ids_entered).aggregate(
                total=Sum("amount")
            )["total"] or 0
        )

        result_stages.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "color": stage.color,
            "entered": entered,
            "exited_to_next": exited_to_next,
            "conversion_rate": conversion_rate,
            "avg_duration": avg_duration_iso,
            "total_amount": total_amount,
        })

    total_entered = result_stages[0]["entered"] if result_stages else 0
    won_stage = next(
        (s for s in result_stages if s["stage_name"] in ("Gagné", "Signé")),
        None,
    )
    total_won = won_stage["entered"] if won_stage else 0
    overall_conversion = round((total_won / total_entered) * 100, 1) if total_entered > 0 else 0

    return {
        "pipeline": pipeline.name,
        "stages": result_stages,
        "overall_conversion": overall_conversion,
        "total_entered": total_entered,
        "total_won": total_won,
    }
