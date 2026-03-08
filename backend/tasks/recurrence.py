from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.utils import timezone


WEEKDAY_MAP = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


def compute_next_due_date(current_due_date, recurrence_rule):
    """Compute the next due date from a recurrence rule.

    Supported formats:
    - "DAILY"
    - "WEEKLY"
    - "MONTHLY"
    - "WEEKLY;BYDAY=MO,WE,FR"
    """
    if not recurrence_rule:
        return None

    rule = recurrence_rule.upper().strip()
    now = timezone.now()
    base = max(current_due_date, now) if current_due_date else now

    if rule == "DAILY":
        return base + timedelta(days=1)

    if rule == "WEEKLY":
        return base + timedelta(weeks=1)

    if rule == "MONTHLY":
        return base + relativedelta(months=1)

    if rule.startswith("WEEKLY;BYDAY="):
        days_str = rule.split("BYDAY=")[1]
        days = [WEEKDAY_MAP[d.strip()] for d in days_str.split(",") if d.strip() in WEEKDAY_MAP]
        if not days:
            return base + timedelta(weeks=1)

        # Find next matching weekday after base
        for offset in range(1, 8):
            candidate = base + timedelta(days=offset)
            if candidate.weekday() in days:
                return candidate

    return None
