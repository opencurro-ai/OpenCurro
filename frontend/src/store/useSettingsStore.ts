import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ProviderId } from '@/types/chat'
import type { ProviderMetadata, ProviderModel } from '@/types/provider'

interface SettingsState {
  providerKeys: Record<ProviderId, string>
  providerBaseUrls: Record<ProviderId, string>
  selectedProvider: ProviderId
  selectedModel: string
  novitaApiKey: string
  novitaTemplateId: string
  tavilyApiKey: string
  firecrawlApiKey: string
  providerCatalog: ProviderMetadata[]
  modelsByProvider: Record<ProviderId, ProviderModel[]>
  setProviderKey: (provider: ProviderId, value: string) => void
  setProviderBaseUrl: (provider: ProviderId, value: string) => void
  setSelectedProvider: (provider: ProviderId) => void
  setSelectedModel: (model: string) => void
  setNovitaApiKey: (value: string) => void
  setNovitaTemplateId: (value: string) => void
  setTavilyApiKey: (value: string) => void
  setFirecrawlApiKey: (value: string) => void
  setProviderCatalog: (providers: ProviderMetadata[]) => void
  setModelsForProvider: (provider: ProviderId, models: ProviderModel[]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerKeys: { openrouter: '', groq: '', nvidia: '' },
      providerBaseUrls: {
        openrouter: 'https://openrouter.ai/api/v1',
        groq: 'https://api.groq.com/openai/v1',
        nvidia: 'https://integrate.api.nvidia.com/v1',
      },
      selectedProvider: 'openrouter',
      selectedModel: '',
      novitaApiKey: '',
      novitaTemplateId: '',
      tavilyApiKey: '',
      firecrawlApiKey: '',
      providerCatalog: [],
      modelsByProvider: { openrouter: [], groq: [], nvidia: [] },
      setProviderKey: (provider, value) => set((state) => ({ providerKeys: { ...state.providerKeys, [provider]: value } })),
      setProviderBaseUrl: (provider, value) => set((state) => ({ providerBaseUrls: { ...state.providerBaseUrls, [provider]: value } })),
      setSelectedProvider: (provider) => set({ selectedProvider: provider, selectedModel: '' }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setNovitaApiKey: (value) => set({ novitaApiKey: value }),
      setNovitaTemplateId: (value) => set({ novitaTemplateId: value }),
      setTavilyApiKey: (value) => set({ tavilyApiKey: value }),
      setFirecrawlApiKey: (value) => set({ firecrawlApiKey: value }),
      setProviderCatalog: (providerCatalog) => set({ providerCatalog }),
      setModelsForProvider: (provider, models) => set((state) => ({ modelsByProvider: { ...state.modelsByProvider, [provider]: models } })),
    }),
    {
      name: 'novita-agent-settings',
      partialize: (state) => ({
        providerKeys: state.providerKeys,
        providerBaseUrls: state.providerBaseUrls,
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        novitaApiKey: state.novitaApiKey,
        novitaTemplateId: state.novitaTemplateId,
        tavilyApiKey: state.tavilyApiKey,
        firecrawlApiKey: state.firecrawlApiKey,
        modelsByProvider: state.modelsByProvider,
      }),
    },
  ),
)