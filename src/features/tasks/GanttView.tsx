import { useState, useMemo, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../../lib/db'

interface GanttViewProps {
  workspaceId: string
  onTaskClick?: (taskId: string) => void
}

const DAY_WIDTH = 40
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 60

export default function GanttView({ workspaceId, onTaskClick }: GanttViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)

  const lists = useLiveQuery(
    () => db.lists.where('workspaceId').equals(workspaceId).sortBy('sort'),
    [workspaceId],
    []
  )

  const allTasks = useLiveQuery(async () => {
    if (lists.length === 0) return []
    const listIds = lists.map(l => l.id)
    return db.tasks.where('listId').anyOf(listIds).toArray()
  }, [lists], [])

  // Filter tasks with due dates and sort
  const tasks = useMemo(() => {
    return allTasks
      .filter(t => t.dueAt)
      .sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0))
  }, [allTasks])

  // Calculate date range
  const { startDate, endDate, totalDays, weeks } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      
      return {
        startDate: start,
        endDate: end,
        totalDays: 37,
        weeks: generateWeeks(start, 37)
      }
    }

    const dates = tasks.map(t => new Date(t.dueAt!))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Add padding
    minDate.setDate(minDate.getDate() - 7)
    maxDate.setDate(maxDate.getDate() + 14)

    minDate.setHours(0, 0, 0, 0)
    maxDate.setHours(0, 0, 0, 0)

    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      startDate: minDate,
      endDate: maxDate,
      totalDays: Math.max(days, 30),
      weeks: generateWeeks(minDate, days)
    }
  }, [tasks])

  function generateWeeks(start: Date, days: number) {
    const result: { label: string; days: Date[] }[] = []
    const current = new Date(start)
    
    for (let i = 0; i < days; i++) {
      const date = new Date(current)
      date.setDate(date.getDate() + i)
      
      const weekLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const lastWeek = result[result.length - 1]
      
      if (!lastWeek || date.getDay() === 0) {
        result.push({ label: weekLabel, days: [date] })
      } else {
        lastWeek.days.push(date)
      }
    }
    
    return result
  }

  const getTaskPosition = (task: Task) => {
    if (!task.dueAt) return null
    
    const taskDate = new Date(task.dueAt)
    taskDate.setHours(0, 0, 0, 0)
    
    const daysFromStart = Math.floor(
      (taskDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Task duration (default to 1 day, can use estimateMinutes if available)
    const duration = task.estimateMinutes 
      ? Math.max(1, Math.ceil(task.estimateMinutes / (8 * 60))) // Convert to days
      : 1

    return {
      left: daysFromStart * DAY_WIDTH,
      width: Math.max(duration * DAY_WIDTH - 4, DAY_WIDTH - 4)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'done': return 'var(--color-success)'
      case 'in-progress': return 'var(--brand-primary)'
      case 'blocked': return 'var(--color-danger)'
      default: return 'var(--bg-tertiary)'
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) * DAY_WIDTH

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current && todayOffset > 0) {
      containerRef.current.scrollLeft = Math.max(0, todayOffset - 200)
    }
  }, [todayOffset])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  if (tasks.length === 0) {
    return (
      <div className="gantt-empty">
        <div className="gantt-empty-icon">📊</div>
        <h3>No tasks with due dates</h3>
        <p>Add due dates to your tasks to see them in the Gantt chart</p>
      </div>
    )
  }

  return (
    <div className="gantt-container">
      {/* Left sidebar - task list */}
      <div className="gantt-sidebar">
        <div className="gantt-sidebar-header">
          <span>Tasks</span>
        </div>
        <div className="gantt-sidebar-tasks">
          {tasks.map((task, index) => {
            const list = lists.find(l => l.id === task.listId)
            return (
              <div
                key={task.id}
                className="gantt-sidebar-task"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onTaskClick?.(task.id)}
              >
                <span
                  className="gantt-task-status-dot"
                  style={{ background: getStatusColor(task.status) }}
                />
                <span className="gantt-sidebar-task-title">{task.title}</span>
                {list && (
                  <span className="gantt-sidebar-task-list">{list.title}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right side - chart */}
      <div 
        className="gantt-chart" 
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Header with dates */}
        <div className="gantt-header" style={{ width: totalDays * DAY_WIDTH }}>
          <div className="gantt-weeks">
            {weeks.map((week, i) => (
              <div
                key={i}
                className="gantt-week"
                style={{ width: week.days.length * DAY_WIDTH }}
              >
                {week.label}
              </div>
            ))}
          </div>
          <div className="gantt-days">
            {[...Array(totalDays)].map((_, i) => {
              const date = new Date(startDate)
              date.setDate(date.getDate() + i)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const isToday = date.getTime() === today.getTime()
              
              return (
                <div
                  key={i}
                  className={`gantt-day ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                  style={{ width: DAY_WIDTH }}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        <div 
          className="gantt-grid"
          style={{ 
            width: totalDays * DAY_WIDTH,
            height: tasks.length * ROW_HEIGHT
          }}
        >
          {/* Vertical lines for days */}
          {[...Array(totalDays)].map((_, i) => {
            const date = new Date(startDate)
            date.setDate(date.getDate() + i)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            
            return (
              <div
                key={i}
                className={`gantt-grid-line ${isWeekend ? 'weekend' : ''}`}
                style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
              />
            )
          })}

          {/* Today marker */}
          {todayOffset >= 0 && todayOffset <= totalDays * DAY_WIDTH && (
            <div
              className="gantt-today-marker"
              style={{ left: todayOffset + DAY_WIDTH / 2 }}
            />
          )}

          {/* Task bars */}
          {tasks.map((task, index) => {
            const pos = getTaskPosition(task)
            if (!pos) return null
            
            return (
              <div
                key={task.id}
                className={`gantt-task-bar ${task.status || ''}`}
                style={{
                  top: index * ROW_HEIGHT + 4,
                  left: pos.left,
                  width: pos.width,
                  height: ROW_HEIGHT - 8,
                  background: getStatusColor(task.status)
                }}
                onClick={() => onTaskClick?.(task.id)}
                title={`${task.title}\nDue: ${new Date(task.dueAt!).toLocaleDateString()}`}
              >
                <span className="gantt-task-bar-label">{task.title}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
