import MiniSearch from 'minisearch'
import { db } from './db'

export interface SearchResult {
  id: string
  type: 'board' | 'task' | 'list' | 'node' | 'note' | 'doc' | 'event' | 'habit' | 'goal'
  title: string
  content?: string
  itemId?: string
  boardId?: string
  nodeId?: string
  listId?: string
  score: number
  matches: string[]
  areaId?: string
  status?: string
  timestamp?: number
  tags?: string[]
}

export interface SearchFilters {
  areaIds?: string[]
  types?: SearchResult['type'][]
  statuses?: string[]
  dateFrom?: number
  dateTo?: number
  tags?: string[]
}

export class SearchService {
  private searchIndex: MiniSearch | null = null
  private documents: Map<string, SearchResult> = new Map()
  private initialization: Promise<void> | null = null

  async initialize() {
    if (this.searchIndex) return
    if(this.initialization) return this.initialization
    this.initialization=this.initializeOnce()
    try { await this.initialization } finally { this.initialization=null }
  }

  private async initializeOnce() {
    const index = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['id', 'type', 'title', 'boardId', 'nodeId', 'listId', 'areaId', 'itemId', 'status', 'timestamp', 'tags'],
      searchOptions: {
        boost: { title: 2, content: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    })
    this.searchIndex=index
    await this.buildIndex()
  }

  private async buildIndex() {
    if (!this.searchIndex) return

    const documents: SearchResult[] = []

    // Index boards
    const boards = await db.boards.toArray()
    for (const board of boards) {
      documents.push({
        id: `board-${board.id}`,
        type: 'board',
        title: board.title,
        content: `Board: ${board.title}`,
        boardId: board.id,
        score: 0,
        matches: [],
        areaId: board.areaId,
      })
    }

    // Index tasks
    const tasks = await db.tasks.toArray()
    for (const task of tasks) {
      documents.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        content: `${task.title} ${task.description || ''}`,
        listId: task.listId,
        itemId: task.id,
        score: 0,
        matches: [],
        areaId: task.areaId,
        status: task.status || 'not-started',
        timestamp: task.scheduledStartAt || task.dueAt || undefined,
        tags: task.tags,
      })
    }

    // Index lists
    const lists = await db.lists.toArray()
    for (const list of lists) {
      documents.push({
        id: `list-${list.id}`,
        type: 'list',
        title: list.title,
        content: `List: ${list.title}`,
        listId: list.id,
        score: 0,
        matches: [],
      })
    }

    // Index board nodes (from board data)
    for (const board of boards) {
      try {
        const boardData = JSON.parse(board.data) as {nodes?:Array<{id:string;data?:{label?:string}}>}
        if (boardData.nodes) {
          for (const node of boardData.nodes) {
            documents.push({
              id: `node-${board.id}-${node.id}`,
              type: 'node',
              title: node.data?.label || 'Untitled Node',
              content: node.data?.label || '',
              boardId: board.id,
              nodeId: node.id,
              score: 0,
              matches: [],
              areaId: board.areaId,
            })
          }
        }
      } catch (error) {
        console.warn('Failed to parse board data for search indexing:', error)
      }
    }

    for (const note of await db.notes.toArray()) documents.push({id:`note-${note.id}`,itemId:note.id,type:'note',title:note.title,content:note.content.replace(/<[^>]+>/g,' '),score:0,matches:[],areaId:note.areaId,timestamp:note.updatedAt,tags:note.tags})
    for (const doc of await db.docs.toArray()) documents.push({id:`doc-${doc.id}`,itemId:doc.id,type:'doc',title:doc.title,content:doc.content.replace(/<[^>]+>/g,' '),score:0,matches:[],areaId:doc.areaId,timestamp:doc.updatedAt})
    for (const event of await db.calendarEvents.toArray()) documents.push({id:`event-${event.id}`,itemId:event.id,type:'event',title:event.title,content:`${event.description || ''} ${event.location || ''}`,score:0,matches:[],areaId:event.areaId,status:'scheduled',timestamp:event.startAt})
    for (const habit of await db.habits.toArray()) documents.push({id:`habit-${habit.id}`,itemId:habit.id,type:'habit',title:habit.title,content:habit.description || '',score:0,matches:[],areaId:habit.areaId,status:habit.archived?'archived':'active',timestamp:habit.createdAt})
    for (const goal of await db.goals.toArray()) documents.push({id:`goal-${goal.id}`,itemId:goal.id,type:'goal',title:goal.title,content:goal.description || '',score:0,matches:[],areaId:goal.areaId,status:goal.status,timestamp:goal.targetDate || goal.updatedAt})

    // Deduplicate documents by ID before adding to index
    const uniqueDocuments = Array.from(new Map(documents.map(doc => [doc.id, doc])).values())
    this.documents = new Map(uniqueDocuments.map(doc => [doc.id, doc]))
    this.searchIndex.addAll(uniqueDocuments)
  }

  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!this.searchIndex || !query.trim()) {
      return []
    }

    const results = this.searchIndex.search(query, {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 2 },
    })

    return results
      .map(result => {
        const doc = this.documents.get(result.id)
        if (!doc) return null

        return {
          ...doc,
          score: result.score,
          matches: result.terms,
        }
      })
      .filter(Boolean)
      .filter(result=>!filters?.areaIds?.length||filters.areaIds.includes(result!.areaId||'area-personal'))
      .filter(result=>!filters?.types?.length||filters.types.includes(result!.type))
      .filter(result=>!filters?.statuses?.length||filters.statuses.includes(result!.status||''))
      .filter(result=>filters?.dateFrom===undefined||((result!.timestamp??-Infinity)>=filters.dateFrom))
      .filter(result=>filters?.dateTo===undefined||((result!.timestamp??Infinity)<=filters.dateTo))
      .filter(result=>!filters?.tags?.length||filters.tags.every(tag=>(result!.tags||[]).some(item=>item.toLowerCase()===tag.toLowerCase()))) as SearchResult[]
  }

  async addToIndex(result: SearchResult) {
    if (!this.searchIndex) return

    this.documents.set(result.id, result)
    this.searchIndex.add(result)
  }

  async removeFromIndex(id: string) {
    if (!this.searchIndex) return

    this.documents.delete(id)
    this.searchIndex.remove({ id })
  }

  async reindex() {
    if (!this.searchIndex) return this.initialize()
    this.searchIndex.removeAll()
    this.documents.clear()
    await this.buildIndex()
  }
}

export const searchService = new SearchService()
