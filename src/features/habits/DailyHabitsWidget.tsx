import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HabitLog } from '../../lib/db'

interface DailyHabitsWidgetProps {
  workspaceId: string
  onViewAll?: () => void
}

export default function DailyHabitsWidget({ workspaceId, onViewAll }: DailyHabitsWidgetProps) {
  const habits = useLiveQuery(
    () => db.habits.where('workspaceId').equals(workspaceId).and(h => !h.archived).toArray(),
    [workspaceId],
    []
  )

  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], [])

  const today = new Date().toISOString().slice(0, 10)

  const todayLogs = useMemo(() => {
    const logs: Record<string, HabitLog> = {}
    habitLogs
      .filter(log => log.date === today)
      .forEach(log => { logs[log.habitId] = log })
    return logs
  }, [habitLogs, today])

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

  const completedCount = habits.filter(h => todayLogs[h.id]?.completed).length
  const progress = habits.length > 0 ? (completedCount / habits.length) * 100 : 0

  if (habits.length === 0) {
    return (
      <div className="widget habits-widget habits-widget-empty">
        <div className="widget-header">
          <h3 className="widget-title">Today's Habits</h3>
        </div>
        <div className="widget-body">
          <p className="text-muted">No habits yet. Add your first habit to get started!</p>
          {onViewAll && (
            <button className="btn btn-sm btn-primary mt-2" onClick={onViewAll}>
              + Add Habit
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="widget habits-widget">
      <div className="widget-header">
        <h3 className="widget-title">Today's Habits</h3>
        <span className="habits-widget-progress">
          {completedCount}/{habits.length}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="habits-widget-progress-bar">
        <div 
          className="habits-widget-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="habits-widget-list">
        {habits.slice(0, 5).map(habit => {
          const isCompleted = todayLogs[habit.id]?.completed
          return (
            <div
              key={habit.id}
              className={`habits-widget-item ${isCompleted ? 'completed' : ''}`}
              onClick={() => toggleHabit(habit.id)}
            >
              <div
                className="habits-widget-checkbox"
                style={{ 
                  borderColor: habit.color,
                  background: isCompleted ? habit.color : 'transparent'
                }}
              >
                {isCompleted && <span>✓</span>}
              </div>
              <span className="habits-widget-title">
                {habit.icon && <span className="habits-widget-icon">{habit.icon}</span>}
                {habit.title}
              </span>
            </div>
          )
        })}
      </div>

      {habits.length > 5 && (
        <div className="habits-widget-more">
          +{habits.length - 5} more habits
        </div>
      )}

      {onViewAll && (
        <button className="btn btn-sm btn-ghost widget-view-all" onClick={onViewAll}>
          View All →
        </button>
      )}
    </div>
  )
}
