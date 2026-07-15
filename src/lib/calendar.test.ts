import { describe, expect, it } from 'vitest'
import { expandCalendarEvents, findCalendarConflicts, moveTimestampToDate, toLocalDateTime } from './calendar'
import type { CalendarEvent } from './db'

const event = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({ id:'e1',workspaceId:'ws',areaId:'personal',title:'Test',startAt:new Date(2026,0,5,9).getTime(),endAt:new Date(2026,0,5,10).getTime(),allDay:false,recurrence:'none',createdAt:1,updatedAt:1,...overrides })

describe('expandCalendarEvents', () => {
  it('includes a one-time event that overlaps the range', () => {
    expect(expandCalendarEvents([event()],new Date(2026,0,5).getTime(),new Date(2026,0,6).getTime())).toHaveLength(1)
  })
  it('generates weekly occurrences without storing duplicates', () => {
    const result=expandCalendarEvents([event({recurrence:'weekly'})],new Date(2026,0,1).getTime(),new Date(2026,1,1).getTime())
    expect(result).toHaveLength(4)
    expect(new Set(result.map(x=>x.occurrenceId)).size).toBe(4)
    expect(result.every(x=>x.sourceEventId==='e1')).toBe(true)
  })
  it('preserves local wall-clock time across daily recurrence', () => {
    const result=expandCalendarEvents([event({recurrence:'daily'})],new Date(2026,0,5).getTime(),new Date(2026,0,8).getTime())
    expect(result.map(x=>new Date(x.startAt).getHours())).toEqual([9,9,9])
  })
  it('formats timestamps for datetime-local inputs', () => expect(toLocalDateTime(new Date(2026,3,2,14,30).getTime())).toContain('2026-04-02T14:30'))
  it('keeps the monthly anchor day after a shorter month',()=>{
    const january31=event({startAt:new Date(2026,0,31,9).getTime(),endAt:new Date(2026,0,31,10).getTime(),recurrence:'monthly'})
    const result=expandCalendarEvents([january31],new Date(2026,0,1).getTime(),new Date(2026,4,1).getTime())
    expect(result.map(x=>new Date(x.startAt).getDate())).toEqual([31,28,31,30])
  })
  it('moves an item to a date while preserving its local time',()=>expect(new Date(moveTimestampToDate(new Date(2026,0,2,14,45).getTime(),new Date(2026,5,10))).getHours()).toBe(14))
  it('marks both sides of a timed-event conflict but ignores touching events',()=>{
    const expanded=expandCalendarEvents([event({id:'a'}),event({id:'b',startAt:new Date(2026,0,5,9,30).getTime(),endAt:new Date(2026,0,5,11).getTime()}),event({id:'c',startAt:new Date(2026,0,5,11).getTime(),endAt:new Date(2026,0,5,12).getTime()})],new Date(2026,0,5).getTime(),new Date(2026,0,6).getTime())
    expect([...findCalendarConflicts(expanded)].map(id=>id.split(':')[0]).sort()).toEqual(['a','b'])
  })
})
