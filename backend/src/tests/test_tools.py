import asyncio

from src.agents.tools.file_read import execute_file_read
from src.agents.tools.file_write import execute_file_write


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