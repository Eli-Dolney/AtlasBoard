import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HabitLog } from '../../lib/db'
import { DashboardCard } from './DashboardCard'
import { PomodoroTimer } from '../../components/PomodoroTimer'

interface DashboardPageProps {
  workspaceId: string
  onNavigate: (route: string) => void
}

export default function DashboardPage({ workspaceId, onNavigate }: DashboardPageProps) {
  const [showPomodoroTimer, setShowPomodoroTimer] = useState(false)
  
  // Fetch stats from database
  const boards = useLiveQuery(
    () => db.boards.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])

  const lists = useLiveQuery(
    () => db.lists.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const tables = useLiveQuery(
    () => db.tableMetas.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const notes = useLiveQuery(() => db.notes?.toArray() ?? Promise.resolve([]), [], [])
  
  const docs = useLiveQuery(() => db.docs?.toArray() ?? Promise.resolve([]), [], [])
  
  // Productivity data
  const habits = useLiveQuery(
    () => db.habits?.where('workspaceId').equals(workspaceId).and(h => !h.archived).toArray() ?? Promise.resolve([]),
    [workspaceId],
    []
  )
  
  const habitLogs = useLiveQuery(() => db.habitLogs?.toArray() ?? Promise.resolve([]), [], [])
  
  const goals = useLiveQuery(
    () => db.goals?.where('workspaceId').equals(workspaceId).and(g => g.status === 'active').toArray() ?? Promise.resolve([]),
    [workspaceId],
    []
  )
  
  const focusSessions = useLiveQuery(() => db.focusSessions?.toArray() ?? Promise.resolve([]), [], [])
  
  const today = new Date().toISOString().slice(0, 10)
  
  // Today's habits completion
  const todayHabitStats = useMemo(() => {
    const todayLogs: Record<string, HabitLog> = {}
    habitLogs
      .filter(log => log.date === today)
      .forEach(log => { todayLogs[log.habitId] = log })
    
    const completed = habits.filter(h => todayLogs[h.id]?.completed).length
    return { completed, total: habits.length }
  }, [habits, habitLogs, today])
  
  // Today's focus stats
  const todayFocusStats = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const sessions = focusSessions.filter(s => s.completedAt >= todayStart.getTime() && s.type === 'work')
    const minutes = sessions.reduce((sum, s) => sum + s.duration, 0)
    return { sessions: sessions.length, minutes }
  }, [focusSessions])

  // Calculate stats
  const taskStats = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    const activeTasks = tasks.filter(t => t.status !== 'done')
    const dueSoon = tasks.filter(
      t => t.dueAt && t.dueAt >= now.getTime() && t.dueAt <= weekFromNow.getTime() && t.status !== 'done'
    )
    const overdue = tasks.filter(
      t => t.dueAt && t.dueAt < now.getTime() && t.status !== 'done'
    )
    const completed = tasks.filter(t => t.status === 'done')

    return { activeTasks: activeTasks.length, dueSoon: dueSoon.length, overdue: overdue.length, completed: completed.length }
  }, [tasks])

  // Get recent items
  const recentBoards = useMemo(
    () =>
      [...boards]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3)
        .map(b => ({
          id: b.id,
          title: b.title,
          subtitle: new Date(b.updatedAt).toLocaleDateString(),
        })),
    [boards]
  )

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .filter(t => t.status !== 'done')
        .sort((a, b) => (b.dueAt ?? 0) - (a.dueAt ?? 0))
        .slice(0, 3)
        .map(t => ({
          id: t.id,
          title: t.title,
          subtitle: t.dueAt ? new Date(t.dueAt).toLocaleDateString() : undefined,
        })),
    [tasks]
  )

  const recentTables = useMemo(
    () =>
      [...tables]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3)
        .map(t => ({
          id: t.id,
          title: t.name,
          subtitle: new Date(t.createdAt).toLocaleDateString(),
        })),
    [tables]
  )

  // Section cards data - Workspace
  const workspaceSections = [
    {
      id: 'mind',
      title: 'Mind Maps',
      description: 'Visual brainstorming and idea mapping',
      icon: <span>🧠</span>,
      color: '#8b5cf6',
      stats: [
        { label: 'Boards', value: boards.length },
      ],
      recentItems: recentBoards,
    },
    {
      id: 'tasks',
      title: 'Tasks & Projects',
      description: 'Kanban boards and task management',
      icon: <span>✓</span>,
      color: '#3b82f6',
      stats: [
        { label: 'Active', value: taskStats.activeTasks },
        { label: 'Due Soon', value: taskStats.dueSoon },
        { label: 'Overdue', value: taskStats.overdue },
      ],
      recentItems: recentTasks,
    },
    {
      id: 'tables',
      title: 'Tables',
      description: 'Structured data and spreadsheets',
      icon: <span>📊</span>,
      color: '#f59e0b',
      stats: [{ label: 'Tables', value: tables.length }],
      recentItems: recentTables,
    },
    {
      id: 'docs',
      title: 'Documents',
      description: 'Wiki and documentation',
      icon: <span>📄</span>,
      color: '#64748b',
      stats: [{ label: 'Docs', value: docs?.length ?? 0 }],
      recentItems: [],
    },
  ]
  
  // Productivity sections
  const productivitySections = [
    {
      id: 'focus',
      title: 'Focus Timer',
      description: 'Pomodoro technique for productivity',
      icon: <span>🍅</span>,
      color: '#ef4444',
      stats: [
        { label: 'Today', value: `${todayFocusStats.sessions}` },
        { label: 'Minutes', value: todayFocusStats.minutes },
      ],
      recentItems: [],
    },
    {
      id: 'habits',
      title: 'Habits',
      description: 'Daily habit tracking',
      icon: <span>🔥</span>,
      color: '#f97316',
      stats: [
        { label: 'Today', value: `${todayHabitStats.completed}/${todayHabitStats.total}` },
        { label: 'Tracking', value: habits.length },
      ],
      recentItems: [],
    },
    {
      id: 'goals',
      title: 'Goals',
      description: 'Track progress on your goals',
      icon: <span>🎯</span>,
      color: '#22c55e',
      stats: [{ label: 'Active', value: goals.length }],
      recentItems: [],
    },
  ]
  
  // Planning sections
  const planningSections = [
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'Schedule and timeline view',
      icon: <span>📅</span>,
      color: '#10b981',
      stats: [
        { label: 'This Week', value: taskStats.dueSoon },
        { label: 'Completed', value: taskStats.completed },
      ],
      recentItems: [],
    },
    {
      id: 'gantt',
      title: 'Timeline',
      description: 'Gantt chart view of tasks',
      icon: <span>📈</span>,
      color: '#0ea5e9',
      stats: [],
      recentItems: [],
    },
    {
      id: 'notes',
      title: 'Notes',
      description: 'Quick notes and documentation',
      icon: <span>📝</span>,
      color: '#ec4899',
      stats: [{ label: 'Notes', value: notes?.length ?? 0 }],
      recentItems: [],
    },
  ]

  // Quick stats for header
  const quickStats = [
    { label: 'Active Tasks', value: taskStats.activeTasks, color: '#3b82f6' },
    { label: 'Due This Week', value: taskStats.dueSoon, color: '#f59e0b' },
    { label: 'Focus Today', value: `${todayFocusStats.sessions} 🍅`, color: '#ef4444' },
    { label: 'Habits Done', value: `${todayHabitStats.completed}/${todayHabitStats.total}`, color: '#f97316' },
    { label: 'Active Goals', value: goals.length, color: '#22c55e' },
  ]

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">Welcome back</h1>
          <p className="dashboard-subtitle">
            Here's what's happening across your workspace
          </p>
        </div>
        <button 
          className="btn btn-primary btn-lg dashboard-focus-btn"
          onClick={() => setShowPomodoroTimer(true)}
        >
          🍅 Start Focus Session
        </button>
      </div>

      {/* Quick Stats */}
      <div className="dashboard-quick-stats">
        {quickStats.map((stat, i) => (
          <div key={i} className="dashboard-quick-stat">
            <div
              className="dashboard-quick-stat-indicator"
              style={{ background: stat.color }}
            />
            <div className="dashboard-quick-stat-content">
              <span className="dashboard-quick-stat-value">{stat.value}</span>
              <span className="dashboard-quick-stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Productivity Section */}
      <div className="dashboard-sections">
        <h2 className="dashboard-section-title">Productivity</h2>
        <div className="dashboard-cards-grid dashboard-cards-productivity">
          {productivitySections.map(section => (
            <DashboardCard
              key={section.id}
              {...section}
              onClick={() => onNavigate(section.id)}
            />
          ))}
        </div>
      </div>

      {/* Workspace Sections Grid */}
      <div className="dashboard-sections">
        <h2 className="dashboard-section-title">Workspace</h2>
        <div className="dashboard-cards-grid">
          {workspaceSections.map(section => (
            <DashboardCard
              key={section.id}
              {...section}
              onClick={() => onNavigate(section.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Planning Sections Grid */}
      <div className="dashboard-sections">
        <h2 className="dashboard-section-title">Planning</h2>
        <div className="dashboard-cards-grid dashboard-cards-planning">
          {planningSections.map(section => (
            <DashboardCard
              key={section.id}
              {...section}
              onClick={() => onNavigate(section.id)}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-activity">
        <h2 className="dashboard-section-title">Recent Activity</h2>
        <div className="dashboard-activity-list">
          {[...recentBoards, ...recentTasks, ...recentTables]
            .slice(0, 8)
            .map((item, i) => (
              <div key={`${item.id}-${i}`} className="dashboard-activity-item">
                <div className="dashboard-activity-dot" />
                <div className="dashboard-activity-content">
                  <span className="dashboard-activity-title">{item.title}</span>
                  {item.subtitle && (
                    <span className="dashboard-activity-time">{item.subtitle}</span>
                  )}
                </div>
              </div>
            ))}
          {[...recentBoards, ...recentTasks, ...recentTables].length === 0 && (
            <div className="dashboard-activity-empty">
              <span>No recent activity yet. Start by creating a mind map or task!</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Pomodoro Timer Modal */}
      <PomodoroTimer
        workspaceId={workspaceId}
        isOpen={showPomodoroTimer}
        onClose={() => setShowPomodoroTimer(false)}
      />
    </div>
  )
}
