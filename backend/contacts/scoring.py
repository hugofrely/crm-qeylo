from django.utils import timezone
from datetime import timedelta


DEFAULT_SCORING_RULES = {
    "email_sent": 5,
    "email_opened": 3,
    "email_clicked": 8,
    "call_made": 5,
    "call_answered": 10,
    "deal_created": 20,
    "deal_won": 30,
    "meeting": 15,
    "note_added": 2,
    "task_completed": 3,
}

DECAY_POINTS_7D = -5
DECAY_POINTS_30D = -15


def create_default_scoring_rules(organization):
    from .models import ScoringRule
    for event_type, points in DEFAULT_SCORING_RULES.items():
        ScoringRule.objects.get_or_create(
            organization=organization,
            event_type=event_type,
            defaults={"points": points},
        )


def recalculate_score(contact):
    from .models import ScoringRule
    from notes.models import TimelineEntry

    org = contact.organization
    rules = {r.event_type: r.points for r in ScoringRule.objects.filter(organization=org, is_active=True)}

    entry_type_map = {
        "email_sent": "email_sent",
        "email_received": "email_opened",
        "call": "call_made",
        "deal_created": "deal_created",
        "note_added": "note_added",
        "meeting": "meeting",
    }

    cutoff = timezone.now() - timedelta(days=90)
    entries = TimelineEntry.objects.filter(
        contact=contact,
        created_at__gte=cutoff,
    ).values_list("entry_type", flat=True)

    score = 0
    for entry_type in entries:
        event = entry_type_map.get(entry_type)
        if event and event in rules:
            score += rules[event]

    from notes.models import Call
    answered_calls = Call.objects.filter(
        contact=contact,
        outcome="answered",
        started_at__gte=cutoff,
    ).count()
    if "call_answered" in rules:
        score += answered_calls * rules["call_answered"]
        if "call_made" in rules:
            score -= answered_calls * rules["call_made"]

    from deals.models import Deal
    won_deals = Deal.objects.filter(
        contact=contact,
        won_at__isnull=False,
        won_at__gte=cutoff,
    ).count()
    if "deal_won" in rules:
        score += won_deals * rules["deal_won"]
        if "deal_created" in rules:
            score -= won_deals * rules["deal_created"]

    from tasks.models import Task
    completed_tasks = Task.objects.filter(
        contact=contact,
        is_done=True,
        created_at__gte=cutoff,
    ).count()
    if "task_completed" in rules:
        score += completed_tasks * rules["task_completed"]

    last_activity = TimelineEntry.objects.filter(contact=contact).order_by("-created_at").first()
    if last_activity:
        days_inactive = (timezone.now() - last_activity.created_at).days
        if days_inactive >= 30:
            score += DECAY_POINTS_30D
        elif days_inactive >= 7:
            score += DECAY_POINTS_7D

    score = max(0, min(100, score))
    contact.numeric_score = score

    from organizations.models import OrganizationSettings
    try:
        settings = OrganizationSettings.objects.get(organization=org)
        hot = settings.scoring_hot_threshold
        warm = settings.scoring_warm_threshold
    except OrganizationSettings.DoesNotExist:
        hot, warm = 70, 30

    if score >= hot:
        contact.lead_score = "hot"
    elif score >= warm:
        contact.lead_score = "warm"
    else:
        contact.lead_score = "cold"

    contact.save(update_fields=["numeric_score", "lead_score"])
