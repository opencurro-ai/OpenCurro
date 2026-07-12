from fastapi import APIRouter, HTTPException

from src.agents.providers.registry import ProviderRegistry
from src.schemas.providers import ProviderMetadata, ProviderModelsRequest, ProviderModelsResponse


def build_provider_router(provider_registry: ProviderRegistry) -> APIRouter:
    router = APIRouter(prefix="/providers", tags=["providers"])

    @router.get("", response_model=list[ProviderMetadata])
    async def list_supported_providers() -> list[ProviderMetadata]:
        return provider_registry.list_supported()

    @router.post("/models", response_model=ProviderModelsResponse)
    async def list_models(request: ProviderModelsRequest) -> ProviderModelsResponse:
        provider = provider_registry.get(request.provider)
        try:
            models = await provider.list_models(request.api_key, request.base_url)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return ProviderModelsResponse(provider=request.provider, models=models)

    return router