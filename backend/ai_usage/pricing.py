from decimal import Decimal

# Prices in USD per million tokens
AI_PRICING = {
    "claude-sonnet-4-20250514": {
        "input": Decimal("3.00"),
        "output": Decimal("15.00"),
    },
    "claude-opus-4-6": {
        "input": Decimal("15.00"),
        "output": Decimal("75.00"),
    },
}

MILLION = Decimal("1000000")


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    """Calculate estimated cost in USD for a given model and token counts."""
    pricing = AI_PRICING.get(model)
    if not pricing:
        return Decimal("0")
    input_cost = pricing["input"] * Decimal(input_tokens) / MILLION
    output_cost = pricing["output"] * Decimal(output_tokens) / MILLION
    return input_cost + output_cost
