import './index.css'
import { useEffect, useState } from 'react'
import { BoardCanvas } from './features/boards/BoardCanvas'
import TasksPage from './features/tasks/TasksPage'
import TablesView from './features/tables/TablesView'
import GraphPage from './features/graph/GraphPage'
import DashboardPage from './features/dashboard/DashboardPage'
import TemplatesPage from './features/templates/TemplatesPage'
import NotesPage from './features/notes/NotesPage'
import CalendarPage from './features/calendar/CalendarPage'
import FocusPage from './features/focus/FocusPage'
import HabitsPage from './features/habits/HabitsPage'
import GoalsPage from './features/goals/GoalsPage'
import GanttView from './features/tasks/GanttView'
import GalleryView from './features/tables/GalleryView'
import DocsPage from './features/docs/DocsPage'
import CommandMenu, { type Command } from './components/CommandMenu'
import { emitCreateTable, emitCreateTaskList, emitOpenQuickPalette } from './lib/events'
import { SettingsModal } from './components/SettingsModal'
import { PomodoroTimer } from './components/PomodoroTimer'

type Route = 'dashboard' | 'mind' | 'tables' | 'tasks' | 'graph' | 'templates' | 'notes' | 'calendar' | 'focus' | 'habits' | 'goals' | 'gantt' | 'gallery' | 'docs'

// Navigation sections for sidebar
const navSections = [
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'mind', label: 'Mind Maps', icon: '🧠' },
      { id: 'tasks', label: 'Tasks', icon: '✓' },
      { id: 'tables', label: 'Tables', icon: '📊' },
      { id: 'docs', label: 'Docs', icon: '📄' },
    ],
  },
  {
    id: 'productivity',
    title: 'Productivity',
    items: [
      { id: 'focus', label: 'Focus Timer', icon: '🍅' },
      { id: 'habits', label: 'Habits', icon: '🔥' },
      { id: 'goals', label: 'Goals', icon: '🎯' },
    ],
  },
  {
    id: 'planning',
    title: 'Planning',
    items: [
      { id: 'calendar', label: 'Calendar', icon: '📅' },
      { id: 'gantt', label: 'Timeline', icon: '📈' },
      { id: 'notes', label: 'Notes', icon: '📝' },
    ],
  },
  {
    id: 'explore',
    title: 'Explore',
    items: [
      { id: 'graph', label: 'Graph View', icon: '🔗' },
      { id: 'gallery', label: 'Gallery', icon: '🖼️' },
      { id: 'templates', label: 'Templates', icon: '📋' },
    ],
  },
]

