from fastapi import APIRouter, HTTPException

from src.agents.providers.registry import ProviderRegistry
from src.schemas.providers import ProviderMetadata, ProviderModelsRequest, ProviderModelsResponse


def build_provider_router(provider_registry: ProviderRegistry) -> APIRouter:
    router = APIRouter(prefix="/providers", tags=["providers"])

    @router.get("", response_model=list[ProviderMetadata])
    async def list_supported_providers() -> list[ProviderMetadata]:
        try:
            return provider_registry.list_supported()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to list providers: {exc}") from exc

    @router.post("/models", response_model=ProviderModelsResponse)
    async def list_models(request: ProviderModelsRequest) -> ProviderModelsResponse:
        try:
            provider = provider_registry.get(request.provider)
            models = await provider.list_models(request.api_key, request.base_url)
            return ProviderModelsResponse(provider=request.provider, models=models)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to fetch models: {exc}") from exc

    return router