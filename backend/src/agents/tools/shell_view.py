from __future__ import annotations

from typing import Any

from src.schemas.sandbox import ToolExecutionResult

SHELL_VIEW_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "shell_view",
        "description": "View the output of background commands that were started with shall_tool and wait_for_output=false. Use this to check the progress or results of long-running commands. Provide the session_name(s) you used when starting the background command.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_names": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of session names to view output for. These are the session_name values you used when running background commands with shall_tool.",
                }
            },
            "required": ["session_names"],
        },
    },
}


async def execute_shell_view(*, sandbox_context, arguments: dict, **kwargs) -> ToolExecutionResult:
    session_names = arguments.get("session_names", [])

    if not session_names:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_session_names",
                "message": "No session_names provided.",
            },
        )

    sessions = []
    for session_name in session_names:
        session_info = sandbox_context.background_handles.get(session_name)
        if session_info is None:
            sessions.append({
                "session_name": session_name,
                "status": "session not found",
                "output": "",
            })
            continue

        handle = session_info.get("handle")
        if handle is None:
            sessions.append({
                "session_name": session_name,
                "status": "session not found",
                "output": "",
            })
            continue

        stdout = handle.stdout or ""
        stderr = handle.stderr or ""
        combined_output = stdout + stderr

        if handle.exit_code is not None:
            sessions.append({
                "session_name": session_name,
                "status": "completed",
                "output": combined_output,
            })
        else:
            sessions.append({
                "session_name": session_name,
                "status": "running",
                "output": combined_output,
            })

    return ToolExecutionResult(ok=True, data={"sessions": sessions})
