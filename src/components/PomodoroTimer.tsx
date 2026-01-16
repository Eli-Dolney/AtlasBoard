import { useState, useEffect, useRef, useCallback } from 'react'
import { db, type FocusSession } from '../lib/db'

const WORK_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
]

const BREAK_PRESETS = [
  { label: '5m', minutes: 5 },
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '20m', minutes: 20 },
]

interface PomodoroTimerProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onMinimize?: () => void
}

export function PomodoroTimer({ workspaceId, isOpen, onClose, onMinimize }: PomodoroTimerProps) {
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [duration, setDuration] = useState(25) // minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60) // seconds
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsToday, setSessionsToday] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  
  const intervalRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load today's session count
  useEffect(() => {
    const loadSessions = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sessions = await db.focusSessions
        .where('completedAt')
        .aboveOrEqual(today.getTime())
        .and(s => s.type === 'work')
        .count()
      setSessionsToday(sessions)
    }
    loadSessions()
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(t => t - 1)
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      handleComplete()
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft])

  const handleComplete = useCallback(async () => {
    setIsRunning(false)
    
    // Play notification sound
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVw8LU5+mX1ZNDB+kZqLbl1qgI+Wk4FybnqHkpSThoN8fIKDg4WGhoaFhYWFhYWFhYWFhYWFhYSEhISEhIODg4OCgoKBgYCAgH9/fn59fXx8e3t6enl5eHh3d3Z2dXV0dHNzcnJxcXBwb29ubm1tbGxra2pqaWloaGdnZmZlZWRkY2NiYmFhYGBfX15eXV1cXFtbWlpZWVhYV1dWVlVVVFRTU1JSUVFQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUVFRUlJTU1RUVVVWVldXWFhZWVpaW1tcXF1dXl5fX2BgYWFiYmNjZGRlZWZmZ2doaGlpampra2xsbW1ubm9vcHBxcXJyc3N0dHV1dnZ3d3h4eXl6ent7fHx9fX5+f3+AgIGBgoKDg4SEhYWGhoeHiIiJiYqKi4uMjI2Njo6Pj5CQkZGSkpOTlJSVlZaWl5eYmJmZmpqbm5ycnZ2enp+foKChoaKio6OkpKWlpqanp6ioqamqqqqrq6ysra2urq+vsLCxsbKysrOzs7S0tLS1tba2t7e4uLm5urq7u7y8vb2+vr+/wMDBwcLCw8PExMXFxsbHx8jIycnKysvLzMzNzc7Oz8/Q0NHR0tLT09TU1dXW1tfX2NjZ2dra29vc3N3d3t7f3+Dg4eHi4uPj5OTl5ebm5+fo6Onp6urr6+zs7e3u7u/v8PDx8fLy8/P09PX19vb39/j4+fn6+vv7/Pz9/f7+')
      audioRef.current.play()
    } catch {}

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(mode === 'work' ? 'Focus session complete!' : 'Break is over!', {
        body: mode === 'work' ? 'Time for a break!' : 'Ready to focus?',
        icon: '🍅'
      })
    }

    // Save session to database
    const session: FocusSession = {
      id: `fs_${Date.now()}`,
      workspaceId,
      duration,
      completedAt: Date.now(),
      type: mode
    }
    await db.focusSessions.put(session)

    if (mode === 'work') {
      setSessionsToday(s => s + 1)
      // Auto-switch to break
      setMode('break')
      setDuration(5)
      setTimeLeft(5 * 60)
    } else {
      // Auto-switch to work
      setMode('work')
      setDuration(25)
      setTimeLeft(25 * 60)
    }
  }, [mode, duration, workspaceId])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(duration * 60)
  }

  const selectPreset = (minutes: number, type: 'work' | 'break') => {
    setMode(type)
    setDuration(minutes)
    setTimeLeft(minutes * 60)
    setIsRunning(false)
    setShowSettings(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  if (!isOpen) return null

  return (
    <div className="pomodoro-overlay">
      <div className="pomodoro-widget">
        {/* Header */}
        <div className="pomodoro-header">
          <div className="pomodoro-mode-toggle">
            <button
              className={`pomodoro-mode-btn ${mode === 'work' ? 'active' : ''}`}
              onClick={() => selectPreset(25, 'work')}
            >
              Focus
            </button>
            <button
              className={`pomodoro-mode-btn ${mode === 'break' ? 'active' : ''}`}
              onClick={() => selectPreset(5, 'break')}
            >
              Break
            </button>
          </div>
          <div className="pomodoro-actions">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSettings(!showSettings)}>
              ⚙️
            </button>
            {onMinimize && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={onMinimize}>
                −
              </button>
            )}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Timer Display */}
        <div className="pomodoro-timer">
          <div className="pomodoro-progress-ring">
            <svg viewBox="0 0 100 100">
              <circle
                className="pomodoro-progress-bg"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="6"
              />
              <circle
                className="pomodoro-progress-bar"
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                style={{
                  stroke: mode === 'work' ? 'var(--brand-primary)' : 'var(--color-success)',
                }}
              />
            </svg>
            <div className="pomodoro-time">{formatTime(timeLeft)}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="pomodoro-controls">
          <button className="btn btn-ghost btn-icon" onClick={resetTimer} title="Reset">
            ↺
          </button>
          <button
            className={`pomodoro-play-btn ${isRunning ? 'running' : ''}`}
            onClick={toggleTimer}
            style={{
              background: mode === 'work' ? 'var(--brand-primary)' : 'var(--color-success)',
            }}
          >
            {isRunning ? '⏸' : '▶'}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={handleComplete} title="Skip">
            ⏭
          </button>
        </div>

        {/* Session Counter */}
        <div className="pomodoro-stats">
          <span className="pomodoro-tomatoes">
            {[...Array(Math.min(sessionsToday, 8))].map((_, i) => (
              <span key={i}>🍅</span>
            ))}
            {sessionsToday > 8 && <span>+{sessionsToday - 8}</span>}
          </span>
          <span className="pomodoro-count">{sessionsToday} sessions today</span>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="pomodoro-settings">
            <div className="pomodoro-settings-section">
              <div className="pomodoro-settings-title">Focus Duration</div>
              <div className="pomodoro-presets">
                {WORK_PRESETS.map(preset => (
                  <button
                    key={preset.minutes}
                    className={`pomodoro-preset ${mode === 'work' && duration === preset.minutes ? 'active' : ''}`}
                    onClick={() => selectPreset(preset.minutes, 'work')}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pomodoro-settings-section">
              <div className="pomodoro-settings-title">Break Duration</div>
              <div className="pomodoro-presets">
                {BREAK_PRESETS.map(preset => (
                  <button
                    key={preset.minutes}
                    className={`pomodoro-preset ${mode === 'break' && duration === preset.minutes ? 'active' : ''}`}
                    onClick={() => selectPreset(preset.minutes, 'break')}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Mini floating timer for when minimized
export function MiniPomodoroTimer({ 
  timeLeft, 
  isRunning, 
  mode,
  onExpand,
  onToggle 
}: { 
  timeLeft: number
  isRunning: boolean
  mode: 'work' | 'break'
  onExpand: () => void
  onToggle: () => void
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      className="pomodoro-mini"
      style={{ background: mode === 'work' ? 'var(--brand-primary)' : 'var(--color-success)' }}
    >
      <span className="pomodoro-mini-time">{formatTime(timeLeft)}</span>
      <button className="pomodoro-mini-btn" onClick={onToggle}>
        {isRunning ? '⏸' : '▶'}
      </button>
      <button className="pomodoro-mini-btn" onClick={onExpand}>
        ↗
      </button>
    </div>
  )
}
