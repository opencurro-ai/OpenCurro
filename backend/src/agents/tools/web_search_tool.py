from __future__ import annotations

from typing import Any

from src.core.config import get_settings
from src.schemas.sandbox import ToolExecutionResult

MAX_SEARCH_RESULTS = 15

WEB_SEARCH_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web using Tavily for up-to-date information, news, and general knowledge. Returns up to 15 results with titles, URLs, and descriptions.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                }
            },
            "required": ["query"]
        }
    }
}


async def execute_web_search(*, arguments: dict[str, Any], **kwargs) -> ToolExecutionResult:
    query = arguments.get("query", "")
    if not query:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_query", "message": "No search query provided."},
        )

    api_key = kwargs.get("tavily_api_key") or get_settings().tavily_api_key
    if not api_key:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_api_key", "message": "Tavily API key is not configured. Add it in Settings."},
        )

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=api_key)
        response = client.search(query=query, max_results=MAX_SEARCH_RESULTS)
        raw_results = response.get("results", []) if isinstance(response, dict) else []

        formatted: list[dict[str, str]] = []
        for item in raw_results:
            formatted.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "Description": item.get("content", item.get("description", "")),
            })

        return ToolExecutionResult(
            ok=True,
            data={
                "query": query,
                "results": formatted,
                "result_count": len(formatted),
            },
        )
    except ImportError:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_dependency", "message": "Tavily package is not installed. Run: pip install tavily-python"},
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={"code": "web_search_failed", "message": str(exc)},
        )
