import { beforeEach,describe,expect,it } from 'vitest'
import { db } from './db'
import { findMindMapBacklinks } from './backlinks'

beforeEach(async()=>{await db.delete();await db.open()})

describe('mind-map backlinks',()=>{
  it('finds typed item links across maps and ignores malformed boards',async()=>{
    await db.boards.bulkAdd([
      {id:'b2',workspaceId:'ws',title:'Work map',areaId:'area-work',updatedAt:2,data:JSON.stringify({nodes:[{id:'n2',data:{label:'Launch',linkedTaskId:'t1'}},{id:'n3',data:{label:'Appointment',linkedEventId:'e1'}}]})},
      {id:'b1',workspaceId:'ws',title:'Family map',areaId:'area-family',updatedAt:1,data:JSON.stringify({nodes:[{id:'n1',data:{label:'School prep',linkedTaskId:'t1'}}]})},
      {id:'bad',workspaceId:'ws',title:'Broken',updatedAt:3,data:'not-json'},
    ])
    expect(await findMindMapBacklinks('ws','task','t1')).toEqual([
      {boardId:'b1',boardTitle:'Family map',nodeId:'n1',nodeLabel:'School prep',areaId:'area-family'},
      {boardId:'b2',boardTitle:'Work map',nodeId:'n2',nodeLabel:'Launch',areaId:'area-work'},
    ])
    expect((await findMindMapBacklinks('ws','event','e1'))[0].nodeId).toBe('n3')
  })
  it('keeps task-to-node identity scoped to its map',async()=>{
    await db.tasks.bulkAdd([
      {id:'t1',listId:'l1',title:'First',nodeBoardId:'b1',nodeId:'n1',sort:1},
      {id:'t2',listId:'l1',title:'Second',nodeBoardId:'b2',nodeId:'n1',sort:2},
    ])
    expect((await db.tasks.where('[nodeBoardId+nodeId]').equals(['b2','n1']).first())?.id).toBe('t2')
  })
})
