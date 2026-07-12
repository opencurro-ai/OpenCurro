# Provider Management and Model Discovery

## Overview
This feature implements a provider abstraction for OpenRouter, Groq, and NVIDIA NIM, plus endpoints and frontend controls for API key entry and dynamic model discovery.

## Goals
- Support adding provider API keys from the UI.
- Fetch available models from each provider after key entry.
- Make it straightforward to add future OpenAI-compatible providers.

## Scope / non-goals
- In scope: provider registry, key validation by live API call, model list normalization, frontend settings UX.
- Non-goals: server-side encrypted secret storage, billing dashboards.

## User flows / UX / design notes
- User opens settings modal.
- User enters OpenRouter, Groq, NVIDIA NIM, and Novita API keys plus optional Novita template id.
- User clicks fetch models or saves settings.
- UI displays provider-specific model options for chat selection.

## Functional requirements
- Providers must expose a common interface: `list_models`, `stream_chat_completion`, `chat_completion` as needed.
- OpenRouter adapter uses base URL `https://openrouter.ai/api/v1`.
- Groq adapter uses base URL `https://api.groq.com/openai/v1`.
- NVIDIA NIM adapter defaults to `https://integrate.api.nvidia.com/v1` while allowing override later.
- Model list response should normalize to provider id, model id, label, context window if known, and tool-calling capability when inferable.
- Provider settings are stored in browser Local Storage and sent per request to backend.

## Data model / schema
- ProviderSettings: provider name, api key, enabled flag, optional base URL.
- ProviderModel: id, provider, label, owned_by optional, supports_tools optional.

## API contracts
- `POST /api/providers/models` with provider + api key -> normalized model list.
- `GET /api/providers` -> supported provider metadata.

## Edge cases / failure modes
- Missing API key.
- Invalid API key returns provider-specific error.
- Provider rate limits.
- Provider model endpoint partially succeeds or omits metadata.

## Acceptance criteria
- User can save provider keys locally.
- Backend can fetch models from all three providers.
- UI can switch providers/models without reload.
- Provider architecture allows adding a new provider without rewriting the agent core.

## Test plan / test cases
- Unit tests for provider normalization.
- Integration tests with mocked `/models` responses.
- Frontend store tests for settings persistence.

## Implementation notes
- Use httpx AsyncClient for list-model requests.
- Normalize OpenAI-compatible models endpoint responses.
- Avoid logging secrets.

## Status / open questions
- Status: done
- Open questions: none.