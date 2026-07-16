import { useState } from 'react'
import { FolderOpen, Menu, Settings, Terminal } from 'lucide-react'

import { Composer } from '@/components/chat/Composer'
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
                  {message.toolChips && message.toolChips.length > 0 ? (
                    <div className="flex flex-wrap gap-[10px] mt-3">
                      {message.toolChips.map((tool) =>
                        tool.name === 'shall_tool' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <TerminalOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                          </div>
                        ) : tool.name === 'list_files' ? (
                          <div key={tool.id} className="w-full max-w-xl">
                            <ListFilesOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
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
