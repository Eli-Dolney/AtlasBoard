import './index.css'
import { useState } from 'react'
import { BoardCanvas } from './features/boards/BoardCanvas'
import Kanban from './features/tasks/Kanban'
import TablesView from './features/tables/TablesView'

function App() {
  // For MVP we use a single default workspace and board ids
  const workspaceId = 'default-ws'
  const boardId = 'default-board'
  const [tab, setTab] = useState<'kanban' | 'tables'>('kanban')
  return (
    <div className="app-shell">
      <div className="h-[100vh] grid grid-rows-[1fr_auto]">
        <BoardCanvas boardId={boardId} workspaceId={workspaceId} onOpenTools={(t) => setTab(t)} />
        <div className="border-t border-neutral-200 pl-[72px] dark:border-neutral-800">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="font-medium">Workspace tools:</span>
            <button className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700" onClick={() => setTab('kanban')}>Tasks</button>
            <button className="rounded bg-neutral-200 px-2 py-1 dark:bg-neutral-700" onClick={() => setTab('tables')}>Tables</button>
          </div>
          {tab === 'kanban' ? <Kanban workspaceId={workspaceId} /> : <TablesView workspaceId={workspaceId} />}
        </div>
      </div>
    </div>
  )
}

export default App
