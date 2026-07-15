import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { db } from '../../lib/db'
import MindMapsPage from './MindMapsPage'

vi.mock('./BoardCanvas',()=>({BoardCanvas:({boardId}:{boardId:string})=><div data-testid="mock-canvas">{boardId}</div>}))

beforeEach(async()=>{await db.delete();await db.open();localStorage.clear();await db.areas.add({id:'area-personal',workspaceId:'ws',name:'Personal',color:'#8b5cf6',icon:'✨',sort:0});await db.boards.add({id:'default-board',workspaceId:'ws',areaId:'area-personal',title:'My Map',data:'',updatedAt:1})})

describe('MindMapsPage',()=>{
  it('creates, selects, and persists a second map after the live query refreshes',async()=>{
    render(<MindMapsPage workspaceId="ws" selectedAreas={[]} onOpenTools={vi.fn()}/>)
    await waitFor(()=>expect((screen.getByTestId('mindmap-switcher') as HTMLSelectElement).options).toHaveLength(1))
    fireEvent.click(screen.getByTestId('new-mindmap'))
    await waitFor(()=>expect((screen.getByTestId('mindmap-switcher') as HTMLSelectElement).options).toHaveLength(2))
    const selected=(screen.getByTestId('mindmap-switcher') as HTMLSelectElement).value
    expect(selected).toMatch(/^board-/)
    expect(screen.getByTestId('mock-canvas').textContent).toBe(selected)
    expect(localStorage.getItem('atlas-active-board')).toBe(selected)
  })
})
