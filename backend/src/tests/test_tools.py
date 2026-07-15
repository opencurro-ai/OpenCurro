import asyncio

from src.agents.tools.call_sub_agent import execute_call_sub_agent
from src.agents.tools.file_read import execute_file_read
from src.agents.tools.file_write import execute_file_write
from src.agents.tools.shall_tool import execute_shall_tool
from src.services.session_store import SessionStore


class FakeSandboxAdapter:
    def __init__(self) -> None:
        self.files: dict[str, str] = {}

    async def read_file(self, context, file_path: str) -> str:
        if file_path not in self.files:
            raise FileNotFoundError(file_path)
        return self.files[file_path]

    async def write_file(self, context, file_path: str, content: str):
        self.files[file_path] = content
        return {"path": file_path}

    async def run_command(self, context, command: str, timeout: int = 180, wait_for_output: bool = True) -> dict:
        return {
            "stdout": f"output of: {command}",
            "stderr": "",
            "exit_code": 0,
        }


class FakeSubAgentRunner:
    started = asyncio.Event()
    completed = asyncio.Event()
    should_fail = False

    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs

    async def run(self, messages, on_event=None) -> dict:
        type(self).started.set()
        if on_event:
            await on_event("sub_agent_token", {"value": "background work"})
        await asyncio.sleep(0)
        if type(self).should_fail:
            raise RuntimeError("runner exploded")
        type(self).completed.set()
        return {
            "result": "done",
            "messages": messages + [{"role": "assistant", "content": "done"}],
        }

    @classmethod
    def reset(cls) -> None:
        cls.started = asyncio.Event()
        cls.completed = asyncio.Event()
        cls.should_fail = False


def test_file_write_and_read_roundtrip() -> None:
    async def run() -> None:
        adapter = FakeSandboxAdapter()
        context = object()
        write_result = await execute_file_write(
            sandbox_adapter=adapter,
            sandbox_context=context,
            arguments={"file_path": "/home/user/test.py", "content": "print('x')\nprint('y')"},
        )
        assert write_result.ok is True

        read_result = await execute_file_read(
            sandbox_adapter=adapter,
            sandbox_context=context,
            arguments={"file_path": "/home/user/test.py"},
        )
        assert read_result.ok is True
        assert "print('x')" in read_result.data["content"]
        assert "     1\t" in read_result.data["content"]

    asyncio.run(run())


def test_shall_tool_returns_command_output() -> None:
    async def run() -> None:
        adapter = FakeSandboxAdapter()
        context = object()
        result = await execute_shall_tool(
            sandbox_adapter=adapter,
            sandbox_context=context,
            arguments={"session_name": "test", "command": "ls -la", "wait_for_output": True},
        )
        assert result.ok is True
        assert result.data["stdout"] == "output of: ls -la"
        assert result.data["exit_code"] == 0

    asyncio.run(run())


def test_shall_tool_missing_command() -> None:
    async def run() -> None:
        adapter = FakeSandboxAdapter()
        context = object()
        result = await execute_shall_tool(
            sandbox_adapter=adapter,
            sandbox_context=context,
            arguments={"session_name": "test", "command": ""},
        )
        assert result.ok is False
        assert result.error["code"] == "missing_command"

    asyncio.run(run())


def test_file_read_returns_structured_error() -> None:
    async def run() -> None:
        adapter = FakeSandboxAdapter()
        context = object()
        result = await execute_file_read(
            sandbox_adapter=adapter,
            sandbox_context=context,
            arguments={"file_path": "/home/user/missing.py"},
        )
        assert result.ok is False
        assert result.error["code"] == "file_read_failed"

    asyncio.run(run())


def test_call_sub_agent_wait_for_output_false_starts_background_task() -> None:
    async def run() -> None:
        FakeSubAgentRunner.reset()
        store = SessionStore()

        result = await execute_call_sub_agent(
            sandbox_adapter=FakeSandboxAdapter(),
            sandbox_context=object(),
            arguments={
                "session": "research",
                "agent": "deepexplorer",
                "task": "Inspect the repository",
                "wait_for_output": False,
            },
            provider=object(),
            model="fake-model",
            api_key="fake-key",
            base_url=None,
            chat_id="chat-1",
            session_store=store,
            runner_factory=FakeSubAgentRunner,
        )

        assert result.ok is True
        assert result.data["status"] == "started"

        state = store.get_sub_agent_execution("chat-1", "research")
        assert state is not None
        assert state.status == "running"
        assert state.background_task is not None
        background_task = state.background_task

        await asyncio.wait_for(FakeSubAgentRunner.started.wait(), timeout=1)
        await asyncio.wait_for(background_task, timeout=1)

        completed_state = store.get_sub_agent_execution("chat-1", "research")
        assert completed_state is not None
        assert completed_state.status == "completed"
        assert completed_state.result == "done"
        assert completed_state.background_task is None
        assert completed_state.events[0]["event"] == "sub_agent_token"
        assert store.get_sub_agent_messages("chat-1", "research")[-1]["content"] == "done"

    asyncio.run(run())


def test_call_sub_agent_wait_for_output_false_captures_background_errors() -> None:
    async def run() -> None:
        FakeSubAgentRunner.reset()
        FakeSubAgentRunner.should_fail = True
        store = SessionStore()

        result = await execute_call_sub_agent(
            sandbox_adapter=FakeSandboxAdapter(),
            sandbox_context=object(),
            arguments={
                "session": "research",
                "agent": "deepexplorer",
                "task": "Inspect the repository",
                "wait_for_output": False,
            },
            provider=object(),
            model="fake-model",
            api_key="fake-key",
            base_url=None,
            chat_id="chat-2",
            session_store=store,
            runner_factory=FakeSubAgentRunner,
        )

        assert result.ok is True
        state = store.get_sub_agent_execution("chat-2", "research")
        assert state is not None and state.background_task is not None
        background_task = state.background_task

        await asyncio.wait_for(FakeSubAgentRunner.started.wait(), timeout=1)
        await asyncio.wait_for(background_task, timeout=1)

        errored_state = store.get_sub_agent_execution("chat-2", "research")
        assert errored_state is not None
        assert errored_state.status == "error"
        assert errored_state.error is not None
        assert errored_state.error["code"] == "sub_agent_error"
        assert errored_state.background_task is None

    asyncio.run(run())


def test_call_sub_agent_wait_for_output_true_returns_result_and_stores_messages() -> None:
    async def run() -> None:
        FakeSubAgentRunner.reset()
        store = SessionStore()

        result = await execute_call_sub_agent(
            sandbox_adapter=FakeSandboxAdapter(),
            sandbox_context=object(),
            arguments={
                "session": "research",
                "agent": "deepexplorer",
                "task": "Inspect the repository",
            },
            provider=object(),
            model="fake-model",
            api_key="fake-key",
            base_url=None,
            chat_id="chat-3",
            session_store=store,
            runner_factory=FakeSubAgentRunner,
        )

        assert result.ok is True
        assert result.data["result"] == "done"
        state = store.get_sub_agent_execution("chat-3", "research")
        assert state is not None
        assert state.status == "completed"
        assert state.result == "done"
        assert store.get_sub_agent_messages("chat-3", "research")[-1]["content"] == "done"

    asyncio.run(run())