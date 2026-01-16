import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'
import { db, type Task } from '../../lib/db'

const WORKSPACE_ID = 'default-ws'

export default function TimelineNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [tasks, setTasks] = useState<Task[]>([])

  // Migration effect: Move local events to global tasks DB
  useEffect(() => {
    if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
      const migrate = async () => {
        let list = await db.lists.where('workspaceId').equals(WORKSPACE_ID).first()
        if (!list) {
          const listId = `l_${Date.now()}`
          await db.lists.put({ id: listId, workspaceId: WORKSPACE_ID, title: 'General', sort: 0 })
          list = { id: listId } as any
        }

        for (const e of data.events) {
          const newTask: Task = {
            id: `t_migrated_${Date.now()}_${e.id}`,
            listId: list!.id,
            title: e.title,
            description: e.description,
            dueAt: new Date(e.date).getTime(),
            status: e.status || 'not-started',
            nodeId: id,
            tags: [e.type || 'task'],
            sort: Date.now(),
          }
          await db.tasks.put(newTask)
        }

        // Clear local events so we don't migrate again
        setNodes(nds =>
          nds.map(n => (n.id === id ? { ...n, data: { ...n.data, events: [] } } : n))
        )
      }
      void migrate()
    }
  }, [data?.events, id, setNodes])

  // Load tasks linked to this node
  useEffect(() => {
    const load = async () => {
      const linkedTasks = await db.tasks.where('nodeId').equals(id).toArray()
      setTasks(linkedTasks)
    }
    void load()
    const interval = setInterval(load, 1000)
    return () => clearInterval(interval)
  }, [id])

  const addEvent = async () => {
    let list = await db.lists.where('workspaceId').equals(WORKSPACE_ID).first()
    if (!list) {
      const listId = `l_${Date.now()}`
      await db.lists.put({ id: listId, workspaceId: WORKSPACE_ID, title: 'General', sort: 0 })
      list = { id: listId } as any
    }

    const newTask: Task = {
      id: `t_${Date.now()}`,
      listId: list!.id,
      title: 'New Event',
      dueAt: Date.now(),
      status: 'not-started',
      nodeId: id,
      tags: ['task'],
      sort: Date.now(),
    }
    await db.tasks.put(newTask)
    setTasks(prev => [...prev, newTask])
  }

  const updateEvent = async (taskId: string, updates: Partial<Task>) => {
    await db.tasks.update(taskId, updates)
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)))
  }

  const removeEvent = async (taskId: string) => {
    await db.tasks.delete(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const sortedTasks = [...tasks].sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))

  const typeColors: Record<string, string> = {
    milestone: 'bg-purple-100 text-purple-800 border-purple-200',
    task: 'bg-blue-100 text-blue-800 border-blue-200',
    deadline: 'bg-red-100 text-red-800 border-red-200',
  }

  const statusColors: Record<string, string> = {
    'not-started': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    blocked: 'bg-red-100 text-red-800',
    done: 'bg-green-100 text-green-800',
  }

  return (
    <div
      className={`relative min-w-[500px] max-w-[700px] rounded-md border border-slate-300 bg-white p-4 shadow ${selected ? 'ring-2 ring-blue-400' : ''}`}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <button
          className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
          onPointerDown={e => e.stopPropagation()}
          onClick={addEvent}
        >
          + Event
        </button>
      </NodeToolbar>

      <div className="space-y-3">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Timeline</h3>
          <div className="text-sm text-slate-600">{tasks.length} events</div>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-slate-200"></div>

          <div className="space-y-4">
            {sortedTasks.map(task => {
              const type =
                task.tags?.find(t => ['milestone', 'deadline'].includes(t)) || 'task'

              return (
                <div key={task.id} className="relative flex items-start gap-4">
                  <div
                    className={`relative z-10 h-3 w-3 rounded-full border-2 border-white ${typeColors[type]?.replace('text-', 'bg-').replace('-800', '-500') ?? 'bg-blue-500'}`}
                  ></div>

                  <div className={`flex-1 rounded-lg border p-3 ${typeColors[type] ?? 'bg-white'}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <input
                          className="mb-1 w-full bg-transparent font-medium text-slate-900 focus:outline-none"
                          value={task.title}
                          onChange={e => updateEvent(task.id, { title: e.target.value })}
                        />
                        <input
                          className="mb-2 w-full bg-transparent text-sm text-slate-600 focus:outline-none"
                          placeholder="Description..."
                          value={task.description || ''}
                          onChange={e => updateEvent(task.id, { description: e.target.value })}
                        />
                        <div className="text-sm font-medium text-slate-700">
                          📅 {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No date'}
                        </div>
                      </div>

                      <div className="ml-4 flex items-center gap-2">
                        {task.status && (
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${statusColors[task.status]}`}
                          >
                            {task.status}
                          </span>
                        )}

                        <select
                          className="rounded border px-2 py-1 text-xs"
                          value={type}
                          onChange={e => {
                            const newType = e.target.value
                            const oldTags = (task.tags || []).filter(
                              t => !['milestone', 'deadline', 'task'].includes(t)
                            )
                            updateEvent(task.id, { tags: [...oldTags, newType] })
                          }}
                        >
                          <option value="milestone">Milestone</option>
                          <option value="task">Task</option>
                          <option value="deadline">Deadline</option>
                        </select>

                        <button
                          className="text-xs text-red-600 hover:text-red-800"
                          onClick={() => removeEvent(task.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <select
                        className="rounded border px-2 py-1 text-sm"
                        value={task.status || 'not-started'}
                        onChange={e =>
                          updateEvent(task.id, { status: e.target.value as Task['status'] })
                        }
                      >
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="done">Completed</option>
                      </select>

                      <input
                        type="date"
                        className="rounded border px-2 py-1 text-sm"
                        value={
                          task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : ''
                        }
                        onChange={e =>
                          updateEvent(task.id, {
                            dueAt: e.target.value
                              ? new Date(e.target.value + 'T00:00:00').getTime()
                              : undefined,
                          })
                        }
                      />

                      <input
                        type="text"
                        className="flex-1 rounded border px-2 py-1 text-sm"
                        placeholder="Assignee (optional)"
                        value={task.assignee || ''}
                        onChange={e => updateEvent(task.id, { assignee: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
