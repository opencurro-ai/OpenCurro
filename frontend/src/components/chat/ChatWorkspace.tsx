import { useState } from 'react'
import { BrainCircuit, Eye, FolderOpen, Menu, Settings, Terminal } from 'lucide-react'

import { Composer } from '@/components/chat/Composer'
import { SubAgentOutput } from '@/components/chat/SubAgentOutput'
import type { ChatRecord, ToolChip } from '@/types/chat'

interface ChatWorkspaceProps {
  chat: ChatRecord
  disabled: boolean
  isStreaming: boolean
  iterationCurrent: number
  iterationLimit: number
  onSendMessage: (value: string) => Promise<void>
  onOpenSettings: () => void
  onToggleSidebar: () => void
  error?: string
}

function TerminalOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const commandData = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const stdout = commandData?.stdout as string | undefined
  const stderr = commandData?.stderr as string | undefined
  const exitCode = commandData?.exit_code as number | undefined
  const status = commandData?.status as string | undefined
  const pid = commandData?.pid as number | undefined
  const message = commandData?.message as string | undefined
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...'
    : status === 'started' ? 'started'
    : exitCode === 0 ? 'done'
    : exitCode !== undefined ? `exit ${exitCode}`
    : 'done'

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <Terminal className="size-[14px] shrink-0 text-[#858481]" />
        <span className="flex-1 truncate font-mono text-[13px]">
          {chip.label}
          {chip.sessionName ? <span className="ml-2 text-[11px] text-[#858481]">[{chip.sessionName}]</span> : null}
        </span>
        <span className={`shrink-0 text-[11px] ${isRunning ? 'animate-pulse text-[#858481]' : status === 'started' ? 'text-[#f97316]' : exitCode === 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4 font-mono text-[13px] leading-relaxed bg-[#f5f5f5]">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#858481]">
            <Terminal className="size-3" />
            <span>$ {chip.command || 'command'}</span>
            {chip.sessionName ? <span className="ml-auto text-[#858481]/60">session: {chip.sessionName}</span> : null}
          </div>
          {chip.ok !== undefined ? (
            <div className="space-y-1">
              {stdout ? <pre className="whitespace-pre-wrap text-[#059669]">{stdout}</pre> : null}
              {stderr ? <pre className="whitespace-pre-wrap text-[#dc2626]/80">{stderr}</pre> : null}
              {message ? <div className="text-[#34322d]/70">{message}</div> : null}
              {pid !== undefined ? <div className="text-[11px] text-[#858481]">PID: {pid}</div> : null}
              {exitCode !== undefined ? (
                <div className={`pt-1 text-[11px] ${exitCode === 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  Exit code: {exitCode}
                </div>
              ) : null}
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2 text-[#858481]">
              <span className="inline-block size-2 animate-pulse rounded-full bg-[#ffc700]" />
              Running...
            </div>
          ) : (
            <div className="text-[#858481]">No output</div>
          )}
        </div>
      )}
    </div>
  )
}

function ListFilesOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const items = data?.items as Array<{ name: string; type: string; path: string; size?: number | null }> | undefined
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...' : chip.ok ? 'done' : 'error'

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <FolderOpen className="size-[14px] shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[13px]">
          {chip.label}
        </span>
        <span className={`shrink-0 text-[11px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4 font-mono text-[13px] leading-relaxed bg-[#f5f5f5]">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#858481]">
            <FolderOpen className="size-3" />
            <span>{chip.path || 'directory'}</span>
          </div>
          {items ? (
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.path} className="flex items-center gap-2 text-[13px]">
                  <span className={`shrink-0 ${item.type === 'dir' ? 'text-[#f59e0b]' : 'text-[#858481]'}`}>
                    {item.type === 'dir' ? '📁' : '📄'}
                  </span>
                  <span className="text-[#34322d]">{item.name}</span>
                  {item.type === 'file' && item.size != null ? (
                    <span className="ml-auto text-[11px] text-[#858481]">{item.size} B</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : chip.ok === false ? (
            <div className="text-[#ef4444]">Failed to list directory</div>
          ) : (
            <div className="text-[#858481]">No files found</div>
          )}
        </div>
      )}
    </div>
  )
}

function WebSearchOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const results = data?.results as Array<{ title: string; url: string; Description: string }> | undefined
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...' : chip.ok ? 'done' : 'error'

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-[#858481]" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="flex-1 truncate text-[13px]">
          {chip.label}
          {chip.query ? <span className="ml-2 text-[11px] text-[#858481]">"{chip.query}"</span> : null}
        </span>
        <span className={`shrink-0 text-[11px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
        {results && results.length > 0 ? <span className="shrink-0 text-[10px] text-[#858481] ml-2">{results.length} results</span> : null}
      </button>
      {isOpen && results && results.length > 0 ? (
        <div className="border-t border-border p-3 space-y-2 bg-[#f5f5f5]">
          {results.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block rounded-[12px] bg-white border border-border p-3 hover:shadow-sm transition-shadow">
              <div className="text-[13px] font-semibold text-[#34322d] mb-1">{r.title}</div>
              <div className="text-[11px] text-[#858481] mb-1 line-clamp-2">{r.Description}</div>
              <div className="text-[10px] text-[#3b82f6] truncate">{r.url}</div>
            </a>
          ))}
        </div>
      ) : isOpen && chip.ok === false ? (
        <div className="border-t border-border p-4 text-[#ef4444] text-[13px] bg-[#f5f5f5]">Search failed</div>
      ) : null}
    </div>
  )
}

function FetchWebOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const content = data?.content as string | undefined
  const url = data?.url as string | undefined
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...' : chip.ok ? 'done' : 'error'
  const displayContent = content ? (content.length > 4000 ? content.slice(0, 4000) + '...' : content) : ''

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-[#858481]" strokeWidth={1.8}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span className="flex-1 truncate text-[13px]">
          {chip.label}
          {url ? <span className="ml-2 text-[11px] text-[#858481] font-mono truncate">{url}</span> : null}
        </span>
        <span className={`shrink-0 text-[11px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && displayContent ? (
        <div className="border-t border-border p-4 font-mono text-[12px] leading-relaxed bg-[#f5f5f5] max-h-[400px] overflow-auto">
          <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-wider text-[#858481]">
            <svg viewBox="0 0 24 24" className="size-3" strokeWidth={1.8}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Fetched content</span>
            {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[#3b82f6] underline truncate max-w-[200px]">{url}</a> : null}
          </div>
          <pre className="whitespace-pre-wrap text-[#34322d]">{displayContent}</pre>
        </div>
      ) : isOpen && chip.ok === false ? (
        <div className="border-t border-border p-4 text-[#ef4444] text-[13px] bg-[#f5f5f5]">Fetch failed</div>
      ) : null}
    </div>
  )
}

function ShellViewOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const sessions = data?.sessions as Array<{ session_name: string; status: string; output: string }> | undefined
  const isRunning = chip.ok === undefined
  const hasRunning = sessions?.some((s) => s.status === 'running') ?? false

  const statusLabel = isRunning || hasRunning ? 'running...' : 'done'

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <Eye className="size-[14px] shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[13px]">
          {chip.label}
        </span>
        <span className={`shrink-0 text-[11px] ${(isRunning || hasRunning) ? 'animate-pulse text-[#858481]' : 'text-[#22c55e]'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4 font-mono text-[13px] leading-relaxed bg-[#f5f5f5]">
          {sessions && sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.session_name}>
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-[#858481]">
                    <Eye className="size-3" />
                    <span className="font-semibold">{session.session_name}</span>
                    <span className={`ml-auto ${session.status === 'running' ? 'text-[#f97316]' : 'text-[#22c55e]'}`}>
                      {session.status}
                    </span>
                  </div>
                  {session.output ? (
                    <pre className="whitespace-pre-wrap text-[#34322d] bg-white rounded-lg p-3 border border-border text-[12px]">{session.output}</pre>
                  ) : (
                    <div className="text-[#858481] text-[12px]">No output yet</div>
                  )}
                </div>
              ))}
            </div>
          ) : chip.ok === false ? (
            <div className="text-[#ef4444]">Failed to view shell output</div>
          ) : (
            <div className="text-[#858481]">Awaiting output...</div>
          )}
        </div>
      )}
    </div>
  )
}

