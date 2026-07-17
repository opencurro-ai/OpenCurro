from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from src.schemas.providers import ProviderType
from src.schemas.sandbox import SandboxSettings


MessageRole = Literal["system", "user", "assistant", "tool"]


class ChatMessage(BaseModel):
    role: MessageRole
    content: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatSessionCreateRequest(BaseModel):
    chat_id: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatSessionResponse(BaseModel):
    chat_id: str
    message_count: int
    has_sandbox: bool


class ChatStreamRequest(BaseModel):
    chat_id: str = Field(min_length=1)
    user_message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    provider: ProviderType
    model: str = Field(min_length=1)
    api_key: str = Field(min_length=1)
    base_url: Optional[str] = None
    sandbox: SandboxSettings
    max_iterations: int = Field(default=1000, ge=1, le=1000)
    tavily_api_key: Optional[str] = None
    firecrawl_api_key: Optional[str] = None


class SSEEvent(BaseModel):
    event: str
    data: dict[str, Any]