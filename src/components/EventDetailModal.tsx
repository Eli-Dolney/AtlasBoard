import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CalendarEvent } from '../lib/db'
import { toLocalDateTime } from '../lib/calendar'
import RelatedMindMaps from './RelatedMindMaps'

export default function EventDetailModal({
  eventId,
  draftDate,
  workspaceId,
  defaultAreaId,
  onClose,
}: {
  eventId: string | null
  draftDate: Date | null
  workspaceId: string
  defaultAreaId: string
  onClose: () => void
}) {
  const existing = useLiveQuery(
    () => (eventId ? db.calendarEvents.get(eventId) : undefined),
    [eventId]
  )
  const areas = useLiveQuery(
    () => db.areas.where('workspaceId').equals(workspaceId).sortBy('sort'),
    [workspaceId],
    []
  )
  const initialStart = draftDate ? new Date(draftDate).getTime() : existing?.startAt || 0
  const [form, setForm] = useState<Partial<CalendarEvent>>({})
  const [error, setError] = useState('')
  useEffect(() => {
    const start = new Date(initialStart)
    if (start.getHours() === 0) start.setHours(9)
    setForm(
      existing || {
        title: '',
        areaId: defaultAreaId,
        startAt: start.getTime(),
        endAt: start.getTime() + 3600000,
        allDay: false,
        recurrence: 'none',
        reminderMinutes: 15,
      }
    )
  }, [existing, initialStart, defaultAreaId, eventId])
  if (!eventId && !draftDate) return null
  const update = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) =>
    setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.title?.trim() || !form.startAt || !form.endAt) {
      setError('Add a title, start, and end time.')
      return
    }
    if (form.endAt <= form.startAt) {
      setError('The event must end after it starts.')
      return
    }
    const now = Date.now(),
      record: CalendarEvent = {
        id: eventId || `event-${crypto.randomUUID()}`,
        workspaceId,
        areaId: form.areaId || defaultAreaId,
        title: form.title.trim(),
        description: form.description || '',
        startAt: form.startAt,
        endAt: form.endAt,
        allDay: !!form.allDay,
        location: form.location || '',
        recurrence: form.recurrence || 'none',
        reminderMinutes: form.reminderMinutes,
        color: form.color,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      }
    await db.calendarEvents.put(record)
    onClose()
  }
  const remove = async () => {
    if (eventId && confirm('Delete this event and all of its recurring occurrences?')) {
      await db.calendarEvents.delete(eventId)
      onClose()
    }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{eventId ? 'Edit event' : 'New event'}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body event-form">
          <label>
            Title
            <input
              autoFocus
              className="input"
              value={form.title || ''}
              onChange={e => update('title', e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label>
              Starts
              <input
                className="input"
                type="datetime-local"
                value={form.startAt ? toLocalDateTime(form.startAt) : ''}
                onChange={e => update('startAt', new Date(e.target.value).getTime())}
              />
            </label>
            <label>
              Ends
              <input
                className="input"
                type="datetime-local"
                value={form.endAt ? toLocalDateTime(form.endAt) : ''}
                onChange={e => update('endAt', new Date(e.target.value).getTime())}
              />
            </label>
          </div>
          <div className="event-duration">
            <span>Duration</span>
            {[30, 60, 90, 120].map(minutes => (
              <button
                key={minutes}
                onClick={() => form.startAt && update('endAt', form.startAt + minutes * 60000)}
              >
                {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label>
              Life area
              <select
                className="select"
                value={form.areaId || defaultAreaId}
                onChange={e => update('areaId', e.target.value)}
              >
                {areas
                  .filter(a => !a.archived)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Repeats
              <select
                className="select"
                value={form.recurrence || 'none'}
                onChange={e => update('recurrence', e.target.value as CalendarEvent['recurrence'])}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label>
              Location
              <input
                className="input"
                value={form.location || ''}
                onChange={e => update('location', e.target.value)}
              />
            </label>
            <label>
              Reminder
              <select
                className="select"
                value={form.reminderMinutes ?? -1}
                onChange={e => update('reminderMinutes', Number(e.target.value))}
              >
                <option value="-1">None</option>
                <option value="0">At start</option>
                <option value="5">5 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
            </label>
          </div>
          <label className="event-check">
            <input
              type="checkbox"
              checked={!!form.allDay}
              onChange={e => update('allDay', e.target.checked)}
            />{' '}
            All-day event
          </label>
          <label>
            Notes
            <textarea
              className="input"
              rows={4}
              value={form.description || ''}
              onChange={e => update('description', e.target.value)}
            />
          </label>
          {eventId && <RelatedMindMaps workspaceId={workspaceId} type="event" itemId={eventId} />}
          {error && <p className="event-error">{error}</p>}
        </div>
        <div className="modal-footer">
          {eventId && (
            <button className="btn btn-danger" onClick={remove}>
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save}>
              Save event
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
