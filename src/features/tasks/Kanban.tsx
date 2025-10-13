import React, { useEffect, useMemo, useState } from 'react'
import { db, type Task, type TaskList } from '../../lib/db'

export default function Kanban({ workspaceId }: { workspaceId: string }) {
  const [lists, setLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    void (async () => {
      const ls = await db.lists.where('workspaceId').equals(workspaceId).sortBy('sort')
      const ts = await db.tasks.toArray()
      setLists(ls)
      setTasks(ts)
    })()
  }, [workspaceId])

  const tasksByList = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!map[t.listId]) map[t.listId] = []
      map[t.listId].push(t)
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.sort - b.sort)
    return map
  }, [tasks])

  const addList = async () => {
    const sort = lists.length ? Math.max(...lists.map(l => l.sort)) + 1 : 1
    const id = `l_${Date.now()}`
    const list: TaskList = { id, workspaceId, title: 'New List', sort }
    await db.lists.put(list)
    setLists(cur => cur.concat(list))
  }

  const addTask = async (listId: string) => {
    const listTasks = tasks.filter(t => t.listId === listId)
    const sort = listTasks.length ? Math.max(...listTasks.map(t => t.sort)) + 1 : 1
    const task: Task = { id: `t_${Date.now()}`, listId, title: 'New Task', sort }
    await db.tasks.put(task)
    setTasks(cur => cur.concat(task))
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {lists.map(l => (
        <div
          key={l.id}
          className="w-72 shrink-0 rounded-lg border border-neutral-200 bg-white p-3 shadow dark:border-neutral-800 dark:bg-neutral-900"
        >
          <input
            className="mb-2 w-full rounded border px-2 py-1 text-sm"
            value={l.title}
            onChange={async e => {
              const next = { ...l, title: e.target.value }
              await db.lists.put(next)
              setLists(cur => cur.map(x => (x.id === l.id ? next : x)))
            }}
          />
          <div className="space-y-2">
            {(tasksByList[l.id] ?? []).map(t => (
              <div
                key={t.id}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm shadow dark:border-neutral-700 dark:bg-neutral-800"
              >
                <input
                  className="w-full bg-transparent outline-none"
                  value={t.title}
                  onChange={async e => {
                    const next = { ...t, title: e.target.value }
                    await db.tasks.put(next)
                    setTasks(cur => cur.map(x => (x.id === t.id ? next : x)))
                  }}
                />
              </div>
            ))}
          </div>
          <button
            className="mt-2 w-full rounded bg-neutral-200 px-2 py-1 text-sm"
            onClick={() => void addTask(l.id)}
          >
            + Add task
          </button>
        </div>
      ))}
      <button
        className="h-10 w-72 shrink-0 rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500"
        onClick={() => void addList()}
      >
        + Add list
      </button>
    </div>
  )
}
