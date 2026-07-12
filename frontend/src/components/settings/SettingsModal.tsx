import { Loader2, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useProviders } from '@/hooks/useProviders'
import { useSettingsStore } from '@/store/useSettingsStore'
import type { ProviderId } from '@/types/chat'

const providers: ProviderId[] = ['openrouter', 'groq', 'nvidia']

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    modelsByProvider,
    novitaApiKey,
    novitaTemplateId,
    providerBaseUrls,
    providerKeys,
    selectedModel,
    selectedProvider,
    setNovitaApiKey,
    setNovitaTemplateId,
    setProviderBaseUrl,
    setProviderKey,
    setSelectedModel,
    setSelectedProvider,
  } = useSettingsStore()
  const { error, loadingModels, loadModels } = useProviders()

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#090d14] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">Control plane</p>
            <h2 className="font-['Syne'] text-3xl text-white">Settings</h2>
          </div>
          <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onClose}>
            Close
          </Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <div className="mb-3 flex items-center gap-2 text-white">
                <Settings2 className="size-4 text-cyan-200" />
                <h3 className="font-medium">LLM providers</h3>
              </div>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider} className="space-y-2 rounded-[1.25rem] border border-white/8 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium capitalize text-white">{provider}</label>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => void loadModels(provider)}
                      >
                        {loadingModels && provider === selectedProvider ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Fetch models
                      </Button>
                    </div>
                    <input
                      value={providerKeys[provider]}
                      onChange={(event) => setProviderKey(provider, event.target.value)}
                      placeholder={`${provider.toUpperCase()} API key`}
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                    />
                    <input
                      value={providerBaseUrls[provider]}
                      onChange={(event) => setProviderBaseUrl(provider, event.target.value)}
                      placeholder="Base URL"
                      className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <h3 className="mb-3 text-sm font-medium text-white">Novita sandbox</h3>
              <div className="space-y-3">
                <input
                  value={novitaApiKey}
                  onChange={(event) => setNovitaApiKey(event.target.value)}
                  placeholder="Novita API key"
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                />
                <input
                  value={novitaTemplateId}
                  onChange={(event) => setNovitaTemplateId(event.target.value)}
                  placeholder="Optional custom sandbox template id"
                  className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
                />
                <p className="text-xs leading-6 text-white/50">Sandbox creation is automatic on the first message. Timeout is set to one hour with resume-friendly lifecycle handling.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <label className="mb-2 block text-sm font-medium text-white">Active provider</label>
              <select
                value={selectedProvider}
                onChange={(event) => setSelectedProvider(event.target.value as ProviderId)}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              >
                {providers.map((provider) => (
                  <option key={provider} value={provider} className="bg-slate-900">
                    {provider}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <label className="mb-2 block text-sm font-medium text-white">Model</label>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="bg-slate-900">Select model</option>
                {modelsByProvider[selectedProvider].map((model) => (
                  <option key={model.id} value={model.id} className="bg-slate-900">
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/8 p-4 text-sm leading-7 text-cyan-50/85">
              <p>Use native tool calling only. Models are fetched live from the selected provider after you add its key.</p>
            </div>

            {error ? <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div> : null}
          </div>
        </section>
      </div>
    </div>
  )
}