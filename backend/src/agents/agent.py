import json
import re
import asyncio
from typing import AsyncGenerator, Optional, Callable

from src.agents.providers.registry import ProviderRegistry
from src.agents.sandbox.registry import SandboxRegistry
from src.agents.systemprompts.systemprompt import SYSTEM_PROMPT
from src.agents.tools.registry import ToolRegistry
from src.schemas.chat import ChatMessage, ChatStreamRequest
from src.services.session_store import SessionStore


class AgentRunner:
    def __init__(
        self,
        *,
        provider_registry: ProviderRegistry,
        sandbox_registry: SandboxRegistry,
        tool_registry: ToolRegistry,
        session_store: SessionStore,
    ) -> None:
        self.provider_registry = provider_registry
        self.sandbox_registry = sandbox_registry
        self.tool_registry = tool_registry
        self.session_store = session_store

    async def stream_turn(self, request: ChatStreamRequest) -> AsyncGenerator[str, None]:
        session = self.session_store.upsert_history(request.chat_id, request.history)
        session.messages.append(ChatMessage(role="user", content=request.user_message).model_dump(exclude_none=True))

        async def send(event: str, data: dict) -> str:
            return self._sse(event, data)

        yield await send("iteration", {"current": 0, "limit": request.max_iterations})

        sandbox_adapter = self.sandbox_registry.get(request.sandbox.provider)
        if session.sandbox_context is None:
            yield await send("status", {"state": "creating_sandbox", "label": "Creating sandbox..."})
            try:
                session.sandbox_context = await sandbox_adapter.create(request.sandbox)
            except Exception as exc:
                yield await send(
                    "error",
                    {
                        "message": f"Sandbox creation failed: {exc}",
                        "code": "sandbox_create_failed",
                    },
                )
                yield await send("done", {"ok": False})
                return
            yield await send(
                "sandbox",
                {
                    "sandbox_id": session.sandbox_context.sandbox_id,
                    "provider": session.sandbox_context.provider,
                    "root_path": session.sandbox_context.root_path,
                },
            )

        provider = self.provider_registry.get(request.provider)
        visible_answer_parts: list[str] = []
        iteration = 0

        while iteration < request.max_iterations:
            iteration += 1
            yield await send("iteration", {"current": iteration, "limit": request.max_iterations})
            yield await send("status", {"state": "thinking", "label": "Thinking..."})

            assistant_content_parts: list[str] = []
            streamed_tool_calls: list[dict] = []
            finish_reason: Optional[str] = None

            async for delta in provider.stream_chat_completion(
                api_key=request.api_key,
                model=request.model,
                messages=self._build_provider_messages(session.messages),
                tools=self.tool_registry.schemas,
                base_url=request.base_url,
            ):
                if delta.text:
                    cleaned = self._normalize_delta(delta.text)
                    if cleaned:
                        assistant_content_parts.append(cleaned)
                        visible_answer_parts.append(cleaned)
                        yield await send("token", {"value": cleaned})
                if delta.tool_calls:
                    streamed_tool_calls = self._merge_tool_calls(streamed_tool_calls, delta.tool_calls)
                if delta.finish_reason:
                    finish_reason = delta.finish_reason

            if streamed_tool_calls or finish_reason == "tool_calls":
                assistant_tool_message = {
                    "role": "assistant",
                    "content": "".join(assistant_content_parts) or None,
                    "tool_calls": streamed_tool_calls,
                }
                session.messages.append(assistant_tool_message)

                for tool_call in streamed_tool_calls:
                    tool_name = tool_call.get("function", {}).get("name", "unknown")
                    tool_args = tool_call.get("function", {}).get("arguments", "{}")
                    tool_payload = self._safe_json_loads(tool_args)
                    file_path = tool_payload.get("file_path")
                    yield await send(
                        "tool_call",
                        {
                            "name": tool_name,
                            "file_path": file_path,
                            "label": self._tool_label(tool_name, file_path),
                        },
                    )
                    result = await self.tool_registry.execute(
                        tool_name,
                        tool_args,
                        sandbox_adapter=sandbox_adapter,
                        sandbox_context=session.sandbox_context,
                    )
                    session.messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.get("id"),
                            "name": tool_name,
                            "content": json.dumps(result),
                            "metadata": {"file_path": file_path},
                        }
                    )
                    yield await send(
                        "tool_result",
                        {
                            "name": tool_name,
                            "file_path": file_path,
                            "ok": result.get("ok", False),
                            "result": result,
                        },
                    )
                continue

            final_message = "".join(assistant_content_parts)
            session.messages.append({"role": "assistant", "content": final_message})
            yield await send(
                "message_complete",
                {
                    "content": "".join(visible_answer_parts),
                    "iteration_count": iteration,
                },
            )
            yield await send("done", {"ok": True})
            return

        yield await send(
            "error",
            {
                "message": "Iteration limit reached before the agent could finish the turn.",
                "code": "iteration_limit_reached",
            },
        )
        yield await send("done", {"ok": False})

    def _build_provider_messages(self, messages: list[dict]) -> list[dict]:
        built_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for message in messages:
            built: dict = {"role": message["role"]}
            if message.get("content") is not None:
                built["content"] = message.get("content")
            if message.get("tool_calls") is not None:
                built["tool_calls"] = message.get("tool_calls")
            if message.get("tool_call_id") is not None:
                built["tool_call_id"] = message.get("tool_call_id")
            if message.get("name") is not None:
                built["name"] = message.get("name")
            built_messages.append(built)
        return built_messages

    def _merge_tool_calls(self, accumulated: list[dict], incoming: list[dict]) -> list[dict]:
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

    def _tool_label(self, tool_name: str, file_path: Optional[str]) -> str:
        prefix = "Create" if tool_name == "file_write" else "Read"
        return f"{prefix}: {file_path or 'unknown'}"

    def _normalize_delta(self, text: str) -> str:
        return text.replace("\r\n", "\n")

    def _sse(self, event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"