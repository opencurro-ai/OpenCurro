from __future__ import annotations

import json
from typing import Any

from src.agents.tools.file_read import FILE_READ_TOOL_SCHEMA, execute_file_read
from src.agents.tools.file_write import FILE_WRITE_TOOL_SCHEMA, execute_file_write


class ToolRegistry:
    def __init__(self) -> None:
        self._schemas = [FILE_WRITE_TOOL_SCHEMA, FILE_READ_TOOL_SCHEMA]
        self._handlers = {
            "file_write": execute_file_write,
            "file_read": execute_file_read,
        }

    @property
    def schemas(self) -> list[dict[str, Any]]:
        return self._schemas

    async def execute(self, tool_name: str, arguments: str | dict[str, Any], *, sandbox_adapter, sandbox_context):
        if tool_name not in self._handlers:
            return {
                "ok": False,
                "error": {
                    "code": "unknown_tool",
                    "message": f"Unknown tool: {tool_name}",
                },
            }

        parsed_arguments = arguments
        if isinstance(arguments, str):
            parsed_arguments = json.loads(arguments or "{}")

        result = await self._handlers[tool_name](
            sandbox_adapter=sandbox_adapter,
            sandbox_context=sandbox_context,
            arguments=parsed_arguments,
        )
        return result.model_dump(exclude_none=True)