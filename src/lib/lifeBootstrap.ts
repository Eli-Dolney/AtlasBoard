import { db, type Area } from './db'

export const DEFAULT_AREAS: Area[] = [
  { id: 'area-personal', workspaceId: 'default-ws', name: 'Personal', color: '#8b5cf6', icon: '👤', sort: 0 },
  { id: 'area-family', workspaceId: 'default-ws', name: 'Family', color: '#ec4899', icon: '👨‍👧', sort: 1 },
  { id: 'area-work', workspaceId: 'default-ws', name: 'Work', color: '#3b82f6', icon: '💼', sort: 2 },
  { id: 'area-youtube', workspaceId: 'default-ws', name: 'YouTube', color: '#ef4444', icon: '▶️', sort: 3 },
]

export async function ensureLifeHub(workspaceId: string) {
  const count = await db.areas.where('workspaceId').equals(workspaceId).count()
  if (!count) await db.areas.bulkPut(DEFAULT_AREAS.map(a => ({ ...a, workspaceId })))
  else {
    const personal=await db.areas.get('area-personal')
    if(personal?.workspaceId===workspaceId&&personal.name==='Personal'&&personal.icon==='✨') await db.areas.update(personal.id,{icon:'👤'})
  }
  const profile = await db.playerProfiles.where('workspaceId').equals(workspaceId).first()
  if (!profile) await db.playerProfiles.put({ id: `player-${workspaceId}`, workspaceId, lifetimeXp: 0, rewardsEnabled: true, animationsEnabled: true, soundsEnabled: false, streaksEnabled: true, showXp: true, updatedAt: Date.now() })
}
