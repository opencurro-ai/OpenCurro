from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from src.agents.agent import AgentRunner
from src.schemas.chat import ChatSessionCreateRequest, ChatSessionResponse, ChatStreamRequest
from src.services.session_store import SessionStore


def build_chat_router(agent_runner: AgentRunner, session_store: SessionStore) -> APIRouter:
    router = APIRouter(prefix="/chat", tags=["chat"])

    @router.post("/session", response_model=ChatSessionResponse)
    async def create_or_hydrate_session(request: ChatSessionCreateRequest) -> ChatSessionResponse:
        try:
            session = session_store.upsert_history(request.chat_id, request.history)
            return ChatSessionResponse(
                chat_id=session.chat_id,
                message_count=len(session.messages),
                has_sandbox=session.sandbox_context is not None,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Session error: {exc}") from exc

    @router.post("/stream")
    async def stream_chat(request: ChatStreamRequest) -> StreamingResponse:
        try:
            generator = agent_runner.stream_turn(request)
            return StreamingResponse(generator, media_type="text/event-stream")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Stream start failed: {exc}") from exc

    return router