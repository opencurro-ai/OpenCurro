import { useState, useEffect, useRef } from 'react'
import { Bot, FolderOpen, X } from 'lucide-react'

import type { SubAgentChip, ToolChip } from '@/types/chat'

function SubAgentToolChipDisplay({ chip }: { chip: ToolChip }) {
  const isFileRead = chip.name === 'file_read'
  const isListFiles = chip.name === 'list_files'
  const isRunning = chip.ok === undefined

  const statusLabel = isRunning ? 'running...'
    : chip.ok ? 'done'
    : 'error'

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs">
        <FolderOpen className="size-3 shrink-0 text-[#858481]" />
        <span className="flex-1 truncate text-[12px] text-[#34322d]">
          {chip.label}
        </span>
        <span className={`shrink-0 text-[10px] ${isRunning ? 'animate-pulse text-[#858481]' : chip.ok ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {statusLabel}
        </span>
      </div>
      {!isRunning && chip.resultData && (
        <div className="border-t border-border px-3 py-2 text-[11px] font-mono text-[#858481] leading-relaxed bg-[#f5f5f5] max-h-[150px] overflow-auto">
          {isFileRead && chip.resultData.data && typeof chip.resultData.data === 'object' && 'content' in (chip.resultData.data as Record<string, unknown>)
            ? ((chip.resultData.data as Record<string, unknown>).content as string)?.split('\n').slice(0, 20).map((line: string, i: number) => (
                <div key={i} className="whitespace-pre-wrap">{line}</div>
              ))
            : isListFiles && chip.resultData.data && typeof chip.resultData.data === 'object' && 'items' in (chip.resultData.data as Record<string, unknown>)
            ? ((chip.resultData.data as Record<string, unknown>).items as Array<{name: string; type: string; path: string}>).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span>{item.type === 'dir' ? '📁' : '📄'}</span>
                  <span>{item.path}</span>
                </div>
              ))
            : <pre className="whitespace-pre-wrap">{JSON.stringify(chip.resultData, null, 2).slice(0, 500)}</pre>
          }
        </div>
      )}
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
