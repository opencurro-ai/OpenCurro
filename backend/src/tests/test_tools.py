import asyncio

from src.agents.tools.file_read import execute_file_read
from src.agents.tools.file_write import execute_file_write
from src.agents.tools.shall_tool import execute_shall_tool


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
