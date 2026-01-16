import { useEffect, useState, useMemo } from 'react'

type QuickAction = {
  key: string
  label: string
  hint?: string
  icon?: string
  category: string
  run: () => void
}

type QuickPaletteProps = {
  open: boolean
  onClose: () => void
  actions: QuickAction[]
}

const categoryOrder = ['Nodes', 'Attachments', 'Templates', 'Navigation']
const categoryIcons: Record<string, string> = {
  'Nodes': '🔷',
  'Attachments': '📎',
  'Templates': '📋',
  'Navigation': '🧭',
}

export default function QuickPalette({ open, onClose, actions }: QuickPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Group actions by category
  const groupedActions = useMemo(() => {
    const filtered = search 
      ? actions.filter(a => a.label.toLowerCase().includes(search.toLowerCase()))
      : actions
    
    const groups: Record<string, QuickAction[]> = {}
    for (const action of filtered) {
      const cat = action.category || 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(action)
    }
    return groups
  }, [actions, search])

  // Flat list for keyboard navigation
  const flatActions = useMemo(() => {
    const result: QuickAction[] = []
    for (const cat of categoryOrder) {
      if (groupedActions[cat]) {
        result.push(...groupedActions[cat])
      }
    }
    // Add any categories not in the order
    for (const cat of Object.keys(groupedActions)) {
      if (!categoryOrder.includes(cat)) {
        result.push(...groupedActions[cat])
      }
    }
    return result
  }, [groupedActions])

  useEffect(() => {
    setSearch('')
    setSelectedIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatActions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && flatActions[selectedIndex]) {
        e.preventDefault()
        flatActions[selectedIndex].run()
        onClose()
        return
      }
    }
    
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, flatActions, selectedIndex])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24">
      <div 
        className="absolute inset-0" 
        style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose} 
      />
      <div 
        className="relative w-[600px] max-h-[70vh] overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-light)' }}
      >
        {/* Search Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">⚡</span>
            <input
              type="text"
              placeholder="What do you want to create?"
              className="w-full pl-10 pr-4 py-3 text-lg rounded-xl outline-none"
              style={{ 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-primary)',
                border: '2px solid transparent'
              }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
            Use ↑↓ to navigate, Enter to select, Esc to close
          </p>
        </div>

        {/* Actions List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          {flatActions.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
              No matching actions found
            </div>
          ) : (
            categoryOrder.map(category => {
              const categoryActions = groupedActions[category]
              if (!categoryActions || categoryActions.length === 0) return null
              
              return (
                <div key={category}>
                  <div 
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider sticky top-0"
                    style={{ 
                      color: 'var(--text-tertiary)', 
                      background: 'var(--bg-secondary)'
                    }}
                  >
                    {categoryIcons[category]} {category}
                  </div>
                  <div className="px-2 pb-2">
                    {categoryActions.map((action, i) => {
                      const globalIndex = flatActions.findIndex(a => a.key === action.key)
                      const isSelected = globalIndex === selectedIndex
                      
                      return (
                        <button
                          key={action.key}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                            isSelected ? 'scale-[1.02]' : ''
                          }`}
                          style={{
                            background: isSelected ? 'var(--brand-primary)' : 'transparent',
                            color: isSelected ? 'white' : 'var(--text-primary)'
                          }}
                          onClick={() => {
                            action.run()
                            onClose()
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <span className="text-xl w-8 text-center">
                            {action.icon || '•'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{action.label}</div>
                            {action.hint && (
                              <div 
                                className="text-xs"
                                style={{ 
                                  color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' 
                                }}
                              >
                                {action.hint}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Tips */}
        <div 
          className="p-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor: 'var(--border-light)', color: 'var(--text-tertiary)' }}
        >
          <span>💡 Tip: Press <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>Q</kbd> anytime to open Quick Create</span>
          <span>Press <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>⌘K</kbd> for command menu</span>
        </div>
      </div>
    </div>
  )
}
