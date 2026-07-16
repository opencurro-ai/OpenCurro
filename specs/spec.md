# Novita Agent Studio Spec

## Project overview
A production-grade web application for running an autonomous file-capable AI agent inside a Novita sandbox. The product combines a React + Vite frontend and a FastAPI backend. Users add provider API keys from the UI, choose a model from OpenRouter, Groq, or NVIDIA NIM, and chat with an agent that can natively call file tools to read and overwrite files inside the active Novita sandbox under `/home/user/`.

## Goals
- Deliver a real agent loop with native LLM tool calling.
- Persist full chat history on the backend for each active chat session without truncation, including tool calls and tool results.
- Persist chat summaries and client-visible chat history in browser Local Storage.
- Provide smooth token-by-token SSE streaming that pauses during tool execution and resumes after tool results.
- Create sandboxes automatically on the first user message and route all file operations into the created sandbox.
- Provide a responsive chat workspace with sidebar history, settings modal, provider/model controls, iteration indicator, and sandbox file explorer.
- Keep the architecture extensible for future LLM providers and future sandbox providers.

## Design direction
- Dark, high-contrast workstation aesthetic with editorial typography and subtle neon accents.
- Left-dominant conversational workspace; right-side file explorer panel.
- AI responses displayed as flowing prose without bubble chrome; user messages appear in cards.
- Minimal tool activity chips and polished loading states for thinking, sandbox creation, and tool activity.

## Technical stack decisions
- Frontend: React 19, Vite, TypeScript, Zustand, Tailwind CSS v4.
- Backend: Python 3 with FastAPI, asyncio, uvicorn, pydantic, httpx, python-dotenv.
- Persistence: Browser Local Storage for chat list, settings, selected chat metadata, and UI state. No database.
- Streaming: Server-Sent Events from FastAPI to frontend.
- LLM integration: OpenAI-compatible provider adapters for OpenRouter, Groq, and NVIDIA NIM.
- Sandbox integration: Provider abstraction with a Novita sandbox implementation using `novita-sandbox`.

## Architecture rules
- The backend owns the real agent loop, tool execution, sandbox lifecycle, and SSE streaming.
- The LLM must receive tool definitions through the provider `tools` parameter. Tool use must come from native provider responses, never text simulation.
- The backend must append all user messages, assistant content, assistant tool call messages, tool outputs, and tool failures to session memory in order.
- Max iteration per user message is 1000 and resets for each new submitted user message.
- Sandbox creation is required before the first agent turn can proceed.
- All file tools are restricted to absolute paths under `/home/user/` inside the sandbox.
- Frontend backend URL must come from `frontend/.env` only.
- New providers and sandbox adapters must be pluggable through registry abstractions rather than hardcoded branching in UI code.

## Feature list
| Feature | Status | Spec |
| --- | --- | --- |
| Agent runtime and streaming loop | done | `specs/agent-runtime/document.md` |
| Provider management and model discovery | done | `specs/provider-management/document.md` |
| Novita sandbox integration and file tools | done | `specs/sandbox-integration/document.md` |
| Frontend chat workspace and local persistence | done | `specs/frontend-workspace/document.md` |

## Notes from research
- OpenRouter exposes an OpenAI-compatible chat completions API at `https://openrouter.ai/api/v1/chat/completions`, supports `tools`, requires keeping `tools` on tool-result follow-up calls, and streams via SSE.
- Groq exposes an OpenAI-compatible base URL `https://api.groq.com/openai/v1`, supports native `tools`, `tool_choice`, `parallel_tool_calls`, and `GET /models`.
- NVIDIA NIM exposes OpenAI-compatible `/v1/chat/completions` and `/v1/models`; cloud usage commonly targets `https://integrate.api.nvidia.com/v1`.
- Novita sandbox Python SDK supports `Sandbox.create(...)`, lifecycle timeout/pause options, `sandbox.files.list`, `sandbox.files.read`, `sandbox.files.write`, `sandbox.files.get_info`, and `sandbox.kill()`.
- Novita lifecycle supports a one-hour timeout with pause/auto-resume behavior, making sandbox reuse practical for longer chats.

## Implementation sequencing
1. Define provider, sandbox, agent, and schema contracts.
2. Implement Novita sandbox adapter and file tools.
3. Implement agent loop with SSE streaming and tool interruption/resume.
4. Implement provider/model endpoints and settings flow.
5. Build frontend workspace and wire live streaming.
6. Validate lint, build, backend tests, and browser behavior.

## Status