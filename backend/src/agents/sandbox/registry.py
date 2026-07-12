from src.agents.sandbox.base import SandboxAdapter
from src.agents.sandbox.novita import NovitaSandboxAdapter


class SandboxRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, SandboxAdapter] = {
            "novita": NovitaSandboxAdapter(),
        }

    def get(self, provider_name: str) -> SandboxAdapter:
        if provider_name not in self._providers:
            raise KeyError(f"Unsupported sandbox provider: {provider_name}")
        return self._providers[provider_name]