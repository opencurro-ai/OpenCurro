# Agent Runtime and Streaming Loop

## Overview
This feature implements the backend AI agent loop, native tool-calling orchestration, full in-memory conversation history retention for the active session, and token-by-token SSE streaming from FastAPI to the frontend.

## Goals
- Support real native tool calling using provider API `tools` parameter.
- Preserve every conversation event in order: user input, assistant text, assistant tool calls, tool results, and tool errors.
- Stream assistant tokens smoothly to the UI and stop/resume around tool execution.
- Enforce per-turn max iteration = 1000.

## Scope / non-goals
- In scope: agent session state, provider invocation, tool dispatch, SSE event schema, error handling.
- Non-goals: long-term server-side persistence across app restarts, vector memory, database storage.

## User flows / UX / design notes
- User sends a message.
- Frontend opens SSE stream.
- Backend emits status events such as thinking, creating sandbox, tool activity, iteration count, token deltas, and completion.
- If the model requests a tool call, text streaming pauses, tool activity chips appear, then text streaming resumes after tool results are added.

## Functional requirements
- Agent must accept system prompt, conversation history, provider choice, model id, and active sandbox context.
- Agent must pass `tools` on every provider request when tool calling is enabled.
- Agent must parse tool calls only from native API response payloads.
- Agent must execute tool calls sequentially with `parallel_tool_calls=false` for predictable sandbox mutations.
- Agent must append assistant tool-call message and tool-result message to memory before resuming the model.
- Agent must expose SSE events for `status`, `thinking`, `sandbox`, `tool_call`, `tool_result`, `token`, `message_complete`, `error`, and `done`.
- Agent file must include: `import json`, `import re`, `import asyncio`, and `from typing import AsyncGenerator, Optional, Callable`.

## Data model / schema
- ChatSession: session id, selected provider, selected model, sandbox id, iteration count, messages.
- AgentMessage: role, content, tool_calls optional, tool_call_id optional, event metadata.
- SSEEvent: event name, data payload.

## API contracts
- `POST /api/providers/models`: returns available models for a provider using the provided API key.
- `GET /api/chat/stream`: SSE endpoint for a chat turn. Query carries session/chat id; POST alternative acceptable if implemented with fetch streaming bridge.
- `POST /api/chat/session`: creates or rehydrates a backend session.

## Edge cases / failure modes
- Invalid API key.
- Unsupported model.
- Provider returns malformed tool arguments.
- Tool points outside `/home/user/`.
- File missing.
- Sandbox creation fails.
- Provider stream disconnect mid-turn.
- Iteration limit reached.

## Acceptance criteria
- A turn with no tool calls streams token deltas progressively and completes cleanly.
- A turn with tool calls shows tool activity, executes tools, and resumes answer generation.
- All events remain in session memory in exact order.
- Max iteration counter resets on each new user message.

## Test plan / test cases
- Unit test tool-call loop with fake provider response.
- Unit test iteration limit stop.
- Unit test path validation.
- Integration test streaming endpoint emits ordered SSE events.
- Integration test tool error recovery produces structured error tool result.

## Implementation notes
- Use an async generator to yield SSE events.
- Maintain an accumulator for streamed assistant content across multiple provider calls in a single turn.
- Use provider adapters to normalize OpenAI-compatible responses.

## Status / open questions
- Status: done
- Open questions: none blocking.