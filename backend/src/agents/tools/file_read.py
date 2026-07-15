from __future__ import annotations

from src.agents.sandbox.base import SandboxContext
from src.schemas.sandbox import ToolExecutionResult

FILE_READ_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "file_read",
        "description": "Read the content of an existing file from the sandbox. Returns content with line numbers.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Absolute path starting with /home/user/. Example: /home/user/project/src/main.py"
                }
            },
            "required": ["file_path"]
        }
    }
}


async def execute_file_read(*, sandbox_adapter, sandbox_context: SandboxContext, arguments: dict, **kwargs) -> ToolExecutionResult:
    file_path = arguments.get("file_path")
    try:
        content = await sandbox_adapter.read_file(sandbox_context, file_path)
        numbered_content = "\n".join(
            f"{index:>6}\t{line}" for index, line in enumerate(content.splitlines(), start=1)
        )
        return ToolExecutionResult(
            ok=True,
            data={
                "file_path": file_path,
                "content": numbered_content,
            },
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "file_read_failed",
                "message": str(exc),
                "file_path": file_path,
            },
        )