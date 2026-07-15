import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Task } from '../../lib/db'
import { inSelectedAreas } from '../../lib/areaSelection'
import { expandCalendarEvents, findCalendarConflicts, moveTimestampToDate } from '../../lib/calendar'
import TaskDetailModal from '../../components/TaskDetailModal'
import EventDetailModal from '../../components/EventDetailModal'
import { useAtlasItemSelection } from '../../lib/itemSelection'

interface CalendarPageProps {
  workspaceId: string
  selectedAreas?: string[]
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda'
type DragItem = { type:'task'|'event'; id:string; occurrenceStart?:number }

export default function CalendarPage({ workspaceId, selectedAreas = [] }: CalendarPageProps) {
  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useAtlasItemSelection('event')
  const [draftEventDate, setDraftEventDate] = useState<Date | null>(null)

  const allTasks = useLiveQuery(() => db.tasks.toArray(), [], [])
  const tasks = allTasks.filter(t => inSelectedAreas(t.areaId, selectedAreas))
  const allEvents = useLiveQuery(() => db.calendarEvents.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])
  const events = allEvents.filter(e => inSelectedAreas(e.areaId, selectedAreas))
  const areas = useLiveQuery(() => db.areas.where('workspaceId').equals(workspaceId).toArray(), [workspaceId], [])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const occurrenceRange = useMemo(() => ({ start: new Date(year, month - 1, 1).getTime(), end: new Date(year, month + 2, 1).getTime() }), [year, month])
  const occurrences = useMemo(() => expandCalendarEvents(events, occurrenceRange.start, occurrenceRange.end), [events, occurrenceRange])
  const conflictIds=useMemo(()=>findCalendarConflicts(occurrences),[occurrences])

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1)
    const start = new Date(year, month, 1 - first.getDay())
    return [...Array(42)].map(
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    )
  }, [year, month])

  // Generate week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(cursor)
    startOfWeek.setDate(cursor.getDate() - cursor.getDay())
    return [...Array(7)].map(
      (_, i) =>
        new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i)
    )
  }, [cursor])

  // Tasks grouped by day
  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {}
    for (const t of tasks) {
      const scheduled=t.scheduledStartAt??t.dueAt
      if (!scheduled) continue
      const key = new Date(scheduled).toDateString()
      if (!m[key]) m[key] = []
      m[key].push(t)
    }
    return m
  }, [tasks])

  const addTaskAtDate = async (date: Date) => {
    const list = await db.lists.where('workspaceId').equals(workspaceId).first()
    const listId = list?.id ?? `l_${Date.now()}`
    if (!list) {
      await db.lists.put({ id: listId, workspaceId, title: 'General', sort: 0 })
    }

    const task: Task = {
      id: `t_${Date.now()}`,
      listId,
      title: 'New Task',
      dueAt: date.getTime(),
      status: 'not-started',
      sort: Date.now(),
    }
    await db.tasks.put(task)
    setSelectedTaskId(task.id)
  }

  const addEventAtDate = (date: Date) => setDraftEventDate(new Date(date))

  const startDrag=(event:React.DragEvent,item:DragItem)=>{event.stopPropagation();event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-atlas-item',JSON.stringify(item))}
  const dropOnDate=async(event:React.DragEvent,date:Date,hour?:number)=>{
    event.preventDefault();event.stopPropagation()
    const raw=event.dataTransfer.getData('application/x-atlas-item');if(!raw)return
    const item=JSON.parse(raw) as DragItem
    if(item.type==='task'){
      const task=await db.tasks.get(item.id);if(!task)return
      const original=task.scheduledStartAt??task.dueAt??date.getTime(),next=moveTimestampToDate(original,date,hour)
      const duration=(task.scheduledEndAt??original+3600000)-original
      await db.tasks.update(task.id,{scheduledStartAt:next,scheduledEndAt:next+Math.max(0,duration),dueAt:task.dueAt??next})
    }else{
      const calendarEvent=await db.calendarEvents.get(item.id);if(!calendarEvent)return
      const original=item.occurrenceStart??calendarEvent.startAt,next=moveTimestampToDate(original,date,hour)
      const shift=next-original
      await db.calendarEvents.update(calendarEvent.id,{startAt:calendarEvent.startAt+shift,endAt:calendarEvent.endAt+shift,updatedAt:Date.now()})
    }
  }

  const statusColors: Record<string, string> = {
    'not-started': 'var(--brand-primary)',
    'in-progress': 'var(--status-in-progress)',
    blocked: 'var(--status-blocked)',
    done: 'var(--status-done)',
  }

  const navigatePrev = () => {
    if (view === 'month') {
      setCursor(new Date(year, month - 1, 1))
    } else if (view === 'week') {
      setCursor(new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000))
    } else if(view==='day') {
      setCursor(new Date(cursor.getTime() - 24 * 60 * 60 * 1000))
    } else setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,cursor.getDate()))
  }

  const navigateNext = () => {
    if (view === 'month') {
      setCursor(new Date(year, month + 1, 1))
    } else if (view === 'week') {
      setCursor(new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000))
    } else if(view==='day') {
      setCursor(new Date(cursor.getTime() + 24 * 60 * 60 * 1000))
    } else setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,cursor.getDate()))
  }

  const getHeaderTitle = () => {
    if (view === 'month') {
      return cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if(view==='day') {
      return cursor.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } else return `Agenda · ${cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'})}`
  }

  // Render day cell content
  const renderDayCell = (d: Date, isCompact = false) => {
    const key = new Date(d.toISOString().slice(0, 10)).toDateString()
    const dayTasks = tasksByDay[key] ?? []
    const dayEvents = occurrences.filter(e => e.startAt < new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime() && e.endAt > new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime())
    const inMonth = d.getMonth() === month
    const isToday = new Date().toDateString() === key

    return (
      <div
        key={`${key}-${d.getTime()}`}
        className={`calendar-day ${!inMonth && view === 'month' ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
        onClick={e => {
          if (e.target === e.currentTarget) {
            addTaskAtDate(d)
          }
        }}
        onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move'}}
        onDrop={e=>dropOnDate(e,d)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="calendar-day-number">{d.getDate()}</span>
          <button
            className="btn btn-ghost btn-icon btn-sm opacity-0 group-hover:opacity-100"
            style={{ width: 20, height: 20, fontSize: '0.75rem' }}
            onClick={e => {
              e.stopPropagation()
              addTaskAtDate(d)
            }}
          >
            +
          </button>
        </div>
        <div className="calendar-day-events">
          {dayEvents.slice(0, 3).map(e => <div draggable onDragStart={drag=>startDrag(drag,{type:'event',id:e.sourceEventId,occurrenceStart:e.startAt})} key={e.occurrenceId} className={`calendar-event calendar-event-scheduled ${conflictIds.has(e.occurrenceId)?'calendar-conflict':''}`} onClick={click=>{click.stopPropagation();setSelectedEventId(e.sourceEventId)}} style={{ background: e.color || areas.find(a=>a.id===e.areaId)?.color || 'var(--brand-primary)' }} title={`${e.title}${e.location ? ` · ${e.location}` : ''}${conflictIds.has(e.occurrenceId)?' · Conflicts with another event':''}`}>{e.allDay?'◆':'◷'} {e.title}{e.recurrence&&e.recurrence!=='none'?' ↻':''}{conflictIds.has(e.occurrenceId)?' ⚠':''}</div>)}
          {dayTasks.slice(0, isCompact ? 2 : 4).map(t => (
            <div
              draggable
              onDragStart={drag=>startDrag(drag,{type:'task',id:t.id})}
              key={t.id}
              className={`calendar-event ${t.status === 'done' ? 'done' : ''}`}
              style={{
                background: statusColors[t.status || 'not-started'],
                opacity: t.status === 'done' ? 0.6 : 1,
              }}
              onClick={e => {
                e.stopPropagation()
                setSelectedTaskId(t.id)
              }}
              title={t.title}
            >
              {t.title}
            </div>
          ))}
          {dayTasks.length > (isCompact ? 2 : 4) && (
            <div className="text-xs text-center py-1" style={{ color: 'var(--text-tertiary)' }}>
              +{dayTasks.length - (isCompact ? 2 : 4)} more
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render day view (hour-by-hour)
  const renderDayView = () => {
    const key = new Date(cursor.toISOString().slice(0, 10)).toDateString()
    const dayTasks = tasksByDay[key] ?? []
    const dayStart = new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate()).getTime()
    const dayEnd = new Date(cursor.getFullYear(),cursor.getMonth(),cursor.getDate()+1).getTime()
    const dayEvents = occurrences.filter(e=>e.startAt<dayEnd&&e.endAt>dayStart)
    const hours = [...Array(24)].map((_, i) => i)

    return (
      <div className="calendar-day-view">
        <div className="calendar-day-header">
          <div className="calendar-day-info">
            <span className="calendar-day-number large">{cursor.getDate()}</span>
            <span className="calendar-day-name">
              {cursor.toLocaleDateString(undefined, { weekday: 'long' })}
            </span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => addTaskAtDate(cursor)}>
            + Add Task
          </button>
        </div>

        <div className="calendar-hours">
          {hours.map(hour => (
            <div key={hour} className="calendar-hour" onDragOver={e=>e.preventDefault()} onDrop={e=>dropOnDate(e,cursor,hour)}>
              <div className="calendar-hour-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="calendar-hour-content">
                {dayEvents.filter(e=>!e.allDay&&new Date(e.startAt).getHours()===hour).map(e=><div draggable onDragStart={drag=>startDrag(drag,{type:'event',id:e.sourceEventId,occurrenceStart:e.startAt})} key={e.occurrenceId} className={`calendar-hour-event ${conflictIds.has(e.occurrenceId)?'calendar-conflict':''}`} style={{background:e.color||areas.find(a=>a.id===e.areaId)?.color}} onClick={()=>setSelectedEventId(e.sourceEventId)}>◷ {e.title}{conflictIds.has(e.occurrenceId)?' ⚠':''}</div>)}
                {dayTasks
                  .filter(t => {
                    if (!t.dueAt) return false
                    const taskHour = new Date(t.dueAt).getHours()
                    return taskHour === hour
                  })
                  .map(t => (
                    <div
                      draggable
                      onDragStart={drag=>startDrag(drag,{type:'task',id:t.id})}
                      key={t.id}
                      className="calendar-hour-event"
                      style={{
                        background: statusColors[t.status || 'not-started'],
                        opacity: t.status === 'done' ? 0.6 : 1,
                      }}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      {t.title}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* All day tasks */}
        {(dayTasks.length > 0 || dayEvents.some(e=>e.allDay)) && (
          <div className="calendar-all-day">
            <h3 className="calendar-all-day-title">Tasks for this day</h3>
            <div className="calendar-all-day-list">
              {dayEvents.filter(e=>e.allDay).map(e=><div key={e.occurrenceId} className="calendar-all-day-item" onClick={()=>setSelectedEventId(e.sourceEventId)}><div className="calendar-all-day-dot" style={{background:e.color||areas.find(a=>a.id===e.areaId)?.color}}/><span>{e.title}</span></div>)}
              {dayTasks.map(t => (
                <div
                  key={t.id}
                  className="calendar-all-day-item"
                  onClick={() => setSelectedTaskId(t.id)}
                >
                  <div
                    className="calendar-all-day-dot"
                    style={{ background: statusColors[t.status || 'not-started'] }}
                  />
                  <span
                    style={{
                      textDecoration: t.status === 'done' ? 'line-through' : 'none',
                      opacity: t.status === 'done' ? 0.6 : 1,
                    }}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAgendaView=()=>{
    const rangeStart=new Date(cursor.getFullYear(),cursor.getMonth(),1).getTime(),rangeEnd=new Date(cursor.getFullYear(),cursor.getMonth()+1,1).getTime()
    const items=[...occurrences.filter(e=>e.startAt>=rangeStart&&e.startAt<rangeEnd).map(e=>({key:e.occurrenceId,at:e.startAt,title:e.title,areaId:e.areaId,type:'event' as const,id:e.sourceEventId,occurrenceStart:e.startAt,done:false})),...tasks.filter(t=>{const at=t.scheduledStartAt??t.dueAt;return at&&at>=rangeStart&&at<rangeEnd}).map(t=>({key:t.id,at:t.scheduledStartAt??t.dueAt!,title:t.title,areaId:t.areaId,type:'task' as const,id:t.id,done:t.status==='done'}))].sort((a,b)=>a.at-b.at)
    return <div className="calendar-agenda">{items.length===0?<div className="calendar-agenda-empty"><span>🗓️</span><h3>Your month is open</h3><p>Drag an unscheduled task onto a date, or add an event.</p></div>:items.map((item,index)=>{const previous=items[index-1],showDate=!previous||new Date(previous.at).toDateString()!==new Date(item.at).toDateString();return <div key={item.key}>{showDate&&<h3 className="agenda-date">{new Date(item.at).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</h3>}<div draggable onDragStart={drag=>startDrag(drag,{type:item.type,id:item.id,occurrenceStart:'occurrenceStart' in item?item.occurrenceStart:undefined})} className={`agenda-item ${item.done?'done':''}`} onClick={()=>item.type==='task'?setSelectedTaskId(item.id):setSelectedEventId(item.id)} style={{borderLeftColor:areas.find(a=>a.id===item.areaId)?.color}}><time>{new Date(item.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time><span>{item.type==='event'?'◷':'✓'}</span><b>{item.title}</b><small>{areas.find(a=>a.id===item.areaId)?.name}</small></div></div>})}</div>
  }

  return (
    <div className="calendar-page">
      <div className="calendar">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => addEventAtDate(cursor)}>+ Event</button>
            <button className="btn btn-secondary btn-sm" onClick={navigatePrev}>
              ←
            </button>
            <span className="calendar-title">{getHeaderTitle()}</span>
            <button className="btn btn-secondary btn-sm" onClick={navigateNext}>
              →
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <div className="calendar-view-toggle">
              <button
                className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('month')}
              >
                Month
              </button>
              <button
                className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('week')}
              >
                Week
              </button>
              <button
                className={`btn btn-sm ${view === 'day' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('day')}
              >
                Day
              </button>
              <button className={`btn btn-sm ${view==='agenda'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('agenda')}>Agenda</button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' && (
          <>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
            </div>
            <div className="calendar-grid">{monthDays.map(d => renderDayCell(d))}</div>
          </>
        )}

        {view === 'week' && (
          <>
            <div className="calendar-weekdays">
              {weekDays.map(d => (
                <div
                  key={d.toISOString()}
                  className={`calendar-weekday ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`}
                >
                  <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="calendar-weekday-date">{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="calendar-grid calendar-grid-week">
              {weekDays.map(d => renderDayCell(d, true))}
            </div>
          </>
        )}

        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
      </div>

      {/* Upcoming Tasks Sidebar */}
      <div className="calendar-sidebar">
        <h3 className="calendar-sidebar-title">Unscheduled</h3>
        <p className="calendar-sidebar-hint">Drag these onto the calendar</p>
        <div className="calendar-sidebar-list unscheduled-list">{tasks.filter(t=>!t.scheduledStartAt&&!t.dueAt&&t.status!=='done').slice(0,8).map(t=><div draggable onDragStart={drag=>startDrag(drag,{type:'task',id:t.id})} key={t.id} className="calendar-sidebar-item"><div className="calendar-sidebar-dot" style={{background:areas.find(a=>a.id===t.areaId)?.color||statusColors[t.status||'not-started']}}/><div className="calendar-sidebar-content"><span className="calendar-sidebar-task-title">{t.title}</span><span className="calendar-sidebar-task-date">Drag to schedule</span></div></div>)}{tasks.filter(t=>!t.scheduledStartAt&&!t.dueAt&&t.status!=='done').length===0&&<p className="text-caption calendar-sidebar-empty">Nothing waiting</p>}</div>
        <h3 className="calendar-sidebar-title upcoming-title">Upcoming Tasks</h3>
        <div className="calendar-sidebar-list">
          {tasks
            .filter(t => t.dueAt && t.status !== 'done')
            .sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0))
            .slice(0, 10)
            .map(t => (
              <div
                key={t.id}
                className="calendar-sidebar-item"
                onClick={() => setSelectedTaskId(t.id)}
              >
                <div
                  className="calendar-sidebar-dot"
                  style={{ background: statusColors[t.status || 'not-started'] }}
                />
                <div className="calendar-sidebar-content">
                  <span className="calendar-sidebar-task-title">{t.title}</span>
                  <span className="calendar-sidebar-task-date">
                    {t.dueAt && new Date(t.dueAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          {tasks.filter(t => t.dueAt && t.status !== 'done').length === 0 && (
            <p className="text-caption" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              No upcoming tasks
            </p>
          )}
        </div>
      </div>

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />
      <EventDetailModal eventId={selectedEventId} draftDate={draftEventDate} workspaceId={workspaceId} defaultAreaId={selectedAreas[0]||areas[0]?.id||'area-personal'} onClose={()=>{setSelectedEventId(null);setDraftEventDate(null)}} />
    </div>
  )
}
