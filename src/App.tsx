import './index.css'
import { useRef, useState } from 'react'
import { BoardCanvas } from './features/boards/BoardCanvas'
import TasksPage from './features/tasks/TasksPage'
import TablesView from './features/tables/TablesView'

function App() {
  // For MVP we use a single default workspace and board ids
  const workspaceId = 'default-ws'
  const boardId = 'default-board'

  const mindMapRef = useRef<HTMLDivElement | null>(null)
  const tablesRef = useRef<HTMLDivElement | null>(null)
  const tasksRef = useRef<HTMLDivElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-[60] border-b border-neutral-200/70 bg-white/70 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-900/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="font-semibold tracking-tight">Atlas Boards</div>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <button className="rounded-md px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => scrollTo(mindMapRef)}>Mind Map</button>
            <button className="rounded-md px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => scrollTo(tablesRef)}>Tables</button>
            <button className="rounded-md px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => scrollTo(tasksRef)}>Personal Tasks</button>
          </nav>
          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center rounded-md p-2 text-xl md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="mx-auto block max-w-7xl px-4 pb-3 md:hidden">
            <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow dark:border-neutral-800 dark:bg-neutral-900">
              <button className="rounded-md px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { setMenuOpen(false); scrollTo(mindMapRef) }}>Mind Map</button>
              <button className="rounded-md px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { setMenuOpen(false); scrollTo(tablesRef) }}>Tables</button>
              <button className="rounded-md px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => { setMenuOpen(false); scrollTo(tasksRef) }}>Personal Tasks</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Mind Map section */}
        <section ref={mindMapRef} id="mind-map" className="relative">
          <div style={{ height: 'calc(100vh - 56px)' }}>
            <BoardCanvas
              boardId={boardId}
              workspaceId={workspaceId}
              onOpenTools={(t) => {
                if (t === 'kanban') scrollTo(tasksRef)
                if (t === 'tables') scrollTo(tablesRef)
              }}
            />
          </div>
        </section>

        {/* Tables section */}
        <section ref={tablesRef} id="tables" className="border-t border-neutral-200 bg-neutral-50 py-6 sm:py-10 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-4 text-lg font-semibold">Tables</h2>
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <TablesView workspaceId={workspaceId} />
            </div>
          </div>
        </section>

        {/* Personal Tasks section */}
        <section ref={tasksRef} id="tasks" className="border-t border-neutral-200 bg-neutral-50 py-6 sm:py-10 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="mb-4 text-lg font-semibold">Personal Tasks</h2>
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <TasksPage workspaceId={workspaceId} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
