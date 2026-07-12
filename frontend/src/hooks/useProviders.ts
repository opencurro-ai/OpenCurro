import { useEffect, useState } from 'react'

import { fetchModels, fetchProviders } from '@/lib/api'
import { useSettingsStore } from '@/store/useSettingsStore'
import type { ProviderId } from '@/types/chat'

export function useProviders() {
  const {
    providerCatalog,
    providerKeys,
    providerBaseUrls,
    selectedProvider,
    selectedModel,
    setModelsForProvider,
    setProviderCatalog,
    setSelectedModel,
  } = useSettingsStore()
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingProviders(true)
        const providers = await fetchProviders()
        setProviderCatalog(providers)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load providers')
      } finally {
        setLoadingProviders(false)
      }
    }
    void run()
  }, [setProviderCatalog])

  const loadModels = async (provider: ProviderId = selectedProvider) => {
    const apiKey = providerKeys[provider]
    if (!apiKey) {
      setError(`Add a ${provider} API key first.`)
      return
    }

    try {
      setLoadingModels(true)
      setError('')
      const models = await fetchModels(provider, apiKey, providerBaseUrls[provider])
      setModelsForProvider(provider, models)
      if (provider === selectedProvider && !selectedModel && models[0]) {
        setSelectedModel(models[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoadingModels(false)
    }
  }

  return {
    providerCatalog,
    loadingProviders,
    loadingModels,
    error,
    loadModels,
  }
}