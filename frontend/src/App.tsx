import { useEffect, useMemo, useState } from 'react'
import { Menu, PanelLeftClose, Settings } from 'lucide-react'

import { ChatWorkspace } from '@/components/chat/ChatWorkspace'
import { HistorySidebar } from '@/components/chat/HistorySidebar'
import { FileExplorer } from '@/components/files/FileExplorer'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { Button } from '@/components/ui/button'
import { useAgentChat } from '@/hooks/useAgentChat'
import { useChatStore } from '@/store/useChatStore'
import { useSettingsStore } from '@/store/useSettingsStore'

function App() {
  const { sendMessage } = useAgentChat()
  const { activeChatId, chats, createChat, isStreaming, iterationCurrent, iterationLimit, setActiveChat, statusLabel } = useChatStore()
  const { novitaApiKey, providerKeys, selectedModel, selectedProvider } = useSettingsStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!chats.length) {
      const id = createChat()
      setActiveChat(id)
      return
    }
    if (!activeChatId) {
      setActiveChat(chats[0].id)
    }
  }, [activeChatId, chats, createChat, setActiveChat])

  const activeChat = useMemo(() => chats.find((chat) => chat.id === (activeChatId || chats[0]?.id)) ?? chats[0], [activeChatId, chats])
  const readyToChat = Boolean(providerKeys[selectedProvider] && selectedModel && novitaApiKey)

  if (!activeChat) {
    return null
  }

  const handleSendMessage = async (value: string) => {
    try {
      setError('')
      await sendMessage(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_right,rgba(45,212,191,0.16),transparent_20%),linear-gradient(180deg,#02050a,#071019_52%,#03060b)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setSidebarOpen((value) => !value)}>
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <Menu className="size-4" />}
            </Button>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Production workspace</p>
              <h1 className="font-['Syne'] text-xl text-white">AI file agent for Novita sandbox</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 md:block">
              Provider <span className="text-cyan-100">{selectedProvider}</span> · Model <span className="text-cyan-100">{selectedModel || 'unselected'}</span>
            </div>
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 size-4" />
              Settings
            </Button>
          </div>
        </header>

        {error ? <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

        <main className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <div className={`${sidebarOpen ? 'block' : 'hidden'} min-h-0 lg:block`}>
            <HistorySidebar />
          </div>
          <div className="min-h-0">
            <ChatWorkspace
              chat={activeChat}
              disabled={!readyToChat}
              isStreaming={isStreaming}
              statusLabel={statusLabel}
              iterationCurrent={iterationCurrent}
              iterationLimit={iterationLimit}
              onSendMessage={handleSendMessage}
            />
          </div>
          <div className="min-h-0">
            <FileExplorer chat={activeChat} />
          </div>
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default App