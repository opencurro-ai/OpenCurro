from __future__ import annotations

import json
import re
from typing import Any, Optional

from src.agents.subagents import register_subagent
from src.agents.subagents.deepresearcher.systemprompt import DEEP_RESEARCHER_SYSTEM_PROMPT
from src.agents.tools.web_search_tool import WEB_SEARCH_TOOL_SCHEMA, execute_web_search
from src.agents.tools.fatch_web_urls import FETCH_WEB_URLS_TOOL_SCHEMA, execute_fatch_web_urls
from src.agents.tools.file_write import FILE_WRITE_TOOL_SCHEMA, execute_file_write
from src.agents.tools.file_read import FILE_READ_TOOL_SCHEMA, execute_file_read
from src.agents.tools.list_files import LIST_FILES_TOOL_SCHEMA, execute_list_files
from src.agents.tools.str_replace import STR_REPLACE_TOOL_SCHEMA, execute_str_replace
from src.agents.tools.shall_tool import SHALL_TOOL_SCHEMA, execute_shall_tool

DEEP_RESEARCHER_TOOLS = [
    WEB_SEARCH_TOOL_SCHEMA,
    FETCH_WEB_URLS_TOOL_SCHEMA,
    FILE_WRITE_TOOL_SCHEMA,
    FILE_READ_TOOL_SCHEMA,
    LIST_FILES_TOOL_SCHEMA,
    STR_REPLACE_TOOL_SCHEMA,
    SHALL_TOOL_SCHEMA,
]
DEEP_RESEARCHER_TOOL_HANDLERS = {
    "web_search": execute_web_search,
    "fatch_web_urls": execute_fatch_web_urls,
    "file_write": execute_file_write,
    "file_read": execute_file_read,
    "list_files": execute_list_files,
    "str_replace": execute_str_replace,
    "shall_tool": execute_shall_tool,
}


async def run_deepresearcher(
    *,
    provider,
    model: str,
    api_key: str,
    base_url: Optional[str],
    sandbox_adapter,
    sandbox_context,
    task: str,
    session_messages: list[dict[str, Any]],
    emit_event,
    tavily_api_key: Optional[str] = None,
    firecrawl_api_key: Optional[str] = None,
) -> str:
    output_parts: list[str] = []

    session_messages.append({"role": "user", "content": task})

    while True:
        assistant_content_parts: list[str] = []
        streamed_tool_calls: list[dict] = []
        finish_reason: Optional[str] = None

        messages = _build_subagent_messages(session_messages)

        try:
            async for delta in provider.stream_chat_completion(
                api_key=api_key,
                model=model,
                messages=messages,
                tools=DEEP_RESEARCHER_TOOLS,
                base_url=base_url,
            ):
                if delta.text:
                    cleaned = delta.text.replace("\r\n", "\n")
                    if cleaned:
                        assistant_content_parts.append(cleaned)
                        output_parts.append(cleaned)
                        await emit_event("subagent_token", {"value": cleaned})
                if delta.tool_calls:
                    streamed_tool_calls = _merge_tool_calls(streamed_tool_calls, delta.tool_calls)
                if delta.finish_reason:
                    finish_reason = delta.finish_reason
        except Exception as exc:
            await emit_event("subagent_error", {"message": f"Sub-agent provider error: {exc}"})
            raise

        if streamed_tool_calls or finish_reason == "tool_calls":
            assistant_tool_message = {
                "role": "assistant",
                "content": "".join(assistant_content_parts) or None,
                "tool_calls": streamed_tool_calls,
            }
            session_messages.append(assistant_tool_message)

            for tool_call in streamed_tool_calls:
                tool_name = tool_call.get("function", {}).get("name", "unknown")
                tool_args = tool_call.get("function", {}).get("arguments", "{}")
                parsed_args = _safe_json_loads(tool_args)

                extra_kwargs: dict[str, Any] = {}
                if tool_name in ("web_search",):
                    extra_kwargs["tavily_api_key"] = tavily_api_key
                if tool_name in ("fatch_web_urls",):
                    extra_kwargs["firecrawl_api_key"] = firecrawl_api_key

                file_path = parsed_args.get("file_path")
                command = parsed_args.get("command")
                session_name = parsed_args.get("session_name") or parsed_args.get("session") or "default"
                session_names = parsed_args.get("session_names")
                list_path = parsed_args.get("path")
                query = parsed_args.get("query")
                url = parsed_args.get("url")
                old_string = parsed_args.get("old_string")
                new_string = parsed_args.get("new_string")
                label = _subagent_tool_label(tool_name, file_path, command, list_path, session_names, url=url)

                await emit_event(
                    "subagent_tool_call",
                    {
                        "name": tool_name,
                        "file_path": file_path,
                        "command": command,
                        "session_name": session_name,
                        "session_names": session_names,
                        "path": list_path,
                        "query": query,
                        "url": url,
                        "old_string": old_string,
                        "new_string": new_string,
                        "label": label,
                    },
                )

                handler = DEEP_RESEARCHER_TOOL_HANDLERS.get(tool_name)
                if handler is None:
                    result = {
                        "ok": False,
                        "error": {"code": "unknown_tool", "message": f"Unknown tool: {tool_name}"},
                    }
                else:
                    try:
                        tool_result = await handler(
                            sandbox_adapter=sandbox_adapter,
                            sandbox_context=sandbox_context,
                            arguments=parsed_args,
                            **extra_kwargs,
                        )
                        result = tool_result.model_dump(exclude_none=True)
                    except Exception as exc:
                        result = {
                            "ok": False,
                            "error": {"code": "tool_execution_failed", "message": str(exc)},
                        }

                session_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.get("id"),
                        "name": tool_name,
                        "content": json.dumps(result),
                        "metadata": {"file_path": file_path},
                    }
                )

                await emit_event(
                    "subagent_tool_result",
                    {
                        "name": tool_name,
                        "file_path": file_path,
                        "ok": result.get("ok", False),
                        "result": result,
                    },
                )
            continue

        final_output = "".join(assistant_content_parts)
        session_messages.append({"role": "assistant", "content": final_output})
        return final_output


