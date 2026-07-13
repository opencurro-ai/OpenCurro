import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { fetchSandboxFiles } from '@/lib/api'
import type { ChatRecord } from '@/types/chat'
import type { FileTreeNode } from '@/types/sandbox'

import { FileViewer } from './FileViewer'

function TreeNode({ node, depth = 0, onFileSelect }: { node: FileTreeNode; depth?: number; onFileSelect: (path: string) => void }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = !!node.children?.length
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (node.type === 'file') {
            onFileSelect(node.path)
          } else {
            setOpen((value) => !value)
          }
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-white/70 hover:bg-white/6"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (open ? <ChevronDown className="size-4 text-white/35" /> : <ChevronRight className="size-4 text-white/35" />) : <span className="size-4" />}
        {node.type === 'dir' ? (open ? <FolderOpen className="size-4 text-cyan-200" /> : <Folder className="size-4 text-cyan-200" />) : <File className="size-4 text-cyan-200" />}
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && open ? (
        <div>
          {node.children?.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} onFileSelect={onFileSelect} />)}
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

  const loadFiles = async () => {
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
  }

  useEffect(() => {
    void loadFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id, chat.sandbox?.sandboxId])

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col rounded-[2rem] border border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Sandbox files</p>
            <h2 className="font-['Syne'] text-lg text-white">/home/user</h2>
          </div>
          <Button variant="outline" size="icon" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => void loadFiles()}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {!ready ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/4 p-4 text-sm leading-7 text-white/55">
              Send your first message to provision the sandbox. Files appear here after creation.
            </div>
          ) : null}
          {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}
          {ready && !error && nodes.length === 0 && !loading ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/4 p-4 text-sm text-white/55">No files found yet.</div>
          ) : null}
          <div className="space-y-1">
            {nodes.map((node) => <TreeNode key={node.path} node={node} onFileSelect={setSelectedFilePath} />)}
          </div>
        </div>
      </aside>

      {selectedFilePath ? (
        <FileViewer
          chatId={chat.id}
          filePath={selectedFilePath}
          onClose={() => setSelectedFilePath(null)}
        />
      ) : null}
    </>
  )
}
