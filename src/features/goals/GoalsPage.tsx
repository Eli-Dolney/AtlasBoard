import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Goal, type Milestone } from '../../lib/db'

interface GoalsPageProps {
  workspaceId: string
}

const GOAL_CATEGORIES = [
  { value: 'personal', label: 'Personal', icon: '🎯', color: '#8b5cf6' },
  { value: 'work', label: 'Work', icon: '💼', color: '#3b82f6' },
  { value: 'health', label: 'Health', icon: '💪', color: '#10b981' },
  { value: 'learning', label: 'Learning', icon: '📚', color: '#f59e0b' },
  { value: 'finance', label: 'Finance', icon: '💰', color: '#84cc16' },
  { value: 'other', label: 'Other', icon: '✨', color: '#ec4899' },
]

export default function GoalsPage({ workspaceId }: GoalsPageProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')

  const goals = useLiveQuery(
    () => db.goals.where('workspaceId').equals(workspaceId).reverse().sortBy('createdAt'),
    [workspaceId],
    []
  )

  const milestones = useLiveQuery(() => db.milestones.toArray(), [], [])

  const filteredGoals = useMemo(() => {
    if (filter === 'all') return goals
    return goals.filter(g => g.status === filter)
  }, [goals, filter])

  const selectedGoal = goals.find(g => g.id === selectedGoalId)
  const selectedMilestones = milestones
    .filter(m => m.goalId === selectedGoalId)
    .sort((a, b) => a.sort - b.sort)

  const saveGoal = async (goalData: Partial<Goal>) => {
    if (editingGoal) {
      await db.goals.update(editingGoal.id, {
        ...goalData,
        updatedAt: Date.now()
      })
    } else {
      const newGoal: Goal = {
        id: `g_${Date.now()}`,
        workspaceId,
        title: goalData.title || 'New Goal',
        description: goalData.description,
        category: goalData.category || 'personal',
        targetDate: goalData.targetDate,
        progress: 0,
        status: 'active',
        color: goalData.color,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      await db.goals.put(newGoal)
    }
    setShowAddModal(false)
    setEditingGoal(null)
  }

  const deleteGoal = async (id: string) => {
    if (!window.confirm('Delete this goal and all its milestones?')) return
    await db.goals.delete(id)
    await db.milestones.where('goalId').equals(id).delete()
    if (selectedGoalId === id) setSelectedGoalId(null)
  }

  const toggleGoalStatus = async (goal: Goal) => {
    const newStatus = goal.status === 'completed' ? 'active' : 'completed'
    await db.goals.update(goal.id, {
      status: newStatus,
      progress: newStatus === 'completed' ? 100 : goal.progress,
      updatedAt: Date.now()
    })
  }

  const addMilestone = async (goalId: string, title: string) => {
    const count = milestones.filter(m => m.goalId === goalId).length
    const milestone: Milestone = {
      id: `m_${Date.now()}`,
      goalId,
      title,
      completed: false,
      sort: count
    }
    await db.milestones.put(milestone)
    updateGoalProgress(goalId)
  }

  const toggleMilestone = async (milestone: Milestone) => {
    await db.milestones.update(milestone.id, {
      completed: !milestone.completed,
      completedAt: !milestone.completed ? Date.now() : undefined
    })
    updateGoalProgress(milestone.goalId)
  }

  const deleteMilestone = async (id: string, goalId: string) => {
    await db.milestones.delete(id)
    updateGoalProgress(goalId)
  }

  const updateGoalProgress = async (goalId: string) => {
    const allMilestones = await db.milestones.where('goalId').equals(goalId).toArray()
    if (allMilestones.length === 0) return
    
    const completed = allMilestones.filter(m => m.completed).length
    const progress = Math.round((completed / allMilestones.length) * 100)
    
    await db.goals.update(goalId, { 
      progress,
      updatedAt: Date.now()
    })
  }

  const getCategoryInfo = (category: string) => {
    return GOAL_CATEGORIES.find(c => c.value === category) || GOAL_CATEGORIES[5]
  }

  const activeGoalsCount = goals.filter(g => g.status === 'active').length
  const completedGoalsCount = goals.filter(g => g.status === 'completed').length

  return (
    <div className="goals-page">
      {/* Header */}
      <div className="goals-header">
        <div>
          <h1 className="goals-title">Goals</h1>
          <p className="goals-subtitle">Track your goals and celebrate milestones</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + New Goal
        </button>
      </div>

      {/* Stats */}
      <div className="goals-stats">
        <div className="goals-stat">
          <span className="goals-stat-value">{activeGoalsCount}</span>
          <span className="goals-stat-label">Active Goals</span>
        </div>
        <div className="goals-stat">
          <span className="goals-stat-value">{completedGoalsCount}</span>
          <span className="goals-stat-label">Completed</span>
        </div>
        <div className="goals-stat">
          <span className="goals-stat-value">{goals.length}</span>
          <span className="goals-stat-label">Total Goals</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="goals-filter-tabs">
        {(['active', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            className={`goals-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="goals-content">
        {/* Goals List */}
        <div className="goals-list">
          {filteredGoals.length === 0 ? (
            <div className="goals-empty">
              <div className="goals-empty-icon">🎯</div>
              <h3>No {filter} goals</h3>
              <p>Set a goal to start tracking your progress!</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Create Goal
              </button>
            </div>
          ) : (
            filteredGoals.map(goal => {
              const categoryInfo = getCategoryInfo(goal.category)
              const goalMilestones = milestones.filter(m => m.goalId === goal.id)
              
              return (
                <div
                  key={goal.id}
                  className={`goal-card ${selectedGoalId === goal.id ? 'selected' : ''} ${goal.status === 'completed' ? 'completed' : ''}`}
                  onClick={() => setSelectedGoalId(goal.id)}
                >
                  <div className="goal-card-header">
                    <span 
                      className="goal-category-icon"
                      style={{ background: goal.color || categoryInfo.color }}
                    >
                      {categoryInfo.icon}
                    </span>
                    <div className="goal-card-info">
                      <h3 className="goal-card-title">{goal.title}</h3>
                      <span className="goal-card-category">{categoryInfo.label}</span>
                    </div>
                    <button
                      className={`goal-complete-btn ${goal.status === 'completed' ? 'completed' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleGoalStatus(goal)
                      }}
                    >
                      {goal.status === 'completed' ? '✓' : '○'}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="goal-progress">
                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{ 
                          width: `${goal.progress}%`,
                          background: goal.color || categoryInfo.color
                        }}
                      />
                    </div>
                    <span className="goal-progress-text">{goal.progress}%</span>
                  </div>

                  {/* Meta info */}
                  <div className="goal-card-meta">
                    {goal.targetDate && (
                      <span className="goal-due">
                        📅 {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className="goal-milestones-count">
                      {goalMilestones.filter(m => m.completed).length}/{goalMilestones.length} milestones
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Goal Detail Panel */}
        {selectedGoal && (
          <div className="goal-detail">
            <div className="goal-detail-header">
              <h2 className="goal-detail-title">{selectedGoal.title}</h2>
              <div className="goal-detail-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditingGoal(selectedGoal)
                    setShowAddModal(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => deleteGoal(selectedGoal.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            {selectedGoal.description && (
              <p className="goal-detail-description">{selectedGoal.description}</p>
            )}

            <div className="goal-detail-progress">
              <div className="goal-detail-progress-bar">
                <div
                  className="goal-detail-progress-fill"
                  style={{ 
                    width: `${selectedGoal.progress}%`,
                    background: selectedGoal.color || getCategoryInfo(selectedGoal.category).color
                  }}
                />
              </div>
              <span className="goal-detail-progress-text">{selectedGoal.progress}% Complete</span>
            </div>

            {/* Milestones */}
            <div className="goal-milestones">
              <h3 className="goal-milestones-title">Milestones</h3>
              
              <div className="goal-milestones-list">
                {selectedMilestones.map(milestone => (
                  <div
                    key={milestone.id}
                    className={`goal-milestone ${milestone.completed ? 'completed' : ''}`}
                  >
                    <button
                      className="goal-milestone-check"
                      onClick={() => toggleMilestone(milestone)}
                    >
                      {milestone.completed ? '✓' : '○'}
                    </button>
                    <span className="goal-milestone-title">{milestone.title}</span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => deleteMilestone(milestone.id, selectedGoal.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Milestone */}
              <AddMilestoneInput onAdd={(title) => addMilestone(selectedGoal.id, title)} />
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <GoalModal
          goal={editingGoal}
          onSave={saveGoal}
          onClose={() => {
            setShowAddModal(false)
            setEditingGoal(null)
          }}
        />
      )}
    </div>
  )
}

// Add Milestone Input
function AddMilestoneInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAdd(title.trim())
    setTitle('')
  }

  return (
    <form className="add-milestone-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input"
        placeholder="Add a milestone..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm">
        Add
      </button>
    </form>
  )
}

// Goal Add/Edit Modal
function GoalModal({ 
  goal, 
  onSave, 
  onClose 
}: { 
  goal: Goal | null
  onSave: (goal: Partial<Goal>) => void
  onClose: () => void 
}) {
  const [title, setTitle] = useState(goal?.title || '')
  const [description, setDescription] = useState(goal?.description || '')
  const [category, setCategory] = useState(goal?.category || 'personal')
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : ''
  )
  const [color, setColor] = useState(goal?.color || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title,
      description,
      category: category as Goal['category'],
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
      color: color || undefined
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{goal ? 'Edit Goal' : 'New Goal'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Goal Title</label>
              <input
                type="text"
                className="input"
                placeholder="What do you want to achieve?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="input textarea"
                placeholder="Add more details about your goal..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="goal-category-options">
                {GOAL_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`goal-category-option ${category === cat.value ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat.value)
                      if (!color) setColor(cat.color)
                    }}
                    style={{ 
                      borderColor: category === cat.value ? cat.color : undefined,
                      background: category === cat.value ? `${cat.color}20` : undefined
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Date (optional)</label>
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
