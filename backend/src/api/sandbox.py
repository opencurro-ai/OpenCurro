from fastapi import APIRouter, HTTPException, Query

from src.agents.sandbox.registry import SandboxRegistry
from src.schemas.sandbox import SandboxFilesResponse, SandboxSummary
from src.services.session_store import SessionStore


def build_sandbox_router(session_store: SessionStore, sandbox_registry: SandboxRegistry) -> APIRouter:
    router = APIRouter(prefix="/sandbox", tags=["sandbox"])

    @router.get("/files", response_model=SandboxFilesResponse)
    async def list_sandbox_files(
        chat_id: str = Query(...),
        path: str = Query("/home/user"),
        depth: int = Query(4, ge=1, le=8),
    ) -> SandboxFilesResponse:
        session = session_store.get(chat_id)
        if session is None or session.sandbox_context is None:
            raise HTTPException(status_code=404, detail="No active sandbox for this chat.")

        adapter = sandbox_registry.get(session.sandbox_context.provider)
        tree = await adapter.list_tree(session.sandbox_context, path=path, depth=depth)
        sandbox = SandboxSummary(
            sandbox_id=session.sandbox_context.sandbox_id,
            provider=session.sandbox_context.provider,
            root_path=session.sandbox_context.root_path,
            created_at=session.sandbox_context.created_at,
            timeout_seconds=session.sandbox_context.timeout_seconds,
            template_id=session.sandbox_context.template_id,
        )
        return SandboxFilesResponse(sandbox=sandbox, path=path, tree=tree)

    return router