import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ComposerProps {
  disabled?: boolean
  isStreaming: boolean
  placeholder: string
  onSubmit: (value: string) => Promise<void>
}

export function Composer({ disabled, isStreaming, placeholder, onSubmit }: ComposerProps) {
  const [value, setValue] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextValue = value.trim()
    if (!nextValue || disabled || isStreaming) {
      return
    }
    setValue('')
    await onSubmit(nextValue)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-black/30 p-3 backdrop-blur-xl">
      <div className="flex items-end gap-3">
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          rows={4}
          className="min-h-[112px] flex-1 resize-none rounded-[1.5rem] border border-white/8 bg-white/5 px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || isStreaming || !value.trim()}
          className="size-14 rounded-[1.25rem] bg-cyan-300 text-slate-950 hover:bg-cyan-200"
        >
          {isStreaming ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </Button>
      </div>
    </form>
  )
}