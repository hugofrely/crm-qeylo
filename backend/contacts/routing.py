def match_conditions(contact, conditions):
    """Check if a contact matches a routing rule's conditions."""
    for field, expected in conditions.items():
        if field == "source" and contact.source != expected:
            return False
        elif field == "industry" and contact.industry != expected:
            return False
        elif field == "country" and contact.country != expected:
            return False
        elif field == "estimated_budget_gte":
            if contact.estimated_budget is None or contact.estimated_budget < expected:
                return False
        elif field == "estimated_budget_lte":
            if contact.estimated_budget is None or contact.estimated_budget > expected:
                return False
        elif field == "tags_contains":
            if not isinstance(expected, list):
                expected = [expected]
            if not any(tag in (contact.tags or []) for tag in expected):
                return False
    return True


def route_lead(contact):
    """Assign an owner to a newly created contact using rules or round-robin."""
    from .models import LeadRoutingRule, RoundRobinState

    org = contact.organization

    # 1. Try rule-based routing
    rules = LeadRoutingRule.objects.filter(
        organization=org, is_active=True
    ).select_related("assign_to").order_by("priority")

    for rule in rules:
        if match_conditions(contact, rule.conditions):
            contact.owner = rule.assign_to
            contact.save(update_fields=["owner"])
            return

    # 2. Fall back to round-robin
    state, _ = RoundRobinState.objects.get_or_create(organization=org)
    eligible = list(state.eligible_users.all().order_by("id"))

    if not eligible:
        return

    idx = state.last_assigned_index % len(eligible)
    contact.owner = eligible[idx]
    contact.save(update_fields=["owner"])

    state.last_assigned_index = (idx + 1) % len(eligible)
    state.save(update_fields=["last_assigned_index"])
