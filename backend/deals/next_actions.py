from django.utils import timezone
from .models import Deal, DealStageTransition
from tasks.models import Task
from notes.models import TimelineEntry


def compute_heuristic_actions(deal, organization):
    """Return a list of heuristic next-best-action suggestions for a deal."""
    actions = []
    now = timezone.now()

    if deal.stage.is_won or deal.stage.is_lost:
        return actions

    # 1. Deal dormant - no activity in 7 days
    last_activity = TimelineEntry.objects.filter(
        organization=organization, deal=deal,
    ).order_by("-created_at").first()

    last_transition = DealStageTransition.objects.filter(
        deal=deal
    ).order_by("-transitioned_at").first()

    last_event_time = deal.created_at
    if last_activity and last_activity.created_at > last_event_time:
        last_event_time = last_activity.created_at
    if last_transition and last_transition.transitioned_at > last_event_time:
        last_event_time = last_transition.transitioned_at

    days_since = (now - last_event_time).total_seconds() / 86400
    if days_since >= 7:
        actions.append({
            "type": "deal_dormant",
            "priority": "high",
            "message": f"Aucune activite depuis {int(days_since)} jours. Relancez le contact.",
            "suggested_action": "log_interaction",
            "days_since_activity": int(days_since),
        })

    # 2. No quote in late stage (order >= 3)
    if deal.stage.order >= 3 and not deal.quotes.exists():
        actions.append({
            "type": "no_quote",
            "priority": "high",
            "message": "Ce deal est en stage avance sans devis. Creez un devis.",
            "suggested_action": "create_quote",
        })

    # 3. Close date passed
    if deal.expected_close and deal.expected_close < now.date():
        days_overdue = (now.date() - deal.expected_close).days
        actions.append({
            "type": "close_date_passed",
            "priority": "high",
            "message": f"Date de cloture depassee de {days_overdue} jours. Mettez a jour ou cloturez.",
            "suggested_action": "update_deal",
        })

    # 4. No contact
    if not deal.contact:
        actions.append({
            "type": "no_contact",
            "priority": "medium",
            "message": "Aucun contact associe. Associez un contact a ce deal.",
            "suggested_action": "update_deal",
        })

    # 5. Low probability in late stage
    if deal.stage.order >= 3 and deal.probability is not None and deal.probability < 30:
        actions.append({
            "type": "low_probability_late_stage",
            "priority": "medium",
            "message": f"Probabilite de {deal.probability}% en stage avance. Reevaluez.",
            "suggested_action": "update_deal",
        })

    # 6. Stagnant deal - time in stage > 2x average
    if last_transition:
        days_in_stage = (now - last_transition.transitioned_at).total_seconds() / 86400
        try:
            from .analytics import compute_velocity
            velocity = compute_velocity(organization, str(deal.stage.pipeline_id), period="last_6_months")
            if isinstance(velocity, dict) and "stages" in velocity:
                stage_stat = next((s for s in velocity["stages"] if s["stage_id"] == str(deal.stage_id)), None)
                if stage_stat and stage_stat["avg_days"] > 0 and days_in_stage > stage_stat["avg_days"] * 2:
                    actions.append({
                        "type": "stagnant_deal",
                        "priority": "medium",
                        "message": f"Ce deal est dans ce stage depuis {int(days_in_stage)} jours (moyenne: {stage_stat['avg_days']}). Debloquez ou disqualifiez.",
                        "suggested_action": "update_deal",
                    })
        except Exception:
            pass

    # 7. No next step - no future task
    future_tasks = Task.objects.filter(
        deal=deal, is_done=False, due_date__gte=now,
    ).exists()
    if not future_tasks:
        actions.append({
            "type": "no_next_step",
            "priority": "low",
            "message": "Aucune tache future planifiee. Planifiez une prochaine action.",
            "suggested_action": "create_task",
        })

    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    actions.sort(key=lambda a: priority_order.get(a["priority"], 3))

    return actions
