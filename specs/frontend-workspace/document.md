# Frontend Chat Workspace and Local Persistence

## Overview
This feature implements the user-facing React application: chat UI, history sidebar, settings modal, model controls, file explorer, and browser-local persistence.

## Goals
- Deliver a polished, responsive workstation interface.
- Persist settings and chat history in Local Storage.
- Stream assistant responses in real time from backend SSE.
- Surface minimal tool chips and status animations.

## Scope / non-goals
- In scope: responsive layout, Zustand stores, Local Storage syncing, SSE client, file explorer, settings modal.
- Non-goals: server-side auth, database-backed history sync.

## User flows / UX / design notes
- Left side contains history sidebar and active chat panel.
- Right side shows sandbox file explorer with refresh control.
- Top bar shows provider, model, iteration counter, and settings trigger.
- User messages use bubbles; AI responses are rendered as plain flowing text blocks.
- Thinking and sandbox creation states use animated shimmer labels.
- Tool activity chips display `Create: PATH` or `Read: PATH`.

## Functional requirements
- Chat history list must auto-name from the first user message.
- User can create, switch, and delete chats.
- All chat history metadata persists after refresh in Local Storage.
- Settings modal stores provider keys, Novita key, template id, and backend URL is read from `.env` only.
- Provider/model selector fetches models after key submission.
- File explorer refreshes from backend and renders a tree structure.
- Chat input is disabled until required settings exist; after first turn sandbox creation happens automatically.
- UI should show iteration count and reset per user message.

## Data model / schema
- Local chat summary: id, title, createdAt, updatedAt, messages.
- Chat message view model: id, role, content, tool chips, status, timestamp.
- Settings state: provider keys, selected provider, selected model, Novita key, Novita template id.

## API contracts
- Uses backend `/api/providers`, `/api/providers/models`, `/api/chat/session`, `/api/chat/stream`, `/api/sandbox/files`, `/health`.

## Edge cases / failure modes
- Missing keys/settings.
- SSE disconnect.
- No models available.
- Empty file explorer.
- Deleting active chat.

## Acceptance criteria
- UI is responsive on desktop and tablet widths.
- Refreshing the browser preserves chats and settings.
- Streaming visibly renders token-by-token output.
- Tool chips and status states are visible and understandable.

## Test plan / test cases
- Frontend build passes.
- ESLint passes.
- Manual verification of history persistence and model loading.
- Manual verification of file explorer refresh and streaming flow.

## Implementation notes
- Use Zustand with Local Storage middleware where appropriate.
- Keep app routing minimal but place route definitions under `src/app/routes/route.ts` per requirement.
- Use CSS variables and custom typography to avoid a generic aesthetic.

## Status / open questions
- Status: done
- Open questions: none.