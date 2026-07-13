import { env } from '@/lib/env'
import type { BackendMessage, ProviderId } from '@/types/chat'
import type { ProviderMetadata, ProviderModel } from '@/types/provider'
import type { SandboxFilesResponse } from '@/types/sandbox'

export interface StreamChatPayload {
  chat_id: string
  user_message: string
  history: BackendMessage[]
  provider: ProviderId
  model: string
  api_key: string
  base_url?: string
  sandbox: {
    api_key: string
    template_id?: string
    provider: 'novita'
    timeout_seconds: number
  }
  max_iterations: number
}

export async function fetchProviders(): Promise<ProviderMetadata[]> {
  const response = await fetch(`${env.backendUrl}/api/providers`)
  if (!response.ok) {
    throw new Error('Failed to load providers.')
  }
  return response.json()
}

export async function fetchModels(provider: ProviderId, apiKey: string, baseUrl?: string): Promise<ProviderModel[]> {
  const response = await fetch(`${env.backendUrl}/api/providers/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, api_key: apiKey, base_url: baseUrl || undefined }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to load models.')
  }

  const payload = await response.json()
  return payload.models as ProviderModel[]
}

export async function ensureChatSession(chatId: string, history: BackendMessage[]): Promise<void> {
  await fetch(`${env.backendUrl}/api/chat/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, history }),
  })
}

export async function fetchSandboxFiles(chatId: string): Promise<SandboxFilesResponse> {
  const params = new URLSearchParams({ chat_id: chatId, path: '/home/user', depth: '6' })
  const response = await fetch(`${env.backendUrl}/api/sandbox/files?${params}`)
  if (!response.ok) {
    throw new Error('No active sandbox yet.')
  }
  return response.json()
}

export async function fetchSandboxFileContent(chatId: string, filePath: string): Promise<string> {
  const params = new URLSearchParams({ chat_id: chatId, path: filePath })
  const response = await fetch(`${env.backendUrl}/api/sandbox/file-content?${params}`)
  if (!response.ok) {
    throw new Error('Failed to load file content.')
  }
  const data = await response.json()
  return data.content as string
}

export async function saveSandboxFileContent(chatId: string, filePath: string, content: string): Promise<void> {
  const response = await fetch(`${env.backendUrl}/api/sandbox/file-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, path: filePath, content }),
  })
  if (!response.ok) {
    throw new Error('Failed to save file.')
  }
}

export async function streamChat(payload: StreamChatPayload, onChunk: (event: string, data: Record<string, unknown>) => void): Promise<void> {
  const response = await fetch(`${env.backendUrl}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok || !response.body) {
    throw new Error('Chat stream failed to start.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim())
        }
      }

      if (!dataLines.length) {
        continue
      }

      const payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>
      onChunk(eventName, payload)
    }
  }
}