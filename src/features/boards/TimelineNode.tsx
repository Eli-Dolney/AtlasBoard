import React, { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'

type TimelineEvent = {
  id: string
  title: string
  date: string
  description?: string
  type: 'milestone' | 'task' | 'deadline'
  status?: 'pending' | 'in-progress' | 'completed'
}

export default function TimelineNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [events, setEvents] = useState<TimelineEvent[]>(
    data?.events ?? [
      {
        id: '1',
        title: 'Project Kickoff',
        date: '2024-01-15',
        description: 'Initial project meeting and goal setting',
        type: 'milestone',
        status: 'completed',
      },
      {
        id: '2',
        title: 'Design Phase',
        date: '2024-02-01',
        description: 'UI/UX design and wireframing',
        type: 'task',
        status: 'in-progress',
      },
      {
        id: '3',
        title: 'MVP Release',
        date: '2024-03-15',
        description: 'First version ready for testing',
        type: 'milestone',
      },
      {
        id: '4',
        title: 'User Testing',
        date: '2024-04-01',
        description: 'Gather feedback from beta users',
        type: 'task',
      },
      {
        id: '5',
        title: 'Final Launch',
        date: '2024-05-01',
        description: 'Public release of the product',
        type: 'milestone',
      },
    ]
  )

  useEffect(() => setEvents(data?.events ?? []), [data?.events])

  const commit = (next: TimelineEvent[]) => {
    setEvents(next)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, events: next } } : n))
    )
  }

  const addEvent = () => {
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}`,
      title: 'New Event',
      date: new Date().toISOString().split('T')[0],
      type: 'task',
      status: 'pending',
    }
    commit([...events, newEvent])
  }

  const updateEvent = (eventId: string, updates: Partial<TimelineEvent>) => {
    commit(events.map(event => (event.id === eventId ? { ...event, ...updates } : event)))
  }

  const removeEvent = (eventId: string) => {
    commit(events.filter(event => event.id !== eventId))
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const typeColors = {
    milestone: 'bg-purple-100 text-purple-800 border-purple-200',
    task: 'bg-blue-100 text-blue-800 border-blue-200',
    deadline: 'bg-red-100 text-red-800 border-red-200',
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
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
          <div className="text-sm text-slate-600">{events.length} events</div>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-slate-200"></div>

          <div className="space-y-4">
            {sortedEvents.map((event, index) => (
              <div key={event.id} className="relative flex items-start gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 h-3 w-3 rounded-full border-2 border-white ${typeColors[event.type].replace('text-', 'bg-').replace('-800', '-500')}`}
                ></div>

                {/* Event card */}
                <div className={`flex-1 rounded-lg border p-3 ${typeColors[event.type]}`}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1 font-medium text-slate-900">{event.title}</h4>
                      <p className="mb-2 text-sm text-slate-600">{event.description}</p>
                      <div className="text-sm font-medium text-slate-700">
                        📅 {new Date(event.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      {event.status && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${statusColors[event.status]}`}
                        >
                          {event.status}
                        </span>
                      )}

                      <select
                        className="rounded border px-2 py-1 text-xs"
                        value={event.type}
                        onChange={e =>
                          updateEvent(event.id, { type: e.target.value as TimelineEvent['type'] })
                        }
                      >
                        <option value="milestone">Milestone</option>
                        <option value="task">Task</option>
                        <option value="deadline">Deadline</option>
                      </select>

                      <button
                        className="text-xs text-red-600 hover:text-red-800"
                        onClick={() => removeEvent(event.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={event.status || 'pending'}
                      onChange={e =>
                        updateEvent(event.id, { status: e.target.value as TimelineEvent['status'] })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>

                    <input
                      type="date"
                      className="rounded border px-2 py-1 text-sm"
                      value={event.date}
                      onChange={e => updateEvent(event.id, { date: e.target.value })}
                    />

                    <input
                      type="text"
                      className="flex-1 rounded border px-2 py-1 text-sm"
                      placeholder="Assignee (optional)"
                      value={event.assignee || ''}
                      onChange={e => updateEvent(event.id, { assignee: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
