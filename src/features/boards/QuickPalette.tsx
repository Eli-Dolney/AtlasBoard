import React, { useEffect } from 'react'

type QuickPaletteProps = {
  open: boolean
  onClose: () => void
  actions: Array<{ key: string; label: string; hint?: string; run: () => void }>
}

export default function QuickPalette({ open, onClose, actions }: QuickPaletteProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[560px] rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 text-sm font-medium">Quick Create</div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm shadow hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
              onClick={() => {
                a.run()
                onClose()
              }}
            >
              <div className="font-medium">{a.label}</div>
              {a.hint && <div className="text-xs text-neutral-500">{a.hint}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


