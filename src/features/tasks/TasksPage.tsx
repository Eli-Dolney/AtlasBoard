import React, { useMemo, useState, useCallback } from 'react'
import Kanban from './Kanban'
import { db, type Task, type TaskList } from '../../lib/db'
import { onCreateTaskList, onOpenTask, emitOpenTask } from '../../lib/events'
import { useLiveQuery } from 'dexie-react-hooks'
import TaskDetailModal from '../../components/TaskDetailModal'

function useTasks(workspaceId: string) {
  const lists = useLiveQuery(
    () => db.lists.where('workspaceId').equals(workspaceId).sortBy('sort'),
    [workspaceId],
    []
  )
  const tasks = useLiveQuery(
    () => db.tasks.toArray(),
    [],
    []
  )
  return { lists: lists ?? [], tasks: tasks ?? [] }
}

// ============================================
// FILTERS BAR COMPONENT
// ============================================
function FiltersBar({ 
  tasks, 
  onChange,
  viewOptions
}: { 
  tasks: Task[]
  onChange: (filtered: Task[]) => void
  viewOptions?: React.ReactNode
}) {
  const [assignee, setAssignee] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [tag, setTag] = useState<string>('')
  const [priority, setPriority] = useState<string>('')

  React.useEffect(() => {
    let next = tasks
    if (assignee) next = next.filter(t => (t.assignee ?? '') === assignee)
    if (status) next = next.filter(t => (t.status ?? 'not-started') === status)
    if (tag) next = next.filter(t => (t.tags ?? []).includes(tag))
    if (priority) next = next.filter(t => (t.priority ?? 'medium') === priority)
    onChange(next)
  }, [assignee, status, tag, priority, tasks, onChange])

  const allAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[]
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags ?? [])))

  const clearFilters = () => {
    setAssignee('')
    setStatus('')
    setTag('')
    setPriority('')
  }

  const hasFilters = assignee || status || tag || priority

  return (
    <div className="filters-bar">
      <select
        className="filter-select"
        value={status}
        onChange={e => setStatus(e.target.value)}
      >
        <option value="">All Status</option>
        <option value="not-started">To Do</option>
        <option value="in-progress">In Progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
      </select>

      <select
        className="filter-select"
        value={priority}
        onChange={e => setPriority(e.target.value)}
      >
        <option value="">All Priority</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      {allAssignees.length > 0 && (
        <select
          className="filter-select"
          value={assignee}
          onChange={e => setAssignee(e.target.value)}
        >
          <option value="">All Assignees</option>
          {allAssignees.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      )}

      {allTags.length > 0 && (
        <select
          className="filter-select"
          value={tag}
          onChange={e => setTag(e.target.value)}
        >
          <option value="">All Tags</option>
          {allTags.map(t => (
            <option key={t} value={t}>#{t}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button 
          className="btn btn-ghost btn-sm"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {allTags.slice(0, 4).map(t => (
          <button
            key={t}
            className={`filter-tag ${tag === t ? 'active' : ''}`}
            style={tag === t ? { background: 'var(--brand-primary)', color: 'white' } : {}}
            onClick={() => setTag(tag === t ? '' : t)}
          >
            #{t}
          </button>
        ))}
        {viewOptions}
      </div>
    </div>
  )
}

// ============================================
// TIMELINE VIEW
// ============================================
function TimelineView({ workspaceId }: { workspaceId: string }) {
  const { lists, tasks } = useTasks(workspaceId)
  const DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const minDue = tasks
    .filter(t => t.dueAt)
    .reduce<number | null>((acc, t) => (acc === null ? (t.dueAt as number) : Math.min(acc, t.dueAt as number)), null)
  const maxDue = tasks
    .filter(t => t.dueAt)
    .reduce<number | null>((acc, t) => (acc === null ? (t.dueAt as number) : Math.max(acc, t.dueAt as number)), null)
  
  const start = new Date((minDue ?? now.getTime()) - 7 * DAY)
  start.setHours(0, 0, 0, 0)
  const end = new Date((maxDue ?? now.getTime()) + 14 * DAY)
  end.setHours(0, 0, 0, 0)
  const total = end.getTime() - start.getTime()
  
  const days: Date[] = []
  for (let t = start.getTime(); t <= end.getTime(); t += DAY) days.push(new Date(t))
  
  const byList = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!m[t.listId]) m[t.listId] = []
      m[t.listId].push(t)
    }
    return m
  }, [tasks])
  
  const pct = (ms: number) => `${(ms / total) * 100}%`

  const statusColors: Record<string, string> = {
    'not-started': 'var(--status-todo)',
    'in-progress': 'var(--status-in-progress)',
    'blocked': 'var(--status-blocked)',
    'done': 'var(--status-done)',
  }

  return (
    <div className="p-6">
      <div 
        className="sticky top-0 z-10 mb-4 flex items-center rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        {days.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString()
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <div
              key={d.toISOString()}
              className="text-center py-2"
              style={{ 
                width: `${100 / days.length}%`,
                borderLeft: i > 0 ? '1px solid var(--border-light)' : 'none',
                background: isToday ? 'rgba(99, 102, 241, 0.1)' : isWeekend ? 'var(--bg-tertiary)' : 'transparent',
                color: isToday ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                fontWeight: isToday ? 600 : 400
              }}
            >
              <div className="text-xs">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="text-sm">{d.getDate()}</div>
            </div>
          )
        })}
      </div>
      
      <div className="space-y-4">
        {lists.map(list => (
          <div
            key={list.id}
            className="card"
          >
            <div className="card-header">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{list.title}</span>
              <span className="badge badge-default">{(byList[list.id] ?? []).length} tasks</span>
            </div>
            <div 
              className="relative overflow-x-hidden"
              style={{ height: 80, background: 'var(--bg-secondary)', padding: '8px' }}
            >
              {(byList[list.id] ?? []).map((t, idx) => {
                const due = t.dueAt ?? now.getTime()
                const est = (t.estimateMinutes ?? 480) * 60 * 1000
                const barStart = Math.max(start.getTime(), due - est)
                const barEnd = Math.min(end.getTime(), due)
                const left = pct(barStart - start.getTime())
                const width = pct(Math.max(2, barEnd - barStart))
                const color = statusColors[t.status || 'not-started']
                return (
                  <div
                    key={t.id}
                    className="absolute truncate rounded-md px-2 py-1 text-xs text-white cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{ 
                      left, 
                      width, 
                      background: color,
                      top: `${12 + (idx % 2) * 28}px`
                    }}
                    title={`${t.title} • due ${new Date(due).toLocaleDateString()}`}
                    onClick={() => emitOpenTask({ taskId: t.id, view: 'list' })}
                  >
                    {t.title}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// LIST VIEW
// ============================================
function ListView({ workspaceId, focusId }: { workspaceId: string; focusId?: string | null }) {
  const { lists, tasks } = useTasks(workspaceId)
  const listsById = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists])
  const [filtered, setFiltered] = useState<Task[]>(tasks)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  React.useEffect(() => setFiltered(tasks), [tasks])
  
  React.useEffect(() => {
    if (focusId) {
      setTimeout(() => {
        const el = document.getElementById(`task-row-${focusId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [focusId, filtered])

  const statusColors: Record<string, string> = {
    'not-started': 'var(--status-todo)',
    'in-progress': 'var(--status-in-progress)',
    'blocked': 'var(--status-blocked)',
    'done': 'var(--status-done)',
  }

  const priorityColors: Record<string, string> = {
    'low': 'var(--priority-low)',
    'medium': 'var(--priority-medium)',
    'high': 'var(--priority-high)',
  }

  return (
    <div>
      <FiltersBar tasks={tasks} onChange={setFiltered} />
      
      <div className="table-container m-4">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Task</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 100 }}>Priority</th>
                <th style={{ width: 120 }}>Due Date</th>
                <th style={{ width: 120 }}>Assignee</th>
                <th style={{ width: 140 }}>List</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => a.sort - b.sort).map(t => (
                <tr 
                  key={t.id}
                  id={`task-row-${t.id}`}
                  className="cursor-pointer"
                  style={focusId === t.id ? { background: 'rgba(99, 102, 241, 0.1)' } : {}}
                  onClick={() => setSelectedTaskId(t.id)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={t.status === 'done'}
                      onChange={async (e) => {
                        e.stopPropagation()
                        await db.tasks.update(t.id, { 
                          status: e.target.checked ? 'done' : 'not-started' 
                        })
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--brand-primary)' }}
                    />
                  </td>
                  <td>
                    <div 
                      className="font-medium"
                      style={{ 
                        color: 'var(--text-primary)',
                        textDecoration: t.status === 'done' ? 'line-through' : 'none',
                        opacity: t.status === 'done' ? 0.6 : 1
                      }}
                    >
                      {t.title}
                    </div>
                    {(t.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {t.tags!.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <span 
                      className="badge"
                      style={{
                        background: `${statusColors[t.status || 'not-started']}20`,
                        color: statusColors[t.status || 'not-started']
                      }}
                    >
                      {t.status === 'not-started' ? 'To Do' :
                       t.status === 'in-progress' ? 'In Progress' :
                       t.status === 'blocked' ? 'Blocked' : 'Done'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div 
                        className="priority-indicator"
                        style={{ background: priorityColors[t.priority || 'medium'] }}
                      />
                      <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                        {t.priority || 'Medium'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {t.dueAt ? (
                      <span 
                        className="text-sm"
                        style={{ 
                          color: new Date(t.dueAt) < new Date() && t.status !== 'done' 
                            ? 'var(--color-error)' 
                            : 'var(--text-secondary)'
                        }}
                      >
                        {new Date(t.dueAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {t.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">
                          {t.assignee.charAt(0)}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {t.assignee}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="tag">{listsById[t.listId]?.title ?? 'Unknown'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}

// ============================================
// CALENDAR VIEW
// ============================================
function CalendarView({ workspaceId }: { workspaceId: string }) {
  const { tasks } = useTasks(workspaceId)
  const [cursor, setCursor] = useState(new Date())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const days = [...Array(42)].map(
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  )
  
  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.dueAt) continue
      const key = new Date(new Date(t.dueAt).toISOString().slice(0, 10)).toDateString()
      if (!m[key]) m[key] = []
      m[key].push(t)
    }
    return m
  }, [tasks])

  const addTaskAtDate = async (date: Date) => {
    const list = await db.lists.where('workspaceId').equals(workspaceId).first()
    const listId = list?.id ?? `l_${Date.now()}`
    if (!list) {
      await db.lists.put({ id: listId, workspaceId, title: 'General', sort: 0 })
    }

    const task: Task = {
      id: `t_${Date.now()}`,
      listId,
      title: 'New Task',
      dueAt: date.getTime(),
      status: 'not-started',
      sort: Date.now()
    }
    await db.tasks.put(task)
    setSelectedTaskId(task.id)
  }

  const statusColors: Record<string, string> = {
    'not-started': 'var(--brand-primary)',
    'in-progress': 'var(--status-in-progress)',
    'blocked': 'var(--status-blocked)',
    'done': 'var(--status-done)',
  }

  return (
    <div className="p-6">
      <div className="calendar">
        <div className="calendar-header">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            ← Prev
          </button>
          <span className="calendar-title">
            {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCursor(new Date())}
            >
              Today
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              Next →
            </button>
          </div>
        </div>
        
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>
        
        <div className="calendar-grid">
          {days.map((d, i) => {
            const key = new Date(d.toISOString().slice(0, 10)).toDateString()
            const dayTasks = tasksByDay[key] ?? []
            const inMonth = d.getMonth() === month
            const isToday = new Date().toDateString() === key
            
            return (
              <div
                key={`${key}-${i}`}
                className={`calendar-day ${!inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    addTaskAtDate(d)
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="calendar-day-number">{d.getDate()}</span>
                  {inMonth && (
                    <button 
                      className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100"
                      style={{ width: 20, height: 20, fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        addTaskAtDate(d)
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="calendar-day-events">
                  {dayTasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className={`calendar-event ${t.status === 'done' ? 'done' : ''}`}
                      style={{ 
                        background: statusColors[t.status || 'not-started'],
                        opacity: t.status === 'done' ? 0.6 : 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTaskId(t.id)
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div 
                      className="text-xs text-center py-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}

// ============================================
// MY TASKS VIEW
// ============================================
function MyTasksView({ workspaceId }: { workspaceId: string }) {
  const { tasks } = useTasks(workspaceId)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 7)
  
  const mine = tasks.filter(t => !t.assignee || t.assignee === '')
  const overdue = mine.filter(
    t => (t.dueAt ?? Infinity) < today.getTime() && (t.status ?? 'not-started') !== 'done'
  )
  const dueSoon = mine.filter(
    t => (t.dueAt ?? Infinity) >= today.getTime() && (t.dueAt ?? Infinity) <= soon.getTime() && t.status !== 'done'
  )
  const inProgress = mine.filter(t => t.status === 'in-progress')
  const completed = mine.filter(t => t.status === 'done').slice(0, 5)

  const TaskCard = ({ task }: { task: Task }) => (
    <div 
      className="card card-hover p-4 cursor-pointer"
      onClick={() => setSelectedTaskId(task.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </div>
          {task.dueAt && (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Due {new Date(task.dueAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>
        {task.priority && (
          <div 
            className="priority-indicator"
            style={{ 
              background: task.priority === 'high' ? 'var(--priority-high)' : 
                         task.priority === 'medium' ? 'var(--priority-medium)' : 'var(--priority-low)'
            }}
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overdue */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-error)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Overdue</h3>
            <span className="badge badge-error">{overdue.length}</span>
          </div>
          <div className="space-y-3">
            {overdue.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No overdue tasks</p>
            ) : (
              overdue.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* Due Soon */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-warning)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Due Soon</h3>
            <span className="badge badge-warning">{dueSoon.length}</span>
          </div>
          <div className="space-y-3">
            {dueSoon.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No upcoming tasks</p>
            ) : (
              dueSoon.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* In Progress */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--status-in-progress)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>In Progress</h3>
            <span className="badge badge-primary">{inProgress.length}</span>
          </div>
          <div className="space-y-3">
            {inProgress.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No tasks in progress</p>
            ) : (
              inProgress.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>

        {/* Recently Completed */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-success)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Completed</h3>
            <span className="badge badge-success">{completed.length}</span>
          </div>
          <div className="space-y-3">
            {completed.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No completed tasks</p>
            ) : (
              completed.map(t => <TaskCard key={t.id} task={t} />)
            )}
          </div>
        </div>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  )
}

// ============================================
// MAIN TASKS PAGE
// ============================================
export default function TasksPage({ workspaceId }: { workspaceId: string }) {
  const [view, setView] = useState<'kanban' | 'list' | 'calendar' | 'mine' | 'timeline'>('kanban')
  const [focusId, setFocusId] = useState<string | null>(null)

  React.useEffect(() => onOpenTask(d => {
    if (d.view) setView(d.view)
    if (d.taskId) setFocusId(d.taskId)
  }), [])

  React.useEffect(
    () =>
      onCreateTaskList(async () => {
        const sort = Date.now()
        const id = `l_${Date.now()}`
        const list: TaskList = { id, workspaceId, title: 'New List', sort }
        await db.lists.put(list)
      }),
    [workspaceId]
  )

  const viewTabs = [
    { id: 'kanban', label: 'Kanban', icon: '📋' },
    { id: 'list', label: 'List', icon: '📝' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'timeline', label: 'Timeline', icon: '📊' },
    { id: 'mine', label: 'My Tasks', icon: '👤' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Tabs */}
      <div className="view-tabs">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            className={`view-tab ${view === tab.id ? 'active' : ''}`}
            onClick={() => setView(tab.id as typeof view)}
          >
            <span className="view-tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* View Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'kanban' && <Kanban workspaceId={workspaceId} />}
        {view === 'list' && <ListView workspaceId={workspaceId} focusId={focusId} />}
        {view === 'calendar' && <CalendarView workspaceId={workspaceId} />}
        {view === 'timeline' && <TimelineView workspaceId={workspaceId} />}
        {view === 'mine' && <MyTasksView workspaceId={workspaceId} />}
      </div>
    </div>
  )
}