def _build_subagent_messages(messages: list[dict]) -> list[dict]:
    built = [{"role": "system", "content": DEEP_RESEARCHER_SYSTEM_PROMPT}]
    for message in messages:
        m: dict = {"role": message["role"]}
        if message.get("content") is not None:
            m["content"] = message.get("content")
        if message.get("tool_calls") is not None:
            m["tool_calls"] = message.get("tool_calls")
        if message.get("tool_call_id") is not None:
            m["tool_call_id"] = message.get("tool_call_id")
        if message.get("name") is not None:
            m["name"] = message.get("name")
        built.append(m)
    return built


def _merge_tool_calls(accumulated: list[dict], incoming: list[dict]) -> list[dict]:
    merged = accumulated[:] if accumulated else []
    for chunk in incoming:
        index = chunk.get("index", len(merged))
        while len(merged) <= index:
            merged.append({"id": None, "type": "function", "function": {"name": "", "arguments": ""}})
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


def _safe_json_loads(raw: str) -> dict:
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


def _subagent_tool_label(
    tool_name: str,
    file_path: Optional[str],
    command: Optional[str] = None,
    list_path: Optional[str] = None,
    session_names: Optional[list[str]] = None,
    url: Optional[str] = None,
) -> str:
    if tool_name == "shall_tool":
        return f"Terminal: {command or 'unknown'}"
    if tool_name == "shell_view":
        sessions = ", ".join(session_names) if session_names else "unknown"
        return f"Shell View: {sessions}"
    if tool_name == "list_files":
        return f"List: {list_path or 'unknown'}"
    if tool_name == "web_search":
        return f"Web Search"
    if tool_name == "fatch_web_urls":
        return f"Fetch: {url or 'url'}"
    if tool_name == "str_replace":
        return f"Edit: {file_path or 'unknown'}"
    if tool_name in ("file_write",):
        return f"Create: {file_path or 'unknown'}"
    return f"Read: {file_path or 'unknown'}"


register_subagent(
    name="deepresearcher",
    system_prompt=DEEP_RESEARCHER_SYSTEM_PROMPT,
    allowed_tools=DEEP_RESEARCHER_TOOLS,
    run_func=run_deepresearcher,
)
