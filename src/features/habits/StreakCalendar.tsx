import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'

interface StreakCalendarProps {
  workspaceId: string
  habitId?: string // Optional: show for specific habit, or all habits if not provided
}

export default function StreakCalendar({ workspaceId, habitId }: StreakCalendarProps) {
  const habits = useLiveQuery(
    () => db.habits.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const habitLogs = useLiveQuery(
    () => habitId 
      ? db.habitLogs.where('habitId').equals(habitId).toArray()
      : db.habitLogs.toArray(),
    [habitId],
    []
  )

  // Generate last 365 days for GitHub-style calendar
  const calendarData = useMemo(() => {
    const days: { date: string; count: number; level: number }[] = []
    const today = new Date()
    const totalHabits = habitId ? 1 : habits.length

    // Create a map of completed habits per day
    const completedByDay: Record<string, number> = {}
    habitLogs
      .filter(log => log.completed)
      .forEach(log => {
        if (!completedByDay[log.date]) completedByDay[log.date] = 0
        completedByDay[log.date]++
      })

    // Generate 365 days
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = completedByDay[dateStr] || 0
      
      // Calculate level (0-4 based on completion percentage)
      let level = 0
      if (totalHabits > 0 && count > 0) {
        const percentage = count / totalHabits
        if (percentage >= 1) level = 4
        else if (percentage >= 0.75) level = 3
        else if (percentage >= 0.5) level = 2
        else if (percentage > 0) level = 1
      }

      days.push({ date: dateStr, count, level })
    }

    return days
  }, [habits, habitLogs, habitId])

  // Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0
    const today = new Date()
    const totalHabits = habitId ? 1 : habits.length
    
    if (totalHabits === 0) return 0

    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayData = calendarData.find(day => day.date === dateStr)
      
      // Skip today if not yet completed
      if (i === 0 && (!dayData || dayData.count === 0)) continue
      
      if (dayData && dayData.count > 0) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    
    return streak
  }, [calendarData, habits, habitId])

  // Calculate longest streak
  const longestStreak = useMemo(() => {
    let longest = 0
    let current = 0
    
    for (const day of calendarData) {
      if (day.count > 0) {
        current++
        longest = Math.max(longest, current)
      } else {
        current = 0
      }
    }
    
    return longest
  }, [calendarData])

  // Group by weeks for display
  const weeks = useMemo(() => {
    const result: typeof calendarData[] = []
    for (let i = 0; i < calendarData.length; i += 7) {
      result.push(calendarData.slice(i, i + 7))
    }
    return result
  }, [calendarData])

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="streak-calendar">
      <div className="streak-stats">
        <div className="streak-stat">
          <span className="streak-stat-value">🔥 {currentStreak}</span>
          <span className="streak-stat-label">Current Streak</span>
        </div>
        <div className="streak-stat">
          <span className="streak-stat-value">🏆 {longestStreak}</span>
          <span className="streak-stat-label">Longest Streak</span>
        </div>
      </div>

      <div className="streak-calendar-grid">
        {/* Month labels */}
        <div className="streak-months">
          {months.map((month, i) => (
            <span key={i} className="streak-month">{month}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="streak-weeks">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="streak-week">
              {week.map((day, dayIndex) => (
                <div
                  key={day.date}
                  className={`streak-day level-${day.level}`}
                  title={`${day.date}: ${day.count} habits completed`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="streak-legend">
          <span className="streak-legend-label">Less</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`streak-day level-${level}`} />
          ))}
          <span className="streak-legend-label">More</span>
        </div>
      </div>
    </div>
  )
}
