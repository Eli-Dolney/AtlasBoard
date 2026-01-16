export type OpenTaskDetail = { taskId: string; view?: 'list' | 'kanban' }

export function emitOpenTask(detail: OpenTaskDetail) {
  const ev = new CustomEvent<OpenTaskDetail>('open-task', { detail })
  window.dispatchEvent(ev)
}

export function onOpenTask(listener: (detail: OpenTaskDetail) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<OpenTaskDetail>).detail)
  window.addEventListener('open-task', handler as EventListener)
  return () => window.removeEventListener('open-task', handler as EventListener)
}

// Global command actions
export function emitOpenQuickPalette() {
  const ev = new CustomEvent('open-quick-palette')
  window.dispatchEvent(ev)
}

export function onOpenQuickPalette(listener: () => void) {
  const handler = () => listener()
  window.addEventListener('open-quick-palette', handler as EventListener)
  return () => window.removeEventListener('open-quick-palette', handler as EventListener)
}

export function emitCreateTable() {
  const ev = new CustomEvent('create-table')
  window.dispatchEvent(ev)
}

export function onCreateTable(listener: () => void) {
  const handler = () => listener()
  window.addEventListener('create-table', handler as EventListener)
  return () => window.removeEventListener('create-table', handler as EventListener)
}

export function emitCreateTaskList() {
  const ev = new CustomEvent('create-task-list')
  window.dispatchEvent(ev)
}

export function onCreateTaskList(listener: () => void) {
  const handler = () => listener()
  window.addEventListener('create-task-list', handler as EventListener)
  return () => window.removeEventListener('create-task-list', handler as EventListener)
}
