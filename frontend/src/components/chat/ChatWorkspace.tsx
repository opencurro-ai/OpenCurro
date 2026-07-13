import { useState } from 'react'
import { Bot, ChevronDown, ChevronRight, Sparkles, Terminal, User2 } from 'lucide-react'

import { Composer } from '@/components/chat/Composer'
import type { ChatRecord, ToolChip } from '@/types/chat'

interface ChatWorkspaceProps {
  chat: ChatRecord
  disabled: boolean
  isStreaming: boolean
  statusLabel: string
  iterationCurrent: number
  iterationLimit: number
  onSendMessage: (value: string) => Promise<void>
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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${
          chip.ok === false ? 'text-rose-200' : 'text-cyan-200'
        }`}
      >
        {isOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
        <Terminal className="size-3 shrink-0" />
        <span className="flex-1 truncate font-mono">
          {chip.label}
          {chip.sessionName ? <span className="ml-2 text-[10px] text-white/40">[{chip.sessionName}]</span> : null}
        </span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-white/40' : status === 'started' ? 'text-amber-400' : exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {statusLabel}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-white/10 p-3 font-mono text-[13px] leading-relaxed">
          <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
            <Terminal className="size-3" />
            <span>$ {chip.command || 'command'}</span>
            {chip.sessionName ? <span className="ml-auto text-white/30">session: {chip.sessionName}</span> : null}
          </div>
          {chip.ok !== undefined ? (
            <div className="space-y-1">
              {stdout ? (
                <pre className="whitespace-pre-wrap text-emerald-200/90">{stdout}</pre>
              ) : null}
              {stderr ? (
                <pre className="whitespace-pre-wrap text-rose-300/80">{stderr}</pre>
              ) : null}
              {message ? (
                <div className="text-white/70">{message}</div>
              ) : null}
              {pid !== undefined ? (
                <div className="text-[11px] text-white/50">PID: {pid}</div>
              ) : null}
              {exitCode !== undefined ? (
                <div className={`pt-1 text-[11px] ${exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Exit code: {exitCode}
                </div>
              ) : null}
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-2 text-white/40">
              <span className="inline-block size-2 animate-pulse rounded-full bg-cyan-300" />
              Running...
            </div>
          ) : (
            <div className="text-white/40">No output</div>
          )}
        </div>
      )}
    </div>
  )
}

function ShimmerLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
      <span className="mr-2 size-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.8)]" />
      <span className="bg-[linear-gradient(110deg,rgba(255,255,255,0.4),rgba(255,255,255,1),rgba(255,255,255,0.4))] bg-[length:220%_100%] bg-clip-text text-transparent animate-[shine_2.4s_linear_infinite]">
        {label}
      </span>
    </span>
  )
}

export function ChatWorkspace({
  chat,
  disabled,
  isStreaming,
  statusLabel,
  iterationCurrent,
  iterationLimit,
  onSendMessage,
}: ChatWorkspaceProps) {
  const [openTerminals, setOpenTerminals] = useState<Set<string>>(new Set())

  const toggleTerminal = (chipId: string) => {
    setOpenTerminals((prev) => {
      const next = new Set(prev)
      if (next.has(chipId)) {
        next.delete(chipId)
      } else {
        next.add(chipId)
      }
      return next
    })
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[2rem] border border-white/10 bg-black/35 backdrop-blur-xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Agent console</p>
          <h1 className="font-['Syne'] text-2xl text-white">Novita Agent Studio</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <ShimmerLabel label={isStreaming ? statusLabel : 'Ready'} />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-cyan-100">
            Iteration {iterationCurrent}/{iterationLimit}
          </span>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
        {chat.messages.length === 0 ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_40%)] p-10 text-center">
            <Sparkles className="mb-4 size-10 text-cyan-200" />
            <h2 className="font-['Syne'] text-3xl text-white">Autonomous file agent</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
              Add your provider and Novita keys in Settings, choose a model, then ask the agent to inspect, create, or overwrite files inside the sandbox.
            </p>
          </div>
        ) : null}

        {chat.messages.map((message) => (
          <article key={message.id} className={`space-y-3 ${message.role === 'user' ? 'ml-auto max-w-3xl' : 'mr-auto max-w-4xl'}`}>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/35">
              {message.role === 'user' ? <User2 className="size-4" /> : <Bot className="size-4" />}
              <span>{message.role === 'user' ? 'User' : 'Agent'}</span>
            </div>
            {message.role === 'user' ? (
              <div className="rounded-[1.75rem] border border-white/8 bg-white/8 px-5 py-4 text-sm leading-7 text-white shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
                {message.content}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap text-[15px] leading-8 text-white/86">{message.content || (message.status === 'streaming' ? '...' : '')}</div>
                {message.toolChips && message.toolChips.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {message.toolChips.map((tool) =>
                      tool.name === 'shall_tool' ? (
                        <div key={tool.id} className="w-full max-w-2xl">
                          <TerminalOutput chip={tool} isOpen={openTerminals.has(tool.id)} onToggle={() => toggleTerminal(tool.id)} />
                        </div>
                      ) : (
                        <span key={tool.id} className={`rounded-full border px-3 py-1 text-xs ${tool.ok === false ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'}`}>
                          {tool.label}
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

      <div className="border-t border-white/10 p-4">
        <Composer
          disabled={disabled}
          isStreaming={isStreaming}
          placeholder={disabled ? 'Add keys and select a model in Settings to begin.' : 'Ask the agent to read, create, or overwrite files in the Novita sandbox...'}
          onSubmit={onSendMessage}
        />
      </div>
    </section>
  )
}