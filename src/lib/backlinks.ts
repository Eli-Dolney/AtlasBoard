import { db } from './db'

export type LinkableItemType = 'task' | 'event' | 'note' | 'doc' | 'goal'

export interface MindMapBacklink {
  boardId: string
  boardTitle: string
  nodeId: string
  nodeLabel: string
  areaId?: string
}

const linkFields: Record<LinkableItemType,string> = {
  task:'linkedTaskId',
  event:'linkedEventId',
  note:'linkedNoteId',
  doc:'linkedDocId',
  goal:'linkedGoalId',
}

export async function findMindMapBacklinks(workspaceId:string,type:LinkableItemType,itemId:string):Promise<MindMapBacklink[]> {
  const boards=await db.boards.where('workspaceId').equals(workspaceId).toArray()
  const field=linkFields[type]
  const matches:MindMapBacklink[]=[]
  for(const board of boards){
    try{
      const data=JSON.parse(board.data) as {nodes?:Array<{id:string;data?:Record<string,unknown>}>}
      for(const node of data.nodes||[]){
        if(node.data?.[field]===itemId){
          matches.push({boardId:board.id,boardTitle:board.title,nodeId:node.id,nodeLabel:String(node.data.label||node.data.text||'Untitled node'),areaId:board.areaId})
        }
      }
    }catch{/* A malformed board must not hide backlinks from healthy maps. */}
  }
  return matches.sort((a,b)=>a.boardTitle.localeCompare(b.boardTitle)||a.nodeLabel.localeCompare(b.nodeLabel))
}

export function openMindMapBacklink(link:Pick<MindMapBacklink,'boardId'|'nodeId'>){
  localStorage.setItem('atlas-active-board',link.boardId)
  localStorage.setItem('atlas-focus-mind-node',link.nodeId)
  window.location.hash='/mind'
  setTimeout(()=>window.dispatchEvent(new CustomEvent('atlas-focus-mind-node',{detail:link})),150)
}
