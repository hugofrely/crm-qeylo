# backend/segments/engine.py
from datetime import timedelta
from django.db.models import Q, Count, Max, Subquery, OuterRef
from django.utils import timezone
from contacts.models import Contact


# Maps field names to Django ORM lookups
FIELD_MAP = {
    # Direct contact fields
    "first_name": "first_name",
    "last_name": "last_name",
    "email": "email",
    "phone": "phone",
    "company": "company",
    "source": "source",
    "lead_score": "lead_score",
    "job_title": "job_title",
    "city": "city",
    "country": "country",
    "state": "state",
    "postal_code": "postal_code",
    "industry": "industry",
    "language": "language",
    "preferred_channel": "preferred_channel",
    "decision_role": "decision_role",
    "siret": "siret",
    "linkedin_url": "linkedin_url",
    "website": "website",
    "twitter_url": "twitter_url",
    "secondary_email": "secondary_email",
    "secondary_phone": "secondary_phone",
    "mobile_phone": "mobile_phone",
    "notes": "notes",
    "identified_needs": "identified_needs",
    # Date fields
    "created_at": "created_at",
    "updated_at": "updated_at",
    "birthday": "birthday",
    # Numeric
    "estimated_budget": "estimated_budget",
}

DATE_FIELDS = {"created_at", "updated_at", "birthday"}
NUMERIC_FIELDS = {"estimated_budget"}

UNIT_MAP = {
    "days": lambda v: timedelta(days=v),
    "weeks": lambda v: timedelta(weeks=v),
    "months": lambda v: timedelta(days=v * 30),
}


def build_condition_q(condition: dict) -> Q:
    """Build a Q object from a single condition dict."""
    field = condition["field"]
    operator = condition["operator"]
    value = condition.get("value")
    unit = condition.get("unit", "days")

    if field.startswith("custom_field."):
        field_id = field.split(".", 1)[1]
        return _build_custom_field_q(field_id, operator, value)

    if field in ("deals_count", "open_deals_count", "tasks_count", "open_tasks_count"):
        return _build_relation_count_q(field, operator, value)

    if field == "last_interaction_date":
        return _build_last_interaction_q(operator, value, unit)

    if field == "has_deal_closing_within":
        return _build_deal_closing_q(value, unit)

    if field == "categories":
        return _build_category_q(operator, value)

    if field == "tags":
        return _build_tags_q(operator, value)

    orm_field = FIELD_MAP.get(field)
    if not orm_field:
        return Q()

    if field in DATE_FIELDS:
        return _build_date_q(orm_field, operator, value, unit)

    if field in NUMERIC_FIELDS:
        return _build_numeric_q(orm_field, operator, value)

    return _build_text_q(orm_field, operator, value)


def _build_text_q(orm_field: str, operator: str, value) -> Q:
    if operator == "equals":
        return Q(**{orm_field: value})
    if operator == "not_equals":
        return ~Q(**{orm_field: value})
    if operator == "contains":
        return Q(**{f"{orm_field}__icontains": value})
    if operator == "not_contains":
        return ~Q(**{f"{orm_field}__icontains": value})
    if operator == "is_empty":
        return Q(**{orm_field: ""}) | Q(**{f"{orm_field}__isnull": True})
    if operator == "is_not_empty":
        return ~Q(**{orm_field: ""}) & Q(**{f"{orm_field}__isnull": False})
    if operator == "in":
        return Q(**{f"{orm_field}__in": value if isinstance(value, list) else [value]})
    if operator == "not_in":
        return ~Q(**{f"{orm_field}__in": value if isinstance(value, list) else [value]})
    return Q()


def _build_numeric_q(orm_field: str, operator: str, value) -> Q:
    if operator == "equals":
        return Q(**{orm_field: value})
    if operator == "not_equals":
        return ~Q(**{orm_field: value})
    if operator == "greater_than":
        return Q(**{f"{orm_field}__gt": value})
    if operator == "less_than":
        return Q(**{f"{orm_field}__lt": value})
    if operator == "between":
        if isinstance(value, list) and len(value) == 2:
            return Q(**{f"{orm_field}__gte": value[0], f"{orm_field}__lte": value[1]})
    if operator == "is_empty":
        return Q(**{f"{orm_field}__isnull": True})
    if operator == "is_not_empty":
        return Q(**{f"{orm_field}__isnull": False})
    return Q()


def _build_date_q(orm_field: str, operator: str, value, unit: str) -> Q:
    now = timezone.now()
    if operator == "equals":
        return Q(**{f"{orm_field}__date": value})
    if operator == "before":
        return Q(**{f"{orm_field}__lt": value})
    if operator == "after":
        return Q(**{f"{orm_field}__gt": value})
    if operator == "within_last":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(**{f"{orm_field}__gte": now - delta})
    if operator == "within_next":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(**{f"{orm_field}__lte": now + delta, f"{orm_field}__gte": now})
    if operator == "is_empty":
        return Q(**{f"{orm_field}__isnull": True})
    return Q()


