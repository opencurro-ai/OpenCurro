from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import PurePosixPath
from typing import Protocol, Optional, Any

from src.schemas.sandbox import FileInfoModel, FileTreeNode, SandboxSettings


@dataclass
class SandboxContext:
    sandbox_id: str
    provider: str
    root_path: str
    created_at: datetime
    timeout_seconds: int
    template_id: Optional[str]
    client: Any


class SandboxAdapter(Protocol):
    provider_name: str

    async def create(self, settings: SandboxSettings) -> SandboxContext:
        ...

    async def read_file(self, context: SandboxContext, file_path: str) -> str:
        ...

    async def write_file(self, context: SandboxContext, file_path: str, content: str) -> dict[str, Any]:
        ...

    async def list_tree(self, context: SandboxContext, path: str, depth: int = 4) -> list[FileTreeNode]:
        ...

    async def get_info(self, context: SandboxContext, path: str) -> FileInfoModel:
        ...

    async def ensure_ready(self, context: SandboxContext) -> None:
        ...

    async def run_command(self, context: SandboxContext, command: str, timeout: int = 180, wait_for_output: bool = True) -> dict[str, Any]:
        ...

    async def dispose(self, context: SandboxContext) -> None:
        ...


def normalize_sandbox_path(file_path: str, root_path: str = "/home/user") -> str:
    path = PurePosixPath(file_path)
    root = PurePosixPath(root_path)
    if not path.is_absolute():
        raise ValueError("Path must be absolute.")
    if path == root:
        return str(path)
    if root not in path.parents:
        raise ValueError(f"Path must stay inside {root_path}.")
    return str(path)