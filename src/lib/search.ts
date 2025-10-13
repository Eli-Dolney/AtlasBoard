import MiniSearch from 'minisearch'
import { db } from './db'

export interface SearchResult {
  id: string
  type: 'board' | 'task' | 'list' | 'node'
  title: string
  content?: string
  boardId?: string
  nodeId?: string
  listId?: string
  score: number
  matches: string[]
}

export class SearchService {
  private searchIndex: MiniSearch | null = null
  private documents: Map<string, SearchResult> = new Map()

  async initialize() {
    this.searchIndex = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['id', 'type', 'title', 'boardId', 'nodeId', 'listId'],
      searchOptions: {
        boost: { title: 2, content: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    })

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
        score: 0,
        matches: [],
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
        const boardData = JSON.parse(board.data)
        if (boardData.nodes) {
          for (const node of boardData.nodes) {
            documents.push({
              id: `node-${board.id}-${node.id}`,
              type: 'node',
              title: (node.data as any)?.label || 'Untitled Node',
              content: (node.data as any)?.label || '',
              boardId: board.id,
              nodeId: node.id,
              score: 0,
              matches: [],
            })
          }
        }
      } catch (error) {
        console.warn('Failed to parse board data for search indexing:', error)
      }
    }

    // Deduplicate documents by ID before adding to index
    const uniqueDocuments = Array.from(new Map(documents.map(doc => [doc.id, doc])).values())
    this.documents = new Map(uniqueDocuments.map(doc => [doc.id, doc]))
    this.searchIndex.addAll(uniqueDocuments)
  }

  async search(query: string): Promise<SearchResult[]> {
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
      .filter(Boolean) as SearchResult[]
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
    if (this.searchIndex) {
      this.searchIndex.removeAll()
    }
    this.documents.clear()
    await this.buildIndex()
  }
}

export const searchService = new SearchService()
