import asyncio
import json
from datetime import datetime

from src.agents.agent import AgentRunner
from src.agents.providers.base import ProviderStreamDelta
from src.agents.sandbox.base import SandboxContext
from src.agents.tools.call_sub_agent import execute_call_sub_agent
from src.schemas.chat import ChatStreamRequest
from src.schemas.providers import ProviderMetadata
from src.schemas.sandbox import SandboxSettings
from src.services.session_store import SessionStore


class FakeStreamingProvider:
    metadata = ProviderMetadata(
        id="openrouter",
        label="OpenRouter",
        default_base_url="https://example.com",
        supports_tools=True,
        supports_streaming=True,
    )

    def __init__(self) -> None:
        self.calls = 0

    async def list_models(self, api_key: str, base_url: str | None = None) -> list:
        return []

    async def stream_chat_completion(self, **kwargs):
        self.calls += 1
        if self.calls == 1:
            yield ProviderStreamDelta(
                tool_calls=[
                    {
                        "index": 0,
                        "id": "tool-1",
                        "type": "function",
                        "function": {
                            "name": "call_sub_agent",
                            "arguments": json.dumps(
                                {
                                    "session": "research",
                                    "agent": "deepexplorer",
                                    "task": "Inspect the repository",
                                    "wait_for_output": False,
                                }
                            ),
                        },
                    }
                ],
                finish_reason="tool_calls",
            )
            return

        yield ProviderStreamDelta(text="Background review launched.")
        yield ProviderStreamDelta(finish_reason="stop")


class FakeProviderRegistry:
    def __init__(self, provider: FakeStreamingProvider) -> None:
        self.provider = provider

    def get(self, provider_name: str) -> FakeStreamingProvider:
        return self.provider


class FakeSandboxAdapter:
    async def create(self, settings: SandboxSettings) -> SandboxContext:
        return SandboxContext(
            sandbox_id="sandbox-1",
            provider="novita",
            root_path="/home/user",
            created_at=datetime.utcnow(),
            timeout_seconds=settings.timeout_seconds,
            template_id=settings.template_id,
            client=object(),
        )


class FakeSandboxRegistry:
    def __init__(self) -> None:
        self.adapter = FakeSandboxAdapter()

    def get(self, provider_name: str) -> FakeSandboxAdapter:
        return self.adapter


class FakeSubAgentRunner:
    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs

    async def run(self, messages, on_event=None) -> dict:
        if on_event:
            await on_event("sub_agent_token", {"value": "Inspecting files..."})
        await asyncio.sleep(0)
        return {
            "result": "Sub-agent completed.",
            "messages": messages + [{"role": "assistant", "content": "Sub-agent completed."}],
        }


class FakeToolRegistry:
    schemas = []

    async def execute(self, tool_name: str, arguments: str, **extra_kwargs):
        if tool_name != "call_sub_agent":
            raise AssertionError(f"Unexpected tool: {tool_name}")
        result = await execute_call_sub_agent(
            arguments=json.loads(arguments),
            runner_factory=FakeSubAgentRunner,
            **extra_kwargs,
        )
        return result.model_dump(exclude_none=True)


def _parse_sse_event_names(chunks: list[str]) -> list[str]:
    events: list[str] = []
    for chunk in chunks:
        for line in chunk.splitlines():
            if line.startswith("event: "):
                events.append(line.split(": ", 1)[1])
    return events


def test_stream_turn_keeps_sse_open_for_background_sub_agent_events() -> None:
    async def run() -> None:
        provider = FakeStreamingProvider()
        runner = AgentRunner(
            provider_registry=FakeProviderRegistry(provider),
            sandbox_registry=FakeSandboxRegistry(),
            tool_registry=FakeToolRegistry(),
            session_store=SessionStore(),
        )

        request = ChatStreamRequest(
            chat_id="chat-runtime",
            user_message="Inspect the repo with the sub-agent.",
            history=[],
            provider="openrouter",
            model="fake-model",
            api_key="fake-key",
            sandbox={
                "api_key": "sandbox-key",
                "provider": "novita",
                "timeout_seconds": 3600,
            },
            max_iterations=10,
        )

        chunks = [chunk async for chunk in runner.stream_turn(request)]
        event_names = _parse_sse_event_names(chunks)

        assert "sub_agent_start" in event_names
        assert "sub_agent_token" in event_names
        assert "sub_agent_result" in event_names
        assert event_names.index("sub_agent_result") < event_names.index("done")
        assert "message_complete" in event_names

    asyncio.run(run())