function App() {
  const workspaceId = 'default-ws'
  const boardId = 'default-board'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pomodoroOpen, setPomodoroOpen] = useState(false)
  const [route, setRoute] = useState<Route>(() => {
    const hash = (window.location.hash || '').replace(/^#\/?/, '')
    if (hash.startsWith('tables')) return 'tables'
    if (hash.startsWith('tasks')) return 'tasks'
    if (hash.startsWith('graph')) return 'graph'
    if (hash.startsWith('mind')) return 'mind'
    if (hash.startsWith('templates')) return 'templates'
    if (hash.startsWith('notes')) return 'notes'
    if (hash.startsWith('calendar')) return 'calendar'
    if (hash.startsWith('focus')) return 'focus'
    if (hash.startsWith('habits')) return 'habits'
    if (hash.startsWith('goals')) return 'goals'
    if (hash.startsWith('gantt')) return 'gantt'
    if (hash.startsWith('gallery')) return 'gallery'
    if (hash.startsWith('docs')) return 'docs'
    return 'dashboard'
  })

  const navigate = (to: Route) => {
    window.location.hash = `/${to}`
  }

  useEffect(() => {
    const onHash = () => {
      const hash = (window.location.hash || '').replace(/^#\/?/, '')
      if (hash.startsWith('tables')) setRoute('tables')
      else if (hash.startsWith('tasks')) setRoute('tasks')
      else if (hash.startsWith('graph')) setRoute('graph')
      else if (hash.startsWith('mind')) setRoute('mind')
      else if (hash.startsWith('templates')) setRoute('templates')
      else if (hash.startsWith('notes')) setRoute('notes')
      else if (hash.startsWith('calendar')) setRoute('calendar')
      else if (hash.startsWith('focus')) setRoute('focus')
      else if (hash.startsWith('habits')) setRoute('habits')
      else if (hash.startsWith('goals')) setRoute('goals')
      else if (hash.startsWith('gantt')) setRoute('gantt')
      else if (hash.startsWith('gallery')) setRoute('gallery')
      else if (hash.startsWith('docs')) setRoute('docs')
      else setRoute('dashboard')
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Cmd+K global command menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
      // Cmd+, for settings
      if (isMod && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
      // Cmd+B toggle sidebar
      if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setSidebarOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleTemplateSelect = (templateId: string) => {
    // Navigate to mind map and trigger template insertion
    navigate('mind')
    // The BoardCanvas will handle the template via events
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('insert-template', { detail: templateId }))
    }, 100)
  }

  const commands: Command[] = [
    { id: 'nav-dashboard', label: 'Go to Dashboard', hint: 'G D', run: () => navigate('dashboard') },
    { id: 'nav-mind', label: 'Go to Mind Map', hint: 'G M', run: () => navigate('mind') },
    { id: 'nav-tables', label: 'Go to Tables', hint: 'G T', run: () => navigate('tables') },
    { id: 'nav-tasks', label: 'Go to Tasks', hint: 'G P', run: () => navigate('tasks') },
    { id: 'nav-calendar', label: 'Go to Calendar', hint: 'G C', run: () => navigate('calendar') },
    { id: 'nav-notes', label: 'Go to Notes', hint: 'G N', run: () => navigate('notes') },
    { id: 'nav-focus', label: 'Go to Focus Timer', hint: 'G F', run: () => navigate('focus') },
    { id: 'nav-habits', label: 'Go to Habits', hint: 'G H', run: () => navigate('habits') },
    { id: 'nav-goals', label: 'Go to Goals', run: () => navigate('goals') },
    { id: 'nav-gantt', label: 'Go to Timeline/Gantt', run: () => navigate('gantt') },
    { id: 'nav-gallery', label: 'Go to Gallery', run: () => navigate('gallery') },
    { id: 'nav-docs', label: 'Go to Docs', run: () => navigate('docs') },
    { id: 'nav-templates', label: 'Go to Templates', run: () => navigate('templates') },
    { id: 'nav-graph', label: 'Go to Graph View', hint: 'G G', run: () => navigate('graph') },
    { id: 'start-pomodoro', label: 'Start Focus Timer', hint: 'F', run: () => setPomodoroOpen(true) },
    { id: 'quick', label: 'Open Quick Create', hint: 'Q', run: () => emitOpenQuickPalette() },
    { id: 'new-table', label: 'New Table', run: () => emitCreateTable() },
    { id: 'new-task-list', label: 'New Task List', run: () => emitCreateTaskList() },
    { id: 'settings', label: 'Open Settings / Data', hint: 'Cmd+,', run: () => setSettingsOpen(true) },
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', hint: 'Cmd+B', run: () => setSidebarOpen(v => !v) },
  ]

  const getPageTitle = () => {
    switch (route) {
      case 'dashboard':
        return 'Dashboard'
      case 'mind':
        return 'Mind Map'
      case 'tasks':
        return 'Tasks & Projects'
      case 'tables':
        return 'Tables'
      case 'graph':
        return 'Graph View'
      case 'calendar':
        return 'Calendar'
      case 'notes':
        return 'Notes'
      case 'templates':
        return 'Templates'
      case 'focus':
        return 'Focus Timer'
      case 'habits':
        return 'Habits'
      case 'goals':
        return 'Goals'
      case 'gantt':
        return 'Timeline'
      case 'gallery':
        return 'Gallery'
      case 'docs':
        return 'Documents'
      default:
        return 'Atlas Boards'
    }
  }

  const showHeader = route !== 'mind'

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          width: sidebarOpen ? 'var(--sidebar-width)' : '0',
          minWidth: sidebarOpen ? 'var(--sidebar-width)' : '0',
          opacity: sidebarOpen ? 1 : 0,
          overflow: sidebarOpen ? 'visible' : 'hidden',
        }}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="sidebar-brand-icon">AB</div>
            <span>Atlas Boards</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.id} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className={`sidebar-item ${route === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id as Route)}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="sidebar-section">
            <div className="sidebar-section-title">Quick Actions</div>
            <button className="sidebar-item" onClick={() => emitOpenQuickPalette()}>
              <span className="sidebar-item-icon">⚡</span>
              <span>Quick Create</span>
            </button>
            <button className="sidebar-item" onClick={() => setCmdOpen(true)}>
              <span className="sidebar-item-icon">🔍</span>
              <span>Search</span>
              <span className="ml-auto text-xs opacity-50">⌘K</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={() => setSettingsOpen(true)}>
            <span className="sidebar-item-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header - only shown for non-mind map views */}
        {showHeader && (
          <header className="main-header">
            <div className="flex items-center gap-3">
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSidebarOpen(v => !v)}
                title="Toggle Sidebar (⌘B)"
              >
                ☰
              </button>
              {/* Breadcrumb */}
              <div className="breadcrumb">
                <button
                  className="breadcrumb-item"
                  onClick={() => navigate('dashboard')}
                  style={{ opacity: route === 'dashboard' ? 1 : 0.7 }}
                >
                  Home
                </button>
                {route !== 'dashboard' && (
                  <>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item active">{getPageTitle()}</span>
                  </>
                )}
              </div>
            </div>
            <div className="main-header-actions">
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setCmdOpen(true)}
                title="Search (⌘K)"
              >
                🔍
              </button>
              {(route === 'tasks' || route === 'tables') && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (route === 'tasks') emitCreateTaskList()
                    else if (route === 'tables') emitCreateTable()
                  }}
                >
                  + New
                </button>
              )}
            </div>
          </header>
        )}

        {/* Main Body */}
        <main className="main-body">
          {route === 'dashboard' && (
            <DashboardPage workspaceId={workspaceId} onNavigate={r => navigate(r as Route)} />
          )}

          {route === 'mind' && (
            <div style={{ height: '100%', position: 'relative' }}>
              <BoardCanvas
                boardId={boardId}
                workspaceId={workspaceId}
                onOpenTools={t => {
                  if (t === 'kanban') navigate('tasks')
                  if (t === 'tables') navigate('tables')
                }}
              />
              {/* Floating sidebar toggle for mind map view */}
              {!sidebarOpen && (
                <button
                  className="btn btn-secondary btn-icon"
                  style={{
                    position: 'absolute',
                    left: 16,
                    bottom: 16,
                    zIndex: 50,
                  }}
                  onClick={() => setSidebarOpen(true)}
                  title="Show Sidebar (⌘B)"
                >
                  ☰
                </button>
              )}
            </div>
          )}

          {route === 'tables' && (
            <div className="p-6">
              <TablesView workspaceId={workspaceId} />
            </div>
          )}

          {route === 'tasks' && <TasksPage workspaceId={workspaceId} />}

          {route === 'graph' && (
            <div style={{ height: '100%' }}>
              <GraphPage workspaceId={workspaceId} />
            </div>
          )}

          {route === 'calendar' && (
            <div className="p-6" style={{ height: '100%' }}>
              <CalendarPage workspaceId={workspaceId} />
            </div>
          )}

          {route === 'notes' && (
            <div style={{ height: '100%' }}>
              <NotesPage workspaceId={workspaceId} />
            </div>
          )}

          {route === 'templates' && (
            <div className="p-6">
              <TemplatesPage onSelectTemplate={handleTemplateSelect} />
            </div>
          )}

          {route === 'focus' && (
            <FocusPage workspaceId={workspaceId} />
          )}

          {route === 'habits' && (
            <HabitsPage workspaceId={workspaceId} />
          )}

          {route === 'goals' && (
            <GoalsPage workspaceId={workspaceId} />
          )}

          {route === 'gantt' && (
            <div className="p-6" style={{ height: '100%' }}>
              <h1 className="text-2xl font-bold mb-4">Timeline View</h1>
              <GanttView workspaceId={workspaceId} />
            </div>
          )}

          {route === 'gallery' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Gallery View</h1>
              <GalleryView workspaceId={workspaceId} />
            </div>
          )}

          {route === 'docs' && (
            <div style={{ height: '100%' }}>
              <DocsPage workspaceId={workspaceId} />
            </div>
          )}
        </main>
      </div>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PomodoroTimer
        workspaceId={workspaceId}
        isOpen={pomodoroOpen}
        onClose={() => setPomodoroOpen(false)}
      />
    </div>
  )
}

export default App
