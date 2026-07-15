import json
import re
import asyncio
from typing import Any, AsyncGenerator, Awaitable, Optional, Callable

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
        active_background_streams: list[dict[str, Any]] = []

        while iteration < request.max_iterations:
            for chunk in await self._collect_background_events(active_background_streams, send):
                yield chunk

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

                for chunk in await self._collect_background_events(active_background_streams, send):
                    yield chunk

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
                    command = tool_payload.get("command")
                    session_name = tool_payload.get("session_name") or tool_payload.get("session") or "default"
                    list_path = tool_payload.get("path")
                    yield await send(
                        "tool_call",
                        {
                            "name": tool_name,
                            "file_path": file_path,
                            "command": command,
                            "session_name": session_name,
                            "path": list_path,
                            "label": self._tool_label(tool_name, file_path, command, list_path),
                        },
                    )

                    if tool_name == "call_sub_agent":
                        yield await send(
                            "sub_agent_start",
                            {
                                "session": tool_payload.get("session"),
                                "agent": tool_payload.get("agent"),
                                "task": tool_payload.get("task"),
                                "wait_for_output": tool_payload.get("wait_for_output", True),
                            },
                        )

                    event_queue: asyncio.Queue = asyncio.Queue()

                    async def on_sub_agent_event(event: str, data: dict) -> None:
                        await event_queue.put((event, data))

                    tool_task = asyncio.create_task(
                        self.tool_registry.execute(
                            tool_name,
                            tool_args,
                            sandbox_adapter=sandbox_adapter,
                            sandbox_context=session.sandbox_context,
                            provider=provider,
                            model=request.model,
                            api_key=request.api_key,
                            base_url=request.base_url,
                            chat_id=request.chat_id,
                            session_store=self.session_store,
                            on_event=on_sub_agent_event,
                        )
                    )

                    while True:
                        get_task = asyncio.create_task(event_queue.get())
                        done, pending = await asyncio.wait(
                            [get_task, tool_task],
                            return_when=asyncio.FIRST_COMPLETED,
                        )

                        if tool_task in done:
                            if get_task in done:
                                event_type, event_data = get_task.result()
                                yield await send(event_type, event_data)
                            else:
                                get_task.cancel()
                            while not event_queue.empty():
                                event_type, event_data = event_queue.get_nowait()
                                yield await send(event_type, event_data)
                            result = tool_task.result()

                            if tool_name == "call_sub_agent":
                                background_state = self.session_store.get_sub_agent_execution(request.chat_id, session_name)
                                data = result.get("data", {})
                                if data.get("status") == "started" and background_state is not None and background_state.background_task is not None:
                                    active_background_streams.append(
                                        {
                                            "queue": event_queue,
                                            "task": background_state.background_task,
                                            "session": session_name,
                                            "agent": tool_payload.get("agent"),
                                        }
                                    )
                            break

                        event_type, event_data = get_task.result()
                        yield await send(event_type, event_data)

                        for chunk in await self._collect_background_events(active_background_streams, send):
                            yield chunk

                    session.messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.get("id"),
                            "name": tool_name,
                            "content": json.dumps(result),
                            "metadata": {"file_path": file_path},
                        }
                    )

                    if tool_name == "call_sub_agent":
                        data = result.get("data", {})
                        if data.get("status") != "started":
                            yield await send(
                                "sub_agent_result",
                                {
                                    "session": data.get("session"),
                                    "agent": data.get("agent"),
                                    "result": data.get("result"),
                                },
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

                    for chunk in await self._collect_background_events(active_background_streams, send):
                        yield chunk
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

            async for chunk in self._wait_for_background_streams(active_background_streams, send):
                yield chunk

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

    def _tool_label(self, tool_name: str, file_path: Optional[str], command: Optional[str] = None, list_path: Optional[str] = None) -> str:
        if tool_name == "call_sub_agent":
            return "Sub-agent task"
        if tool_name == "shall_tool":
            return f"Terminal: {command or 'unknown'}"
        if tool_name == "list_files":
            return f"List: {list_path or 'unknown'}"
        prefix = "Create" if tool_name == "file_write" else "Read"
        return f"{prefix}: {file_path or 'unknown'}"

    async def _collect_background_events(
        self,
        active_background_streams: list[dict[str, Any]],
        send: Callable[[str, dict], Awaitable[str]],
    ) -> list[str]:
        emitted: list[str] = []
        still_active: list[dict[str, Any]] = []

        for stream in active_background_streams:
            queue: asyncio.Queue = stream["queue"]
            task: asyncio.Task = stream["task"]

            while not queue.empty():
                event_type, event_data = queue.get_nowait()
                emitted.append(await send(event_type, event_data))

            if not task.done() or not queue.empty():
                still_active.append(stream)

        active_background_streams[:] = still_active
        return emitted

    async def _wait_for_background_streams(
        self,
        active_background_streams: list[dict[str, Any]],
        send: Callable[[str, dict], Awaitable[str]],
    ) -> AsyncGenerator[str, None]:
        while active_background_streams:
            emitted = await self._collect_background_events(active_background_streams, send)
            for chunk in emitted:
                yield chunk

            if not active_background_streams:
                break

            await asyncio.sleep(0.05)

    def _normalize_delta(self, text: str) -> str:
        return text.replace("\r\n", "\n")

    def _sse(self, event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"