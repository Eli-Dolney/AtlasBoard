import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createMindMapForTemplate } from './mindmapCreation'

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
})

describe('template map creation', () => {
  it('creates a separate map and preserves the existing web', async () => {
    await db.boards.add({
      id: 'existing',
      workspaceId: 'ws',
      areaId: 'area-family',
      title: 'Family web',
      data: '{"nodes":[{"id":"n1"}],"edges":[]}',
      updatedAt: 1,
    })
    const id = await createMindMapForTemplate('ws', 'area-work', 'Project Hub')
    expect(id).not.toBe('existing')
    expect((await db.boards.get('existing'))?.title).toBe('Family web')
    expect(await db.boards.get(id)).toMatchObject({
      workspaceId: 'ws',
      areaId: 'area-work',
      title: 'Project Hub',
      data: '',
    })
    expect(localStorage.getItem('atlas-active-board')).toBe(id)
  })
})
