import { useCallback } from 'react'

import { ensureChatSession, streamChat } from '@/lib/api'
import { useChatStore } from '@/store/useChatStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { createId } from '@/utils/id'

export function useAgentChat() {
  const {
    chats,
    activeChatId,
    addUserMessage,
    addEvent,
    addToolChip,
    updateLastToolChip,
    addSubAgentChip,
    appendSubAgentToken,
    addSubAgentToolChip,
    updateLastSubAgentToolChip,
    updateSubAgentStatus,
    appendAssistantToken,
    appendAssistantReasoning,
    finalizeAssistantMessage,
    markAssistantError,
    setIteration,
    setSandboxInfo,
    setStatusLabel,
    setStreaming,
    startAssistantMessage,
  } = useChatStore()
  const { providerKeys, providerBaseUrls, selectedModel, selectedProvider, novitaApiKey, novitaTemplateId, tavilyApiKey, firecrawlApiKey } = useSettingsStore()

  const sendMessage = useCallback(async (content: string) => {
    const chatId = activeChatId || chats[0]?.id
    if (!chatId) {
      throw new Error('No active chat available.')
    }
    if (!selectedModel) {
      throw new Error('Select a model first.')
    }
    const providerKey = providerKeys[selectedProvider]
    if (!providerKey) {
      throw new Error(`Add a ${selectedProvider} API key first.`)
    }
    if (!novitaApiKey) {
      throw new Error('Add a Novita sandbox API key first.')
    }

    const chat = chats.find((item) => item.id === chatId)
    if (!chat) {
      throw new Error('Chat not found.')
    }

    addUserMessage(chatId, content)
    addEvent(chatId, { type: 'user_message', content })
    const assistantId = startAssistantMessage(chatId)
    void assistantId
    setStatusLabel('Thinking...')
    setStreaming(true)
    setIteration(0, 1000)

    const nextHistory = [...chat.modelHistory, { role: 'user' as const, content }]
    await ensureChatSession(chatId, nextHistory)

    try {
      await streamChat(
        {
          chat_id: chatId,
          user_message: content,
          history: chat.modelHistory,
          provider: selectedProvider,
          model: selectedModel,
          api_key: providerKey,
          base_url: providerBaseUrls[selectedProvider],
          sandbox: {
            api_key: novitaApiKey,
            template_id: novitaTemplateId || undefined,
            provider: 'novita',
            timeout_seconds: 3600,
          },
          max_iterations: 1000,
          tavily_api_key: tavilyApiKey || undefined,
          firecrawl_api_key: firecrawlApiKey || undefined,
        },
        (event, data) => {
          addEvent(chatId, { type: event, data })
          if (event === 'status') {
            const label = typeof data.label === 'string' ? data.label : 'Working...'
            setStatusLabel(label)
          }
          if (event === 'iteration') {
            const current = typeof data.current === 'number' ? data.current : 0
            const limit = typeof data.limit === 'number' ? data.limit : 1000
            setIteration(current, limit)
          }
          if (event === 'sandbox') {
            const sandboxId = typeof data.sandbox_id === 'string' ? data.sandbox_id : ''
            const provider = typeof data.provider === 'string' ? data.provider : 'novita'
            const rootPath = typeof data.root_path === 'string' ? data.root_path : '/home/user'
            setSandboxInfo(chatId, { sandboxId, provider, rootPath })
            setStatusLabel('Thinking...')
          }
          if (event === 'tool_call') {
            const dataSessionNames = data.session_names
            const sessionNames = Array.isArray(dataSessionNames) ? dataSessionNames.filter((s: unknown): s is string => typeof s === 'string') : undefined
            addToolChip(chatId, {
              id: createId('tool'),
              name: typeof data.name === 'string' ? data.name : 'tool',
              label: typeof data.label === 'string' ? data.label : 'Tool activity',
              filePath: typeof data.file_path === 'string' ? data.file_path : undefined,
              command: typeof data.command === 'string' ? data.command : undefined,
              sessionName: typeof data.session_name === 'string' && data.session_name ? data.session_name : 'default',
              sessionNames,
              path: typeof data.path === 'string' ? data.path : undefined,
              query: typeof data.query === 'string' ? data.query : undefined,
              url: typeof data.url === 'string' ? data.url : undefined,
              oldString: typeof data.old_string === 'string' ? data.old_string : undefined,
              newString: typeof data.new_string === 'string' ? data.new_string : undefined,
            })
          }
          if (event === 'tool_result') {
            updateLastToolChip(chatId, {
              ok: typeof data.ok === 'boolean' ? data.ok : undefined,
              resultData: typeof data.result === 'object' && data.result !== null ? data.result as Record<string, unknown> : undefined,
            })
          }
          if (event === 'subagent_start') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            const agent = typeof data.agent === 'string' ? data.agent : 'agent'
            addSubAgentChip(chatId, {
              id: createId('subagent'),
              session,
              agent,
              output: '',
              toolChips: [],
              status: 'running',
            })
          }
          if (event === 'subagent_token') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            const token = typeof data.value === 'string' ? data.value : ''
            appendSubAgentToken(chatId, session, token)
          }
          if (event === 'subagent_tool_call') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            addSubAgentToolChip(chatId, session, {
              id: createId('tool'),
              name: typeof data.name === 'string' ? data.name : 'tool',
              label: typeof data.label === 'string' ? data.label : 'Tool activity',
              filePath: typeof data.file_path === 'string' ? data.file_path : undefined,
              path: typeof data.path === 'string' ? data.path : undefined,
            })
          }
          if (event === 'subagent_tool_result') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            updateLastSubAgentToolChip(chatId, session, {
              ok: typeof data.ok === 'boolean' ? data.ok : undefined,
              resultData: typeof data.result === 'object' && data.result !== null ? data.result as Record<string, unknown> : undefined,
            })
          }
          if (event === 'subagent_complete') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            updateSubAgentStatus(chatId, session, 'completed')
          }
          if (event === 'subagent_error') {
            const session = typeof data.session === 'string' ? data.session : 'default'
            const message = typeof data.message === 'string' ? data.message : 'Sub-agent error'
            updateSubAgentStatus(chatId, session, 'error', message)
          }
          if (event === 'reasoning') {
            const token = typeof data.value === 'string' ? data.value : ''
            appendAssistantReasoning(chatId, token)
          }
          if (event === 'token') {
            const token = typeof data.value === 'string' ? data.value : ''
            appendAssistantToken(chatId, token)
          }
          if (event === 'message_complete') {
            const finalContent = typeof data.content === 'string' ? data.content : ''
            const finalReasoning = typeof data.reasoning === 'string' ? data.reasoning : undefined
            finalizeAssistantMessage(chatId, finalContent, finalReasoning)
            setStatusLabel('Ready')
          }
          if (event === 'error') {
            const message = typeof data.message === 'string' ? data.message : 'Unknown error'
            markAssistantError(chatId, message)
            setStatusLabel('Issue detected')
          }
          if (event === 'done') {
            setStreaming(false)
            setStatusLabel('Ready')
          }
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      markAssistantError(chatId, message)
      setStreaming(false)
      setStatusLabel('Issue detected')
      throw error
    }
  }, [
    activeChatId,
    addEvent,
    addToolChip,
    addSubAgentChip,
    addSubAgentToolChip,
    appendSubAgentToken,
    updateLastSubAgentToolChip,
    updateSubAgentStatus,
    addUserMessage,
    appendAssistantReasoning,
    appendAssistantToken,
    chats,
    finalizeAssistantMessage,
    markAssistantError,
    updateLastToolChip,
    novitaApiKey,
    novitaTemplateId,
    tavilyApiKey,
    firecrawlApiKey,
    providerBaseUrls,
    providerKeys,
    selectedModel,
    selectedProvider,
    setIteration,
    setSandboxInfo,
    setStatusLabel,
    setStreaming,
    startAssistantMessage,
  ])

  return { sendMessage }
}