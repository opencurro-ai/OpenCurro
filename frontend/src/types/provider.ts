import type { ProviderId } from './chat'

export interface ProviderMetadata {
  id: ProviderId
  label: string
  default_base_url: string
  supports_tools: boolean
  supports_streaming: boolean
}

export interface ProviderModel {
  id: string
  provider: ProviderId
  label: string
  owned_by?: string | null
  supports_tools?: boolean | null
  context_window?: number | null
}

export interface ProviderSettings {
  providerKeys: Record<ProviderId, string>
  providerBaseUrls: Record<ProviderId, string>
  selectedProvider: ProviderId
  selectedModel: string
  novitaApiKey: string
  novitaTemplateId: string
}