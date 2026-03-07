import logging
from .models import AIUsageLog
from .pricing import calculate_cost

logger = logging.getLogger(__name__)


def log_ai_usage(
    organization,
    user,
    call_type: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    conversation=None,
):
    """Log an AI API call with token usage and estimated cost."""
    try:
        cost = calculate_cost(model, input_tokens, output_tokens)
        AIUsageLog.objects.create(
            organization=organization,
            user=user,
            call_type=call_type,
            model_name=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost,
            conversation=conversation,
        )
    except Exception:
        logger.exception("Failed to log AI usage")


async def alog_ai_usage(
    organization,
    user,
    call_type: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    conversation=None,
):
    """Async version of log_ai_usage."""
    try:
        cost = calculate_cost(model, input_tokens, output_tokens)
        await AIUsageLog.objects.acreate(
            organization=organization,
            user=user,
            call_type=call_type,
            model_name=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost,
            conversation=conversation,
        )
    except Exception:
        logger.exception("Failed to log AI usage")
