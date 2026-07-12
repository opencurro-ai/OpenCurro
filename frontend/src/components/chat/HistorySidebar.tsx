import { MessageSquarePlus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useChatStore } from '@/store/useChatStore'

export function HistorySidebar() {
  const { activeChatId, chats, createChat, deleteChat, setActiveChat } = useChatStore()
  const currentChatId = activeChatId || chats[0]?.id

  return (
    <aside className="flex h-full w-full flex-col rounded-[2rem] border border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Chat history</p>
          <h2 className="font-['Syne'] text-lg text-white">Sessions</h2>
        </div>
        <Button variant="outline" size="icon" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={() => createChat()}>
          <MessageSquarePlus className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {chats.map((chat) => {
          const isActive = chat.id === currentChatId
          return (
            <div
              key={chat.id}
              className={`group flex items-start gap-2 rounded-2xl border px-3 py-3 transition ${isActive ? 'border-cyan-300/50 bg-cyan-300/10 text-white shadow-[0_0_40px_rgba(103,232,249,0.08)]' : 'border-white/8 bg-white/4 text-white/70 hover:border-white/15 hover:bg-white/8'}`}
            >
              <button
                type="button"
                onClick={() => setActiveChat(chat.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate font-medium">{chat.title || 'New chat'}</div>
                <div className="mt-1 truncate text-xs text-white/45">
                  {chat.messages[chat.messages.length - 1]?.content || 'No messages yet'}
                </div>
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-white/35 opacity-0 transition group-hover:opacity-100 hover:bg-white/8 hover:text-rose-200"
                onClick={() => deleteChat(chat.id)}
                aria-label={`Delete ${chat.title}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}