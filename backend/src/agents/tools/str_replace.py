from __future__ import annotations

from src.agents.sandbox.base import SandboxContext
from src.schemas.sandbox import ToolExecutionResult

STR_REPLACE_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "str_replace",
        "description": "Replace a specific string inside a file",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path of the file where replacement should happen"
                },
                "old_string": {
                    "type": "string",
                    "description": "Exact text or code block that should be replaced"
                },
                "new_string": {
                    "type": "string",
                    "description": "New text that will replace the old text"
                },
                "replace_all": {
                    "type": "boolean",
                    "description": "Replace all occurrences of old_string (default false)"
                }
            },
            "required": ["file_path", "old_string", "new_string"]
        }
    }
}


async def execute_str_replace(*, sandbox_adapter, sandbox_context: SandboxContext, arguments: dict, **kwargs) -> ToolExecutionResult:
    file_path = arguments.get("file_path")
    old_string = arguments.get("old_string")
    new_string = arguments.get("new_string")
    replace_all = arguments.get("replace_all", False)

    if not file_path or old_string is None or new_string is None:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "missing_arguments",
                "message": "Missing required arguments: file_path, old_string, new_string",
            },
        )

    try:
        content = await sandbox_adapter.read_file(sandbox_context, file_path)
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "file_read_failed",
                "message": f"Failed to read file: {exc}",
                "file_path": file_path,
            },
        )

    occurrences = content.count(old_string)
    if occurrences == 0:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "string_not_found",
                "message": "The specified old_string was not found in the file. Provide more context or check the exact content.",
                "file_path": file_path,
            },
        )

    if occurrences > 1 and not replace_all:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "multiple_occurrences",
                "message": f"Found {occurrences} occurrences of old_string. Provide a more unique string or use replace_all=true.",
                "file_path": file_path,
                "occurrences": occurrences,
            },
        )

    new_content = content.replace(old_string, new_string) if replace_all else content.replace(old_string, new_string, 1)

    try:
        await sandbox_adapter.write_file(sandbox_context, file_path, new_content)
        return ToolExecutionResult(
            ok=True,
            data={
                "file_path": file_path,
                "old_string": old_string,
                "new_string": new_string,
                "replace_all": replace_all,
                "occurrences": occurrences,
            },
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={
                "code": "file_write_failed",
                "message": f"Failed to write file after replacement: {exc}",
                "file_path": file_path,
            },
        )
