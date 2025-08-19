import Dexie, { type Table } from 'dexie'

export type Workspace = {
	id: string
	name: string
	color?: string
	icon?: string
	lastModified: number
}

export type BoardRecord = {
	id: string
	workspaceId: string
	title: string
	data: string // JSON string of React Flow graph
	updatedAt: number
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
	sort: number
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
	type: 'text' | 'number' | 'select' | 'date' | 'checkbox'
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

export class AtlasDB extends Dexie {
	workspaces!: Table<Workspace, string>
	boards!: Table<BoardRecord, string>
	lists!: Table<TaskList, string>
	tasks!: Table<Task, string>
	tableMetas!: Table<TableMeta, string>
	tableColumns!: Table<TableColumn, string>
	tableRows!: Table<TableRow, string>
	templates!: Table<BoardTemplate, string>

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

		// Bind typed properties to actual stores
		this.workspaces = this.table('workspaces')
		this.boards = this.table('boards')
		this.lists = this.table('lists')
		this.tasks = this.table('tasks')
		this.tableMetas = this.table('tables')
		this.tableColumns = this.table('tableColumns')
		this.tableRows = this.table('tableRows')
		this.templates = this.table('templates')
	}
}

export const db = new AtlasDB()


