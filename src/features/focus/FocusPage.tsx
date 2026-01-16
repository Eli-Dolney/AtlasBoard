import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { PomodoroTimer } from '../../components/PomodoroTimer'

interface FocusPageProps {
  workspaceId: string
}

export default function FocusPage({ workspaceId }: FocusPageProps) {
  const [showTimer, setShowTimer] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  const sessions = useLiveQuery(
    () => db.focusSessions.where('workspaceId').equals(workspaceId).reverse().sortBy('completedAt'),
    [workspaceId],
    []
  )

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekAgo = today - 7 * 24 * 60 * 60 * 1000
    const monthAgo = today - 30 * 24 * 60 * 60 * 1000

    const todaySessions = sessions.filter(s => s.completedAt >= today && s.type === 'work')
    const weekSessions = sessions.filter(s => s.completedAt >= weekAgo && s.type === 'work')
    const monthSessions = sessions.filter(s => s.completedAt >= monthAgo && s.type === 'work')

    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0)
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0)
    const monthMinutes = monthSessions.reduce((sum, s) => sum + s.duration, 0)

    return {
      today: { sessions: todaySessions.length, minutes: todayMinutes },
      week: { sessions: weekSessions.length, minutes: weekMinutes },
      month: { sessions: monthSessions.length, minutes: monthMinutes },
    }
  }, [sessions])

  // Get sessions for selected period
  const periodSessions = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    
    let startTime = today
    if (selectedPeriod === 'week') startTime = today - 7 * 24 * 60 * 60 * 1000
    if (selectedPeriod === 'month') startTime = today - 30 * 24 * 60 * 60 * 1000

    return sessions.filter(s => s.completedAt >= startTime)
  }, [sessions, selectedPeriod])

  // Group sessions by day for chart
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {}
    const now = new Date()
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      days[key] = 0
    }

    sessions
      .filter(s => s.type === 'work')
      .forEach(s => {
        const key = new Date(s.completedAt).toISOString().slice(0, 10)
        if (days[key] !== undefined) {
          days[key] += s.duration
        }
      })

    return Object.entries(days).map(([date, minutes]) => ({
      date,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      minutes,
      hours: Math.round(minutes / 60 * 10) / 10
    }))
  }, [sessions])

  const maxMinutes = Math.max(...dailyData.map(d => d.minutes), 60)

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="focus-page">
      {/* Header */}
      <div className="focus-header">
        <div>
          <h1 className="focus-title">Focus</h1>
          <p className="focus-subtitle">Track your productivity with the Pomodoro technique</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowTimer(true)}>
          🍅 Start Focus Session
        </button>
      </div>

      {/* Quick Stats */}
      <div className="focus-stats-grid">
        <div className="focus-stat-card">
          <div className="focus-stat-icon" style={{ background: 'var(--brand-primary)' }}>🍅</div>
          <div className="focus-stat-content">
            <div className="focus-stat-value">{stats.today.sessions}</div>
            <div className="focus-stat-label">Sessions Today</div>
          </div>
        </div>
        <div className="focus-stat-card">
          <div className="focus-stat-icon" style={{ background: 'var(--color-success)' }}>⏱️</div>
          <div className="focus-stat-content">
            <div className="focus-stat-value">{formatDuration(stats.today.minutes)}</div>
            <div className="focus-stat-label">Focus Time Today</div>
          </div>
        </div>
        <div className="focus-stat-card">
          <div className="focus-stat-icon" style={{ background: 'var(--color-warning)' }}>📊</div>
          <div className="focus-stat-content">
            <div className="focus-stat-value">{stats.week.sessions}</div>
            <div className="focus-stat-label">Sessions This Week</div>
          </div>
        </div>
        <div className="focus-stat-card">
          <div className="focus-stat-icon" style={{ background: 'var(--brand-secondary)' }}>🔥</div>
          <div className="focus-stat-content">
            <div className="focus-stat-value">{formatDuration(stats.week.minutes)}</div>
            <div className="focus-stat-label">Weekly Focus Time</div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="focus-chart-card">
        <h2 className="focus-section-title">Weekly Overview</h2>
        <div className="focus-chart">
          {dailyData.map(day => (
            <div key={day.date} className="focus-chart-bar-container">
              <div className="focus-chart-value">{day.minutes > 0 ? formatDuration(day.minutes) : ''}</div>
              <div
                className="focus-chart-bar"
                style={{
                  height: `${(day.minutes / maxMinutes) * 150}px`,
                  background: day.minutes > 0 
                    ? 'linear-gradient(to top, var(--brand-primary), var(--brand-secondary))'
                    : 'var(--bg-tertiary)'
                }}
              />
              <div className="focus-chart-label">{day.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="focus-recent">
        <div className="focus-recent-header">
          <h2 className="focus-section-title">Recent Sessions</h2>
          <div className="focus-period-toggle">
            {(['today', 'week', 'month'] as const).map(period => (
              <button
                key={period}
                className={`btn btn-sm ${selectedPeriod === period ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="focus-sessions-list">
          {periodSessions.length === 0 ? (
            <div className="focus-empty">
              <p>No focus sessions yet. Start one to track your productivity!</p>
            </div>
          ) : (
            periodSessions.slice(0, 20).map(session => (
              <div key={session.id} className="focus-session-item">
                <div className="focus-session-icon">
                  {session.type === 'work' ? '🍅' : '☕'}
                </div>
                <div className="focus-session-info">
                  <span className="focus-session-type">
                    {session.type === 'work' ? 'Focus Session' : 'Break'}
                  </span>
                  <span className="focus-session-duration">{session.duration} minutes</span>
                </div>
                <div className="focus-session-time">
                  {new Date(session.completedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pomodoro Timer Modal */}
      <PomodoroTimer
        workspaceId={workspaceId}
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
      />
    </div>
  )
}
