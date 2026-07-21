from __future__ import annotations

import json
from typing import Any, Optional

from src.agents.subagents import get_subagent
from src.schemas.sandbox import ToolExecutionResult

CALL_SUB_AGENT_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "call_sub_agent",
        "description": "Call a specialized sub-agent to perform a specific task within a given session and return the result. Use this tool when a dedicated sub-agent is better suited for the requested work or for completing the task faster.",
        "parameters": {
            "type": "object",
            "properties": {
                "session": {
                    "type": "string",
                    "description": "The unique session identifier where the sub-agent should execute. Use this to target an existing agent session.",
                },
                "agent": {
                    "type": "string",
                    "description": "The name of the specialized sub-agent to execute the task. Currently available sub-agents: deepexplorer (read-only code exploration), deepresearcher (web research with file output).",
                },
                "task": {
                    "type": "string",
                    "description": "A clear and detailed description of the task that the selected sub-agent should complete.",
                },
            },
            "required": ["session", "agent", "task"],
        },
    },
}


async def execute_call_sub_agent(
    *,
    sandbox_adapter,
    sandbox_context,
    arguments: dict[str, Any],
    **kwargs,
) -> ToolExecutionResult:
    session_name = arguments.get("session", "default")
    agent_name = arguments.get("agent", "")
    task = arguments.get("task", "")

    if not agent_name:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_agent", "message": "No sub-agent name specified."},
        )

    subagent_def = get_subagent(agent_name)
    if subagent_def is None:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "unknown_subagent",
                "message": f"Unknown sub-agent: {agent_name}. Available: deepexplorer, deepresearcher.",
            },
        )

    provider = kwargs.get("provider")
    model = kwargs.get("model")
    api_key = kwargs.get("api_key")
    base_url = kwargs.get("base_url")
    chat_id = kwargs.get("chat_id")
    session_store = kwargs.get("session_store")
    agent = kwargs.get("agent")
    subagent_event_queue = kwargs.get("subagent_event_queue")
    tavily_api_key = kwargs.get("tavily_api_key")
    firecrawl_api_key = kwargs.get("firecrawl_api_key")

    if not all([provider, model, api_key, chat_id, agent, subagent_event_queue]):
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_dependencies", "message": "Required dependencies not provided to sub-agent tool."},
        )

    sub_session_key = f"{chat_id}:subagent:{session_name}"
    sub_sessions = agent.subagent_sessions

    if sub_session_key not in sub_sessions:
        sub_sessions[sub_session_key] = []

    session_messages = sub_sessions[sub_session_key]

    async def emit_event(event_type: str, data: dict) -> None:
        event_data = {"session": session_name, **data}
        await subagent_event_queue.put((event_type, event_data))

    await emit_event("subagent_start", {"agent": agent_name})

    try:
        run_func = subagent_def["run"]
        output = await run_func(
            provider=provider,
            model=model,
            api_key=api_key,
            base_url=base_url,
            sandbox_adapter=sandbox_adapter,
            sandbox_context=sandbox_context,
            task=task,
            session_messages=session_messages,
            emit_event=emit_event,
            tavily_api_key=tavily_api_key,
            firecrawl_api_key=firecrawl_api_key,
        )

        await emit_event("subagent_complete", {"output": output})

        return ToolExecutionResult(
            ok=True,
            data={"session": session_name, "agent": agent_name, "output": output},
        )
    except Exception as exc:
        await emit_event("subagent_error", {"message": str(exc)})
        return ToolExecutionResult(
            ok=False,
            error={"code": "subagent_execution_failed", "message": str(exc)},
        )
