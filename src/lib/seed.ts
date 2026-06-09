import { db } from './db'

const WORKSPACE_ID = 'default-ws'
const BOARD_ID = 'default-board'

function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return startOfDay(d.getTime())
}

export async function isWorkspaceEmpty(workspaceId: string): Promise<boolean> {
  const [taskCount, listCount, habitCount, goalCount, noteCount] = await Promise.all([
    db.tasks.count(),
    db.lists.where('workspaceId').equals(workspaceId).count(),
    db.habits.where('workspaceId').equals(workspaceId).count(),
    db.goals.where('workspaceId').equals(workspaceId).count(),
    db.notes.where('workspaceId').equals(workspaceId).count(),
  ])
  return taskCount === 0 && listCount === 0 && habitCount === 0 && goalCount === 0 && noteCount === 0
}

export async function seedStarterWorkspace(
  workspaceId = WORKSPACE_ID,
  boardId = BOARD_ID
): Promise<boolean> {
  if (!(await isWorkspaceEmpty(workspaceId))) {
    return false
  }

  const now = Date.now()

  await db.workspaces.put({
    id: workspaceId,
    name: 'My Workspace',
    color: '#6366f1',
    icon: 'AB',
    lastModified: now,
  })

  const starterNodes = [
    {
      id: 'n-root',
      type: 'editable',
      position: { x: 0, y: 0 },
      data: { label: 'My Life Map', color: '#6366f1', shape: 'rounded' },
    },
    {
      id: 'n-tasks',
      type: 'editable',
      position: { x: -320, y: 180 },
      data: { label: 'Tasks & Projects', color: '#3b82f6' },
    },
    {
      id: 'n-calendar',
      type: 'editable',
      position: { x: 0, y: 220 },
      data: { label: 'Calendar & Planning', color: '#10b981' },
    },
    {
      id: 'n-goals',
      type: 'editable',
      position: { x: 320, y: 180 },
      data: { label: 'Goals & Habits', color: '#8b5cf6' },
    },
    {
      id: 'n-ideas',
      type: 'note',
      position: { x: -180, y: -200 },
      data: {
        label: 'Quick capture',
        text: '<p>Brain dump ideas here — use [[wikilinks]] to connect thoughts.</p>',
      },
    },
  ]

  const starterEdges = [
    { id: 'e1', source: 'n-root', target: 'n-tasks', type: 'labeled' },
    { id: 'e2', source: 'n-root', target: 'n-calendar', type: 'labeled' },
    { id: 'e3', source: 'n-root', target: 'n-goals', type: 'labeled' },
    { id: 'e4', source: 'n-root', target: 'n-ideas', type: 'labeled' },
  ]

  const existingBoard = await db.boards.get(boardId)
  let shouldSeedBoard = !existingBoard
  if (existingBoard?.data) {
    try {
      const parsed = JSON.parse(existingBoard.data) as { nodes?: unknown[] }
      shouldSeedBoard = (parsed.nodes?.length ?? 0) <= 1
    } catch {
      shouldSeedBoard = true
    }
  }
  if (shouldSeedBoard) {
    await db.boards.put({
      id: boardId,
      workspaceId,
      title: 'My Life Map',
      data: JSON.stringify({ nodes: starterNodes, edges: starterEdges }),
      updatedAt: now,
    })
  }

  const listId = 'list_planner'
  await db.lists.put({
    id: listId,
    workspaceId,
    title: 'My Planner',
    sort: 0,
  })

  const starterTasks = [
    {
      id: 'task_welcome',
      listId,
      title: 'Explore your mind map',
      description: 'Double-click nodes to edit. Press Tab for child nodes.',
      status: 'in-progress' as const,
      priority: 'medium' as const,
      dueAt: daysFromNow(0),
      sort: 0,
    },
    {
      id: 'task_calendar',
      listId,
      title: 'Add tasks to your calendar',
      description: 'Open Calendar from the sidebar to see due dates.',
      status: 'not-started' as const,
      priority: 'high' as const,
      dueAt: daysFromNow(0),
      sort: 1,
    },
    {
      id: 'task_week',
      listId,
      title: 'Plan your week',
      status: 'not-started' as const,
      priority: 'medium' as const,
      dueAt: daysFromNow(3),
      sort: 2,
    },
    {
      id: 'task_backup',
      listId,
      title: 'Export a backup (Settings)',
      description: 'Your data stays local — export JSON backups anytime.',
      status: 'not-started' as const,
      priority: 'low' as const,
      dueAt: daysFromNow(7),
      sort: 3,
    },
  ]

  await db.tasks.bulkPut(starterTasks)

  await db.habits.put({
    id: 'habit_daily_review',
    workspaceId,
    title: 'Daily review',
    frequency: 'daily',
    timeOfDay: 'evening',
    color: '#6366f1',
    icon: '📋',
    createdAt: now,
  })

  return true
}

export async function ensureStarterData(
  workspaceId = WORKSPACE_ID,
  boardId = BOARD_ID
): Promise<void> {
  try {
    await seedStarterWorkspace(workspaceId, boardId)
  } catch (error) {
    console.warn('Failed to seed starter data:', error)
  }
}
