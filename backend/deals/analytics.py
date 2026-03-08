from datetime import timedelta, date, datetime as dt
from django.db.models import Sum, Count, F
from django.utils import timezone

from .models import Deal, DealStageTransition, Pipeline, SalesQuota


def _resolve_period(period):
    """Return (start, end) datetimes for the given period string."""
    now = timezone.now()
    if period == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=now.year + 1, month=1)
        else:
            end = start.replace(month=now.month + 1)
        return start, end
    elif period == "this_quarter":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_month = q_month + 3
        if end_month > 12:
            end = start.replace(year=now.year + 1, month=end_month - 12)
        else:
            end = start.replace(month=end_month)
        return start, end
    elif period == "next_quarter":
        q_month = ((now.month - 1) // 3) * 3 + 4
        if q_month > 12:
            start = now.replace(year=now.year + 1, month=q_month - 12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_month = start.month + 3
        if end_month > 12:
            end = start.replace(year=start.year + 1, month=end_month - 12)
        else:
            end = start.replace(month=end_month)
        return start, end
    elif period == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start.replace(year=now.year + 1)
        return start, end
    elif period == "last_3_months":
        return now - timedelta(days=90), now
    elif period == "last_6_months":
        return now - timedelta(days=180), now
    return None, None


def _months_in_range(start, end):
    """Yield (year, month) tuples for each month in the range."""
    current = start.replace(day=1)
    while current < end:
        yield current.year, current.month
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


def compute_forecast(organization, period="this_quarter", pipeline_id=None, user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    qs = Deal.objects.filter(
        organization=organization,
        expected_close__gte=start.date(),
        expected_close__lt=end.date(),
    ).exclude(stage__is_won=True).exclude(stage__is_lost=True)

    if pipeline_id:
        qs = qs.filter(stage__pipeline_id=pipeline_id)
    if user_id:
        qs = qs.filter(created_by_id=user_id)

    months = []
    for year, month in _months_in_range(start, end):
        month_start = date(year, month, 1)
        month_end = date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)

        month_deals = qs.filter(expected_close__gte=month_start, expected_close__lt=month_end)

        categories = {}
        for cat_name, prob_min, prob_max in [("commit", 80, 101), ("best_case", 40, 80), ("pipeline", 0, 40)]:
            cat_deals = month_deals.filter(probability__gte=prob_min, probability__lt=prob_max)
            agg = cat_deals.aggregate(total=Sum("amount"), cnt=Count("id"))
            total = float(agg["total"] or 0)
            cnt = agg["cnt"]
            weighted = float(cat_deals.aggregate(w=Sum(F("amount") * F("probability") / 100))["w"] or 0)
            categories[cat_name] = {"count": cnt, "total": round(total, 2), "weighted": round(weighted, 2)}

        # Quota for this month
        quota_qs = SalesQuota.objects.filter(organization=organization, month=month_start)
        if user_id:
            quota_qs = quota_qs.filter(user_id=user_id)
        quota_total = float(quota_qs.aggregate(t=Sum("target_amount"))["t"] or 0)

        # Closed won this month
        m_start_dt = timezone.make_aware(dt(year, month, 1))
        m_end_year = year + (1 if month == 12 else 0)
        m_end_month = 1 if month == 12 else month + 1
        m_end_dt = timezone.make_aware(dt(m_end_year, m_end_month, 1))
        closed_won_qs = Deal.objects.filter(
            organization=organization, stage__is_won=True,
            won_at__gte=m_start_dt, won_at__lt=m_end_dt,
        )
        if pipeline_id:
            closed_won_qs = closed_won_qs.filter(stage__pipeline_id=pipeline_id)
        if user_id:
            closed_won_qs = closed_won_qs.filter(created_by_id=user_id)
        closed_won = float(closed_won_qs.aggregate(t=Sum("amount"))["t"] or 0)

        total_weighted = sum(c["weighted"] for c in categories.values())

        months.append({
            "month": f"{year}-{month:02d}",
            **categories,
            "total_weighted": round(total_weighted, 2),
            "quota": round(quota_total, 2),
            "closed_won": round(closed_won, 2),
        })

    summary = {
        "commit": round(sum(m["commit"]["weighted"] for m in months), 2),
        "best_case": round(sum(m["best_case"]["weighted"] for m in months), 2),
        "pipeline": round(sum(m["pipeline"]["weighted"] for m in months), 2),
        "total_weighted": round(sum(m["total_weighted"] for m in months), 2),
        "total_quota": round(sum(m["quota"] for m in months), 2),
        "total_closed_won": round(sum(m["closed_won"] for m in months), 2),
    }

    return {"period": period, "months": months, "summary": summary}


def compute_win_loss(organization, period="this_quarter", pipeline_id=None, user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    base_qs = Deal.objects.filter(organization=organization)
    if pipeline_id:
        base_qs = base_qs.filter(stage__pipeline_id=pipeline_id)
    if user_id:
        base_qs = base_qs.filter(created_by_id=user_id)

    won_qs = base_qs.filter(won_at__gte=start, won_at__lt=end)
    lost_qs = base_qs.filter(lost_at__gte=start, lost_at__lt=end)

    won_agg = won_qs.aggregate(count=Count("id"), total=Sum("amount"))
    lost_agg = lost_qs.aggregate(count=Count("id"), total=Sum("amount"))

    won_count = won_agg["count"]
    lost_count = lost_agg["count"]
    total_decided = won_count + lost_count
    win_rate = round((won_count / total_decided) * 100, 1) if total_decided > 0 else 0

    # Loss reasons
    loss_reasons = list(
        lost_qs.values("loss_reason__name")
        .annotate(count=Count("id"), total_amount=Sum("amount"))
        .order_by("-count")
    )
    loss_reason_list = []
    for lr in loss_reasons:
        name = lr["loss_reason__name"] or "Non renseign\u00e9"
        pct = round((lr["count"] / lost_count) * 100, 1) if lost_count > 0 else 0
        loss_reason_list.append({
            "reason": name,
            "count": lr["count"],
            "total_amount": float(lr["total_amount"] or 0),
            "percentage": pct,
        })

    # Monthly trend
    trend = []
    for year, month in _months_in_range(start, end):
        m_start = timezone.make_aware(dt(year, month, 1))
        m_end_month = month + 1 if month < 12 else 1
        m_end_year = year if month < 12 else year + 1
        m_end = timezone.make_aware(dt(m_end_year, m_end_month, 1))

        m_won = base_qs.filter(won_at__gte=m_start, won_at__lt=m_end).count()
        m_lost = base_qs.filter(lost_at__gte=m_start, lost_at__lt=m_end).count()
        m_total = m_won + m_lost
        m_rate = round((m_won / m_total) * 100, 1) if m_total > 0 else 0

        trend.append({"month": f"{year}-{month:02d}", "won": m_won, "lost": m_lost, "win_rate": m_rate})

    return {
        "period": period,
        "summary": {
            "won": {"count": won_count, "total_amount": float(won_agg["total"] or 0)},
            "lost": {"count": lost_count, "total_amount": float(lost_agg["total"] or 0)},
            "win_rate": win_rate,
        },
        "loss_reasons": loss_reason_list,
        "trend": trend,
    }


def compute_velocity(organization, pipeline_id, period="last_6_months", user_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    try:
        pipeline = Pipeline.objects.get(id=pipeline_id, organization=organization)
    except Pipeline.DoesNotExist:
        return {"error": "Pipeline not found"}

    stages = list(pipeline.stages.filter(is_won=False, is_lost=False).order_by("order"))

    # Average sales cycle for won deals
    won_deals = Deal.objects.filter(
        organization=organization, stage__pipeline=pipeline,
        stage__is_won=True, won_at__gte=start, won_at__lt=end,
    )
    if user_id:
        won_deals = won_deals.filter(created_by_id=user_id)

    cycles = []
    for deal in won_deals:
        if deal.won_at and deal.created_at:
            delta = (deal.won_at - deal.created_at).total_seconds() / 86400
            cycles.append(delta)

    avg_cycle = round(sum(cycles) / len(cycles), 1) if cycles else 0
    sorted_cycles = sorted(cycles)
    median_cycle = round(sorted_cycles[len(sorted_cycles) // 2], 0) if sorted_cycles else 0

    # Time per stage from transitions
    transitions = DealStageTransition.objects.filter(
        organization=organization, deal__stage__pipeline=pipeline,
        transitioned_at__gte=start, transitioned_at__lt=end,
    ).exclude(duration_in_previous__isnull=True)
    if user_id:
        transitions = transitions.filter(changed_by_id=user_id)

    stage_stats = []
    for stage in stages:
        stage_transitions = transitions.filter(from_stage=stage)
        durations = [t.duration_in_previous.total_seconds() / 86400 for t in stage_transitions if t.duration_in_previous]
        if durations:
            avg_days = round(sum(durations) / len(durations), 1)
            sorted_d = sorted(durations)
            median_days = round(sorted_d[len(sorted_d) // 2], 0)
        else:
            avg_days = 0
            median_days = 0
        stage_stats.append({
            "stage": stage.name,
            "stage_id": str(stage.id),
            "avg_days": avg_days,
            "median_days": int(median_days),
            "deal_count": len(durations),
        })

    # Stagnant deals (time in stage > 2x average)
    stagnant = []
    now = timezone.now()
    open_deals = Deal.objects.filter(
        organization=organization, stage__pipeline=pipeline,
        stage__is_won=False, stage__is_lost=False,
    )
    if user_id:
        open_deals = open_deals.filter(created_by_id=user_id)

    for deal in open_deals.select_related("stage"):
        last_t = DealStageTransition.objects.filter(deal=deal).order_by("-transitioned_at").first()
        if not last_t:
            continue
        days_in_stage = (now - last_t.transitioned_at).total_seconds() / 86400
        stage_stat = next((s for s in stage_stats if s["stage_id"] == str(deal.stage_id)), None)
        if stage_stat and stage_stat["avg_days"] > 0 and days_in_stage > stage_stat["avg_days"] * 2:
            stagnant.append({
                "id": str(deal.id), "name": deal.name, "stage": deal.stage.name,
                "days_in_stage": round(days_in_stage, 1),
                "avg_for_stage": stage_stat["avg_days"],
                "amount": float(deal.amount),
            })

    return {
        "pipeline": pipeline.name, "period": period,
        "avg_cycle_days": avg_cycle, "median_cycle_days": int(median_cycle),
        "stages": stage_stats, "stagnant_deals": stagnant,
    }


def compute_leaderboard(organization, period="this_month", pipeline_id=None):
    start, end = _resolve_period(period)
    if not start or not end:
        return {"error": "Invalid period"}

    from organizations.models import Membership

    members = Membership.objects.filter(organization=organization).select_related("user")

    rankings = []
    for membership in members:
        user = membership.user
        base_qs = Deal.objects.filter(organization=organization, created_by=user)
        if pipeline_id:
            base_qs = base_qs.filter(stage__pipeline_id=pipeline_id)

        won = base_qs.filter(won_at__gte=start, won_at__lt=end)
        lost = base_qs.filter(lost_at__gte=start, lost_at__lt=end)

        won_agg = won.aggregate(count=Count("id"), total=Sum("amount"))
        lost_count = lost.count()

        deals_won = won_agg["count"]
        revenue = float(won_agg["total"] or 0)
        total_decided = deals_won + lost_count
        win_rate = round((deals_won / total_decided) * 100, 1) if total_decided > 0 else 0
        avg_deal_size = round(revenue / deals_won, 2) if deals_won > 0 else 0

        quota_qs = SalesQuota.objects.filter(
            organization=organization, user=user,
            month__gte=start.date() if hasattr(start, 'date') else start,
            month__lt=end.date() if hasattr(end, 'date') else end,
        )
        quota = float(quota_qs.aggregate(t=Sum("target_amount"))["t"] or 0)
        attainment = round((revenue / quota) * 100, 1) if quota > 0 else 0

        rankings.append({
            "user": {"id": str(user.id), "first_name": user.first_name, "last_name": user.last_name},
            "deals_won": deals_won, "revenue_closed": revenue,
            "quota": quota, "quota_attainment": attainment,
            "avg_deal_size": avg_deal_size, "win_rate": win_rate,
        })

    rankings.sort(key=lambda r: r["quota_attainment"], reverse=True)
    return {"period": period, "rankings": rankings}
