from __future__ import annotations

import json
import re
from typing import Any, Optional

from src.agents.providers.base import LLMProvider
from src.agents.sandbox.base import SandboxAdapter, SandboxContext
from src.agents.subagents.deepexplorer.systemprompt import SUB_AGENT_SYSTEM_PROMPT
from src.agents.tools.file_read import FILE_READ_TOOL_SCHEMA, execute_file_read
from src.agents.tools.list_files import LIST_FILES_TOOL_SCHEMA, execute_list_files

SUB_AGENT_TOOLS = [FILE_READ_TOOL_SCHEMA, LIST_FILES_TOOL_SCHEMA]
SUB_AGENT_HANDLERS: dict[str, Any] = {
    "file_read": execute_file_read,
    "list_files": execute_list_files,
}


class SubAgentRunner:
    def __init__(
        self,
        *,
        provider: LLMProvider,
        model: str,
        api_key: str,
        base_url: Optional[str],
        sandbox_adapter: SandboxAdapter,
        sandbox_context: SandboxContext,
    ) -> None:
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.base_url = base_url
        self.sandbox_adapter = sandbox_adapter
        self.sandbox_context = sandbox_context

    async def run(
        self,
        messages: list[dict[str, Any]],
        on_event=None,
    ) -> dict[str, Any]:
        full_messages = [{"role": "system", "content": SUB_AGENT_SYSTEM_PROMPT}] + messages

        while True:
            assistant_content_parts: list[str] = []
            streamed_tool_calls: list[dict[str, Any]] = []
            finish_reason: Optional[str] = None

            async for delta in self.provider.stream_chat_completion(
                api_key=self.api_key,
                model=self.model,
                messages=full_messages,
                tools=SUB_AGENT_TOOLS,
                base_url=self.base_url,
            ):
                if delta.text:
                    cleaned = delta.text.replace("\r\n", "\n")
                    if cleaned:
                        assistant_content_parts.append(cleaned)
                        if on_event:
                            await on_event("sub_agent_token", {"value": cleaned})
                if delta.tool_calls:
                    streamed_tool_calls = self._merge_tool_calls(streamed_tool_calls, delta.tool_calls)
                if delta.finish_reason:
                    finish_reason = delta.finish_reason

            if streamed_tool_calls or finish_reason == "tool_calls":
                assistant_message = {
                    "role": "assistant",
                    "content": "".join(assistant_content_parts) or None,
                    "tool_calls": streamed_tool_calls,
                }
                full_messages.append(assistant_message)

                for tool_call in streamed_tool_calls:
                    tool_name = tool_call.get("function", {}).get("name", "unknown")
                    tool_args = tool_call.get("function", {}).get("arguments", "{}")
                    parsed_args = self._safe_json_loads(tool_args)

                    file_path = parsed_args.get("file_path")
                    list_path = parsed_args.get("path")

                    if on_event:
                        await on_event(
                            "sub_agent_tool_call",
                            {
                                "name": tool_name,
                                "file_path": file_path or list_path,
                                "label": self._tool_label(tool_name, file_path, list_path),
                            },
                        )

                    handler = SUB_AGENT_HANDLERS.get(tool_name)
                    if handler:
                        tool_result = await handler(
                            sandbox_adapter=self.sandbox_adapter,
                            sandbox_context=self.sandbox_context,
                            arguments=parsed_args,
                        )
                        result = tool_result.model_dump(exclude_none=True)
                    else:
                        result = {
                            "ok": False,
                            "error": {
                                "code": "unknown_tool",
                                "message": f"Unknown tool: {tool_name}",
                            },
                        }

                    full_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.get("id"),
                            "name": tool_name,
                            "content": json.dumps(result),
                        }
                    )

                    if on_event:
                        await on_event(
                            "sub_agent_tool_result",
                            {
                                "name": tool_name,
                                "ok": result.get("ok", False),
                                "file_path": file_path or list_path,
                            },
                        )

                continue

            final_text = "".join(assistant_content_parts)
            full_messages.append({"role": "assistant", "content": final_text})
            return {"result": final_text, "messages": full_messages[1:]}

    def _merge_tool_calls(self, accumulated: list[dict], incoming: list[dict]) -> list[dict]:
        merged = accumulated[:] if accumulated else []
        for chunk in incoming:
            index = chunk.get("index", len(merged))
            while len(merged) <= index:
                merged.append(
                    {"id": None, "type": "function", "function": {"name": "", "arguments": ""}}
                )
            target = merged[index]
            if chunk.get("id"):
                target["id"] = chunk["id"]
            if chunk.get("type"):
                target["type"] = chunk["type"]
            function = chunk.get("function") or {}
            target_function = target.setdefault("function", {"name": "", "arguments": ""})
            if function.get("name"):
                target_function["name"] += function["name"]
            if function.get("arguments"):
                target_function["arguments"] += function["arguments"]
        return merged

    def _safe_json_loads(self, raw: str) -> dict:
        try:
            return json.loads(raw or "{}")
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw or "")
            if not match:
                return {}
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}

    def _tool_label(
        self,
        tool_name: str,
        file_path: Optional[str],
        list_path: Optional[str],
    ) -> str:
        if tool_name == "list_files":
            return f"List: {list_path or 'unknown'}"
        return f"Read: {file_path or 'unknown'}"
