import type { CalendarEvent } from './db'

export type CalendarOccurrence = CalendarEvent & { occurrenceId: string; sourceEventId: string }

const advance = (date: Date, recurrence: CalendarEvent['recurrence'], anchorDay=date.getDate()) => {
  const next = new Date(date)
  if (recurrence === 'daily') next.setDate(next.getDate() + 1)
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7)
  if (recurrence === 'monthly') {
    next.setDate(1);next.setMonth(next.getMonth()+1)
    const lastDay=new Date(next.getFullYear(),next.getMonth()+1,0).getDate()
    next.setDate(Math.min(anchorDay,lastDay))
  }
  return next
}

export function expandCalendarEvents(events: CalendarEvent[], rangeStart: number, rangeEnd: number): CalendarOccurrence[] {
  const out: CalendarOccurrence[] = []
  for (const event of events) {
    const duration = Math.max(0, event.endAt - event.startAt)
    if (!event.recurrence || event.recurrence === 'none') {
      if (event.startAt < rangeEnd && event.endAt > rangeStart) out.push({ ...event, occurrenceId: `${event.id}:${event.startAt}`, sourceEventId: event.id })
      continue
    }
    let start = new Date(event.startAt)
    const anchorDay=start.getDate()
    let guard = 0
    while (start.getTime() + duration <= rangeStart && guard++ < 4000) start = advance(start, event.recurrence,anchorDay)
    while (start.getTime() < rangeEnd && guard++ < 5000) {
      const startAt = start.getTime(), endAt = startAt + duration
      if (endAt > rangeStart) out.push({ ...event, startAt, endAt, occurrenceId: `${event.id}:${startAt}`, sourceEventId: event.id })
      start = advance(start, event.recurrence,anchorDay)
    }
  }
  return out.sort((a,b) => a.startAt - b.startAt)
}

export function toLocalDateTime(timestamp: number) {
  const date = new Date(timestamp - new Date(timestamp).getTimezoneOffset() * 60000)
  return date.toISOString().slice(0, 16)
}

export function moveTimestampToDate(originalTimestamp:number,targetDate:Date,hour?:number){const original=new Date(originalTimestamp),next=new Date(targetDate);next.setHours(hour??original.getHours(),original.getMinutes(),0,0);return next.getTime()}

export function findCalendarConflicts(occurrences:CalendarOccurrence[]){const conflicted=new Set<string>();const timed=occurrences.filter(item=>!item.allDay).sort((a,b)=>a.startAt-b.startAt);for(let i=0;i<timed.length;i++){for(let j=i+1;j<timed.length&&timed[j].startAt<timed[i].endAt;j++){if(timed[i].sourceEventId!==timed[j].sourceEventId){conflicted.add(timed[i].occurrenceId);conflicted.add(timed[j].occurrenceId)}}}return conflicted}
