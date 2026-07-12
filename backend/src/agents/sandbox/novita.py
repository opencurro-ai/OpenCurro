from __future__ import annotations

from datetime import datetime
from pathlib import PurePosixPath
from typing import Any

from novita_sandbox.code_interpreter import AsyncSandbox

from src.agents.sandbox.base import SandboxAdapter, SandboxContext, normalize_sandbox_path
from src.schemas.sandbox import FileInfoModel, FileTreeNode, SandboxSettings


class NovitaSandboxAdapter(SandboxAdapter):
    provider_name = "novita"

    async def create(self, settings: SandboxSettings) -> SandboxContext:
        sandbox = await AsyncSandbox.create(
            api_key=settings.api_key,
            template=settings.template_id,
            timeout=settings.timeout_seconds,
            auto_pause=True,
            metadata={"source": "novita-agent-studio"},
            lifecycle={"on_timeout": "pause", "auto_resume": True},
        )
        return SandboxContext(
            sandbox_id=sandbox.sandbox_id,
            provider=self.provider_name,
            root_path="/home/user",
            created_at=datetime.utcnow(),
            timeout_seconds=settings.timeout_seconds,
            template_id=settings.template_id,
            client=sandbox,
        )

    async def ensure_ready(self, context: SandboxContext) -> None:
        if hasattr(context.client, "set_timeout"):
            await context.client.set_timeout(context.timeout_seconds)

    async def read_file(self, context: SandboxContext, file_path: str) -> str:
        await self.ensure_ready(context)
        path = normalize_sandbox_path(file_path, context.root_path)
        content = await context.client.files.read(path, format="text")
        if isinstance(content, bytes):
            return content.decode("utf-8", errors="replace")
        return str(content)

    async def write_file(self, context: SandboxContext, file_path: str, content: str) -> dict[str, Any]:
        await self.ensure_ready(context)
        path = normalize_sandbox_path(file_path, context.root_path)
        await self._ensure_parent_dirs(context, path)
        result = await context.client.files.write(path, content)
        info = await context.client.files.get_info(path)
        return {
            "path": path,
            "result": self._serialize_object(result),
            "info": self._entry_to_info(info).model_dump(),
        }

    async def list_tree(self, context: SandboxContext, path: str, depth: int = 4) -> list[FileTreeNode]:
        await self.ensure_ready(context)
        safe_path = normalize_sandbox_path(path, context.root_path)
        entries = await context.client.files.list(safe_path, depth=depth)
        return self._build_tree(entries, safe_path)

    async def get_info(self, context: SandboxContext, path: str) -> FileInfoModel:
        await self.ensure_ready(context)
        safe_path = normalize_sandbox_path(path, context.root_path)
        info = await context.client.files.get_info(safe_path)
        return self._entry_to_info(info)

    async def dispose(self, context: SandboxContext) -> None:
        await context.client.kill()

    async def _ensure_parent_dirs(self, context: SandboxContext, file_path: str) -> None:
        current = PurePosixPath(file_path).parent
        root = PurePosixPath(context.root_path)
        to_create: list[PurePosixPath] = []
        while current != root and current != current.parent:
            to_create.append(current)
            current = current.parent
        for directory in reversed(to_create):
            try:
                await context.client.files.make_dir(str(directory))
            except Exception:
                # Directory may already exist; continue.
                continue

    def _build_tree(self, entries: list[Any], root_path: str) -> list[FileTreeNode]:
        node_map: dict[str, FileTreeNode] = {}
        for entry in entries:
            info = self._entry_to_info(entry)
            node_map[info.path] = FileTreeNode(
                name=info.name,
                path=info.path,
                type="dir" if info.type == "dir" else "file",
                size=info.size,
                modified_time=info.modified_time,
                children=[],
            )

        sorted_paths = sorted(node_map.keys(), key=lambda value: (value.count("/"), value))
        roots: list[FileTreeNode] = []
        for path in sorted_paths:
            node = node_map[path]
            parent_path = str(PurePosixPath(path).parent)
            if path == root_path:
                roots.append(node)
                continue
            parent = node_map.get(parent_path)
            if parent is not None and parent.type == "dir":
                parent.children.append(node)
            else:
                roots.append(node)

        if root_path in node_map:
            return node_map[root_path].children
        return roots

    def _entry_to_info(self, entry: Any) -> FileInfoModel:
        modified_time = getattr(entry, "modified_time", None)
        return FileInfoModel(
            name=getattr(entry, "name", ""),
            type=str(getattr(entry, "type", "file")).split(".")[-1].replace("'>", "").replace("'", "").lower(),
            path=getattr(entry, "path", ""),
            size=getattr(entry, "size", None),
            mode=getattr(entry, "mode", None),
            permissions=getattr(entry, "permissions", None),
            owner=getattr(entry, "owner", None),
            group=getattr(entry, "group", None),
            modified_time=modified_time.isoformat() if modified_time else None,
            symlink_target=getattr(entry, "symlink_target", None),
        )

    def _serialize_object(self, value: Any) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, dict):
            return {key: self._serialize_object(val) for key, val in value.items()}
        if isinstance(value, (list, tuple)):
            return [self._serialize_object(item) for item in value]
        if hasattr(value, "__dict__"):
            return {key: self._serialize_object(val) for key, val in value.__dict__.items() if not key.startswith("_")}
        return str(value)