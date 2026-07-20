from __future__ import annotations

from dataclasses import dataclass
from typing import Any, AsyncGenerator, Protocol, Optional

from src.schemas.providers import ProviderMetadata, ProviderModel


@dataclass
class ProviderStreamDelta:
    text: str = ""
    reasoning: str = ""
    tool_calls: list[dict[str, Any]] | None = None
    finish_reason: Optional[str] = None
    raw: Optional[dict[str, Any]] = None


class LLMProvider(Protocol):
    metadata: ProviderMetadata

    async def list_models(self, api_key: str, base_url: Optional[str] = None) -> list[ProviderModel]:
        ...

    async def stream_chat_completion(
        self,
        *,
        api_key: str,
        model: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        base_url: Optional[str] = None,
        temperature: float = 0.2,
    ) -> AsyncGenerator[ProviderStreamDelta, None]:
        ...