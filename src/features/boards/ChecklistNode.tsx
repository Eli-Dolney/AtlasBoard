import React, { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'

type ChecklistItem = { id: string; text: string; done: boolean }

export default function ChecklistNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [items, setItems] = useState<ChecklistItem[]>(
    data?.items ?? [{ id: `${Date.now()}_1`, text: 'New item', done: false }]
  )

  useEffect(() => setItems(data?.items ?? []), [data?.items])

  const commit = (next: ChecklistItem[]) => {
    setItems(next)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, items: next } } : n))
    )
  }

  const addItem = () =>
    commit(items.concat({ id: `${Date.now()}_${Math.random()}`, text: 'New item', done: false }))

  return (
    <div
      className={`relative min-w-[200px] rounded-md border border-slate-300 bg-white p-3 shadow ${selected ? 'ring-2 ring-blue-400' : ''}`}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <button
          className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
          onPointerDown={e => e.stopPropagation()}
          onClick={addItem}
        >
          Add item
        </button>
      </NodeToolbar>

      <div className="space-y-1">
        {items.map((it, idx) => (
          <div key={it.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={it.done}
              onChange={e => {
                const next = items.slice()
                next[idx] = { ...it, done: e.target.checked }
                commit(next)
              }}
              onPointerDown={e => e.stopPropagation()}
            />
            <input
              className={`flex-1 bg-white text-neutral-900 outline-none ${it.done ? 'text-slate-500 line-through' : ''}`}
              value={it.text}
              onChange={e => {
                const next = items.slice()
                next[idx] = { ...it, text: e.target.value }
                commit(next)
              }}
              onPointerDown={e => e.stopPropagation()}
            />
            <button
              className="text-rose-600"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => commit(items.filter(x => x.id !== it.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
