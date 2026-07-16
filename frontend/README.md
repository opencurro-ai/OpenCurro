<div align="center">

# 🎨 OpenCurro Frontend

<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Zustand-5-amber&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/shadcn/ui-New_York-000" />

<br />
<br />

<strong>React 19 + Vite + TypeScript frontend for the OpenCurro autonomous AI agent workspace.</strong>
<br />
<em>Streaming chat UI, sandbox file explorer, provider/model management, and Local Storage persistence.</em>

</div>

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Component Tree](#-component-tree)
- [State Management](#-state-management)
- [Data Flow](#-data-flow)
- [API Client](#-api-client)
- [SSE Streaming](#-sse-streaming)
- [Theme & Styling](#-theme--styling)
- [Mobile Layout](#-mobile-layout)
- [Type System](#-type-system)

---

## 🏗 Architecture

```
App.tsx (Root Layout)
├── HistorySidebar     — Chat history list
├── ChatWorkspace      — Main chat panel
│   ├── Composer       — Input + send
│   ├── Message list
│   │   ├── User bubble
│   │   ├── Assistant block
│   │   ├── ToolChips  — TerminalOutput, ListFilesOutput
│   │   └── SubAgentOutput (modal)
├── FileExplorer       — Sandbox file tree
│   └── FileViewer     — Inline code editor
└── SettingsModal      — API keys, providers, models

Stores (Zustand + LocalStorage)
├── useChatStore       — Chats, messages, tools, streaming
└── useSettingsStore   — API keys, provider, model selection

Hooks
├── useAgentChat       — SSE orchestrator
└── useProviders       — Model fetching

Lib
├── api.ts             — REST + SSE client
├── env.ts             — Backend URL
└── cn()               — Class merge
```

---

## 📁 Project Structure

```
frontend/
├── public/
│   └── _redirects                        # SPA fallback
├── src/
│   ├── main.tsx                          # React entry point
│   ├── App.tsx                           # Root layout, tabs, overlays
│   ├── index.css                         # Tailwind v4 + theme
│   ├── vite-env.d.ts                     # Vite env types
│   │
│   ├── app/routes/
│   │   └── route.ts                      # Route constants
│   │
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWorkspace.tsx         # Message list + composer
│   │   │   ├── Composer.tsx              # Textarea + send button
│   │   │   ├── HistorySidebar.tsx        # Chat history
│   │   │   └── SubAgentOutput.tsx        # Sub-agent modal
│   │   ├── files/
│   │   │   ├── FileExplorer.tsx          # File tree
│   │   │   └── FileViewer.tsx            # Code viewer/editor
│   │   ├── settings/
│   │   │   └── SettingsModal.tsx         # Configuration
│   │   └── ui/
│   │       └── button.tsx                # shadcn/ui Button
│   │
│   ├── hooks/
│   │   ├── useAgentChat.ts               # SSE orchestrator
│   │   └── useProviders.ts               # Provider model fetcher
│   │
│   ├── lib/
│   │   ├── api.ts                        # REST + SSE streaming
│   │   ├── env.ts                        # VITE_BACKEND_URL
│   │   └── utils.ts                      # cn() utility
│   │
│   ├── store/
│   │   ├── useChatStore.ts               # Chat state (persisted)
│   │   └── useSettingsStore.ts           # Settings (persisted)
│   │
│   ├── types/
│   │   ├── chat.ts                       # ChatRecord, UiMessage, ToolChip
│   │   ├── provider.ts                   # ProviderMetadata, ProviderModel
│   │   └── sandbox.ts                    # FileTreeNode, SandboxFilesResponse
│   │
│   └── utils/
│       └── id.ts                         # createId()
│
├── .env                                   # VITE_BACKEND_URL
├── vite.config.ts                         # Vite + proxy + Tailwind
├── tsconfig*.json                         # TypeScript config
├── eslint.config.js                       # ESLint flat config
├── components.json                        # shadcn/ui config
├── package.json
└── bun.lock / package-lock.json
```

---

## 🚀 Getting Started

```bash
cd frontend
npm install        # or: bun install
npm run dev        # or: bun run dev
```

Dev server: `http://localhost:5173` (Vite proxies `/api` → `http://localhost:8000`)

### Environment (`frontend/.env`)

```env
VITE_BACKEND_URL=    # Empty = Vite proxy; set to http://localhost:8000 for standalone
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint over all source files |
| `npm run preview` | Preview production build |

### Dependencies

| Package | Purpose |
|---------|---------|
| `react` 19, `react-dom` 19 | UI framework |
| `zustand` 5 | State management + LocalStorage persist |
| `tailwindcss` 4, `@tailwindcss/vite` | Utility-first CSS |
| `clsx` + `tailwind-merge` | Class merging (`cn()`) |
| `class-variance-authority` | Component variants (shadcn) |
| `@radix-ui/react-slot` | Polymorphic components (shadcn) |
| `lucide-react` | Icon library |

---

## 🧩 Component Tree

### App.tsx — Root Layout

**Desktop** (md+): Two-column grid — chat (40%, `minmax(360px,40%)`) | file explorer (1fr)

**Mobile**: Single column with bottom tab bar (Chat / Files)

**Overlays**: SettingsModal (fixed center), HistorySidebar (slide-in left)

Auto-creates initial chat on first load (`useEffect` in `App.tsx:34`).

### ChatWorkspace (`components/chat/ChatWorkspace.tsx`)

```
┌─────────────────────────────────┐
│ [Menu] [A] Chat Title  [⚙️]    │ ← Header
├─────────────────────────────────┤
│ User Message (bubble)          │
│                                 │
│ Curro AI                        │ ← Assistant block
│   response text...              │
│   [Terminal: npm install] ▼     │ ← Tool chips (collapsible)
│   [Create: /src/App.tsx]        │ ← Inline tool chips
│   [deepexplorer] ✓              │ ← Sub-agent chip
│                                 │
│ Curro AI                        │
│   more response...              │
├─────────────────────────────────┤
│ Iteration 3/1000          Stop  │ ← Iteration pill
│ ⚠️ Configure API keys...        │ ← Warning banner
│ ┌─────────────────────────┐     │
│ │ Ask Curro to build...   │     │ ← Composer textarea
│ │                    [➤]  │     │
│ └─────────────────────────┘     │
└─────────────────────────────────┘
```

**TerminalOutput** — Collapsible card for `shall_tool`:
- Header: Terminal icon + command + session name + status pill
- Body: stdout (green), stderr (red), exit code, PID

**ListFilesOutput** — Collapsible card for `list_files`:
- Header: Folder icon + path + status
- Body: File list with icons (📁 📄)

### Composer (`components/chat/Composer.tsx`)

Textarea that grows, iteration indicator pill, warning banner if not configured, send button with amber background.

### HistorySidebar (`components/chat/HistorySidebar.tsx`)

Slide-in overlay with chat list, new chat button, delete on hover, active highlight.

### SubAgentOutput (`components/chat/SubAgentOutput.tsx`)

Modal dialog showing:
- Sub-agent name + session ID
- Tools Used section (collapsible tool chips)
- Output section (monospace text, live streaming cursor)

### FileExplorer (`components/files/FileExplorer.tsx`)

```
┌─────────────────────────────────┐
│ 📁 Workspace Files       🔄     │ ← Header
├─────────────────────────────────┤
│ ▼ project/                      │ ← Tree nodes
│   ▶ src/                        │
│     📄 App.tsx                  │ ← Color-coded icons
│     📄 main.tsx                 │
│   📄 package.json               │
│   📄 tsconfig.json              │
│ ▶ node_modules/                 │
├─────────────────────────────────┤
│ (selected file opens below)     │
└─────────────────────────────────┘
```

**File icons color-coded**: `.ts/.tsx`=blue, `.py`=green, `.css`=pink, `.js/.jsx`=yellow, `.html`=red, other=gray.

### FileViewer (`components/files/FileViewer.tsx`)

```
┌─────────────────────────────────┐
│ 📄 App.tsx                  [✕] │ ← Tab
├─────────────────────────────────┤
│ project › src › App.tsx    Save │ ← Breadcrumb
├─────────────────────────────────┤
│  1 │ import React...            │ ← Line-numbered code
│  2 │                            │
│  3 │ function App() {           │
│  4 │   return <div>...</div>     │
│  5 │ }                          │
│ ... (editable textarea overlay) │
├─────────────────────────────────┤
│ Ln 1, Col 1  TypeScript  UTF-8 │ ← Footer
└─────────────────────────────────┘
```

Features: editable textarea overlaid on display (transparent text, visible caret), Save appears on modification.

### SettingsModal (`components/settings/SettingsModal.tsx`)

```
┌─────────────────────────────────┐
│ ⚙️ Settings                     │
│ Configure credentials & models  │
├─────────────────────────────────┤
│ API Configuration               │
│ ┌─ openrouter ──────────────┐   │
│ │ [API key input      ]     │   │
│ │ [Base URL input     ]     │   │
│ │              [Fetch modls]│   │
│ └───────────────────────────┘   │
│ ┌─ groq ───────────────────┐   │
│ │ ...                       │   │
│ └───────────────────────────┘   │
│ ┌─ nvidia ────────────────┐    │
│ │ ...                       │   │
│ └───────────────────────────┘   │
│                                 │
│ Novita Sandbox                  │
│ [API key input          ]       │
│ [Template ID (optional) ]       │
│                                 │
│ Active provider  [openrouter▼]  │
│ Model            [model-▼]      │
│                                 │
│ ⚠️ OpenRouter key required      │
│                     [Cancel] [Save Changes] │
└─────────────────────────────────┘
```

---

## 💾 State Management

### useChatStore (`store/useChatStore.ts`)

**Persisted** (Local Storage key: `novita-agent-chats`)

State:
- `chats: ChatRecord[]` — Full chat list with messages
- `activeChatId: string` — Currently selected chat
- `isStreaming`, `statusLabel`, `iterationCurrent`, `iterationLimit` — Transient UI state

Actions:
- `createChat()` / `deleteChat()` / `setActiveChat()`
- `addUserMessage()` / `startAssistantMessage()` / `appendAssistantToken()` / `finalizeAssistantMessage()` / `markAssistantError()`
- `addToolChip()` / `updateLastToolChip()`
- `addSubAgentChip()` / `appendSubAgentToken()` / `addSubAgentToolChip()` / `updateLastSubAgentToolChip()` / `updateSubAgentStatus()`
- `setSandboxInfo()` / `replaceModelHistory()` / `addEvent()`

Persistence: Only `chats` and `activeChatId` stored (via `partialize`). Transient state resets on reload.

### useSettingsStore (`store/useSettingsStore.ts`)

**Persisted** (Local Storage key: `novita-agent-settings`)

State:
- `providerKeys: Record<ProviderId, string>` — API keys per provider
- `providerBaseUrls: Record<ProviderId, string>` — Base URLs per provider
- `selectedProvider`, `selectedModel`
- `novitaApiKey`, `novitaTemplateId`
- `modelsByProvider: Record<ProviderId, ProviderModel[]>`

Persistence: All fields except `providerCatalog` (fetched on mount).

---

## 📊 Data Flow: User Sends a Message

```
1. User types in Composer → submits form
2. Composer calls onSendMessage(text)
3. App → handleSendMessage → useAgentChat.sendMessage(text)

4. sendMessage():
   a. Validates: provider key, model selected, Novita key
   b. addUserMessage(chatId, text) → Zustand → re-render
   c. startAssistantMessage(chatId) → empty "streaming" message
   d. ensureChatSession(chatId, history) → POST /api/chat/session
   e. streamChat(payload, onChunk) → POST /api/chat/stream

5. SSE events processed in onChunk callback:
   "status"       → setStatusLabel()
   "iteration"    → setIteration(current, limit)
   "sandbox"      → setSandboxInfo(chatId, {sandboxId, provider, rootPath})
   "tool_call"    → addToolChip(chatId, tool)
   "tool_result"  → updateLastToolChip(chatId, {ok, resultData})
   "token"        → appendAssistantToken(chatId, token) → UI re-render
   "message_complete" → finalizeAssistantMessage(chatId, content)
   "error"        → markAssistantError(chatId, message)
   "done"         → setStreaming(false)

6. Sub-agent events:
   "subagent_start"       → addSubAgentChip()
   "subagent_token"       → appendSubAgentToken()
   "subagent_tool_call"   → addSubAgentToolChip()
   "subagent_tool_result" → updateLastSubAgentToolChip()
   "subagent_complete"    → updateSubAgentStatus("completed")
   "subagent_error"       → updateSubAgentStatus("error", message)
```

---

## 🔌 API Client (`lib/api.ts`)

### Endpoints

```typescript
fetchProviders(): Promise<ProviderMetadata[]>
fetchModels(provider, apiKey, baseUrl?): Promise<ProviderModel[]>
ensureChatSession(chatId, history): Promise<void>
fetchSandboxFiles(chatId): Promise<SandboxFilesResponse>
fetchSandboxFileContent(chatId, filePath): Promise<string>
saveSandboxFileContent(chatId, filePath, content): Promise<void>
streamChat(payload, onChunk): Promise<void>   // SSE
```

### Backend URL (`lib/env.ts`)

```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
// Empty → relative URLs → Vite proxy handles
// Set → direct backend URL for production
```

### Vite Proxy (`vite.config.ts`)

```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true }
  }
}
```

---

## 📡 SSE Streaming

The SSE client uses raw `fetch` + `ReadableStream` — no external library:

```typescript
const response = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
const reader = response.body!.getReader();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  for (const raw of buffer.split('\n\n')) {
    // Parse "event:" and "data:" lines
    // JSON.parse(data) → onChunk(eventName, payload)
  }
}
```

---

## 🎨 Theme & Styling

### Custom Theme (`src/index.css`)

Warm, light theme with amber accent:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#f8f8f7` | Page bg |
| `--color-foreground` | `#34322d` | Text |
| `--color-primary` | `#ffc700` | Amber accent |
| `--color-border` | `#eeeeee` | Borders |
| `--font-sans` | Inter | UI |
| `--font-mono` | Fira Code | Code |

### Animations

- `fadeUp` — Modal entrance
- `blinkWave` — Thinking indicator (4 dots)
- `pulse` — Live dot / status glow

### Custom Scrollbar

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-thumb { background: rgba(52,50,45,0.12); border-radius: 999px; }
```

---

## 📱 Mobile Layout

**Bottom tab bar** (62px, visible below `md` breakpoint):

```
┌──────────────────────────┐
│  💬 Chat     📁 Files    │
└──────────────────────────┘
```

Active tab has amber background highlight. Full-width single column layout with tab switching.

---

## 📦 Type System

### `types/chat.ts`

```typescript
type ChatRole = 'user' | 'assistant'
type ProviderId = 'openrouter' | 'groq' | 'nvidia'

interface ToolChip { id, name, label, filePath?, command?, sessionName?, path?, ok?, resultData? }
interface SubAgentChip { id, session, agent, output, toolChips, status: 'running'|'completed'|'error', errorMessage? }
interface UiMessage { id, role, content, createdAt, status?, toolChips?, subAgentChips? }
interface BackendMessage { role, content?, tool_calls?, tool_call_id?, name?, metadata?, timestamp? }
interface SandboxInfo { sandboxId, provider, rootPath }
interface ChatRecord { id, title, createdAt, updatedAt, messages, modelHistory, eventHistory, sandbox? }
```

### `types/provider.ts`

```typescript
interface ProviderMetadata { id, label, default_base_url, supports_tools, supports_streaming }
interface ProviderModel { id, provider, label, owned_by?, supports_tools?, context_window? }
```

### `types/sandbox.ts`

```typescript
interface FileTreeNode { name, path, type: 'file'|'dir', size?, modified_time?, children? }
interface SandboxFilesResponse { path, tree, sandbox? }
```

---

## 🧪 Build & Lint

```bash
npm run build    # tsc -b && vite build
npm run lint     # ESLint over all source
```

---

<div align="center">
  <sub>Frontend for OpenCurro — Autonomous AI Agent Studio</sub>
</div>
