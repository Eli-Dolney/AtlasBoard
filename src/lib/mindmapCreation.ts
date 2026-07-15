import { db } from './db'

export async function createMindMapForTemplate(workspaceId: string, areaId: string, title: string) {
  const id = `board-${crypto.randomUUID()}`
  await db.boards.add({ id, workspaceId, areaId, title, data: '', updatedAt: Date.now() })
  localStorage.setItem('atlas-active-board', id)
  return id
}
