import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { searchService } from './search'

beforeEach(async()=>{await db.delete();await db.open()})

describe('global search',()=>{
  it('indexes notes, documents, tasks, maps, and map nodes',async()=>{
    await db.notes.add({id:'n1',workspaceId:'ws',areaId:'area-family',title:'Dance recital',content:'Costume pickup',createdAt:1,updatedAt:1})
    await db.docs.add({id:'d1',workspaceId:'ws',areaId:'area-work',title:'Launch brief',content:'Campaign checklist',createdAt:1,updatedAt:1})
    await db.boards.add({id:'b1',workspaceId:'ws',areaId:'area-youtube',title:'Videos',data:JSON.stringify({nodes:[{id:'node1',data:{label:'Thumbnail ideas'}}],edges:[]}),updatedAt:1})
    await searchService.reindex()
    expect((await searchService.search('recital'))[0].type).toBe('note')
    expect((await searchService.search('campaign'))[0].type).toBe('doc')
    expect((await searchService.search('thumbnail'))[0].type).toBe('node')
  })
  it('applies area and content-type filters',async()=>{
    await db.notes.bulkAdd([{id:'n1',workspaceId:'ws',areaId:'area-family',title:'Weekly plan',content:'Family',createdAt:1,updatedAt:1},{id:'n2',workspaceId:'ws',areaId:'area-work',title:'Weekly plan',content:'Work',createdAt:1,updatedAt:1}])
    await searchService.reindex()
    const results=await searchService.search('weekly',{areaIds:['area-family'],types:['note']})
    expect(results.map(r=>r.id)).toEqual(['note-n1'])
  })
  it('coalesces Strict Mode concurrent initialization',async()=>{
    await db.boards.add({id:'b1',workspaceId:'ws',title:'Only once',data:'{"nodes":[],"edges":[]}',updatedAt:1})
    await searchService.reindex()
    await Promise.all([searchService.initialize(),searchService.initialize()])
    expect((await searchService.search('only')).map(r=>r.id)).toEqual(['board-b1'])
  })
  it('indexes life planning records and filters by status, date, and tag',async()=>{
    const now=Date.now()
    await db.calendarEvents.add({id:'e1',workspaceId:'ws',areaId:'area-family',title:'Dance practice',description:'Bring recital shoes',startAt:now+86400000,endAt:now+90000000,allDay:false,recurrence:'none',createdAt:now,updatedAt:now})
    await db.habits.add({id:'h1',workspaceId:'ws',areaId:'area-personal',title:'Morning walk',description:'Neighborhood loop',frequency:'daily',timeOfDay:'morning',color:'#22c55e',createdAt:now})
    await db.goals.add({id:'g1',workspaceId:'ws',areaId:'area-work',title:'Launch channel',description:'Publish the welcome video',category:'work',progress:30,status:'active',targetDate:now+172800000,createdAt:now,updatedAt:now})
    await db.tasks.add({id:'t1',listId:'l1',areaId:'area-youtube',title:'Edit welcome video',status:'in-progress',tags:['video'],dueAt:now+86400000,sort:1})
    await searchService.reindex()
    expect((await searchService.search('recital',{types:['event'],dateFrom:now}))[0].id).toBe('event-e1')
    expect((await searchService.search('morning',{types:['habit'],statuses:['active']}))[0].id).toBe('habit-h1')
    expect((await searchService.search('launch',{types:['goal'],statuses:['active'],dateFrom:now}))[0].id).toBe('goal-g1')
    expect((await searchService.search('welcome',{types:['task'],statuses:['in-progress'],tags:['video']}))[0].id).toBe('task-t1')
    expect(await searchService.search('welcome',{types:['task'],tags:['family']})).toEqual([])
  })
})
