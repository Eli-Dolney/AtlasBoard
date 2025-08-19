export type OpenTaskDetail = { taskId: string; view?: 'list' | 'kanban' }

export function emitOpenTask(taskId: string, view: 'list' | 'kanban' = 'list') {
	const ev = new CustomEvent<OpenTaskDetail>('open-task', { detail: { taskId, view } })
	window.dispatchEvent(ev)
}

export function onOpenTask(listener: (detail: OpenTaskDetail) => void) {
	const handler = (e: Event) => listener((e as CustomEvent<OpenTaskDetail>).detail)
	window.addEventListener('open-task', handler as EventListener)
	return () => window.removeEventListener('open-task', handler as EventListener)
}
