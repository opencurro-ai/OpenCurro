from __future__ import annotations

import asyncio
from typing import Any, Optional

from src.agents.subagents.deepexplorer.agent import SubAgentRunner
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
                    "description": "The unique session identifier where the sub-agent should execute. Use this to target an existing agent session."
                },
                "agent": {
                    "type": "string",
                    "description": "The name of the specialized sub-agent to execute the task. Currently available sub-agent: deepexplorer."
                },
                "task": {
                    "type": "string",
                    "description": "A clear and detailed description of the task that the selected sub-agent should complete."
                },
                "wait_for_output": {
                    "type": "boolean",
                    "description": "Whether to wait for the sub-agent to finish execution before returning. Set to true for synchronous execution and false for background execution.",
                    "default": True
                }
            },
            "required": ["session", "agent", "task"]
        }
    }
}


async def execute_call_sub_agent(
    *,
    sandbox_adapter,
    sandbox_context,
    arguments: dict[str, Any],
    provider=None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    chat_id: Optional[str] = None,
    session_store=None,
    on_event=None,
    **kwargs,
) -> ToolExecutionResult:
    session_name = arguments.get("session", "default")
    agent_name = arguments.get("agent", "")
    task = arguments.get("task", "")
    wait_for_output = arguments.get("wait_for_output", True)

    if not agent_name:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_agent",
                "message": "No agent name provided.",
            },
        )

    if agent_name != "deepexplorer":
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "unknown_agent",
                "message": f"Unknown sub-agent: {agent_name}. Available: deepexplorer.",
            },
        )

    if not task:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_task",
                "message": "No task provided.",
            },
        )

    runner_factory = kwargs.get("runner_factory", SubAgentRunner)

    async def run_sub_agent(*, emit_live_events: bool, initialize_state: bool) -> ToolExecutionResult:
        existing_messages: list[dict[str, Any]] = []
        if session_store is not None and chat_id:
            existing_messages = list(session_store.get_sub_agent_messages(chat_id, session_name))

        sub_messages = existing_messages + [{"role": "user", "content": task}]
        events: list[dict[str, Any]] = []

        async def collect_event(event_type: str, data: dict) -> None:
            events.append({"event": event_type, "data": data})
            if session_store is not None and chat_id:
                session_store.append_sub_agent_event(chat_id, session_name, event_type, data)
            if emit_live_events and on_event:
                await on_event(event_type, data)

        if session_store is not None and chat_id and initialize_state:
            session_store.start_sub_agent_execution(
                chat_id,
                session_name,
                agent_name=agent_name,
                task=task,
            )

        runner = runner_factory(
            provider=provider,
            model=model,
            api_key=api_key,
            base_url=base_url,
            sandbox_adapter=sandbox_adapter,
            sandbox_context=sandbox_context,
        )

        try:
            result = await runner.run(sub_messages, on_event=collect_event)
            result_text = result.get("result", "")
            updated_messages = result.get("messages", [])

            if session_store is not None and chat_id:
                session_store.set_sub_agent_messages(chat_id, session_name, updated_messages)
                session_store.complete_sub_agent_execution(chat_id, session_name, result_text)

            return ToolExecutionResult(
                ok=True,
                data={
                    "session": session_name,
                    "agent": agent_name,
                    "result": result_text,
                    "events": events,
                },
            )
        except Exception as exc:
            error_payload = {
                "code": "sub_agent_error",
                "message": f"Sub-agent execution failed: {exc}",
                "session": session_name,
                "agent": agent_name,
            }
            if session_store is not None and chat_id:
                session_store.fail_sub_agent_execution(chat_id, session_name, error_payload)

            return ToolExecutionResult(
                ok=False,
                error=error_payload,
                data={
                    "session": session_name,
                    "agent": agent_name,
                    "events": events,
                },
            )

    if not wait_for_output:
        if session_store is not None and chat_id:
            session_store.start_sub_agent_execution(
                chat_id,
                session_name,
                agent_name=agent_name,
                task=task,
            )

        background_task = asyncio.create_task(
            run_sub_agent(emit_live_events=False, initialize_state=False),
            name=f"sub-agent:{chat_id or 'anonymous'}:{session_name}:{agent_name}",
        )

        if session_store is not None and chat_id:
            session_store.attach_sub_agent_task(chat_id, session_name, background_task)

        return ToolExecutionResult(
            ok=True,
            data={
                "session": session_name,
                "agent": agent_name,
                "status": "started",
                "events": [],
            },
        )

    return await run_sub_agent(emit_live_events=True, initialize_state=True)
