import './index.css'
import { useEffect, useState } from 'react'
import { BoardCanvas } from './features/boards/BoardCanvas'
import TasksPage from './features/tasks/TasksPage'
import TablesView from './features/tables/TablesView'
import CommandMenu, { type Command } from './components/CommandMenu'
import { emitCreateTable, emitCreateTaskList, emitOpenQuickPalette } from './lib/events'

function App() {
  // For MVP we use a single default workspace and board ids
  const workspaceId = 'default-ws'
  const boardId = 'default-board'

  const [menuOpen, setMenuOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [route, setRoute] = useState<'mind' | 'tables' | 'tasks'>(() => {
    const hash = (window.location.hash || '').replace(/^#\/?/, '')
    if (hash.startsWith('tables')) return 'tables'
    if (hash.startsWith('tasks')) return 'tasks'
    return 'mind'
  })

  const navigate = (to: 'mind' | 'tables' | 'tasks') => {
    window.location.hash = `/${to}`
  }

  useEffect(() => {
    const onHash = () => {
      const hash = (window.location.hash || '').replace(/^#\/?/, '')
      if (hash.startsWith('tables')) setRoute('tables')
      else if (hash.startsWith('tasks')) setRoute('tasks')
      else setRoute('mind')
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands: Command[] = [
    { id: 'nav-mind', label: 'Go to Mind Map', hint: 'G M', run: () => navigate('mind') },
    { id: 'nav-tables', label: 'Go to Tables', hint: 'G T', run: () => navigate('tables') },
    { id: 'nav-tasks', label: 'Go to Personal Tasks', hint: 'G P', run: () => navigate('tasks') },
    { id: 'quick', label: 'Open Quick Create', hint: 'Q', run: () => emitOpenQuickPalette() },
    { id: 'new-table', label: 'New Table', run: () => emitCreateTable() },
    { id: 'new-task-list', label: 'New Task List', run: () => emitCreateTaskList() },
  ]

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-[60] border-b border-neutral-200/70 bg-white/70 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-900/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="font-semibold tracking-tight">Atlas Boards</div>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <button
              className={`btn-ghost ${route === 'mind' ? 'font-medium' : ''}`}
              onClick={() => navigate('mind')}
            >
              Mind Map
            </button>
            <button
              className={`btn-ghost ${route === 'tables' ? 'font-medium' : ''}`}
              onClick={() => navigate('tables')}
            >
              Tables
            </button>
            <button
              className={`btn-ghost ${route === 'tasks' ? 'font-medium' : ''}`}
              onClick={() => navigate('tasks')}
            >
              Personal Tasks
            </button>
          </nav>
          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center rounded-md p-2 text-xl md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(v => !v)}
          >
            ☰
          </button>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="mx-auto block max-w-7xl px-4 pb-3 md:hidden">
            <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow dark:border-neutral-800 dark:bg-neutral-900">
              <button
                className="btn-ghost justify-start text-left"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('mind')
                }}
              >
                Mind Map
              </button>
              <button
                className="btn-ghost justify-start text-left"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('tables')
                }}
              >
                Tables
              </button>
              <button
                className="btn-ghost justify-start text-left"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('tasks')
                }}
              >
                Personal Tasks
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {route === 'mind' && (
          <section id="mind-map" className="relative">
            <div style={{ height: 'calc(100vh - 56px)' }}>
              <BoardCanvas
                boardId={boardId}
                workspaceId={workspaceId}
                onOpenTools={t => {
                  if (t === 'kanban') navigate('tasks')
                  if (t === 'tables') navigate('tables')
                }}
              />
            </div>
          </section>
        )}
        {route === 'tables' && (
          <section id="tables" className="section-shell">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <h2 className="mb-4 text-lg font-semibold">Tables</h2>
              <div className="card">
                <TablesView workspaceId={workspaceId} />
              </div>
            </div>
          </section>
        )}
        {route === 'tasks' && (
          <section id="tasks" className="section-shell">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <h2 className="mb-4 text-lg font-semibold">Personal Tasks</h2>
              <div className="card">
                <TasksPage workspaceId={workspaceId} />
              </div>
            </div>
          </section>
        )}
      </main>

      <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  )
}

export default App
