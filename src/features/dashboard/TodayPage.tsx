import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalendarEvent, type Note } from '../../lib/db'
import { ACHIEVEMENTS, levelCeiling, levelFloor, levelForXp, setTaskCompleted } from '../../lib/life'
import { inSelectedAreas } from '../../lib/areaSelection'
import { expandCalendarEvents, toLocalDateTime } from '../../lib/calendar'

export default function TodayPage({ workspaceId, selectedAreas, onNavigate }: { workspaceId: string; selectedAreas: string[]; onNavigate: (route: string) => void }) {
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const events = useLiveQuery(() => db.calendarEvents.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])
  const areas = useLiveQuery(() => db.areas.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])
  const profile = useLiveQuery(() => db.playerProfiles.where('workspaceId').equals(workspaceId).first(), [workspaceId])
  const unlockedAchievements = useLiveQuery(() => db.achievementProgress.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])
  const lists = useLiveQuery(() => db.lists.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])
  const [kind, setKind] = useState<'task' | 'event' | 'note'>('task')
  const [title, setTitle] = useState('')
  const [areaId, setAreaId] = useState('area-personal')
  const [when, setWhen] = useState(() => toLocalDateTime(Date.now()))
  const now = new Date(), start = new Date(now); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1)
  const visibleTasks = tasks.filter(t => inSelectedAreas(t.areaId, selectedAreas))
  const visibleEvents = events.filter(e => inSelectedAreas(e.areaId, selectedAreas))
  const eventOccurrences = expandCalendarEvents(visibleEvents,start.getTime(),end.getTime())
  const todayTasks = visibleTasks.filter(t => { const d=t.scheduledStartAt ?? t.dueAt; return d && d>=start.getTime() && d<end.getTime() })
  const overdue = visibleTasks.filter(t => t.status !== 'done' && t.dueAt && t.dueAt < start.getTime()).sort((a,b)=>(a.dueAt??0)-(b.dueAt??0))
  const agenda = [
    ...todayTasks.map(t => ({ id:t.id, at:t.scheduledStartAt ?? t.dueAt!, title:t.title, type:'task' as const, areaId:t.areaId, done:t.status==='done' })),
    ...eventOccurrences.map(e=>({ id:e.occurrenceId, at:e.startAt, title:e.title, type:'event' as const, areaId:e.areaId, done:false }))
  ].sort((a,b)=>a.at-b.at)
  const areaMap = Object.fromEntries(areas.map(a=>[a.id,a]))
  const level = levelForXp(profile?.lifetimeXp ?? 0), floor=levelFloor(level), ceiling=levelCeiling(level)
  const capture = async () => {
    if (!title.trim()) return
    const at = new Date(when).getTime(), id=crypto.randomUUID()
    if (kind==='task') { let list=lists[0]; if(!list){ list={id:`list-${id}`,workspaceId,title:'Inbox',sort:0}; await db.lists.add(list) } await db.tasks.add({id:`task-${id}`,listId:list.id,title:title.trim(),status:'not-started',priority:'medium',dueAt:at,scheduledStartAt:at,scheduledEndAt:at+3600000,areaId,sort:Date.now()}) }
    else if(kind==='event') { const e:CalendarEvent={id:`event-${id}`,workspaceId,areaId,title:title.trim(),startAt:at,endAt:at+3600000,allDay:false,recurrence:'none',createdAt:Date.now(),updatedAt:Date.now()}; await db.calendarEvents.add(e) }
    else { const n:Note={id:`note-${id}`,workspaceId,areaId,title:title.trim(),content:'',createdAt:Date.now(),updatedAt:Date.now()}; await db.notes.add(n) }
    setTitle('')
  }
  return <div className="today-page">
    <section className="today-hero"><div><p className="eyebrow">YOUR DAILY COCKPIT</p><h1>{now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</h1><p className="today-subtitle">A calm view of what matters across your whole life.</p></div>{profile?.showXp!==false&&<div className="level-card"><b>Level {level}</b><span>{profile?.lifetimeXp??0} XP</span><div className="xp-track"><i style={{width:`${Math.min(100,(((profile?.lifetimeXp??0)-floor)/(ceiling-floor))*100)}%`}}/></div></div>}</section>
    <section className="quick-capture card">
      <div className="capture-kinds" aria-label="Capture type">{(['task','event','note'] as const).map(k=><button type="button" key={k} className={kind===k?'active':''} aria-pressed={kind===k} onClick={()=>setKind(k)}>{k}</button>)}</div>
      <div className="quick-capture-fields">
        <input className="input capture-title" value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&capture()} placeholder={`Capture a ${kind}…`}/>
        <input className="input" aria-label="Schedule date and time" type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)}/>
        <select className="select" aria-label="Area" value={areaId} onChange={e=>setAreaId(e.target.value)}>{areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</select>
        <button className="btn btn-primary" onClick={capture}>Add {kind}</button>
      </div>
    </section>
    <div className="today-grid"><section className="card today-panel"><header><h2>Today’s schedule</h2><button onClick={()=>onNavigate('calendar')}>Open calendar →</button></header>{agenda.length===0?<p className="empty-copy">Nothing scheduled yet. Give yourself some breathing room—or capture what matters above.</p>:agenda.map(item=><div className="agenda-row" key={`${item.type}-${item.id}`} style={{borderLeftColor:areaMap[item.areaId??'']?.color}}>{item.type==='task'?<input type="checkbox" checked={item.done} onChange={e=>setTaskCompleted(item.id,workspaceId,e.target.checked)}/>:<span>◷</span>}<time>{new Date(item.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time><b className={item.done?'done':''}>{item.title}</b><small>{areaMap[item.areaId??'']?.name}</small></div>)}</section>
    <section className="card today-panel"><header><h2>Needs attention</h2><button onClick={()=>onNavigate('tasks')}>All tasks →</button></header>{overdue.length===0?<p className="empty-copy">You’re caught up. Nice work.</p>:overdue.slice(0,8).map(t=><div className="attention-row" key={t.id}><button onClick={()=>setTaskCompleted(t.id,workspaceId,true)}>✓</button><div><b>{t.title}</b><small>{Math.ceil((start.getTime()-(t.dueAt??0))/86400000)} days overdue · {areaMap[t.areaId??'']?.name}</small></div></div>)}</section></div>
    {profile?.rewardsEnabled&&<section className="card achievement-strip"><header><div><p className="eyebrow">GENTLE PROGRESS</p><h2>Achievements</h2></div><span>{unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked</span></header><div>{ACHIEVEMENTS.map(a=>{const unlocked=unlockedAchievements.some(p=>p.achievementId===a.id);return <article key={a.id} className={unlocked?'unlocked':''}><i>{a.icon}</i><span><b>{a.title}</b><small>{a.description}</small></span>{unlocked&&<em>✓</em>}</article>})}</div></section>}
  </div>
}
