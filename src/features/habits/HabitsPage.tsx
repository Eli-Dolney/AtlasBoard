import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Habit, type HabitLog } from '../../lib/db'

interface HabitsPageProps {
  workspaceId: string
}

const HABIT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f97316'
]

const HABIT_ICONS = ['💪', '📚', '🏃', '🧘', '💧', '🍎', '💊', '✍️', '🎯', '⭐']

const TIME_OF_DAY = [
  { value: 'morning', label: 'Morning', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { value: 'evening', label: 'Evening', icon: '🌙' },
  { value: 'anytime', label: 'Anytime', icon: '⏰' },
]

export default function HabitsPage({ workspaceId }: HabitsPageProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [view, setView] = useState<'today' | 'all' | 'stats'>('today')

  const habits = useLiveQuery(
    () => db.habits.where('workspaceId').equals(workspaceId).and(h => !h.archived).toArray(),
    [workspaceId],
    []
  )

  const habitLogs = useLiveQuery(
    () => db.habitLogs.toArray(),
    [],
    []
  )

  const today = new Date().toISOString().slice(0, 10)

  // Get today's logs
  const todayLogs = useMemo(() => {
    const logs: Record<string, HabitLog> = {}
    habitLogs
      .filter(log => log.date === today)
      .forEach(log => { logs[log.habitId] = log })
    return logs
  }, [habitLogs, today])

  // Calculate streaks for each habit
  const streaks = useMemo(() => {
    const result: Record<string, number> = {}
    
    habits.forEach(habit => {
      let streak = 0
      const logs = habitLogs
        .filter(l => l.habitId === habit.id && l.completed)
        .sort((a, b) => b.date.localeCompare(a.date))
      
      if (logs.length === 0) {
        result[habit.id] = 0
        return
      }

      // Check consecutive days starting from today or yesterday
      const checkDate = new Date()
      const todayStr = checkDate.toISOString().slice(0, 10)
      const yesterdayDate = new Date(checkDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

      // Start counting from today if completed, or yesterday
      let currentDate = logs[0]?.date === todayStr ? todayStr : 
                        logs[0]?.date === yesterdayStr ? yesterdayStr : null

      if (!currentDate) {
        result[habit.id] = 0
        return
      }

      const d = new Date(currentDate)
      for (const log of logs) {
        const expectedDate = d.toISOString().slice(0, 10)
        if (log.date === expectedDate) {
          streak++
          d.setDate(d.getDate() - 1)
        } else {
          break
        }
      }
      
      result[habit.id] = streak
    })
    
    return result
  }, [habits, habitLogs])

  // Group habits by time of day
  const habitsByTime = useMemo(() => {
    const groups: Record<string, Habit[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      anytime: []
    }
    habits.forEach(h => {
      groups[h.timeOfDay].push(h)
    })
    return groups
  }, [habits])

  const toggleHabit = async (habitId: string) => {
    const existing = todayLogs[habitId]
    
    if (existing) {
      await db.habitLogs.update(existing.id, { 
        completed: !existing.completed,
        completedAt: !existing.completed ? Date.now() : undefined
      })
    } else {
      await db.habitLogs.put({
        id: `hl_${Date.now()}`,
        habitId,
        date: today,
        completed: true,
        completedAt: Date.now()
      })
    }
  }

  const saveHabit = async (habit: Partial<Habit>) => {
    if (editingHabit) {
      await db.habits.update(editingHabit.id, habit)
    } else {
      const newHabit: Habit = {
        id: `h_${Date.now()}`,
        workspaceId,
        title: habit.title || 'New Habit',
        frequency: habit.frequency || 'daily',
        timeOfDay: habit.timeOfDay || 'anytime',
        color: habit.color || HABIT_COLORS[0],
        icon: habit.icon,
        createdAt: Date.now()
      }
      await db.habits.put(newHabit)
    }
    setShowAddModal(false)
    setEditingHabit(null)
  }

  const deleteHabit = async (id: string) => {
    if (!window.confirm('Delete this habit? This will also delete all logs.')) return
    await db.habits.delete(id)
    await db.habitLogs.where('habitId').equals(id).delete()
  }

  const completedToday = habits.filter(h => todayLogs[h.id]?.completed).length
  const totalHabits = habits.length
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0

  return (
    <div className="habits-page">
      {/* Header */}
      <div className="habits-header">
        <div>
          <h1 className="habits-title">Habits</h1>
          <p className="habits-subtitle">Build better habits, one day at a time</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + New Habit
        </button>
      </div>

      {/* Progress Ring */}
      <div className="habits-progress-card">
        <div className="habits-progress-ring-container">
          <svg className="habits-progress-ring" viewBox="0 0 100 100">
            <circle
              className="habits-progress-bg"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
            />
            <circle
              className="habits-progress-bar"
              cx="50"
              cy="50"
              r="40"
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`}
            />
          </svg>
          <div className="habits-progress-text">
            <span className="habits-progress-value">{completionRate}%</span>
            <span className="habits-progress-label">Complete</span>
          </div>
        </div>
        <div className="habits-progress-stats">
          <div className="habits-progress-stat">
            <span className="habits-progress-stat-value">{completedToday}</span>
            <span className="habits-progress-stat-label">Done</span>
          </div>
          <div className="habits-progress-stat">
            <span className="habits-progress-stat-value">{totalHabits - completedToday}</span>
            <span className="habits-progress-stat-label">Remaining</span>
          </div>
          <div className="habits-progress-stat">
            <span className="habits-progress-stat-value">{totalHabits}</span>
            <span className="habits-progress-stat-label">Total</span>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="habits-view-tabs">
        <button
          className={`habits-view-tab ${view === 'today' ? 'active' : ''}`}
          onClick={() => setView('today')}
        >
          Today
        </button>
        <button
          className={`habits-view-tab ${view === 'all' ? 'active' : ''}`}
          onClick={() => setView('all')}
        >
          All Habits
        </button>
        <button
          className={`habits-view-tab ${view === 'stats' ? 'active' : ''}`}
          onClick={() => setView('stats')}
        >
          Stats
        </button>
      </div>

      {/* Today View */}
      {view === 'today' && (
        <div className="habits-today">
          {TIME_OF_DAY.map(time => {
            const timeHabits = habitsByTime[time.value]
            if (timeHabits.length === 0) return null
            
            return (
              <div key={time.value} className="habits-time-group">
                <div className="habits-time-header">
                  <span className="habits-time-icon">{time.icon}</span>
                  <span className="habits-time-label">{time.label}</span>
                </div>
                <div className="habits-list">
                  {timeHabits.map(habit => {
                    const isCompleted = todayLogs[habit.id]?.completed
                    const streak = streaks[habit.id] || 0
                    
                    return (
                      <div
                        key={habit.id}
                        className={`habit-item ${isCompleted ? 'completed' : ''}`}
                        onClick={() => toggleHabit(habit.id)}
                      >
                        <div
                          className="habit-checkbox"
                          style={{ 
                            borderColor: habit.color,
                            background: isCompleted ? habit.color : 'transparent'
                          }}
                        >
                          {isCompleted && <span>✓</span>}
                        </div>
                        <div className="habit-info">
                          <span className="habit-title">
                            {habit.icon && <span className="habit-icon">{habit.icon}</span>}
                            {habit.title}
                          </span>
                          {streak > 0 && (
                            <span className="habit-streak">🔥 {streak} day streak</span>
                          )}
                        </div>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingHabit(habit)
                            setShowAddModal(true)
                          }}
                        >
                          ⚙️
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          
          {habits.length === 0 && (
            <div className="habits-empty">
              <div className="habits-empty-icon">🎯</div>
              <h3>No habits yet</h3>
              <p>Start building positive habits by adding your first one!</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Habit
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Habits View */}
      {view === 'all' && (
        <div className="habits-all">
          <div className="habits-grid">
            {habits.map(habit => {
              const streak = streaks[habit.id] || 0
              const isCompleted = todayLogs[habit.id]?.completed
              
              return (
                <div key={habit.id} className="habit-card">
                  <div className="habit-card-header" style={{ background: habit.color }}>
                    <span className="habit-card-icon">{habit.icon || '📌'}</span>
                    {isCompleted && <span className="habit-card-check">✓</span>}
                  </div>
                  <div className="habit-card-body">
                    <h3 className="habit-card-title">{habit.title}</h3>
                    <div className="habit-card-meta">
                      <span>{TIME_OF_DAY.find(t => t.value === habit.timeOfDay)?.icon} {habit.timeOfDay}</span>
                      {streak > 0 && <span>🔥 {streak}</span>}
                    </div>
                  </div>
                  <div className="habit-card-actions">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setEditingHabit(habit)
                        setShowAddModal(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats View */}
      {view === 'stats' && (
        <div className="habits-stats">
          <div className="habits-streak-section">
            <h2 className="habits-section-title">Current Streaks</h2>
            <div className="habits-streak-list">
              {habits
                .sort((a, b) => (streaks[b.id] || 0) - (streaks[a.id] || 0))
                .map(habit => (
                  <div key={habit.id} className="habits-streak-item">
                    <div className="habits-streak-info">
                      <span className="habits-streak-icon" style={{ background: habit.color }}>
                        {habit.icon || '📌'}
                      </span>
                      <span className="habits-streak-title">{habit.title}</span>
                    </div>
                    <div className="habits-streak-count">
                      <span className="habits-streak-fire">🔥</span>
                      <span className="habits-streak-days">{streaks[habit.id] || 0} days</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <HabitModal
          habit={editingHabit}
          onSave={saveHabit}
          onClose={() => {
            setShowAddModal(false)
            setEditingHabit(null)
          }}
        />
      )}
    </div>
  )
}

// Habit Add/Edit Modal
function HabitModal({ 
  habit, 
  onSave, 
  onClose 
}: { 
  habit: Habit | null
  onSave: (habit: Partial<Habit>) => void
  onClose: () => void 
}) {
  const [title, setTitle] = useState(habit?.title || '')
  const [timeOfDay, setTimeOfDay] = useState(habit?.timeOfDay || 'anytime')
  const [color, setColor] = useState(habit?.color || HABIT_COLORS[0])
  const [icon, setIcon] = useState(habit?.icon || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title, timeOfDay: timeOfDay as Habit['timeOfDay'], color, icon })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Habit Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Exercise, Read, Meditate..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time of Day</label>
              <div className="habit-time-options">
                {TIME_OF_DAY.map(time => (
                  <button
                    key={time.value}
                    type="button"
                    className={`habit-time-option ${timeOfDay === time.value ? 'active' : ''}`}
                    onClick={() => setTimeOfDay(time.value)}
                  >
                    <span>{time.icon}</span>
                    <span>{time.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Icon</label>
              <div className="habit-icon-options">
                {HABIT_ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    className={`habit-icon-option ${icon === i ? 'active' : ''}`}
                    onClick={() => setIcon(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div className="habit-color-options">
                {HABIT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`habit-color-option ${color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {habit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
