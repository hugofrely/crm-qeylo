"""
Evaluate workflow conditions against event context data.
"""

OPERATORS = {
    "equals": lambda a, b: str(a).lower() == str(b).lower(),
    "not_equals": lambda a, b: str(a).lower() != str(b).lower(),
    "greater_than": lambda a, b: float(a) > float(b),
    "less_than": lambda a, b: float(a) < float(b),
    "contains": lambda a, b: str(b).lower() in str(a).lower(),
    "not_contains": lambda a, b: str(b).lower() not in str(a).lower(),
    "is_empty": lambda a, b: not a or a == "",
    "is_not_empty": lambda a, b: a and a != "",
}


def evaluate_condition(config: dict, context: dict) -> bool:
    """Evaluate a condition node against the template context.

    Config example: {"field": "deal.amount", "operator": "greater_than", "value": 5000}
    """
    field_path = config.get("field", "")
    operator = config.get("operator", "equals")
    expected = config.get("value", "")

    parts = field_path.split(".", 1)
    if len(parts) != 2:
        return False

    entity, field = parts
    actual = context.get(entity, {}).get(field)

    if actual is None:
        return operator in ("is_empty",)

    op_func = OPERATORS.get(operator)
    if not op_func:
        return False

    try:
        return op_func(actual, expected)
    except (ValueError, TypeError):
        return False
