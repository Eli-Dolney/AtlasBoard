import { db, type Task } from './db'

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
    const tasks = await db.tasks.toArray()
    for (const t of tasks) {
      if (shouldNotify(t)) {
        void notify(t)
      }
    }
  }
  void tick()
  const id = setInterval(tick, 30 * 1000)
  return () => clearInterval(id)
}
