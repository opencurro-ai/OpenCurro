import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { BackendMessage, ChatRecord, SandboxInfo, ToolChip, UiMessage } from '@/types/chat'
import { createId } from '@/utils/id'

function createEmptyChat(): ChatRecord {
  const now = new Date().toISOString()
  return {
    id: createId('chat'),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
    modelHistory: [],
    eventHistory: [],
  }
}

const initialChat = createEmptyChat()

interface ChatState {
  chats: ChatRecord[]
  activeChatId: string
  isStreaming: boolean
  statusLabel: string
  iterationCurrent: number
  iterationLimit: number
  setStatusLabel: (value: string) => void
  setStreaming: (value: boolean) => void
  setIteration: (current: number, limit: number) => void
  createChat: () => string
  deleteChat: (chatId: string) => void
  setActiveChat: (chatId: string) => void
  addUserMessage: (chatId: string, content: string) => void
  startAssistantMessage: (chatId: string) => string
  appendAssistantToken: (chatId: string, token: string) => void
  finalizeAssistantMessage: (chatId: string, content: string) => void
  markAssistantError: (chatId: string, message: string) => void
  addToolChip: (chatId: string, tool: ToolChip) => void
  setSandboxInfo: (chatId: string, sandbox: SandboxInfo) => void
  replaceModelHistory: (chatId: string, history: BackendMessage[]) => void
  addEvent: (chatId: string, event: Record<string, unknown>) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [initialChat],
      activeChatId: initialChat.id,
      isStreaming: false,
      statusLabel: 'Ready',
      iterationCurrent: 0,
      iterationLimit: 1000,
      setStatusLabel: (value) => set({ statusLabel: value }),
      setStreaming: (value) => set({ isStreaming: value }),
      setIteration: (current, limit) => set({ iterationCurrent: current, iterationLimit: limit }),
      createChat: () => {
        const chat = createEmptyChat()
        set((state) => ({ chats: [chat, ...state.chats], activeChatId: chat.id }))
        return chat.id
      },
      deleteChat: (chatId) => {
        const chats = get().chats.filter((chat) => chat.id !== chatId)
        const nextChats = chats.length ? chats : [createEmptyChat()]
        set({ chats: nextChats, activeChatId: nextChats[0].id })
      },
      setActiveChat: (chatId) => set({ activeChatId: chatId }),
      addUserMessage: (chatId, content) => set((state) => ({
        chats: state.chats.map((chat) => {
          if (chat.id !== chatId) return chat
          const now = new Date().toISOString()
          const nextMessages: UiMessage[] = [
            ...chat.messages,
            { id: createId('msg'), role: 'user', content, createdAt: now, status: 'idle' },
          ]
          const nextHistory: BackendMessage[] = [...chat.modelHistory, { role: 'user', content, timestamp: now }]
          return {
            ...chat,
            title: chat.messages.length === 0 ? content.slice(0, 48) || 'New chat' : chat.title,
            messages: nextMessages,
            modelHistory: nextHistory,
            updatedAt: now,
          }
        }),
      })),
      startAssistantMessage: (chatId) => {
        const messageId = createId('msg')
        set((state) => ({
          chats: state.chats.map((chat) => chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { id: messageId, role: 'assistant', content: '', createdAt: new Date().toISOString(), status: 'streaming', toolChips: [] },
                ],
              }
            : chat),
        }))
        return messageId
      },
      appendAssistantToken: (chatId, token) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((message, index) => index === chat.messages.length - 1 && message.role === 'assistant'
                ? { ...message, content: `${message.content}${token}` }
                : message),
              updatedAt: new Date().toISOString(),
            }
          : chat),
      })),
      finalizeAssistantMessage: (chatId, content) => set((state) => ({
        chats: state.chats.map((chat) => {
          if (chat.id !== chatId) return chat
          const now = new Date().toISOString()
          return {
            ...chat,
            messages: chat.messages.map((message, index) => index === chat.messages.length - 1 && message.role === 'assistant'
              ? { ...message, content, status: 'idle' }
              : message),
            modelHistory: [...chat.modelHistory, { role: 'assistant', content, timestamp: now }],
            updatedAt: now,
          }
        }),
      })),
      markAssistantError: (chatId, message) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((item, index) => index === chat.messages.length - 1 && item.role === 'assistant'
                ? { ...item, content: message, status: 'error' }
                : item),
              updatedAt: new Date().toISOString(),
            }
          : chat),
      })),
      addToolChip: (chatId, tool) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((message, index) => index === chat.messages.length - 1 && message.role === 'assistant'
                ? { ...message, toolChips: [...(message.toolChips ?? []), tool] }
                : message),
              eventHistory: [...chat.eventHistory, { type: 'tool', tool }],
            }
          : chat),
      })),
      setSandboxInfo: (chatId, sandbox) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId ? { ...chat, sandbox, updatedAt: new Date().toISOString() } : chat),
      })),
      replaceModelHistory: (chatId, history) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId ? { ...chat, modelHistory: history } : chat),
      })),
      addEvent: (chatId, event) => set((state) => ({
        chats: state.chats.map((chat) => chat.id === chatId ? { ...chat, eventHistory: [...chat.eventHistory, event] } : chat),
      })),
    }),
    {
      name: 'novita-agent-chats',
      partialize: (state) => ({
        chats: state.chats,
        activeChatId: state.activeChatId,
      }),
    },
  ),
)