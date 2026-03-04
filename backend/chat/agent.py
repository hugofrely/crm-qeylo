"""
Build and configure the Pydantic AI agent for the CRM chat.
"""
from pydantic_ai import Agent

from .tools import ChatDeps, ALL_TOOLS


def build_agent() -> Agent[ChatDeps, str]:
    """Create a Pydantic AI agent with all CRM tools registered.

    The model is resolved at call-time via the `model` kwarg on
    ``agent.run_sync()`` so we defer the model check here and
    default to None.
    """
    agent: Agent[ChatDeps, str] = Agent(
        model=None,
        deps_type=ChatDeps,
    )
    for tool_func in ALL_TOOLS:
        agent.tool(tool_func)
    return agent
