import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { BoardCanvas } from './BoardCanvas'

export default function MindMapsPage({ workspaceId, selectedAreas, onOpenTools }: { workspaceId: string; selectedAreas: string[]; onOpenTools: (tab: 'kanban' | 'tables' | 'calendar' | 'notes' | 'docs' | 'goals') => void }) {
  const boards = useLiveQuery(() => db.boards.where('workspaceId').equals(workspaceId).sortBy('updatedAt'), [workspaceId], [])
  const areas = useLiveQuery(() => db.areas.where('workspaceId').equals(workspaceId).sortBy('sort'), [workspaceId], [])
  const visible = boards.filter(b => selectedAreas.length === 0 || selectedAreas.includes(b.areaId || 'area-personal')).reverse()
  const [boardId, setBoardId] = useState(() => localStorage.getItem('atlas-active-board') || 'default-board')
  const [pendingBoardId,setPendingBoardId]=useState<string|null>(null)
  const activeBoardId = pendingBoardId && visible.some(b => b.id === pendingBoardId) ? pendingBoardId : boardId
  useEffect(() => {
    if(pendingBoardId){if(visible.some(b=>b.id===pendingBoardId)){setBoardId(pendingBoardId);setPendingBoardId(null)};return}
    if (visible.length && !visible.some(b => b.id === boardId)) setBoardId(visible[0].id)
  }, [visible, boardId, pendingBoardId])
  useEffect(() => localStorage.setItem('atlas-active-board', boardId), [boardId])
  const createBoard = async () => {
    const id = `board-${crypto.randomUUID()}`, areaId=selectedAreas[0] || 'area-personal'
    setPendingBoardId(id)
    // Persist the user's intent immediately; the live query will select the map
    // once IndexedDB publishes the newly inserted board.
    localStorage.setItem('atlas-active-board', id)
    await db.boards.add({id,workspaceId,areaId,title:'Untitled Map',data:'',updatedAt:Date.now()})
  }
  const deleteBoard = async () => {
    if (boards.length <= 1 || !confirm('Delete this mind map? This cannot be undone.')) return
    await db.boards.delete(boardId); setBoardId(boards.find(b=>b.id!==boardId)?.id || 'default-board')
  }
  return <div className="mindmaps-page"><div className="board-switcher"><select data-testid="mindmap-switcher" value={activeBoardId} onChange={e=>setBoardId(e.target.value)}>{visible.map(b=><option key={b.id} value={b.id}>{areas.find(a=>a.id===(b.areaId||'area-personal'))?.icon} {b.title}</option>)}</select><button data-testid="new-mindmap" onClick={createBoard}>＋ New map</button><button className="danger" onClick={deleteBoard} disabled={boards.length<=1}>Delete</button></div><div className="mindmaps-canvas"><BoardCanvas key={activeBoardId} boardId={activeBoardId} workspaceId={workspaceId} areaId={boards.find(b=>b.id===activeBoardId)?.areaId} onOpenTools={onOpenTools}/></div></div>
}
