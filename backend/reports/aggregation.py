from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from django.db.models.functions import TruncMonth, TruncWeek

COMPARISON_PERIODS = {
    "today": "yesterday",
    "this_week": "last_week",
    "this_month": "last_month",
    "last_3_months": "last_6_months",
    "this_year": "last_12_months",
}

from deals.models import Deal, Quote
from contacts.models import Contact
from tasks.models import Task
from notes.models import TimelineEntry


SOURCE_CONFIG = {
    "deals": {
        "model": Deal,
        "metrics": {
            "count": Count("id"),
            "sum:amount": Sum("amount"),
            "avg:amount": Avg("amount"),
        },
        "group_by": {
            "stage": "stage__name",
            "pipeline": "stage__pipeline__name",
            "outcome": "stage__is_won",
        },
        "date_fields": ["created_at", "closed_at", "updated_at"],
        "allowed_filters": ["stage__name__in", "stage__pipeline__id", "stage__is_won", "stage__is_lost"],
    },
    "contacts": {
        "model": Contact,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "source": "source",
            "lead_score": "lead_score",
            "category": "categories__name",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["source", "lead_score", "categories__name"],
    },
    "tasks": {
        "model": Task,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "priority": "priority",
            "is_done": "is_done",
        },
        "date_fields": ["due_date", "created_at"],
        "allowed_filters": ["priority", "is_done"],
    },
    "activities": {
        "model": TimelineEntry,
        "metrics": {
            "count": Count("id"),
        },
        "group_by": {
            "entry_type": "entry_type",
            "user": "created_by__email",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["entry_type", "created_by"],
    },
    "quotes": {
        "model": Quote,
        "metrics": {
            "count": Count("id"),
            "sum:amount": Sum("deal__amount"),
            "avg:amount": Avg("deal__amount"),
        },
        "group_by": {
            "status": "status",
        },
        "date_fields": ["created_at"],
        "allowed_filters": ["status"],
    },
}


def _resolve_date_range(date_range, date_from=None, date_to=None):
    now = timezone.now()
    if date_range == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        return start, end
    elif date_range == "yesterday":
        end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=1)
        return start, end
    elif date_range == "this_week":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
        end = start + timedelta(days=7)
        return start, end
    elif date_range == "last_week":
        this_monday = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=now.weekday())
        start = this_monday - timedelta(days=7)
        end = this_monday
        return start, end
    elif date_range == "this_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            end = start.replace(year=now.year + 1, month=1)
        else:
            end = start.replace(month=now.month + 1)
        return start, end
    elif date_range == "last_month":
        first_of_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = first_of_this
        if now.month == 1:
            start = first_of_this.replace(year=now.year - 1, month=12)
        else:
            start = first_of_this.replace(month=now.month - 1)
        return start, end
    elif date_range == "last_3_months":
        return now - timedelta(days=90), now
    elif date_range == "last_6_months":
        return now - timedelta(days=180), now
    elif date_range == "last_12_months":
        return now - timedelta(days=365), now
    elif date_range == "this_year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now
    elif date_range == "custom" and date_from and date_to:
        from django.utils.dateparse import parse_datetime
        start = parse_datetime(date_from)
        end = parse_datetime(date_to)
        if start and end:
            return start, end
    return None, None


def _format_label(value, group_by):
    if value is None:
        return "N/A"
    if group_by == "outcome":
        return "Gagné" if value else "En cours / Perdu"
    if group_by in ("month", "week"):
        from datetime import date, datetime
        if isinstance(value, (date, datetime)):
            if group_by == "month":
                return value.strftime("%b %Y").lower()
            else:
                return f"Sem. {value.strftime('%d/%m')}"
        return str(value)
    if isinstance(value, bool):
        return "Oui" if value else "Non"
    return str(value)


def aggregate(organization, source, metric, group_by, date_field=None,
              date_range=None, date_from=None, date_to=None, filters=None,
              compare=False):
    config = SOURCE_CONFIG.get(source)
    if not config:
        return {"error": f"Unknown source: {source}"}

    metric_expr = config["metrics"].get(metric)
    if not metric_expr:
        return {"error": f"Unknown metric '{metric}' for source '{source}'"}

    model = config["model"]
    qs = model.objects.filter(organization=organization)

    resolved_date_field = date_field if date_field in config["date_fields"] else config["date_fields"][0]
    start, end = _resolve_date_range(date_range, date_from, date_to)
    if start and end:
        qs = qs.filter(**{f"{resolved_date_field}__gte": start, f"{resolved_date_field}__lt": end})

    if filters:
        for key, value in filters.items():
            if key in ("date_field", "date_range", "date_from", "date_to"):
                continue
            if key in config["allowed_filters"]:
                if isinstance(value, list):
                    qs = qs.filter(**{f"{key}__in" if not key.endswith("__in") else key: value})
                else:
                    qs = qs.filter(**{key: value})

    if group_by in ("month", "week"):
        trunc_fn = TruncMonth if group_by == "month" else TruncWeek
        qs = (
            qs.annotate(period=trunc_fn(resolved_date_field))
            .values("period")
            .annotate(value=metric_expr)
            .order_by("period")
        )
        data = [{"label": _format_label(row["period"], group_by), "value": float(row["value"] or 0)} for row in qs]
    elif group_by in config["group_by"]:
        field_path = config["group_by"][group_by]
        qs = (
            qs.values(field_path)
            .annotate(value=metric_expr)
            .order_by("-value")
        )
        data = [{"label": _format_label(row[field_path], group_by), "value": float(row["value"] or 0)} for row in qs]
    else:
        total = qs.aggregate(value=metric_expr)["value"] or 0
        data = [{"label": "Total", "value": float(total)}]

    total = sum(d["value"] for d in data)
    result = {"data": data, "total": total}

    if compare and date_range in COMPARISON_PERIODS:
        prev_period = COMPARISON_PERIODS[date_range]
        prev_result = aggregate(
            organization=organization,
            source=source,
            metric=metric,
            group_by=group_by,
            date_field=date_field,
            date_range=prev_period,
            date_from=date_from,
            date_to=date_to,
            filters=filters,
            compare=False,
        )
        previous_total = prev_result["total"]
        if previous_total > 0:
            delta_percent = round(((total - previous_total) / previous_total) * 100, 1)
        elif total > 0:
            delta_percent = 100.0
        else:
            delta_percent = 0.0
        result["previous_total"] = previous_total
        result["delta_percent"] = delta_percent

    return result
