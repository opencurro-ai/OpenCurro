from __future__ import annotations

import json
from typing import Any

from src.agents.tools.call_sub_agent import CALL_SUB_AGENT_TOOL_SCHEMA, execute_call_sub_agent
from src.agents.tools.file_read import FILE_READ_TOOL_SCHEMA, execute_file_read
from src.agents.tools.file_write import FILE_WRITE_TOOL_SCHEMA, execute_file_write
from src.agents.tools.list_files import LIST_FILES_TOOL_SCHEMA, execute_list_files
from src.agents.tools.shall_tool import SHALL_TOOL_SCHEMA, execute_shall_tool


class ToolRegistry:
    def __init__(self) -> None:
        self._schemas = [
            FILE_WRITE_TOOL_SCHEMA,
            FILE_READ_TOOL_SCHEMA,
            SHALL_TOOL_SCHEMA,
            LIST_FILES_TOOL_SCHEMA,
            CALL_SUB_AGENT_TOOL_SCHEMA,
        ]
        self._handlers = {
            "file_write": execute_file_write,
            "file_read": execute_file_read,
            "shall_tool": execute_shall_tool,
            "list_files": execute_list_files,
            "call_sub_agent": execute_call_sub_agent,
        }

    @property
    def schemas(self) -> list[dict[str, Any]]:
        return self._schemas

    async def execute(
        self,
        tool_name: str,
        arguments: str | dict[str, Any],
        *,
        sandbox_adapter,
        sandbox_context,
        **extra_kwargs,
    ):
        if tool_name not in self._handlers:
            return {
                "ok": False,
                "error": {
                    "code": "unknown_tool",
                    "message": f"Unknown tool: {tool_name}",
                },
            }

        try:
            if isinstance(arguments, str):
                parsed_arguments = json.loads(arguments or "{}")
            else:
                parsed_arguments = arguments
        except json.JSONDecodeError as exc:
            return {
                "ok": False,
                "error": {
                    "code": "invalid_arguments",
                    "message": f"Failed to parse tool arguments: {exc}",
                    "raw": arguments,
                },
            }

        try:
            result = await self._handlers[tool_name](
                sandbox_adapter=sandbox_adapter,
                sandbox_context=sandbox_context,
                arguments=parsed_arguments,
                **extra_kwargs,
            )
            return result.model_dump(exclude_none=True)
        except Exception as exc:
            return {
                "ok": False,
                "error": {
                    "code": "tool_handler_error",
                    "message": f"Tool '{tool_name}' execution failed: {exc}",
                },
            }