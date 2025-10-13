import React, { useMemo, useState } from 'react'
import Kanban from './Kanban'
import { db, type Task, type TaskList } from '../../lib/db'
import { onCreateTaskList, onOpenTask } from '../../lib/events'

type SavedFilter = { id: string; name: string; query: (t: Task) => boolean }

function useTasks(workspaceId: string) {
  const [lists, setLists] = React.useState<TaskList[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  React.useEffect(() => {
    void (async () => {
      setLists(await db.lists.where('workspaceId').equals(workspaceId).sortBy('sort'))
      setTasks(await db.tasks.toArray())
    })()
  }, [workspaceId])
  return { lists, tasks, setTasks }
}

function FiltersBar({ tasks, onChange }: { tasks: Task[]; onChange: (filtered: Task[]) => void }) {
  const [assignee, setAssignee] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [tag, setTag] = useState<string>('')

  React.useEffect(() => {
    let next = tasks
    if (assignee) next = next.filter(t => (t.assignee ?? '') === assignee)
    if (status) next = next.filter(t => (t.status ?? 'not-started') === status)
    if (tag) next = next.filter(t => (t.tags ?? []).includes(tag))
    onChange(next)
  }, [assignee, status, tag, tasks, onChange])

  const allAssignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[]
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags ?? [])))

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
      <select
        className="rounded border px-2 py-1"
        value={assignee}
        onChange={e => setAssignee(e.target.value)}
      >
        <option value="">Assignee</option>
        {allAssignees.map(a => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <select
        className="rounded border px-2 py-1"
        value={status}
        onChange={e => setStatus(e.target.value)}
      >
        <option value="">Status</option>
        <option value="not-started">Not started</option>
        <option value="in-progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
      </select>
      <select
        className="rounded border px-2 py-1"
        value={tag}
        onChange={e => setTag(e.target.value)}
      >
        <option value="">Tag</option>
        {allTags.map(t => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-2">
        {allTags.slice(0, 6).map(t => (
          <button
            key={t}
            className="rounded bg-neutral-200 px-2 py-1 text-xs dark:bg-neutral-700"
            onClick={() => setTag(t)}
          >
            #{t}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimelineView({ workspaceId }: { workspaceId: string }) {
  const { lists, tasks } = useTasks(workspaceId)
  const DAY = 24 * 60 * 60 * 1000
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const minDue = tasks
    .filter(t => t.dueAt)
    .reduce<
      number | null
    >((acc, t) => (acc === null ? (t.dueAt as number) : Math.min(acc, t.dueAt as number)), null)
  const maxDue = tasks
    .filter(t => t.dueAt)
    .reduce<
      number | null
    >((acc, t) => (acc === null ? (t.dueAt as number) : Math.max(acc, t.dueAt as number)), null)
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
  return (
    <div className="p-4">
      <div className="sticky top-14 z-10 mb-2 flex items-center gap-0 rounded border border-neutral-200 bg-white text-xs dark:border-neutral-800 dark:bg-neutral-900">
        {days.map(d => (
          <div
            key={d.toISOString()}
            className="border-l border-neutral-200 p-1 text-center dark:border-neutral-800"
            style={{ width: `${100 / days.length}%` }}
          >
            {d.getDate()}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {lists.map(list => (
          <div
            key={list.id}
            className="rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-2 text-sm font-medium">{list.title}</div>
            <div className="relative h-20 overflow-x-hidden rounded bg-neutral-50 dark:bg-neutral-950">
              {(byList[list.id] ?? []).map(t => {
                const due = t.dueAt ?? now.getTime()
                const est = (t.estimateMinutes ?? 480) * 60 * 1000
                const barStart = Math.max(start.getTime(), due - est)
                const barEnd = Math.min(end.getTime(), due)
                const left = pct(barStart - start.getTime())
                const width = pct(Math.max(2, barEnd - barStart))
                return (
                  <div
                    key={t.id}
                    className="absolute top-3 h-6 truncate rounded bg-blue-500 px-2 text-xs text-white"
                    style={{ left, width }}
                    title={`${t.title} • due ${new Date(due).toLocaleDateString()}`}
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

function ListView({ workspaceId }: { workspaceId: string }) {
  const { lists, tasks, setTasks } = useTasks(workspaceId)
  const listsById = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists])
  const [filtered, setFiltered] = useState<Task[]>(tasks)
  const [focusId, setFocusId] = useState<string | null>(null)
  React.useEffect(() => setFiltered(tasks), [tasks])
  React.useEffect(
    () =>
      onOpenTask(d => {
        setFocusId(d.taskId)
      }),
    []
  )
  const onField = async (task: Task, patch: Partial<Task>) => {
    const next = { ...task, ...patch }
    await db.tasks.put(next)
    setTasks(cur => cur.map(t => (t.id === task.id ? next : t)))
  }
  return (
    <div className="">
      <FiltersBar tasks={tasks} onChange={setFiltered} />
      <div className="space-y-3 p-4">
        {filtered
          .sort((a, b) => a.sort - b.sort)
          .map(t => (
            <div
              key={t.id}
              className={`grid grid-cols-6 items-center gap-2 rounded border p-2 text-sm ${focusId === t.id ? 'border-blue-400 ring-1 ring-blue-300' : 'border-neutral-200 dark:border-neutral-800'} bg-white dark:bg-neutral-900`}
            >
              <input
                className="col-span-2 rounded border bg-transparent px-2 py-1"
                value={t.title}
                onChange={e => onField(t, { title: e.target.value })}
              />
              <select
                className="rounded border px-2 py-1"
                value={t.status ?? 'not-started'}
                onChange={e => onField(t, { status: e.target.value as Task['status'] })}
              >
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <input
                className="rounded border px-2 py-1"
                placeholder="Assignee"
                value={t.assignee ?? ''}
                onChange={e => onField(t, { assignee: e.target.value })}
              />
              <input
                type="date"
                className="rounded border px-2 py-1"
                value={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : ''}
                onChange={e =>
                  onField(t, {
                    dueAt: e.target.value ? new Date(e.target.value + 'T00:00:00').getTime() : null,
                  })
                }
              />
              <select
                className="rounded border px-2 py-1"
                value={t.priority ?? 'medium'}
                onChange={e => onField(t, { priority: e.target.value as Task['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <div className="col-span-6 grid grid-cols-2 gap-2 text-xs text-neutral-500">
                <div>List: {listsById[t.listId]?.title ?? 'Unknown'}</div>
                <div className="text-right">
                  Estimate (min):{' '}
                  <input
                    type="number"
                    className="w-20 rounded border px-1 py-0.5"
                    value={t.estimateMinutes ?? 480}
                    onChange={e => onField(t, { estimateMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function CalendarView({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [cursor, setCursor] = useState(new Date())
  React.useEffect(() => {
    void (async () => {
      setTasks(await db.tasks.toArray())
    })()
  }, [])
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
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <button
          className="rounded border px-2 py-1"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          Prev
        </button>
        <div className="font-medium">
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          className="rounded border px-2 py-1"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs text-neutral-500">
            {d}
          </div>
        ))}
        {days.map(d => {
          const key = new Date(d.toISOString().slice(0, 10)).toDateString()
          const list = tasksByDay[key] ?? []
          const inMonth = d.getMonth() === month
          return (
            <div
              key={key + d.getTime()}
              className="min-h-24 rounded border p-2 text-xs"
              style={{ opacity: inMonth ? 1 : 0.5 }}
            >
              <div className="mb-1 font-medium">{d.getDate()}</div>
              <div className="space-y-1">
                {list.map(t => (
                  <div
                    key={t.id}
                    className="truncate rounded bg-neutral-200 px-1 py-0.5 dark:bg-neutral-800"
                  >
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MyTasksView({ workspaceId }: { workspaceId: string }) {
  const { tasks } = useTasks(workspaceId)
  const me = '' // local-only for now; leave empty to show Unassigned
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const soon = new Date(today)
  soon.setDate(soon.getDate() + 7)
  const mine = tasks.filter(t => (t.assignee ?? '') === me || !t.assignee)
  const overdue = mine.filter(
    t => (t.dueAt ?? Infinity) < today.getTime() && (t.status ?? 'not-started') !== 'done'
  )
  const dueSoon = mine.filter(
    t => (t.dueAt ?? Infinity) >= today.getTime() && (t.dueAt ?? Infinity) <= soon.getTime()
  )
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="mb-2 font-medium">Overdue</div>
        <div className="space-y-2">
          {overdue.map(t => (
            <div key={t.id} className="rounded border p-2 text-sm">
              {t.title}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 font-medium">Due soon (7 days)</div>
        <div className="space-y-2">
          {dueSoon.map(t => (
            <div key={t.id} className="rounded border p-2 text-sm">
              {t.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TasksPage({ workspaceId }: { workspaceId: string }) {
  const [view, setView] = useState<'kanban' | 'list' | 'calendar' | 'mine' | 'timeline'>('kanban')
  React.useEffect(() => onOpenTask(d => setView(d.view ?? 'list')), [])
  React.useEffect(
    () =>
      onCreateTaskList(async () => {
        const sort = Date.now()
        const id = `l_${Date.now()}`
        const list: TaskList = { id, workspaceId, title: 'New List', sort }
        await db.lists.put(list)
        setView('kanban')
      }),
    [workspaceId]
  )
  return (
    <div className="">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2 text-sm dark:border-neutral-800">
        <button
          className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700"
          onClick={() => setView('kanban')}
        >
          Kanban
        </button>
        <button
          className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700"
          onClick={() => setView('list')}
        >
          List
        </button>
        <button
          className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700"
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
        <button
          className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700"
          onClick={() => setView('timeline')}
        >
          Timeline
        </button>
        <button
          className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700"
          onClick={() => setView('mine')}
        >
          My Tasks
        </button>
      </div>
      {view === 'kanban' && <Kanban workspaceId={workspaceId} />}
      {view === 'list' && <ListView workspaceId={workspaceId} />}
      {view === 'calendar' && <CalendarView workspaceId={workspaceId} />}
      {view === 'timeline' && <TimelineView workspaceId={workspaceId} />}
      {view === 'mine' && <MyTasksView workspaceId={workspaceId} />}
    </div>
  )
}
