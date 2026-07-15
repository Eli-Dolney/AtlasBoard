export type AtlasItemType='task'|'event'|'note'|'doc'|'goal'

const routes:Record<AtlasItemType,string>={task:'tasks',event:'calendar',note:'notes',doc:'docs',goal:'goals'}
const storageKey='atlas-open-item'

export function openAtlasItem(type:AtlasItemType,id:string){
  const detail={type,id}
  localStorage.setItem(storageKey,JSON.stringify(detail))
  window.location.hash=`/${routes[type]}`
  setTimeout(()=>{
    window.dispatchEvent(new CustomEvent('atlas-open-item',{detail}))
    if(type==='task')window.dispatchEvent(new CustomEvent('open-task',{detail:{taskId:id}}))
  },100)
}

export function consumePendingItem(type:AtlasItemType){
  try{
    const raw=localStorage.getItem(storageKey)
    if(!raw)return null
    const pending=JSON.parse(raw) as {type?:string;id?:string}
    if(pending.type!==type||!pending.id)return null
    localStorage.removeItem(storageKey)
    return pending.id
  }catch{return null}
}
