import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../../lib/db'
import TaskDetailModal from '../../components/TaskDetailModal'

interface CalendarPageProps {
  workspaceId: string
}

type CalendarView = 'month' | 'week' | 'day'

export default function CalendarPage({ workspaceId }: CalendarPageProps) {
  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const lists = useLiveQuery(
    () => db.lists.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1)
    const start = new Date(year, month, 1 - first.getDay())
    return [...Array(42)].map(
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    )
  }, [year, month])

  // Generate week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(cursor)
    startOfWeek.setDate(cursor.getDate() - cursor.getDay())
    return [...Array(7)].map(
      (_, i) =>
        new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i)
    )
  }, [cursor])

  // Tasks grouped by day
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
      sort: Date.now(),
    }
    await db.tasks.put(task)
    setSelectedTaskId(task.id)
  }

  const statusColors: Record<string, string> = {
    'not-started': 'var(--brand-primary)',
    'in-progress': 'var(--status-in-progress)',
    blocked: 'var(--status-blocked)',
    done: 'var(--status-done)',
  }

  const navigatePrev = () => {
    if (view === 'month') {
      setCursor(new Date(year, month - 1, 1))
    } else if (view === 'week') {
      setCursor(new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000))
    } else {
      setCursor(new Date(cursor.getTime() - 24 * 60 * 60 * 1000))
    }
  }

  const navigateNext = () => {
    if (view === 'month') {
      setCursor(new Date(year, month + 1, 1))
    } else if (view === 'week') {
      setCursor(new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000))
    } else {
      setCursor(new Date(cursor.getTime() + 24 * 60 * 60 * 1000))
    }
  }

  const getHeaderTitle = () => {
    if (view === 'month') {
      return cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return cursor.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  // Render day cell content
  const renderDayCell = (d: Date, isCompact = false) => {
    const key = new Date(d.toISOString().slice(0, 10)).toDateString()
    const dayTasks = tasksByDay[key] ?? []
    const inMonth = d.getMonth() === month
    const isToday = new Date().toDateString() === key

    return (
      <div
        key={`${key}-${d.getTime()}`}
        className={`calendar-day ${!inMonth && view === 'month' ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
        onClick={e => {
          if (e.target === e.currentTarget) {
            addTaskAtDate(d)
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="calendar-day-number">{d.getDate()}</span>
          <button
            className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100"
            style={{ width: 20, height: 20, fontSize: '0.75rem' }}
            onClick={e => {
              e.stopPropagation()
              addTaskAtDate(d)
            }}
          >
            +
          </button>
        </div>
        <div className="calendar-day-events">
          {dayTasks.slice(0, isCompact ? 2 : 4).map(t => (
            <div
              key={t.id}
              className={`calendar-event ${t.status === 'done' ? 'done' : ''}`}
              style={{
                background: statusColors[t.status || 'not-started'],
                opacity: t.status === 'done' ? 0.6 : 1,
              }}
              onClick={e => {
                e.stopPropagation()
                setSelectedTaskId(t.id)
              }}
              title={t.title}
            >
              {t.title}
            </div>
          ))}
          {dayTasks.length > (isCompact ? 2 : 4) && (
            <div className="text-xs text-center py-1" style={{ color: 'var(--text-tertiary)' }}>
              +{dayTasks.length - (isCompact ? 2 : 4)} more
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render day view (hour-by-hour)
  const renderDayView = () => {
    const key = new Date(cursor.toISOString().slice(0, 10)).toDateString()
    const dayTasks = tasksByDay[key] ?? []
    const hours = [...Array(24)].map((_, i) => i)

    return (
      <div className="calendar-day-view">
        <div className="calendar-day-header">
          <div className="calendar-day-info">
            <span className="calendar-day-number large">{cursor.getDate()}</span>
            <span className="calendar-day-name">
              {cursor.toLocaleDateString(undefined, { weekday: 'long' })}
            </span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => addTaskAtDate(cursor)}>
            + Add Task
          </button>
        </div>

        <div className="calendar-hours">
          {hours.map(hour => (
            <div key={hour} className="calendar-hour">
              <div className="calendar-hour-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="calendar-hour-content">
                {dayTasks
                  .filter(t => {
                    if (!t.dueAt) return false
                    const taskHour = new Date(t.dueAt).getHours()
                    return taskHour === hour
                  })
                  .map(t => (
                    <div
                      key={t.id}
                      className="calendar-hour-event"
                      style={{
                        background: statusColors[t.status || 'not-started'],
                        opacity: t.status === 'done' ? 0.6 : 1,
                      }}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      {t.title}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* All day tasks */}
        {dayTasks.length > 0 && (
          <div className="calendar-all-day">
            <h3 className="calendar-all-day-title">Tasks for this day</h3>
            <div className="calendar-all-day-list">
              {dayTasks.map(t => (
                <div
                  key={t.id}
                  className="calendar-all-day-item"
                  onClick={() => setSelectedTaskId(t.id)}
                >
                  <div
                    className="calendar-all-day-dot"
                    style={{ background: statusColors[t.status || 'not-started'] }}
                  />
                  <span
                    style={{
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      opacity: t.status === 'done' ? 0.6 : 1,
                    }}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-page">
      <div className="calendar">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={navigatePrev}>
              ←
            </button>
            <span className="calendar-title">{getHeaderTitle()}</span>
            <button className="btn btn-secondary btn-sm" onClick={navigateNext}>
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <div className="calendar-view-toggle">
              <button
                className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('month')}
              >
                Month
              </button>
              <button
                className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('week')}
              >
                Week
              </button>
              <button
                className={`btn btn-sm ${view === 'day' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('day')}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' && (
          <>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-grid">{monthDays.map(d => renderDayCell(d))}</div>
          </>
        )}

        {view === 'week' && (
          <>
            <div className="calendar-weekdays">
              {weekDays.map(d => (
                <div
                  key={d.toISOString()}
                  className={`calendar-weekday ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`}
                >
                  <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="calendar-weekday-date">{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="calendar-grid calendar-grid-week">
              {weekDays.map(d => renderDayCell(d, true))}
            </div>
          </>
        )}

        {view === 'day' && renderDayView()}
      </div>

      {/* Upcoming Tasks Sidebar */}
      <div className="calendar-sidebar">
        <h3 className="calendar-sidebar-title">Upcoming Tasks</h3>
        <div className="calendar-sidebar-list">
          {tasks
            .filter(t => t.dueAt && t.status !== 'done')
            .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
            .slice(0, 10)
            .map(t => (
              <div
                key={t.id}
                className="calendar-sidebar-item"
                onClick={() => setSelectedTaskId(t.id)}
              >
                <div
                  className="calendar-sidebar-dot"
                  style={{ background: statusColors[t.status || 'not-started'] }}
                />
                <div className="calendar-sidebar-content">
                  <span className="calendar-sidebar-task-title">{t.title}</span>
                  <span className="calendar-sidebar-task-date">
                    {t.dueAt && new Date(t.dueAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          {tasks.filter(t => t.dueAt && t.status !== 'done').length === 0 && (
            <p className="text-caption" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              No upcoming tasks
            </p>
          )}
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
