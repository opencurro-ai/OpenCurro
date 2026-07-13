import { useEffect, useState } from 'react'
import { FileX, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { fetchSandboxFileContent, saveSandboxFileContent } from '@/lib/api'

interface FileViewerProps {
  chatId: string
  filePath: string
  onClose: () => void
}

export function FileViewer({ chatId, filePath, onClose }: FileViewerProps) {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isModified = content !== originalContent

  useEffect(() => {
    setSaved(false)
    setError('')
    setLoading(true)
    fetchSandboxFileContent(chatId, filePath)
      .then((data) => {
        setContent(data)
        setOriginalContent(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load file'))
      .finally(() => setLoading(false))
  }, [chatId, filePath])

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaved(false)
      await saveSandboxFileContent(chatId, filePath, content)
      setOriginalContent(content)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 flex h-[80vh] w-full max-w-4xl flex-col rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] shadow-[0_18px_60px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3 truncate">
            <span className="rounded-full border border-white/10 bg-white/5 p-1.5">
              <FileX className="size-4 text-cyan-200" />
            </span>
            <div className="truncate">
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">File viewer</p>
              <h2 className="truncate font-['Syne'] text-lg text-white">{filePath}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                Saved
              </span>
            ) : null}
            {isModified ? (
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="mr-1.5 size-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            ) : null}
            <Button variant="outline" size="icon" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-5">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-white/50">
                <div className="size-5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                Loading file content...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div>
          ) : (
            <textarea
              className="h-full w-full resize-none rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-sm leading-6 text-white/86 outline-none focus:border-cyan-300/30 focus:ring-1 focus:ring-cyan-300/20"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}
