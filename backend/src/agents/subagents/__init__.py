from __future__ import annotations

from typing import Any

SUBAGENT_REGISTRY: dict[str, dict[str, Any]] = {}


def register_subagent(
    name: str,
    *,
    system_prompt: str,
    allowed_tools: list[dict[str, Any]],
    run_func,
) -> None:
    SUBAGENT_REGISTRY[name] = {
        "system_prompt": system_prompt,
        "allowed_tools": allowed_tools,
        "run": run_func,
    }


def get_subagent(name: str) -> dict[str, Any] | None:
    return SUBAGENT_REGISTRY.get(name)
