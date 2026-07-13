from __future__ import annotations

from src.schemas.sandbox import ToolExecutionResult

SHALL_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "shall_tool",
        "description": "Execute shell (terminal) commands in the sandbox. Use this to run build commands, install packages, run scripts, or any other terminal operations. The sandbox session persists between commands, so you can run multiple commands in sequence. When wait_for_output is True, the tool waits for completion and returns full stdout/stderr. When False, the command runs in the background.",
        "parameters": {
            "type": "object",
            "properties": {
                "session_name": {
                    "type": "string",
                    "description": "The name of the session to execute the command in. If the session does not exist, a new one is created automatically. Use this to group related commands."
                },
                "command": {
                    "type": "string",
                    "description": "The shell command to execute. For example: ls -la, npm install, python script.py, pip install requests, etc."
                },
                "wait_for_output": {
                    "type": "boolean",
                    "description": "If true, wait for the command to finish and return full output (stdout + stderr). If false, run the command in the background and return a confirmation with the PID.",
                    "default": True
                }
            },
            "required": ["session_name", "command"]
        }
    }
}


async def execute_shall_tool(*, sandbox_adapter, sandbox_context, arguments: dict) -> ToolExecutionResult:
    session_name = arguments.get("session_name", "default")
    command = arguments.get("command")
    wait_for_output = arguments.get("wait_for_output", True)

    if not command:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_command",
                "message": "No command provided.",
            },
        )

    try:
        result = await sandbox_adapter.run_command(
            sandbox_context,
            command=command,
            timeout=180,
            wait_for_output=wait_for_output,
        )
        return ToolExecutionResult(ok=True, data=result)
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "command_execution_failed",
                "message": str(exc),
                "command": command,
            },
        )