def _build_custom_field_q(field_id: str, operator: str, value) -> Q:
    json_path = f"custom_fields__{field_id}"
    if operator == "equals":
        return Q(**{json_path: value})
    if operator == "not_equals":
        return ~Q(**{json_path: value})
    if operator == "contains":
        return Q(**{f"{json_path}__icontains": value})
    if operator == "is_empty":
        return ~Q(**{f"custom_fields__has_key": field_id}) | Q(**{json_path: ""})
    if operator == "is_not_empty":
        return Q(**{f"custom_fields__has_key": field_id}) & ~Q(**{json_path: ""})
    return Q()


def _build_category_q(operator: str, value) -> Q:
    if operator == "equals" or operator == "in":
        ids = value if isinstance(value, list) else [value]
        return Q(categories__id__in=ids)
    if operator == "not_in":
        ids = value if isinstance(value, list) else [value]
        return ~Q(categories__id__in=ids)
    if operator == "has_any":
        return Q(categories__isnull=False)
    if operator == "has_none":
        return Q(categories__isnull=True)
    return Q()


def _build_tags_q(operator: str, value) -> Q:
    if operator == "contains":
        return Q(tags__contains=[value])
    if operator == "not_contains":
        return ~Q(tags__contains=[value])
    if operator == "is_empty":
        return Q(tags=[])
    if operator == "is_not_empty":
        return ~Q(tags=[])
    return Q()


def _build_relation_count_q(field: str, operator: str, value) -> Q:
    if operator == "has_any":
        return Q(**{f"{field}__gt": 0})
    if operator == "has_none":
        return Q(**{field: 0})
    if operator == "greater_than":
        return Q(**{f"{field}__gt": int(value)})
    if operator == "less_than":
        return Q(**{f"{field}__lt": int(value)})
    if operator == "equals":
        return Q(**{field: int(value)})
    return Q()


def _build_last_interaction_q(operator: str, value, unit: str) -> Q:
    now = timezone.now()
    if operator == "within_last":
        delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
        return Q(last_interaction__gte=now - delta)
    if operator == "before":
        return Q(last_interaction__lt=value)
    if operator == "is_empty":
        return Q(last_interaction__isnull=True)
    return Q()


def _build_deal_closing_q(value, unit: str) -> Q:
    now = timezone.now()
    delta = UNIT_MAP.get(unit, UNIT_MAP["days"])(int(value))
    from deals.models import Deal
    closing_deal_contacts = Deal.objects.filter(
        expected_close__lte=(now + delta).date(),
        expected_close__gte=now.date(),
    ).values("contact_id")
    return Q(id__in=Subquery(closing_deal_contacts))


def build_group_q(group: dict) -> Q:
    logic = group.get("logic", "AND")
    conditions = group.get("conditions", [])

    if not conditions:
        return Q()

    combined = build_condition_q(conditions[0])
    for cond in conditions[1:]:
        q = build_condition_q(cond)
        if logic == "OR":
            combined = combined | q
        else:
            combined = combined & q

    return combined


def build_segment_queryset(organization, rules: dict):
    qs = Contact.objects.filter(organization=organization)

    # Note: Task model has no related_name on contact FK, so Django
    # default reverse accessor is "task_set". Deal model uses "deals".
    # TimelineEntry model uses "timeline_entries".

    rules_json = str(rules)
    if "deals_count" in rules_json or "open_deals_count" in rules_json:
        qs = qs.annotate(deals_count=Count("deals", distinct=True))
    if "open_deals_count" in rules_json:
        qs = qs.annotate(
            open_deals_count=Count(
                "deals",
                filter=~Q(deals__stage__name__in=["Gagné", "Perdu"]),
                distinct=True,
            )
        )
    if "tasks_count" in rules_json or "open_tasks_count" in rules_json:
        qs = qs.annotate(tasks_count=Count("task", distinct=True))
    if "open_tasks_count" in rules_json:
        qs = qs.annotate(
            open_tasks_count=Count(
                "task",
                filter=Q(task__is_done=False),
                distinct=True,
            )
        )
    if "last_interaction" in rules_json:
        qs = qs.annotate(last_interaction=Max("timeline_entries__created_at"))

    groups = rules.get("groups", [])
    root_logic = rules.get("logic", "AND")

    if not groups:
        return qs

    combined = build_group_q(groups[0])
    for group in groups[1:]:
        q = build_group_q(group)
        if root_logic == "OR":
            combined = combined | q
        else:
            combined = combined & q

    return qs.filter(combined).distinct()
