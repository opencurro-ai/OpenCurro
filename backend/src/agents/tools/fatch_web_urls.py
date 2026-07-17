from __future__ import annotations

from typing import Any

from src.core.config import get_settings
from src.schemas.sandbox import ToolExecutionResult

FETCH_WEB_URLS_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "fatch_web_urls",
        "description": "Fetch and extract clean content from a single URL using Firecrawl. Use this to get the full content of a webpage beyond search snippets.",
        "parameters": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to fetch"
                }
            },
            "required": ["url"]
        }
    }
}


async def execute_fatch_web_urls(*, arguments: dict[str, Any], **kwargs) -> ToolExecutionResult:
    url = arguments.get("url", "")
    if not url:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_url", "message": "No URL provided."},
        )

    api_key = kwargs.get("firecrawl_api_key") or get_settings().firecrawl_api_key
    if not api_key:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_api_key", "message": "Firecrawl API key is not configured. Add it in Settings."},
        )

    try:
        from firecrawl.v1 import V1FirecrawlApp as FirecrawlApp
        app = FirecrawlApp(api_key=api_key)
        result = app.scrape_url(url, formats=["markdown"])

        content = ""
        fetched_url = url

        if hasattr(result, "markdown"):
            content = result.markdown or ""
        elif hasattr(result, "rawHtml"):
            content = result.rawHtml or ""
        if hasattr(result, "url"):
            fetched_url = result.url or url

        return ToolExecutionResult(
            ok=True,
            data={
                "url": fetched_url,
                "content": content,
            },
        )
    except ImportError:
        return ToolExecutionResult(
            ok=False,
            error={"code": "missing_dependency", "message": "Firecrawl package is not installed. Run: pip install firecrawl-py"},
        )
    except Exception as exc:
        return ToolExecutionResult(
            ok=False,
            error={"code": "fetch_failed", "message": str(exc), "url": url},
        )
