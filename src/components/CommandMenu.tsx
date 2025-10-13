import React from 'react'

export type Command = {
  id: string
  label: string
  hint?: string
  run: () => void
}

export default function CommandMenu({
  open,
  onClose,
  commands,
}: {
  open: boolean
  onClose: () => void
  commands: Command[]
}) {
  const [query, setQuery] = React.useState('')
  const [index, setIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c => c.label.toLowerCase().includes(q))
  }, [commands, query])

  React.useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex(i => Math.min(i + 1, Math.max(0, filtered.length - 1)))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[index]
        if (cmd) {
          onClose()
          cmd.run()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, index, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-8">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[640px] rounded-xl border border-neutral-200 bg-white p-3 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <input
          ref={inputRef}
          className="input mb-2 w-full"
          placeholder="Type a command..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <div className="max-h-80 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          {filtered.length === 0 && <div className="p-3 text-sm text-neutral-500">No results</div>}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${i === index ? 'bg-neutral-100 dark:bg-neutral-800' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                onClose()
                c.run()
              }}
            >
              <span>{c.label}</span>
              {c.hint && <span className="text-xs text-neutral-500">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
