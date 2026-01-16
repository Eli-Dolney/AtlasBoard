import React, { useState, useEffect } from 'react'
import { db, type Task, type TaskList } from '../lib/db'
import { useLiveQuery } from 'dexie-react-hooks'

interface TaskDetailModalProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
]

const statusOptions = [
  { value: 'not-started', label: 'To Do', color: 'var(--status-todo)' },
  { value: 'in-progress', label: 'In Progress', color: 'var(--status-in-progress)' },
  { value: 'blocked', label: 'Blocked', color: 'var(--status-blocked)' },
  { value: 'done', label: 'Done', color: 'var(--status-done)' },
]

export function TaskDetailModal({ taskId, isOpen, onClose }: TaskDetailModalProps) {
  const task = useLiveQuery(
    async () => taskId ? db.tasks.get(taskId) : undefined,
    [taskId]
  )

  const lists = useLiveQuery(
    () => db.lists.toArray(),
    [],
    [] as TaskList[]
  )

  const [editedTask, setEditedTask] = useState<Partial<Task>>({})
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dueAt: task.dueAt,
        estimateMinutes: task.estimateMinutes,
        tags: task.tags || [],
        listId: task.listId,
      })
    }
  }, [task])

  if (!isOpen || !task) return null

  const updateTask = async (updates: Partial<Task>) => {
    setEditedTask(prev => ({ ...prev, ...updates }))
    await db.tasks.update(task.id, updates)
  }

  const handleAddTag = () => {
    if (!newTag.trim()) return
    const currentTags = editedTask.tags || []
    if (!currentTags.includes(newTag.trim())) {
      updateTask({ tags: [...currentTags, newTag.trim()] })
    }
    setNewTag('')
  }

  const handleRemoveTag = (tag: string) => {
    const currentTags = editedTask.tags || []
    updateTask({ tags: currentTags.filter(t => t !== tag) })
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await db.tasks.delete(task.id)
      onClose()
    }
  }

  const currentList = lists.find(l => l.id === task.listId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div
              className="status-dot"
              style={{ 
                background: statusOptions.find(s => s.value === editedTask.status)?.color || 'var(--status-todo)',
                width: 12,
                height: 12
              }}
            />
            <input
              type="text"
              className="text-lg font-semibold bg-transparent border-none outline-none flex-1"
              style={{ color: 'var(--text-primary)' }}
              value={editedTask.title || ''}
              onChange={e => updateTask({ title: e.target.value })}
              placeholder="Task title..."
            />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-caption block mb-2">Status</label>
              <select
                className="select w-full"
                value={editedTask.status || 'not-started'}
                onChange={e => updateTask({ status: e.target.value as Task['status'] })}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-caption block mb-2">Priority</label>
              <select
                className="select w-full"
                value={editedTask.priority || 'medium'}
                onChange={e => updateTask({ priority: e.target.value as Task['priority'] })}
              >
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* List & Assignee Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-caption block mb-2">List</label>
              <select
                className="select w-full"
                value={editedTask.listId || ''}
                onChange={e => updateTask({ listId: e.target.value })}
              >
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-caption block mb-2">Assignee</label>
              <input
                type="text"
                className="input"
                placeholder="Enter name..."
                value={editedTask.assignee || ''}
                onChange={e => updateTask({ assignee: e.target.value })}
              />
            </div>
          </div>

          {/* Due Date & Estimate Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-caption block mb-2">Due Date</label>
              <input
                type="date"
                className="input"
                value={editedTask.dueAt ? new Date(editedTask.dueAt).toISOString().slice(0, 10) : ''}
                onChange={e => updateTask({
                  dueAt: e.target.value ? new Date(e.target.value + 'T00:00:00').getTime() : undefined
                })}
              />
            </div>
            <div>
              <label className="text-caption block mb-2">Time Estimate (minutes)</label>
              <input
                type="number"
                className="input"
                placeholder="e.g., 60"
                min={0}
                value={editedTask.estimateMinutes || ''}
                onChange={e => updateTask({ estimateMinutes: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="text-caption block mb-2">Description</label>
            <textarea
              className="input"
              style={{ minHeight: 120, resize: 'vertical' }}
              placeholder="Add a description..."
              value={editedTask.description || ''}
              onChange={e => updateTask({ description: e.target.value })}
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="text-caption block mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedTask.tags || []).map(tag => (
                <span key={tag} className="tag">
                  #{tag}
                  <button
                    className="ml-1 opacity-50 hover:opacity-100"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-sm flex-1"
                placeholder="Add tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddTag}>
                Add
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--border-light)' }}>
            <div className="flex items-center justify-between text-caption">
              <span>
                Created in: <strong>{currentList?.title || 'Unknown'}</strong>
              </span>
              <span>ID: {task.id}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete Task
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailModal

