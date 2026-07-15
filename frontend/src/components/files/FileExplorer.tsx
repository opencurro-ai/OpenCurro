import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'

import { fetchSandboxFiles } from '@/lib/api'
import type { ChatRecord } from '@/types/chat'
import type { FileTreeNode } from '@/types/sandbox'

import { FileViewer } from './FileViewer'

function TreeNode({ node, depth = 0, onFileSelect, selectedPath }: { node: FileTreeNode; depth?: number; onFileSelect: (path: string) => void; selectedPath: string | null }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = !!node.children?.length

  const getFileIconColor = (name: string) => {
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'text-[#3b82f6]'
    if (name.endsWith('.py')) return 'text-[#10b981]'
    if (name.endsWith('.css')) return 'text-[#d946ef]'
    if (name.endsWith('.json')) return 'text-[#ca8a04]'
    if (name.endsWith('.js') || name.endsWith('.jsx')) return 'text-[#eab308]'
    if (name.endsWith('.html')) return 'text-[#ef4444]'
    return 'text-[#858481]'
  }

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-[6px] px-[14px] py-[3px] text-[13px] text-[#34322d] cursor-pointer select-none relative z-[1] hover:before:bg-[rgba(55,53,47,0.05)] before:content-[''] before:absolute before:inset-0 before:[-webkit-inset:0_-100vmax] before:z-[-1] ${selectedPath === node.path ? 'before:bg-[rgba(255,199,0,0.12)] text-[#9a6a00] font-medium' : ''}`}
        onClick={() => {
          if (node.type === 'file') onFileSelect(node.path)
          else setOpen((v) => !v)
        }}
      >
        <span className="text-[9px] w-[14px] inline-flex items-center justify-center text-[#858481] shrink-0">
          {hasChildren ? (open ? '▼' : '▶') : ''}
        </span>
        <span className={`inline-flex items-center justify-center w-[18px] shrink-0 ${node.type === 'dir' ? 'text-[#eab308]' : getFileIconColor(node.name)}`}>
          {node.type === 'dir' ? (
            <svg viewBox="0 0 24 24" className="size-[14px]" strokeWidth={1.5}>
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="size-[14px]" strokeWidth={1.5}>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && open ? (
        <div className="ml-5 border-l border-[rgba(52,50,45,0.08)]">
          {node.children?.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} onFileSelect={onFileSelect} selectedPath={selectedPath} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FileExplorer({ chat }: { chat: ChatRecord }) {
  const [nodes, setNodes] = useState<FileTreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

  const ready = useMemo(() => Boolean(chat.sandbox?.sandboxId), [chat.sandbox])

  const loadFiles = useCallback(async () => {
    if (!ready) {
      setNodes([])
      return
    }
    try {
      setLoading(true)
      setError('')
      const response = await fetchSandboxFiles(chat.id)
      setNodes(response.tree)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [chat.id, ready])

  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  return (
    <div className="flex-1 min-h-0 bg-white border border-border rounded-[24px] shadow-lg overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-[18px] py-[14px] border-b border-border bg-gradient-to-b from-[rgba(255,255,255,0.96)] to-[rgba(255,255,255,0.88)] shrink-0">
        <div className="flex items-center gap-[10px]">
          <span className="text-[#858481] flex items-center">
            <svg viewBox="0 0 24 24" className="size-5" strokeWidth={1.8}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>
          </span>
          <span className="font-semibold text-[14px] text-[#34322d]">Workspace Files</span>
        </div>
        <button onClick={() => void loadFiles()} className="text-[#858481] hover:text-[#34322d] transition-colors" aria-label="Refresh files">
          <RotateCcw className={`size-[18px] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex-1 min-h-0 relative">
        <div className="flex flex-row min-h-0 absolute inset-0">
          <aside className="w-[238px] border-r border-border bg-[rgba(240,240,240,0.62)] flex flex-col min-h-0 shrink-0">
            <div className="flex items-center justify-between px-[14px] py-3 border-b border-border text-[#858481] text-[11px] font-bold uppercase tracking-[0.12em] shrink-0">
              <span className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="size-[14px]" strokeWidth={1.8}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>
                Explorer
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 text-[13px] text-[#34322d]">
              {!ready ? (
                <div className="px-[14px] py-3 text-[13px] text-[#858481]">Send a message to create a sandbox.</div>
              ) : null}
              {error ? (
                <div className="px-[14px] py-3 text-[13px] text-[#ef4444]">{error}</div>
              ) : null}
              {ready && !error && nodes.length === 0 && !loading ? (
                <div className="px-[14px] py-3 text-[13px] text-[#858481]">No files yet.</div>
              ) : null}
              {nodes.map((node) => (
                <TreeNode key={node.path} node={node} onFileSelect={setSelectedFilePath} selectedPath={selectedFilePath} />
              ))}
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {selectedFilePath ? (
              <FileViewer
                chatId={chat.id}
                filePath={selectedFilePath}
                onClose={() => setSelectedFilePath(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#858481] text-sm">
                <div className="text-center">
                  <svg viewBox="0 0 24 24" className="size-8 mx-auto mb-3 text-[#858481]/50" strokeWidth={1.5}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Select a file to view
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
