import Dexie, { type Table } from 'dexie'

export type Workspace = {
  id: string
  name: string
  color?: string
  icon?: string
  lastModified: number
}

export type Area = { id: string; workspaceId: string; name: string; color: string; icon: string; sort: number; archived?: boolean }
export type CalendarEvent = { id: string; workspaceId: string; areaId: string; title: string; description?: string; startAt: number; endAt: number; allDay: boolean; location?: string; recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'; reminderMinutes?: number; color?: string; linkedTaskId?: string; linkedNoteId?: string; createdAt: number; updatedAt: number }
export type PlayerProfile = { id: string; workspaceId: string; lifetimeXp: number; rewardsEnabled: boolean; animationsEnabled: boolean; soundsEnabled: boolean; streaksEnabled: boolean; showXp: boolean; updatedAt: number }
export type RewardActivity = { id: string; workspaceId: string; sourceKey: string; sourceType: 'task' | 'habit' | 'milestone' | 'focus'; xp: number; createdAt: number }
export type AchievementProgress = { id: string; workspaceId: string; achievementId: string; unlockedAt: number; progress: number }

export type BoardRecord = {
  id: string
  workspaceId: string
  title: string
  data: string // JSON string of React Flow graph
  updatedAt: number
  areaId?: string
}

export type TaskList = {
  id: string
  workspaceId: string
  title: string
  sort: number
}

export type Task = {
  id: string
  listId: string
  title: string
  description?: string
  status?: 'not-started' | 'in-progress' | 'blocked' | 'done'
  assignee?: string
  dueAt?: number | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
  estimateMinutes?: number
  points?: number
  parentId?: string | null
  dependencyIds?: string[]
  // backlink to mind map node
  nodeId?: string | null
  nodeBoardId?: string | null
  sort: number
  areaId?: string
  scheduledStartAt?: number | null
  scheduledEndAt?: number | null
  reminderMinutes?: number
}

export type TableMeta = {
  id: string
  workspaceId: string
  name: string
  createdAt: number
}

export type TableColumn = {
  id: string
  tableId: string
  name: string
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url'
  options?: string[] // for select
  sort: number
}

export type TableRow = {
  id: string
  tableId: string
  // cells are stored as a map from column id to value
  cells: Record<string, unknown>
  sort: number
}

export type BoardTemplate = {
  id: string
  name: string
  // JSON string of React Flow graph
  data: string
  createdAt: number
}

export type Note = {
  id: string
  workspaceId: string
  title: string
  content: string // HTML content from rich text editor
  tags?: string[]
  color?: string
  linkedTaskIds?: string[]
  linkedBoardIds?: string[]
  createdAt: number
  updatedAt: number
  areaId?: string
}

// Focus/Pomodoro
export type FocusSession = {
  id: string
  workspaceId: string
  taskId?: string
  duration: number // in minutes
  completedAt: number
  type: 'work' | 'break'
}

// Habits
export type Habit = {
  id: string
  workspaceId: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom'
  customDays?: number[] // 0-6 for custom frequency
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime'
  color: string
  icon?: string
  archived?: boolean
  createdAt: number
  areaId?: string
}

export type HabitLog = {
  id: string
  habitId: string
  date: string // YYYY-MM-DD format
  completed: boolean
  completedAt?: number
  note?: string
}

// Goals
export type Goal = {
  id: string
  workspaceId: string
  title: string
  description?: string
  category: 'personal' | 'work' | 'health' | 'learning' | 'finance' | 'other'
  targetDate?: number
  progress: number // 0-100
  status: 'active' | 'completed' | 'archived'
  color?: string
  createdAt: number
  updatedAt: number
  areaId?: string
}

export type Milestone = {
  id: string
  goalId: string
  title: string
  targetDate?: number
  completed: boolean
  completedAt?: number
  sort: number
}

// Docs/Wiki
export type Doc = {
  id: string
  workspaceId: string
  parentId?: string | null
  title: string
  content: string // HTML or Markdown content
  icon?: string
  cover?: string
  isFavorite?: boolean
  createdAt: number
  updatedAt: number
  areaId?: string
}

export class AtlasDB extends Dexie {
  workspaces!: Table<Workspace, string>
  boards!: Table<BoardRecord, string>
  lists!: Table<TaskList, string>
  tasks!: Table<Task, string>
  tableMetas!: Table<TableMeta, string>
  tableColumns!: Table<TableColumn, string>
  tableRows!: Table<TableRow, string>
  templates!: Table<BoardTemplate, string>
  notes!: Table<Note, string>
  focusSessions!: Table<FocusSession, string>
  habits!: Table<Habit, string>
  habitLogs!: Table<HabitLog, string>
  goals!: Table<Goal, string>
  milestones!: Table<Milestone, string>
  docs!: Table<Doc, string>
  areas!: Table<Area, string>
  calendarEvents!: Table<CalendarEvent, string>
  playerProfiles!: Table<PlayerProfile, string>
  rewardActivities!: Table<RewardActivity, string>
  achievementProgress!: Table<AchievementProgress, string>

  constructor() {
    super('atlas-db')
    this.version(1).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
    })
    this.version(2).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, sort',
    })
    this.version(3).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, sort',
      tables: 'id, workspaceId, createdAt',
      tableColumns: 'id, tableId, sort',
      tableRows: 'id, tableId, sort',
    })
    this.version(4).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, sort',
      tables: 'id, workspaceId, createdAt',
      tableColumns: 'id, tableId, sort',
      tableRows: 'id, tableId, sort',
      templates: 'id, createdAt, name',
    })
    this.version(5).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, dueAt, status, sort',
      tables: 'id, workspaceId, createdAt',
      tableColumns: 'id, tableId, sort',
      tableRows: 'id, tableId, sort',
      templates: 'id, createdAt, name',
    })
    this.version(6).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, dueAt, status, sort',
      tables: 'id, workspaceId, createdAt',
      tableColumns: 'id, tableId, sort',
      tableRows: 'id, tableId, sort',
      templates: 'id, createdAt, name',
      notes: 'id, workspaceId, createdAt, updatedAt',
    })
    this.version(7).stores({
      workspaces: 'id, name, lastModified',
      boards: 'id, workspaceId, updatedAt',
      lists: 'id, workspaceId, sort',
      tasks: 'id, listId, dueAt, status, sort',
      tables: 'id, workspaceId, createdAt',
      tableColumns: 'id, tableId, sort',
      tableRows: 'id, tableId, sort',
      templates: 'id, createdAt, name',
      notes: 'id, workspaceId, createdAt, updatedAt',
      focusSessions: 'id, workspaceId, completedAt, type',
      habits: 'id, workspaceId, createdAt',
      habitLogs: 'id, habitId, date',
      goals: 'id, workspaceId, status, createdAt',
      milestones: 'id, goalId, sort',
      docs: 'id, workspaceId, parentId, createdAt, updatedAt',
    })
    this.version(8).stores({
      workspaces: 'id, name, lastModified', boards: 'id, workspaceId, areaId, updatedAt', lists: 'id, workspaceId, sort',
      tasks: 'id, listId, areaId, dueAt, scheduledStartAt, status, sort', tables: 'id, workspaceId, createdAt', tableColumns: 'id, tableId, sort', tableRows: 'id, tableId, sort', templates: 'id, createdAt, name',
      notes: 'id, workspaceId, areaId, createdAt, updatedAt', focusSessions: 'id, workspaceId, completedAt, type', habits: 'id, workspaceId, areaId, createdAt', habitLogs: 'id, habitId, date', goals: 'id, workspaceId, areaId, status, createdAt', milestones: 'id, goalId, sort', docs: 'id, workspaceId, areaId, parentId, createdAt, updatedAt',
      areas: 'id, workspaceId, sort, archived', calendarEvents: 'id, workspaceId, areaId, startAt, endAt', playerProfiles: 'id, workspaceId', rewardActivities: 'id, workspaceId, &sourceKey, createdAt', achievementProgress: 'id, workspaceId, achievementId'
    }).upgrade(async tx => {
      const areaId = 'area-personal'
      await tx.table('areas').put({ id: areaId, workspaceId: 'default-ws', name: 'Personal', color: '#8b5cf6', icon: '👤', sort: 0 })
      for (const name of ['boards', 'tasks', 'notes', 'habits', 'goals', 'docs']) await tx.table(name).toCollection().modify((item: { areaId?: string }) => { if (!item.areaId) item.areaId = areaId })
    })

    this.version(9).stores({
      workspaces: 'id, name, lastModified', boards: 'id, workspaceId, areaId, updatedAt', lists: 'id, workspaceId, sort',
      tasks: 'id, listId, areaId, dueAt, scheduledStartAt, status, nodeId, nodeBoardId, [nodeBoardId+nodeId], sort', tables: 'id, workspaceId, createdAt', tableColumns: 'id, tableId, sort', tableRows: 'id, tableId, sort', templates: 'id, createdAt, name',
      notes: 'id, workspaceId, areaId, createdAt, updatedAt', focusSessions: 'id, workspaceId, completedAt, type', habits: 'id, workspaceId, areaId, createdAt', habitLogs: 'id, habitId, date', goals: 'id, workspaceId, areaId, status, createdAt', milestones: 'id, goalId, sort', docs: 'id, workspaceId, areaId, parentId, createdAt, updatedAt',
      areas: 'id, workspaceId, sort, archived', calendarEvents: 'id, workspaceId, areaId, startAt, endAt', playerProfiles: 'id, workspaceId', rewardActivities: 'id, workspaceId, &sourceKey, createdAt', achievementProgress: 'id, workspaceId, achievementId'
    })

    // Bind typed properties to actual stores
    this.workspaces = this.table('workspaces')
    this.boards = this.table('boards')
    this.lists = this.table('lists')
    this.tasks = this.table('tasks')
    this.tableMetas = this.table('tables')
    this.tableColumns = this.table('tableColumns')
    this.tableRows = this.table('tableRows')
    this.templates = this.table('templates')
    this.notes = this.table('notes')
    this.focusSessions = this.table('focusSessions')
    this.habits = this.table('habits')
    this.habitLogs = this.table('habitLogs')
    this.goals = this.table('goals')
    this.milestones = this.table('milestones')
    this.docs = this.table('docs')
    this.areas = this.table('areas')
    this.calendarEvents = this.table('calendarEvents')
    this.playerProfiles = this.table('playerProfiles')
    this.rewardActivities = this.table('rewardActivities')
    this.achievementProgress = this.table('achievementProgress')
  }
}

export const db = new AtlasDB()
