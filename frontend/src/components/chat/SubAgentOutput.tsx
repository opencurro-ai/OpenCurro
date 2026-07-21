import { useState, useEffect, useRef } from 'react'
import { Bot, FolderOpen, Terminal, Eye, X } from 'lucide-react'

import type { SubAgentChip, ToolChip } from '@/types/chat'

function WebSearchToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const results = data?.results as Array<{ title: string; url: string; Description: string }> | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <svg viewBox="0 0 24 24" className="size-3 shrink-0 text-[#858481]" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? 'done' : 'error'}
        </span>
      </div>
      {!isRunning && results && results.length > 0 && (
        <div className="border-t border-border p-2 space-y-1.5 bg-[#f5f5f5]">
          {results.slice(0, 5).map((r, i) => (
            <div key={i} className="rounded-[8px] bg-white border border-border p-2">
              <div className="text-[11px] font-semibold text-[#34322d]">{r.title}</div>
              <div className="text-[10px] text-[#858481] line-clamp-1">{r.Description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FetchWebToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const content = data?.content as string | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <svg viewBox="0 0 24 24" className="size-3 shrink-0 text-[#858481]" strokeWidth={1.8}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? 'done' : 'error'}
        </span>
      </div>
      {!isRunning && content && (
        <div className="border-t border-border px-3 py-2 text-[11px] font-mono text-[#34322d] leading-relaxed bg-[#f5f5f5] max-h-[120px] overflow-auto">
          {content.length > 500 ? content.slice(0, 500) + '...' : content}
        </div>
      )}
    </div>
  )
}

function FileWriteToolDisplay({ chip }: { chip: ToolChip }) {
  const isRunning = chip.ok === undefined
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <svg viewBox="0 0 24 24" className="size-3 shrink-0 text-[#858481]" strokeWidth={1.8}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? 'saved' : 'error'}
        </span>
      </div>
    </div>
  )
}

function StrReplaceToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const occurrences = data?.occurrences as number | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <svg viewBox="0 0 24 24" className="size-3 shrink-0 text-[#858481]" strokeWidth={1.8} fill="none" stroke="currentColor">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? `${occurrences ?? 0} replaced` : 'error'}
        </span>
      </div>
    </div>
  )
}

function ShallToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const commandData = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const stdout = commandData?.stdout as string | undefined
  const stderr = commandData?.stderr as string | undefined
  const exitCode = commandData?.exit_code as number | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <Terminal className="size-3 shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : exitCode === 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : exitCode === 0 ? 'done' : `exit ${exitCode}`}
        </span>
      </div>
      {!isRunning && (stdout || stderr) && (
        <div className="border-t border-border px-3 py-2 text-[11px] font-mono leading-relaxed bg-[#f5f5f5] max-h-[120px] overflow-auto">
          {stdout ? <pre className="whitespace-pre-wrap text-[#059669]">{stdout}</pre> : null}
          {stderr ? <pre className="whitespace-pre-wrap text-[#dc2626]/80">{stderr}</pre> : null}
        </div>
      )}
    </div>
  )
}

function FileReadToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const content = data?.content as string | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <FolderOpen className="size-3 shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? 'done' : 'error'}
        </span>
      </div>
      {!isRunning && content && (
        <div className="border-t border-border px-3 py-2 text-[11px] font-mono text-[#858481] leading-relaxed bg-[#f5f5f5] max-h-[150px] overflow-auto">
          {content.split('\n').slice(0, 15).map((line: string, i: number) => (
            <div key={i} className="whitespace-pre-wrap">{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ListFilesToolDisplay({ chip }: { chip: ToolChip }) {
  const resultData = chip.resultData
  const data = (resultData?.data as Record<string, unknown> | undefined) ?? resultData
  const items = data?.items as Array<{ name: string; type: string; path: string; size?: number | null }> | undefined
  const isRunning = chip.ok === undefined

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <FolderOpen className="size-3 shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {isRunning ? 'running...' : chip.ok ? 'done' : 'error'}
        </span>
      </div>
      {!isRunning && items && (
        <div className="border-t border-border px-3 py-2 text-[11px] font-mono text-[#858481] leading-relaxed bg-[#f5f5f5] max-h-[150px] overflow-auto">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span>{item.type === 'dir' ? '📁' : '📄'}</span>
              <span>{item.path}</span>
              {item.type === 'file' && item.size != null ? <span className="ml-auto text-[10px]">{item.size} B</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SubAgentToolChipDisplay({ chip }: { chip: ToolChip }) {
  if (chip.name === 'web_search') return <WebSearchToolDisplay chip={chip} />
  if (chip.name === 'fatch_web_urls') return <FetchWebToolDisplay chip={chip} />
  if (chip.name === 'file_write') return <FileWriteToolDisplay chip={chip} />
  if (chip.name === 'str_replace') return <StrReplaceToolDisplay chip={chip} />
  if (chip.name === 'shall_tool') return <ShallToolDisplay chip={chip} />
  if (chip.name === 'file_read') return <FileReadToolDisplay chip={chip} />
  if (chip.name === 'list_files') return <ListFilesToolDisplay chip={chip} />
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <FolderOpen className="size-3 shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[12px] text-[#34322d]">{chip.label}</span>
        <span className={`shrink-0 text-[10px] ${chip.ok === undefined ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {chip.ok === undefined ? 'running...' : chip.ok ? 'done' : 'error'}
        </span>
      </div>
    </div>
  )
}

export function SubAgentOutput({ chip }: { chip: SubAgentChip }) {
  const [isOpen, setIsOpen] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [chip.output, isOpen])

  const isRunning = chip.status === 'running'
  const isError = chip.status === 'error'
  const statusIcon = isRunning ? '●' : isError ? '✕' : '✓'
  const statusColor = isRunning ? 'text-[#ffc700]' : isError ? 'text-[#ef4444]' : 'text-[#22c55e]'

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-[6px] rounded-full bg-white border border-border text-xs text-[#34322d] shadow-sm hover:bg-[rgba(55,53,47,0.04)] transition-colors"
      >
        <Bot className="size-[14px] text-[#858481]" />
        <span>{chip.agent}</span>
        <span className={`text-[10px] font-mono ${statusColor}`}>{statusIcon}</span>
        <span className="text-[#858481] text-[10px] font-mono">[{chip.session}]</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white rounded-[18px] shadow-lg w-full max-w-[600px] max-h-[80vh] flex flex-col overflow-hidden m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[10px] bg-[#ffc700] grid place-items-center">
                  <Bot className="size-[16px] text-[#34322d]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#34322d]">{chip.agent}</div>
                  <div className="text-[11px] text-[#858481] font-mono">session: {chip.session}</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-[10px] grid place-items-center text-[#858481] hover:bg-[rgba(55,53,47,0.04)] hover:text-[#34322d] transition-colors"
              >
                <X className="size-[16px]" />
              </button>
            </div>

            <div ref={outputRef} className="flex-1 overflow-auto p-5 space-y-4">
              {chip.toolChips.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-[#858481] font-semibold">Tools Used</div>
                  <div className="flex flex-col gap-2">
                    {chip.toolChips.map((tool) => (
                      <SubAgentToolChipDisplay key={tool.id} chip={tool} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#858481] font-semibold mb-2">Output</div>
                <div className="text-[13px] leading-relaxed text-[#34322d] font-mono bg-[#f5f5f5] rounded-[12px] p-4 whitespace-pre-wrap">
                  {chip.output || (
                    <span className="text-[#858481]">
                      {isRunning ? 'Sub-agent is working...' : isError ? chip.errorMessage || 'Error occurred' : 'No output'}
                    </span>
                  )}
                  {isRunning && chip.output ? (
                    <span className="inline-block w-2 h-4 ml-0.5 bg-[#ffc700] animate-pulse" />
                  ) : null}
                  {isRunning && !chip.output ? (
                    <span className="flex items-center gap-2 mt-1">
                      <span className="inline-block size-2 animate-pulse rounded-full bg-[#ffc700]" />
                      Working...
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
