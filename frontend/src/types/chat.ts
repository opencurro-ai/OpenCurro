export type ChatRole = 'user' | 'assistant'

export type ProviderId = 'openrouter' | 'groq' | 'nvidia'

export interface ToolChip {
  id: string
  name: string
  label: string
  filePath?: string
  command?: string
  sessionName?: string
  path?: string
  ok?: boolean
  resultData?: Record<string, unknown>
}

export interface SubAgentEvent {
  type: 'sub_agent_token' | 'sub_agent_tool_call' | 'sub_agent_tool_result' | 'sub_agent_error'
  data: Record<string, unknown>
}

export interface SubAgentChip {
  id: string
  agent: string
  session: string
  task: string
  waitForOutput: boolean
  status: 'running' | 'waiting' | 'completed' | 'error'
  result?: string
  error?: string
  events: SubAgentEvent[]
}

export interface UiMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  status?: 'idle' | 'streaming' | 'error'
  toolChips?: ToolChip[]
  subAgentChips?: SubAgentChip[]
}

export interface BackendMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: Array<Record<string, unknown>>
  tool_call_id?: string
  name?: string
  metadata?: Record<string, unknown>
  timestamp?: string
}

export interface SandboxInfo {
  sandboxId: string
  provider: string
  rootPath: string
}

export interface ChatRecord {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: UiMessage[]
  modelHistory: BackendMessage[]
  eventHistory: Array<Record<string, unknown>>
  sandbox?: SandboxInfo
}