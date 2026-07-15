import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { awardOnce, ensureLifeHub, levelForXp, setTaskCompleted } from './life'

beforeEach(async () => { await db.delete(); await db.open() })

describe('life hub', () => {
  it('seeds the four default areas and player once', async () => {
    await ensureLifeHub('default-ws'); await ensureLifeHub('default-ws')
    expect(await db.areas.count()).toBe(4)
    expect(await db.playerProfiles.count()).toBe(1)
    expect((await db.areas.get('area-personal'))?.icon).toBe('👤')
  })
  it('updates only the old default Personal icon',async()=>{
    await db.areas.bulkAdd([{id:'area-personal',workspaceId:'default-ws',name:'Personal',color:'#8b5cf6',icon:'✨',sort:0},{id:'custom-personal',workspaceId:'default-ws',name:'My Space',color:'#000',icon:'🐈',sort:1}])
    await ensureLifeHub('default-ws')
    expect((await db.areas.get('area-personal'))?.icon).toBe('👤')
    expect((await db.areas.get('custom-personal'))?.icon).toBe('🐈')
  })
  it('awards a source only once', async () => {
    await ensureLifeHub('default-ws')
    expect(await awardOnce('default-ws','task:t1','task',20)).toBe(true)
    expect(await awardOnce('default-ws','task:t1','task',20)).toBe(false)
    expect((await db.playerProfiles.get('player-default-ws'))?.lifetimeXp).toBe(20)
  })
  it('does not let reopening and recompleting a task farm XP', async () => {
    await ensureLifeHub('default-ws'); await db.tasks.add({id:'t1',listId:'l1',title:'Do it',status:'not-started',sort:0})
    await setTaskCompleted('t1','default-ws',true); await setTaskCompleted('t1','default-ws',false); await setTaskCompleted('t1','default-ws',true)
    expect((await db.playerProfiles.get('player-default-ws'))?.lifetimeXp).toBe(20)
    expect(await db.rewardActivities.count()).toBe(1)
    expect(await db.achievementProgress.where('achievementId').equals('first-step').count()).toBe(1)
  })
  it('uses a progressively wider XP curve', () => expect([levelForXp(0),levelForXp(99),levelForXp(100),levelForXp(400)]).toEqual([1,1,2,3]))
  it('emits one local celebration notice with newly unlocked achievements',async()=>{
    await ensureLifeHub('default-ws');const listener=vi.fn();window.addEventListener('atlas-reward',listener)
    await awardOnce('default-ws','task:celebrate','task',20)
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({xp:20,achievements:['first-step']})
    window.removeEventListener('atlas-reward',listener)
  })
})
