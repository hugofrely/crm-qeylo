# backend/ai_usage/views.py
from datetime import date, timedelta

from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIUsageLog


def _check_superuser(request):
    if not request.user.is_superuser:
        return Response(status=status.HTTP_403_FORBIDDEN)
    return None


def _get_filtered_qs(request):
    """Return a filtered queryset based on query params."""
    qs = AIUsageLog.objects.all()

    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    org_id = request.query_params.get("organization_id")
    user_id = request.query_params.get("user_id")

    if start_date:
        qs = qs.filter(created_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__date__lte=end_date)
    if org_id:
        qs = qs.filter(organization_id=org_id)
    if user_id:
        qs = qs.filter(user_id=user_id)

    return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_summary(request):
    """Global summary with KPIs."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    agg = qs.aggregate(
        total_cost=Sum("estimated_cost"),
        total_input_tokens=Sum("input_tokens"),
        total_output_tokens=Sum("output_tokens"),
        total_calls=Count("id"),
        avg_cost=Avg("estimated_cost"),
    )

    # Previous period for comparison
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    prev_agg = None
    if start_date and end_date:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        delta = end - start
        prev_start = start - delta - timedelta(days=1)
        prev_end = start - timedelta(days=1)
        prev_qs = AIUsageLog.objects.filter(
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end,
        )
        org_id = request.query_params.get("organization_id")
        user_id = request.query_params.get("user_id")
        if org_id:
            prev_qs = prev_qs.filter(organization_id=org_id)
        if user_id:
            prev_qs = prev_qs.filter(user_id=user_id)
        prev_agg = prev_qs.aggregate(
            total_cost=Sum("estimated_cost"),
            total_calls=Count("id"),
        )

    return Response({
        "total_cost": float(agg["total_cost"] or 0),
        "total_input_tokens": agg["total_input_tokens"] or 0,
        "total_output_tokens": agg["total_output_tokens"] or 0,
        "total_calls": agg["total_calls"],
        "avg_cost_per_call": float(agg["avg_cost"] or 0),
        "previous_period": {
            "total_cost": float(prev_agg["total_cost"] or 0),
            "total_calls": prev_agg["total_calls"],
        } if prev_agg else None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_by_user(request):
    """Breakdown by user."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    data = (
        qs.values(
            "user__id", "user__email", "user__first_name", "user__last_name",
        )
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("-total_cost")
    )

    return Response([
        {
            "user_id": str(row["user__id"]),
            "email": row["user__email"],
            "name": f"{row['user__first_name']} {row['user__last_name']}".strip(),
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_by_type(request):
    """Breakdown by call type."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    data = (
        qs.values("call_type")
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("-total_cost")
    )

    return Response([
        {
            "call_type": row["call_type"],
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_timeline(request):
    """Time series data for charts."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    granularity = request.query_params.get("granularity", "day")

    trunc_fn = {"day": TruncDate, "week": TruncWeek, "month": TruncMonth}.get(
        granularity, TruncDate
    )

    data = (
        qs.annotate(period=trunc_fn("created_at"))
        .values("period")
        .annotate(
            total_cost=Sum("estimated_cost"),
            total_input_tokens=Sum("input_tokens"),
            total_output_tokens=Sum("output_tokens"),
            total_calls=Count("id"),
        )
        .order_by("period")
    )

    return Response([
        {
            "period": str(row["period"]),
            "total_cost": float(row["total_cost"] or 0),
            "total_input_tokens": row["total_input_tokens"] or 0,
            "total_output_tokens": row["total_output_tokens"] or 0,
            "total_calls": row["total_calls"],
        }
        for row in data
    ])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def usage_top_consumers(request):
    """Top organizations and users by cost."""
    forbidden = _check_superuser(request)
    if forbidden:
        return forbidden

    qs = _get_filtered_qs(request)
    limit = int(request.query_params.get("limit", 5))

    top_orgs = (
        qs.values("organization__id", "organization__name")
        .annotate(total_cost=Sum("estimated_cost"), total_calls=Count("id"))
        .order_by("-total_cost")[:limit]
    )

    top_users = (
        qs.values("user__id", "user__email", "user__first_name", "user__last_name")
        .annotate(total_cost=Sum("estimated_cost"), total_calls=Count("id"))
        .order_by("-total_cost")[:limit]
    )

    return Response({
        "top_organizations": [
            {
                "organization_id": str(row["organization__id"]),
                "name": row["organization__name"],
                "total_cost": float(row["total_cost"] or 0),
                "total_calls": row["total_calls"],
            }
            for row in top_orgs
        ],
        "top_users": [
            {
                "user_id": str(row["user__id"]),
                "email": row["user__email"],
                "name": f"{row['user__first_name']} {row['user__last_name']}".strip(),
                "total_cost": float(row["total_cost"] or 0),
                "total_calls": row["total_calls"],
            }
            for row in top_users
        ],
    })
