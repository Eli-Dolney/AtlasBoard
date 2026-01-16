import { useMemo, useState } from 'react'
import { db, type Task, type TaskList } from '../../lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import TaskDetailModal from '../../components/TaskDetailModal'

const priorityColors = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
}

const statusColors = {
  'not-started': 'var(--status-todo)',
  'in-progress': 'var(--status-in-progress)',
  'blocked': 'var(--status-blocked)',
  'done': 'var(--status-done)',
}

export default function Kanban({ workspaceId }: { workspaceId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)

  const lists = useLiveQuery(
    () => db.lists.where('workspaceId').equals(workspaceId).sortBy('sort'),
    [workspaceId],
    [] as TaskList[]
  )

  const tasks = useLiveQuery(
    () => db.tasks.toArray(),
    [],
    [] as Task[]
  )

  const tasksByList = useMemo(() => {
    const map: Record<string, Task[]> = {}
    if (!tasks) return map
    for (const t of tasks) {
      if (!map[t.listId]) map[t.listId] = []
      map[t.listId].push(t)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sort - b.sort)
    }
    return map
  }, [tasks])

  const addList = async () => {
    const currentLists = lists || []
    const sort = currentLists.length ? Math.max(...currentLists.map(l => l.sort)) + 1 : 1
    const id = `l_${Date.now()}`
    const list: TaskList = { id, workspaceId, title: 'New List', sort }
    await db.lists.put(list)
    setEditingListId(id)
  }

  const addTask = async (listId: string) => {
    const currentTasks = tasks || []
    const listTasks = currentTasks.filter(t => t.listId === listId)
    const sort = listTasks.length ? Math.max(...listTasks.map(t => t.sort)) + 1 : 1
    const task: Task = { 
      id: `t_${Date.now()}`, 
      listId, 
      title: 'New Task', 
      sort,
      status: 'not-started',
      priority: 'medium'
    }
    await db.tasks.put(task)
    setSelectedTaskId(task.id)
  }

  const deleteList = async (listId: string) => {
    if (!window.confirm('Delete this list and all its tasks?')) return
    // Delete all tasks in this list
    const listTasks = tasks?.filter(t => t.listId === listId) || []
    for (const task of listTasks) {
      await db.tasks.delete(task.id)
    }
    await db.lists.delete(listId)
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault()
    if (!draggingTask) return
    
    if (draggingTask.listId !== targetListId) {
      const listTasks = tasks?.filter(t => t.listId === targetListId) || []
      const newSort = listTasks.length ? Math.max(...listTasks.map(t => t.sort)) + 1 : 1
      await db.tasks.update(draggingTask.id, { 
        listId: targetListId,
        sort: newSort
      })
    }
    setDraggingTask(null)
  }

  const formatDueDate = (dueAt?: number | null) => {
    if (!dueAt) return null
    const date = new Date(dueAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dueAt)
    dueDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: 'Overdue', className: 'badge-error' }
    if (diffDays === 0) return { text: 'Today', className: 'badge-warning' }
    if (diffDays === 1) return { text: 'Tomorrow', className: 'badge-warning' }
    if (diffDays <= 7) return { text: `${diffDays}d`, className: 'badge-default' }
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: 'badge-default' }
  }

  if (!lists || !tasks) return null

  return (
    <>
      <div className="kanban-board">
        {lists.map(list => (
          <div
            key={list.id}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, list.id)}
          >
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                {editingListId === list.id ? (
                  <input
                    type="text"
                    className="input input-sm"
                    autoFocus
                    value={list.title}
                    onChange={async e => {
                      await db.lists.put({ ...list, title: e.target.value })
                    }}
                    onBlur={() => setEditingListId(null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setEditingListId(null)
                      }
                    }}
                  />
                ) : (
                  <>
                    <span 
                      onClick={() => setEditingListId(list.id)}
                      className="cursor-pointer hover:opacity-70"
                    >
                      {list.title}
                    </span>
                    <span className="kanban-column-count">
                      {(tasksByList[list.id] ?? []).length}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => addTask(list.id)}
                  title="Add task"
                >
                  +
                </button>
                <button 
                  className="btn btn-ghost btn-icon btn-sm opacity-50 hover:opacity-100"
                  onClick={() => deleteList(list.id)}
                  title="Delete list"
                >
                  🗑
                </button>
              </div>
            </div>
            
            <div className="kanban-column-body">
              {(tasksByList[list.id] ?? []).map(task => (
                <div
                  key={task.id}
                  className="kanban-card"
                  draggable
                  onDragStart={e => handleDragStart(e, task)}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="kanban-card-title flex-1">
                      {task.title}
                    </span>
                    {task.priority && (
                      <div 
                        className="priority-indicator flex-shrink-0"
                        style={{ background: priorityColors[task.priority] }}
                        title={`${task.priority} priority`}
                      />
                    )}
                  </div>
                  
                  <div className="kanban-card-meta">
                    {task.status && task.status !== 'not-started' && (
                      <span 
                        className="badge"
                        style={{
                          background: `${statusColors[task.status]}20`,
                          color: statusColors[task.status]
                        }}
                      >
                        {task.status === 'in-progress' ? 'In Progress' : 
                         task.status === 'blocked' ? 'Blocked' : 
                         task.status === 'done' ? 'Done' : ''}
                      </span>
                    )}
                    
                    {(() => {
                      const dueInfo = formatDueDate(task.dueAt)
                      if (!dueInfo) return null
                      return (
                        <span className={`badge ${dueInfo.className}`}>
                          📅 {dueInfo.text}
                        </span>
                      )
                    })()}
                    
                    {task.assignee && (
                      <div 
                        className="avatar avatar-sm flex-shrink-0"
                        title={task.assignee}
                      >
                        {task.assignee.charAt(0)}
                      </div>
                    )}
                    
                    {(task.tags || []).length > 0 && (
                      <span className="text-caption opacity-60">
                        +{task.tags!.length} tags
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                className="kanban-add-card"
                onClick={() => addTask(list.id)}
              >
                <span>+</span>
                <span>Add task</span>
              </button>
            </div>
          </div>
        ))}
        
        <button className="kanban-add-column" onClick={addList}>
          <span>+</span>
          <span>Add list</span>
        </button>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
    </>
  )
}
