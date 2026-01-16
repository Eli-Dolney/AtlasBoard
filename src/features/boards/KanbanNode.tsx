import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'

type KanbanColumn = {
  id: string
  title: string
  items: KanbanItem[]
}

type KanbanItem = {
  id: string
  title: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: string
}

export default function KanbanNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [columns, setColumns] = useState<KanbanColumn[]>(
    data?.columns ?? [
      {
        id: 'todo',
        title: 'To Do',
        items: [
          { id: '1', title: 'Design system', priority: 'high' },
          { id: '2', title: 'API endpoints', priority: 'medium' },
        ],
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        items: [{ id: '3', title: 'User authentication', priority: 'high', assignee: 'John' }],
      },
      {
        id: 'done',
        title: 'Done',
        items: [{ id: '4', title: 'Database setup', priority: 'medium' }],
      },
    ]
  )

  useEffect(() => setColumns(data?.columns ?? []), [data?.columns])

  const commit = (next: KanbanColumn[]) => {
    setColumns(next)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, columns: next } } : n))
    )
  }

  const addColumn = () => {
    const newColumn: KanbanColumn = {
      id: `col_${Date.now()}`,
      title: 'New Column',
      items: [],
    }
    commit([...columns, newColumn])
  }

  const addItem = (columnId: string) => {
    const newItem: KanbanItem = {
      id: `item_${Date.now()}`,
      title: 'New Task',
    }
    commit(
      columns.map(col => (col.id === columnId ? { ...col, items: [...col.items, newItem] } : col))
    )
  }

  const moveItem = (itemId: string, fromColumnId: string, toColumnId: string) => {
    const item = columns.find(col => col.id === fromColumnId)?.items.find(i => i.id === itemId)
    if (!item) return

    commit(
      columns.map(col => {
        if (col.id === fromColumnId) {
          return { ...col, items: col.items.filter(i => i.id !== itemId) }
        }
        if (col.id === toColumnId) {
          return { ...col, items: [...col.items, item] }
        }
        return col
      })
    )
  }

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }

  return (
    <div
      className={`relative min-w-[400px] max-w-[600px] rounded-md border border-slate-300 bg-white p-4 shadow ${selected ? 'ring-2 ring-blue-400' : ''}`}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <button
          className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
          onPointerDown={e => e.stopPropagation()}
          onClick={addColumn}
        >
          + Column
        </button>
      </NodeToolbar>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map(column => (
          <div key={column.id} className="w-48 flex-shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">{column.title}</h3>
              <button
                className="text-xs text-slate-500 hover:text-slate-700"
                onClick={() => addItem(column.id)}
              >
                +
              </button>
            </div>

            <div className="min-h-[100px] space-y-2">
              {column.items.map(item => (
                <div key={item.id} className="rounded bg-slate-50 p-2 text-sm">
                  <div className="mb-1 font-medium text-slate-900">{item.title}</div>
                  <div className="flex items-center justify-between">
                    {item.priority && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${priorityColors[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                    )}
                    {item.assignee && (
                      <span className="text-xs text-slate-600">@{item.assignee}</span>
                    )}
                  </div>

                  <div className="mt-2 flex gap-1">
                    {columns.map(
                      col =>
                        col.id !== column.id && (
                          <button
                            key={col.id}
                            className="rounded bg-slate-200 px-1 py-0.5 text-xs hover:bg-slate-300"
                            onClick={() => moveItem(item.id, column.id, col.id)}
                          >
                            → {col.title}
                          </button>
                        )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
