import { useEffect, useState, useRef } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'

type ChecklistItem = { id: string; text: string; done: boolean }

export default function ChecklistNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [items, setItems] = useState<ChecklistItem[]>(
    data?.items ?? [{ id: `${Date.now()}_1`, text: 'New item', done: false }]
  )
  const [title, setTitle] = useState<string>(data?.title ?? 'Checklist')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const newItemRef = useRef<HTMLInputElement>(null)

  useEffect(() => setItems(data?.items ?? []), [data?.items])
  useEffect(() => setTitle(data?.title ?? 'Checklist'), [data?.title])

  const commit = (next: ChecklistItem[]) => {
    setItems(next)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, items: next } } : n))
    )
  }

  const commitTitle = (newTitle: string) => {
    setTitle(newTitle)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, title: newTitle } } : n))
    )
    setIsEditingTitle(false)
  }

  const addItem = (text = 'New item') =>
    commit(items.concat({ id: `${Date.now()}_${Math.random()}`, text, done: false }))

  const toggleAll = (done: boolean) => {
    commit(items.map(it => ({ ...it, done })))
  }

  const removeCompleted = () => {
    commit(items.filter(it => !it.done))
  }

  const completedCount = items.filter(it => it.done).length
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0

  return (
    <div
      className={`relative min-w-[240px] max-w-[320px] transition-all duration-200 ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      style={{ filter: selected ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 p-1.5 rounded-lg bg-white shadow-lg border border-slate-200">
        <button
          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-600"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => {
            addItem()
            setTimeout(() => newItemRef.current?.focus(), 100)
          }}
        >
          ➕ Add
        </button>
        <button
          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-600"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => toggleAll(true)}
        >
          ✅ All
        </button>
        <button
          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-600"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => toggleAll(false)}
        >
          ⬜ None
        </button>
        <button
          className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-red-600"
          onPointerDown={e => e.stopPropagation()}
          onClick={removeCompleted}
        >
          🗑️ Clear Done
        </button>
      </NodeToolbar>

      <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          {isEditingTitle ? (
            <input
              ref={titleRef}
              className="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => commitTitle(title)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitle(title)
                if (e.key === 'Escape') setIsEditingTitle(false)
              }}
              onPointerDown={e => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onDoubleClick={() => {
                setIsEditingTitle(true)
                setTimeout(() => titleRef.current?.focus(), 0)
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-600">
                {completedCount}/{items.length}
              </span>
            </div>
          )}
          
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
          {items.map((it, idx) => (
            <div 
              key={it.id} 
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
                it.done ? 'bg-slate-50' : 'hover:bg-slate-50'
              }`}
            >
              <button
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  it.done 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-slate-300 hover:border-green-400'
                }`}
                onClick={e => {
                  e.stopPropagation()
                  const next = items.slice()
                  next[idx] = { ...it, done: !it.done }
                  commit(next)
                }}
                onPointerDown={e => e.stopPropagation()}
              >
                {it.done && <span className="text-xs">✓</span>}
              </button>
              <input
                ref={idx === items.length - 1 ? newItemRef : undefined}
                className={`flex-1 text-sm bg-transparent outline-none ${
                  it.done ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
                value={it.text}
                onChange={e => {
                  const next = items.slice()
                  next[idx] = { ...it, text: e.target.value }
                  commit(next)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                    setTimeout(() => newItemRef.current?.focus(), 100)
                  }
                  if (e.key === 'Backspace' && it.text === '' && items.length > 1) {
                    e.preventDefault()
                    commit(items.filter(x => x.id !== it.id))
                  }
                }}
                onPointerDown={e => e.stopPropagation()}
              />
              <button
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-red-500 text-xs p-1 rounded"
                onPointerDown={e => e.stopPropagation()}
                onClick={() => commit(items.filter(x => x.id !== it.id))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add new item */}
        <div className="px-4 py-2 border-t border-slate-100">
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => {
              addItem()
              setTimeout(() => newItemRef.current?.focus(), 100)
            }}
          >
            <span>+</span>
            <span>Add item</span>
          </button>
        </div>
      </div>

      <Handle 
        type="target" 
        position={Position.Top}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  )
}
