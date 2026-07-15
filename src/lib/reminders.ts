import { db, type Task } from './db'
import { expandCalendarEvents } from './calendar'

const notified = new Set<string>()

function shouldNotify(task: Task): boolean {
  if (!task.dueAt) return false
  if (task.status === 'done') return false
  const now = Date.now()
  return task.dueAt <= now + 60 * 1000 && task.dueAt > now - 60 * 1000
}

async function notify(task: Task) {
  try {
    if (Notification.permission === 'granted') {
      new Notification('Task due', { body: task.title })
    } else {
      console.log('Task due:', task.title)
    }
  } catch {
    alert(`Task due: ${task.title}`)
  }
}

export function startLocalReminders() {
  const tick = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const now = Date.now()
    const tasks = await db.tasks.toArray()
    for (const t of tasks) {
      const key=`task:${t.id}:${t.dueAt}`
      if (shouldNotify(t) && !notified.has(key)) {
        notified.add(key)
        void notify(t)
      }
    }
    const events = await db.calendarEvents.toArray()
    for (const event of expandCalendarEvents(events, now - 86400000, now + 86400000)) {
      if (event.reminderMinutes === undefined || event.reminderMinutes < 0) continue
      const reminderAt = event.startAt - event.reminderMinutes * 60000
      const key=`event:${event.occurrenceId}:${event.reminderMinutes}`
      if (reminderAt <= now && reminderAt > now - 60000 && !notified.has(key)) {
        notified.add(key)
        new Notification(event.title, { body: event.location ? `At ${event.location}` : 'Upcoming calendar event' })
      }
    }
  }
  void tick()
  const id = setInterval(tick, 30 * 1000)
  return () => clearInterval(id)
}
