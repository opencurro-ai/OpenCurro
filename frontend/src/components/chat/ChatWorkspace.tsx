import { Bot, Sparkles, User2 } from 'lucide-react'

import { Composer } from '@/components/chat/Composer'
import type { ChatRecord } from '@/types/chat'

interface ChatWorkspaceProps {
  chat: ChatRecord
  disabled: boolean
  isStreaming: boolean
  statusLabel: string
  iterationCurrent: number
  iterationLimit: number
  onSendMessage: (value: string) => Promise<void>
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
                    {message.toolChips.map((tool) => (
                      <span key={tool.id} className={`rounded-full border px-3 py-1 text-xs ${tool.ok === false ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'}`}>
                        {tool.label}
                      </span>
                    ))}
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