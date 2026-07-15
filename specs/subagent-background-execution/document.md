# Sub-agent Background Execution and Session Tracking

## Overview
This feature closes a bug in the `call_sub_agent` tool path where `wait_for_output=false` returned a started status without actually launching the sub-agent workflow. The fix must start the sub-agent asynchronously, preserve session history, surface start/result/error state safely, stream background sub-agent activity back through SSE, and avoid regressions in the synchronous execution path.

## Goals
- Ensure `call_sub_agent` really starts execution when `wait_for_output` is `false`.
- Keep synchronous `wait_for_output=true` behavior unchanged.
- Persist background execution state so later UI or backend flows can inspect status and results.
- Stream background sub-agent tokens, tool activity, and completion or error events to the frontend even when `wait_for_output=false`.
- Prevent unhandled background task exceptions from bubbling into runtime errors.

## Scope / non-goals
- In scope: backend sub-agent tool execution, session-store task bookkeeping, background SSE event forwarding, tests for background launch behavior, and frontend environment wiring for live backend connectivity.
- Non-goals: redesigning the entire sub-agent UX, adding a new polling API, or changing provider contracts.

## User flows / UX / design notes
- Main agent invokes `call_sub_agent` with `wait_for_output=false`.
- Frontend receives `sub_agent_start` immediately and should not show an error.
- Backend schedules the sub-agent in the background and records a running task.
- The active chat SSE stream continues to emit background sub-agent tokens, tool activity, and final result or error events while the turn is still open.
- When the background task finishes, the session store contains the final status, messages, and result or error details.

## Functional requirements
- The `call_sub_agent` tool must validate agent name, session name, and task before scheduling work.
- For background execution, the backend must create an asyncio task that runs the same sub-agent logic used by the synchronous path.
- Background completion must store status as `completed` or `error` and preserve emitted events.
- Background task failures must be caught and recorded without crashing the request handler.
- Session state for sub-agents must remain keyed by `chat_id` and sub-agent session name.
- Background execution for `call_sub_agent` must forward live `sub_agent_token`, `sub_agent_tool_call`, `sub_agent_tool_result`, and terminal completion or error events through the existing SSE channel.
- The active chat stream must not emit `done` before tracked background sub-agent streams for that turn have finished.
- Frontend `VITE_BACKEND_URL` must point to the exposed backend URL so the local UI can call the live backend.

## Data model / schema
- Sub-agent execution state: `status`, `session`, `agent`, `task`, `result`, `error`, `events`, and optional in-memory background task reference.
- Existing sub-agent message history remains a list of backend-formatted messages.

## API contracts
- No new HTTP endpoints are required for this bugfix.
- `call_sub_agent` tool result when `wait_for_output=false` returns `ok=true`, `data.status="started"`, plus identifying metadata.
- Existing SSE events remain compatible with current frontend handling, with an added `sub_agent_error` event for failures that happen after background launch.

## Edge cases / failure modes
- Unknown sub-agent name.
- Empty task payload.
- Background task raises provider, sandbox, or tool errors.
- Background task is scheduled without `chat_id`; it still must run without session persistence where feasible.
- Multiple background runs reuse the same sub-agent session name.

## Acceptance criteria
- A `call_sub_agent` invocation with `wait_for_output=false` creates a live asyncio task instead of returning early without execution.
- Background sub-agent activity is visible in the UI while the turn is still open.
- Background completion updates session tracking with result or error.
- The synchronous path still returns the full sub-agent result and messages.
- Backend tests cover both synchronous and background launch behavior.
- Frontend starts against a live backend URL from `frontend/.env` with no connection errors caused by misconfiguration.

## Test plan / test cases
- Unit test background `call_sub_agent` launch stores a running task and eventually marks completion.
- Unit test background task errors are captured as error state.
- Unit test background `call_sub_agent` emits live progress and terminal events when an event callback is supplied.
- Regression test synchronous `call_sub_agent` stores returned messages.
- Run backend pytest suite.
- Run frontend lint/build after environment configuration.

## Implementation notes
- Factor shared runner logic into a reusable coroutine so synchronous and background paths do not diverge.
- Add session-store helpers for sub-agent execution state and task registration/cleanup.
- Prefer done callbacks or wrapped coroutines that catch exceptions to avoid orphaned task warnings.

## Status / open questions
- Status: done
- Open questions: whether a later polling API is needed for richer background UX; not required for this fix.