from __future__ import annotations

from src.agents.sandbox.base import SandboxContext
from src.schemas.sandbox import ToolExecutionResult

LIST_FILES_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_files",
        "description": "List all files and directories in the specified path.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The directory path to list."
                }
            },
            "required": ["path"]
        }
    }
}


async def execute_list_files(*, sandbox_adapter, sandbox_context: SandboxContext, arguments: dict, **kwargs) -> ToolExecutionResult:
    path = arguments.get("path")
    if not path:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_path",
                "message": "The 'path' argument is required.",
            },
        )
    try:
        entries = await sandbox_adapter.list_tree(sandbox_context, path, depth=1)
        items = [
            {
                "name": entry.name,
                "type": entry.type,
                "path": entry.path,
                "size": entry.size,
            }
            for entry in entries
        ]
        return ToolExecutionResult(
            ok=True,
            data={
                "path": path,
                "items": items,
            },
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "list_files_failed",
                "message": str(exc),
                "path": path,
            },
        )
