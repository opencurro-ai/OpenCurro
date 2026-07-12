# Novita Sandbox Integration and File Tools

## Overview
This feature implements a sandbox abstraction with a Novita adapter, auto-creates a sandbox on first chat message, and exposes file read/write tools that operate only within the sandbox filesystem.

## Goals
- Create a Novita sandbox automatically on the first user turn.
- Keep sandbox lifecycle configurable for one hour.
- Execute file reads and overwrites inside the sandbox only.
- Power the right-side file explorer from `/home/user/` in the sandbox.

## Scope / non-goals
- In scope: sandbox provider interface, Novita adapter, filesystem tree API, read/write tools, template id and timeout wiring.
- Non-goals: browser automation in sandbox, terminal UI, arbitrary shell execution tools.

## User flows / UX / design notes
- Before first answer, chat shows `Creating sandbox...` animation.
- Once sandbox is ready, file explorer loads `/home/user/`.
- When the model reads or writes files, tool chips appear in chat.

## Functional requirements
- Sandbox service interface must support create/connect, read file, write file, list directory tree, get metadata, and dispose.
- Novita adapter must use `novita-sandbox` Python SDK.
- Sandbox create call must use the Novita API key and optional template id from the request context.
- Sandbox timeout target is one hour with lifecycle configured for pause + auto resume when supported.
- File tools must validate absolute paths under `/home/user/` only.
- `file_write.py` and `file_read.py` must be created in `backend/src/agents/tools/` and expose exact tool schemas requested by the user.
- File read errors must return structured error data so the agent loop can continue.
- File explorer endpoint must fetch files rooted at `/home/user/` from the active sandbox.

## Data model / schema
- SandboxContext: provider, sandbox id, created_at, root_path, timeout_seconds.
- FileTreeNode: name, path, type, children optional, size optional, modified_time optional.
- ToolResult: ok, data optional, error optional.

## API contracts
- `POST /api/sandbox/create` optional helper endpoint.
- `GET /api/sandbox/files` returns recursive or shallow tree for `/home/user/`.
- Tool execution uses internal agent runtime, not public generic execution endpoint.

## Edge cases / failure modes
- Missing Novita key.
- Invalid template id.
- Sandbox paused/resume latency.
- Path traversal attempts.
- Binary content returned by file read.
- Large directory listings.

## Acceptance criteria
- First chat turn automatically provisions sandbox and continues the agent flow.
- File explorer can refresh and display `/home/user/` contents.
- Tool-based file reads and writes are executed in the sandbox and reflected in the file explorer.
- Path validation blocks access outside `/home/user/`.

## Test plan / test cases
- Unit test path guard helper.
- Unit test tool success and file-not-found error shape.
- Integration test sandbox service abstraction with mocked Novita SDK.
- Integration test explorer endpoint returns normalized tree.

## Implementation notes
- Wrap the SDK so future providers can implement the same protocol.
- Use structured result objects instead of raw exceptions whenever possible.
- Provide a refresh button in UI even if live updates are not available.

## Status / open questions
- Status: done
- Open questions: none.