function StrReplaceOutput({ chip, isOpen, onToggle }: { chip: ToolChip; isOpen: boolean; onToggle: () => void }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const oldString = chip.oldString ?? (data?.old_string as string | undefined)
  const newString = chip.newString ?? (data?.new_string as string | undefined)
  const occurrences = data?.occurrences as number | undefined
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...' : chip.ok ? 'done' : 'error'

  return (
    <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(55,53,47,0.04)] ${chip.ok === false ? 'text-[#ef4444]' : 'text-[#34322d]'}`}
      >
        <svg viewBox="0 0 24 24" className="size-[14px] shrink-0 text-[#858481]" strokeWidth={1.8} fill="none" stroke="currentColor">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span className="flex-1 truncate text-[13px]">
          {chip.label}
        </span>
        <span className={`shrink-0 text-[11px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border p-4 font-mono text-[13px] leading-relaxed bg-[#f5f5f5] space-y-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#858481]">
              <svg viewBox="0 0 24 24" className="size-3" strokeWidth={1.8} fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Old string</span>
            </div>
            <pre className="whitespace-pre-wrap text-[#dc2626] bg-white rounded-lg p-3 border border-border text-[12px] max-h-[200px] overflow-auto">{oldString ?? ''}</pre>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#858481]">
              <svg viewBox="0 0 24 24" className="size-3" strokeWidth={1.8} fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>New string</span>
            </div>
            <pre className={`whitespace-pre-wrap bg-white rounded-lg p-3 border border-border text-[12px] max-h-[200px] overflow-auto ${newString ? 'text-[#059669]' : 'text-[#858481]'}`}>{newString || '(empty)'}</pre>
          </div>
          {occurrences !== undefined ? (
            <div className="text-[11px] text-[#858481]">
              {occurrences} occurrence{occurrences !== 1 ? 's' : ''} replaced
            </div>
          ) : null}
          {chip.ok === false ? (
            <div className="text-[#ef4444] text-[12px]">Edit failed</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#e8d5f5] bg-[#faf5ff] shadow-sm mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs transition-colors hover:bg-[rgba(139,92,246,0.06)] text-[#7c3aed]"
      >
        <BrainCircuit className="size-[14px] shrink-0" />
        <span className="flex-1 truncate text-[13px] font-medium">
          Reasoning
        </span>
        <span className="shrink-0 text-[11px] text-[#7c3aed]/60">
          {isOpen ? 'Hide' : 'Show'}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-[#e8d5f5] p-4">
          <div className="font-[15px] leading-relaxed text-[#6b21a8] italic whitespace-pre-wrap">
            {reasoning}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatWorkspace({
  chat,
  disabled,
  isStreaming,
  iterationCurrent,
  iterationLimit,
  onSendMessage,
  onOpenSettings,
  onToggleSidebar,
  error,
}: ChatWorkspaceProps) {
  const [openTerminals, setOpenTerminals] = useState<Set<string>>(new Set())

  const toggleTerminal = (chipId: string) => {
    setOpenTerminals((prev) => {
      const next = new Set(prev)
      if (next.has(chipId)) next.delete(chipId)
      else next.add(chipId)
      return next
    })
  }

  const readyToChat = !disabled

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      <header className="flex items-center justify-between py-4 border-b border-border gap-4 shrink-0">
        <div className="flex items-center gap-[14px] min-w-0">
          <button
            onClick={onToggleSidebar}
            className="w-[44px] h-[44px] rounded-[10px] grid place-items-center text-[#858481] hover:bg-[rgba(55,53,47,0.04)] hover:text-[#34322d] transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="size-[20px]" />
          </button>
          <div className="w-8 h-8 rounded-[10px] bg-[#ffc700] grid place-items-center text-[#34322d] font-extrabold shadow-[0_10px_20px_rgba(255,199,0,0.26)] shrink-0 text-sm">
            A
          </div>
          <div className="text-[15px] font-bold truncate">{chat.title || 'New chat'}</div>
        </div>
        <div className="flex gap-[2px] shrink-0">
          <button
            className={`w-[34px] h-[34px] rounded-[10px] grid place-items-center transition-colors shrink-0 ${!readyToChat ? 'text-[#f97316] animate-[pulse_1.6s_infinite_ease-in-out]' : 'text-[#858481]'} hover:bg-[rgba(55,53,47,0.04)] hover:text-[#34322d]`}
            onClick={onOpenSettings}
            aria-label="Open settings"
          >
            <Settings className="size-[18px]" />
          </button>
        </div>
      </header>

      <div className="messages flex-1 min-h-0 overflow-auto py-5 px-0">
        <div className="flex flex-col gap-6 max-w-[760px] mx-auto">
          {chat.messages.map((message) => (
            <article key={message.id}>
              {message.role === 'user' ? (
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b67f5] to-[#8f42ff] grid place-items-center text-xs font-bold shrink-0 shadow-[0_10px_20px_rgba(104,90,255,0.25)]">
                    <span className="text-white">U</span>
                  </div>
                  <div className="user-bubble flex-1 bg-white border border-border rounded-[22px] px-4 py-[15px] text-sm leading-[1.65] shadow-sm text-[#34322d]">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div className="assistant-block">
                  <div className="assistant-head flex items-center gap-2 mb-3">
                    <div className="assistant-name text-lg font-extrabold">
                      <span className="text-[#a855f7]">Curro</span> <span className="text-[#34322d]">AI</span>
                    </div>
                  </div>
                  <div className="assistant-copy text-[15px] leading-relaxed text-[#34322d]">
                    {message.content || (message.status === 'streaming' ? (
                      <div className="thinking flex items-center gap-[10px] pt-[6px]">
                        <div className="thinking-line flex items-baseline gap-[6px] font-bold text-[#858481]">
                          <span style={{ color: '#a855f7' }}>Curro</span> thinking
                          <span className="thinking-dots inline-block">
                            <span className="animate-[blinkWave_1.8s_infinite_ease-in-out]" style={{ opacity: 0.25, display: 'inline-block' }}>.</span>
                            <span className="animate-[blinkWave_1.8s_infinite_ease-in-out]" style={{ opacity: 0.25, display: 'inline-block', animationDelay: '0.12s' }}>.</span>
                            <span className="animate-[blinkWave_1.8s_infinite_ease-in-out]" style={{ opacity: 0.25, display: 'inline-block', animationDelay: '0.24s' }}>.</span>
                            <span className="animate-[blinkWave_1.8s_infinite_ease-in-out]" style={{ opacity: 0.25, display: 'inline-block', animationDelay: '0.36s' }}>.</span>
                          </span>
                        </div>
                      </div>
                    ) : '')}
                  </div>
                  {message.reasoning ? (
                    <ReasoningBlock reasoning={message.reasoning} />
                  ) : null}
                  {message.subAgentChips && message.subAgentChips.length > 0 ? (
                    <div className="flex flex-wrap gap-[10px] mt-3">
                      {message.subAgentChips.map((subAgent) => (
                        <SubAgentOutput key={subAgent.id} chip={subAgent} />
                      ))}
                    </div>
                  ) : null}
                      {message.toolChips && message.toolChips.length > 0 ? (
                    <div className="flex flex-wrap gap-[10px] mt-3">
                      {message.toolChips.map((tool) =>
                        tool.name === 'shall_tool' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <TerminalOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'shell_view' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <ShellViewOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'list_files' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <ListFilesOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'web_search' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <WebSearchOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'fatch_web_urls' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <FetchWebOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'str_replace' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <StrReplaceOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : (
                          <span key={tool.id} className={`inline-flex items-center gap-2 px-3 py-[6px] rounded-full bg-white border border-border text-xs text-[#34322d] shadow-sm ${tool.ok === false ? 'border-red-300 bg-red-50 text-red-600' : ''}`}>
                            <span className="text-[#858481] flex items-center">
                              <svg viewBox="0 0 24 24" className="size-[14px]" strokeWidth={1.8}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </span>
                            <span>{tool.label}</span>
                            {tool.filePath ? <small className="text-[#858481] font-mono">{tool.filePath}</small> : null}
                          </span>
                        )
                      )}
                    </div>
                ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-[10px] mb-3 px-[14px] py-3 rounded-[16px] border border-[rgba(239,68,68,0.25)] text-[#ef4444] bg-[rgba(239,68,68,0.08)] shadow-sm text-[13px] shrink-0">
          <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" strokeWidth={1.8}><path d="M12 9v4M12 17h.01"/><path d="M10.3 4.3 2.6 18A2 2 0 0 0 4.3 21h15.4a2 2 0 0 0 1.7-3l-7.7-13.7a2 2 0 0 0-3.4 0Z"/></svg>
          {error}
        </div>
      ) : null}

      <footer className="pt-[14px] pb-[18px] shrink-0">
        <Composer
          disabled={disabled}
          isStreaming={isStreaming}
          iterationCurrent={iterationCurrent}
          iterationLimit={iterationLimit}
          readyToChat={readyToChat}
          placeholder={disabled ? 'Configure API keys in Settings to start chatting.' : 'Ask Curro to help you build something...'}
          onSubmit={onSendMessage}
          onOpenSettings={onOpenSettings}
        />
      </footer>
    </div>
  )
}
