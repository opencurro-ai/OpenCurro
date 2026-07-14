import { useEffect, useState } from 'react'
import { X, Save } from 'lucide-react'

import { fetchSandboxFileContent, saveSandboxFileContent } from '@/lib/api'

interface FileViewerProps {
  chatId: string
  filePath: string
  onClose: () => void
}

function getFileExtensionClass(filename: string): string {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'text-[#3b82f6]'
  if (filename.endsWith('.py')) return 'text-[#10b981]'
  if (filename.endsWith('.css')) return 'text-[#d946ef]'
  if (filename.endsWith('.json')) return 'text-[#ca8a04]'
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'text-[#eab308]'
  if (filename.endsWith('.html')) return 'text-[#ef4444]'
  return 'text-[#858481]'
}

function getLanguageLabel(filename: string): string {
  if (filename.endsWith('.ts')) return 'TypeScript'
  if (filename.endsWith('.tsx')) return 'TypeScript JSX'
  if (filename.endsWith('.py')) return 'Python'
  if (filename.endsWith('.css')) return 'CSS'
  if (filename.endsWith('.json')) return 'JSON'
  if (filename.endsWith('.js')) return 'JavaScript'
  if (filename.endsWith('.jsx')) return 'JavaScript JSX'
  if (filename.endsWith('.html')) return 'HTML'
  return 'Plain Text'
}

export function FileViewer({ chatId, filePath, onClose }: FileViewerProps) {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isModified = content !== originalContent
  const fileName = filePath.split('/').pop() || filePath
  const lines = content.split('\n')

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
    <>
      <div className="tab-strip h-10 flex items-center gap-2 px-[10px] border-b border-border bg-white overflow-auto shrink-0">
        <div className="file-tab active inline-flex items-center gap-2 px-3 py-[10px] rounded-t-[12px] text-[13px] text-[#34322d] bg-[#f8f8f7] shadow-[inset_0_2px_0_#ffc700] whitespace-nowrap">
          <svg viewBox="0 0 24 24" className={`size-[14px] ${getFileExtensionClass(fileName)}`}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          {fileName}
          <button onClick={onClose} className="ml-1 text-[#858481] hover:text-[#34322d]">
            <X className="size-[14px]" />
          </button>
        </div>
      </div>
      <div className="crumbs h-[30px] flex items-center gap-2 px-[14px] border-b border-border bg-[rgba(255,255,255,0.76)] text-[#858481] text-[11px] shrink-0">
        <span className="font-mono">{filePath.split('/').slice(0, -1).join(' › ')} › <strong className="text-[#34322d]">{fileName}</strong></span>
        <div className="ml-auto flex items-center gap-2">
          {saved ? (
            <span className="text-[#22c55e] text-[11px]">Saved</span>
          ) : null}
          {isModified ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[#3b82f6] hover:text-[#2563eb] text-[11px] font-medium"
            >
              <Save className="size-[14px]" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : null}
          <button onClick={onClose} className="text-[#858481] hover:text-[#34322d]" title="Close file">
            <X className="size-[14px]" />
          </button>
        </div>
      </div>
      <div className="editor-shell flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[#858481] text-sm bg-[#f5f5f5]">
            Loading file content...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-[#ef4444] text-sm bg-[#f5f5f5] p-4">{error}</div>
        ) : (
          <div className="flex-1 min-h-0 bg-[#f5f5f5] overflow-auto relative">
            <div className="code-preview font-mono text-[13px] leading-[1.8] text-[#374151] min-w-[640px]">
              {lines.map((line, i) => (
                <div key={i} className="code-line grid grid-cols-[52px_1fr] gap-0 whitespace-pre hover:bg-[rgba(59,130,246,0.05)]">
                  <span className="line-num text-[#9ca3af] text-right pr-4 select-none">{i + 1}</span>
                  <span>{line || ' '}</span>
                </div>
              ))}
            </div>
            <textarea
              className="absolute inset-0 w-full h-full resize-none bg-transparent font-mono text-[13px] leading-[1.8] text-transparent caret-[#34322d] p-0 outline-none overflow-hidden"
              style={{
                WebkitTextFillColor: 'transparent',
                gridTemplateColumns: '52px 1fr',
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </div>
      <div className="editor-footer h-[26px] flex items-center justify-between px-3 border-t border-border bg-white text-[#858481] text-[10px] shrink-0">
        <div className="flex gap-[14px]">
          <span>Ln 1, Col 1</span>
          <span>Spaces: 2</span>
        </div>
        <div className="flex gap-[14px]">
          <span>{getLanguageLabel(fileName)}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </>
  )
}
