from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from src.agents.agent import AgentRunner
from src.schemas.chat import ChatSessionCreateRequest, ChatSessionResponse, ChatStreamRequest
from src.services.session_store import SessionStore


def build_chat_router(agent_runner: AgentRunner, session_store: SessionStore) -> APIRouter:
    router = APIRouter(prefix="/chat", tags=["chat"])

    @router.post("/session", response_model=ChatSessionResponse)
    async def create_or_hydrate_session(request: ChatSessionCreateRequest) -> ChatSessionResponse:
        session = session_store.upsert_history(request.chat_id, request.history)
        return ChatSessionResponse(
            chat_id=session.chat_id,
            message_count=len(session.messages),
            has_sandbox=session.sandbox_context is not None,
        )

    @router.post("/stream")
    async def stream_chat(request: ChatStreamRequest) -> StreamingResponse:
        generator = agent_runner.stream_turn(request)
        return StreamingResponse(generator, media_type="text/event-stream")

    return router