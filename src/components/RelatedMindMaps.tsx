import { useLiveQuery } from 'dexie-react-hooks'
import { findMindMapBacklinks, openMindMapBacklink, type LinkableItemType } from '../lib/backlinks'

export default function RelatedMindMaps({workspaceId,type,itemId}:{workspaceId:string;type:LinkableItemType;itemId:string}){
  const links=useLiveQuery(()=>findMindMapBacklinks(workspaceId,type,itemId),[workspaceId,type,itemId],[])
  return <section className="related-maps"><header><div><span>🧠</span><b>Related mind maps</b></div><small>{links.length} connection{links.length===1?'':'s'}</small></header>{links.length===0?<p>Link this item from a mind-map node to build your connected life web.</p>:<div>{links.map(link=><button key={`${link.boardId}-${link.nodeId}`} onClick={()=>openMindMapBacklink(link)}><span><b>{link.nodeLabel}</b><small>{link.boardTitle}</small></span><em>Open →</em></button>)}</div>}</section>
}
