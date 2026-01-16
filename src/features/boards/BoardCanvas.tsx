import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnConnect,
} from '@reactflow/core'
import { MiniMap } from '@reactflow/minimap'
import { Controls } from '@reactflow/controls'
import { Background } from '@reactflow/background'
import '@reactflow/core/dist/style.css'
import '@reactflow/minimap/dist/style.css'
import '@reactflow/controls/dist/style.css'
// background package does not ship a separate style entry; core styles are enough
import { db, type BoardTemplate, type Task } from '../../lib/db'
import { debounce } from '../../lib/autosave'
import { EditableNode } from './EditableNode'
import LabeledEdge from './LabeledEdge'
import * as htmlToImage from 'html-to-image'
import NoteNode from './NoteNode'
import ChecklistNode from './ChecklistNode'
import KanbanNode from './KanbanNode'
import TimelineNode from './TimelineNode'
import MatrixNode from './MatrixNode'
import QuickPalette from './QuickPalette'
import { emitOpenTask, onOpenQuickPalette } from '../../lib/events'
import { extractOutboundTitles } from '../../lib/links'
import { SearchDialog } from '../../components/SearchDialog'
import { searchService, type SearchResult } from '../../lib/search'
import { WelcomeScreen } from '../../components/WelcomeScreen'

// --- helpers for layout
function radialLayout(rootId: string, nodes: Node[], edges: Edge[]): Node[] {
	const childrenMap = new Map<string, string[]>()
	for (const e of edges) {
		if (!childrenMap.has(e.source as string)) childrenMap.set(e.source as string, [])
		childrenMap.get(e.source as string)!.push(e.target as string)
	}
	const center = { x: 0, y: 0 }
	const placed = new Map<string, { x: number; y: number }>()
	placed.set(rootId, center)
	const walk = (id: string, radius: number) => {
		const kids = childrenMap.get(id) ?? []
		const angleStep = (Math.PI * 2) / Math.max(kids.length, 1)
		kids.forEach((kid, i) => {
			const angle = i * angleStep
			const pos = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
			placed.set(kid, pos)
			walk(kid, radius * 1.2)
		})
	}
  walk(rootId, 450) // Increased radius for better spacing
  return nodes.map(n => (placed.has(n.id) ? { ...n, position: placed.get(n.id)! } : n))
}

// --- Node and Edge Types (defined outside component to avoid React Flow warnings)
const nodeTypes = {
  editable: EditableNode,
  note: NoteNode,
  checklist: ChecklistNode,
  kanban: KanbanNode,
  timeline: TimelineNode,
  matrix: MatrixNode,
}

const edgeTypes = { labeled: LabeledEdge }

// move tidyLayout definition here (before insertTemplate)
const tidyLayout = (function () {
  return function (
    this: void,
    nodes: Node[],
    edges: Edge[],
    setNodes: ReturnType<typeof useNodesState>[1]
  ) {
    const incoming = new Set(edges.map(e => e.target as string))
    const root = nodes.find(n => !incoming.has(n.id)) ?? nodes[0]
		if (!root) return
		const laidOut = radialLayout(root.id, nodes, edges)
    setNodes(cur =>
      cur.map(n => {
        const next = laidOut.find(x => x.id === n.id)
				return next ? { ...n, position: next.position } : n
      })
		)
	}
})()

// --- layout functions (moved before insertTemplate to avoid dependency issues)
const hierarchicalLayout = (function () {
  return function (rootId: string, allNodes: Node[], allEdges: Edge[]) {
    const children = new Map<string, string[]>()
    const parents = new Map<string, string>()
    for (const e of allEdges) {
      const s = String(e.source)
      const t = String(e.target)
      if (!children.has(s)) children.set(s, [])
      children.get(s)!.push(t)
      parents.set(t, s)
    }
    const depth = new Map<string, number>()
    const layers: Map<number, string[]> = new Map()
    const q: string[] = [rootId]
    depth.set(rootId, 0)
    while (q.length) {
      const cur = q.shift() as string
      const d = depth.get(cur) as number
      if (!layers.has(d)) layers.set(d, [])
      layers.get(d)!.push(cur)
      for (const k of children.get(cur) ?? []) {
        if (!depth.has(k)) {
          depth.set(k, d + 1)
          q.push(k)
        }
      }
    }
    const xStep = 450 // Increased horizontal spacing
    const yStep = 200 // Increased vertical spacing
    const positioned = new Map<string, { x: number; y: number }>()
    const maxLayer = Math.max(...Array.from(layers.keys()))
    for (let d = 0; d <= maxLayer; d++) {
      const ids = layers.get(d) ?? []
      const totalHeight = (ids.length - 1) * yStep
      ids.forEach((id, i) => {
        const x = d * xStep
        const y = -totalHeight / 2 + i * yStep
        positioned.set(id, { x, y })
      })
    }
    return allNodes.map(n => (positioned.has(n.id) ? { ...n, position: positioned.get(n.id)! } : n))
  }
})()

type BoardCanvasProps = {
  boardId: string
  workspaceId: string
  onOpenTools?: (tab: 'kanban' | 'tables') => void
}

// Node data interface for type safety
interface NodeData {
  label?: string
  text?: string
  color?: string
  shape?: string
  fontSize?: number
  collapsed?: boolean
  editing?: boolean
  columns?: KanbanColumn[]
  events?: TimelineEvent[]
  matrixData?: MatrixNodeData
  items?: ChecklistItem[]
}

// Supporting interfaces
interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
}

interface KanbanItem {
  id: string
  title: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: string
}

interface TimelineEvent {
  id: string
  title: string
  date: string
  description?: string
  type: 'milestone' | 'task' | 'deadline'
  status?: 'pending' | 'in-progress' | 'completed'
  assignee?: string
}

interface MatrixNodeData {
  title: string
  rows: string[]
  columns: string[]
  cells: MatrixCell[][]
}

interface MatrixCell {
  id: string
  content: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
}

interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ boardId, workspaceId, onOpenTools }) => {
  const initialNodes = useMemo<Node[]>(
    () => [
    {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'Central Idea' },
      type: 'editable',
    },
    ],
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState('Untitled Board')
  const [focusRootId, setFocusRootId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => {
    // Show welcome screen if never shown before
    return !localStorage.getItem('atlas-welcome-shown')
  })

  // simple undo/redo history
  type Snapshot = { nodes: Node[]; edges: Edge[] }
  const history = useRef<Snapshot[]>([])
  const historyIndex = useRef<number>(-1)
  const isNavigatingHistory = useRef(false)

  // Load board if exists
  useEffect(() => {
    void (async () => {
      const rec = await db.boards.get(boardId)
      if (rec?.data) {
        try {
          const parsed = JSON.parse(rec.data) as { nodes: Node[]; edges: Edge[] }
          const upgradedNodes: Node[] = parsed.nodes.map(n => ({
            ...n,
            type: 'editable',
            data: { label: (n?.data as NodeData)?.label ?? 'New Node', ...(n.data as NodeData) },
          }))
          setNodes(upgradedNodes)
          setEdges(parsed.edges)
        } catch {
          // ignore malformed
        }
      }
      setTitle(rec?.title ?? 'Untitled Board')
      setLoaded(true)

      // Initialize search service
      try {
        await searchService.initialize()
      } catch (error) {
        console.warn('Failed to initialize search service:', error)
      }
    })()
  }, [boardId, setEdges, setNodes])

  const persist = useMemo(
    () =>
      debounce(async (n: Node[], e: Edge[]) => {
    const payload = JSON.stringify({ nodes: n, edges: e })
    await db.boards.put({
      id: boardId,
      workspaceId,
      title,
      data: payload,
      updatedAt: Date.now(),
    })
      }, 500),
    [boardId, workspaceId, title]
  )

  useEffect(() => {
    if (!loaded) return
    persist(nodes, edges)
    // push into history unless we are applying a history snapshot
    if (isNavigatingHistory.current) return
    const snap: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }
    // truncate any redo states
    history.current = history.current.slice(0, historyIndex.current + 1)
    history.current.push(snap)
    historyIndex.current = history.current.length - 1
  }, [nodes, edges, loaded, persist])

  const onConnect = useCallback<OnConnect>(
    connection => {
      setEdges(eds => addEdge(connection, eds))
    },
    [setEdges]
  )


  const createNode = useCallback(
    (partial: Partial<Node> & { position: { x: number; y: number } }): Node => {
      const id = `n${Date.now()}_${Math.round(Math.random() * 1000)}`
      return {
        id,
        type: partial.type ?? 'editable',
        data: { label: 'New Node', editing: true, ...(partial.data as NodeData) },
        position: partial.position,
        selected: true,
      } as Node
    },
    []
  )

  const onAddNode = useCallback(() => {
    const node = createNode({
      position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
    })
    setNodes(cur => cur.map((n: any) => ({ ...n, selected: false })).concat(node) as any)
  }, [createNode, setNodes])

  const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes])

  const findNodeByTitle = useCallback(
    (title: string) => {
      return nodes.find(
        n =>
          typeof (n.data as NodeData)?.label === 'string' &&
          ((n.data as NodeData).label as string).trim() === title.trim()
      )
    },
    [nodes]
  )

  const createAndLinkFromSelection = useCallback(
    (title: string) => {
      if (!selectedNode) return
      const newNode = createNode({
        position: { x: selectedNode.position.x + 200, y: selectedNode.position.y + 120 },
        data: { label: title, editing: false },
      })
      const newEdge: Edge = {
        id: `e_${Date.now()}`,
        source: selectedNode.id,
        target: newNode.id,
        type: 'smoothstep',
      }
      setNodes(cur => cur.map((n: any) => ({ ...n, selected: n.id === newNode.id })).concat(newNode) as any)
      setEdges(cur => cur.concat(newEdge))
      rfInstance.current?.setCenter?.(newNode.position.x, newNode.position.y, {
        zoom: 1.1,
        duration: 500,
      })
    },
    [createNode, selectedNode, setEdges, setNodes]
  )

  const onAddChild = useCallback(() => {
    if (!selectedNode) return
    const offsetX = 200
    const offsetY = 120
    const newNode = createNode({
      position: {
        x: (selectedNode.position?.x ?? 0) + offsetX,
        y: (selectedNode.position?.y ?? 0) + offsetY,
      },
    })
    const newEdge: Edge = {
      id: `e${edges.length + 1}`,
      source: selectedNode.id,
      target: newNode.id,
      type: 'smoothstep',
    }
    setNodes(cur => cur.map((n: any) => ({ ...n, selected: false })).concat(newNode) as any)
    setEdges(cur => cur.concat(newEdge))
  }, [createNode, edges.length, selectedNode, setEdges, setNodes])

  const findIncomingEdge = useCallback(() => {
    if (!selectedNode) return undefined
    return edges.find(e => e.target === selectedNode.id)
  }, [edges, selectedNode])

  const onAddSibling = useCallback(() => {
    if (!selectedNode) return
    const incoming = findIncomingEdge()
      const newNode: Node = createNode({
      position: { x: selectedNode.position.x + 220, y: selectedNode.position.y },
    })
    setNodes(cur => cur.map((n: any) => ({ ...n, selected: false })).concat(newNode) as any)
    if (incoming) {
      const newEdge: Edge = {
        id: `e${edges.length + 1}`,
        source: incoming.source,
        target: newNode.id,
        type: 'smoothstep',
      }
      setEdges(cur => cur.concat(newEdge))
    }
  }, [createNode, edges.length, findIncomingEdge, selectedNode, setEdges, setNodes])

  const handleSearchResult = useCallback(
    async (result: SearchResult) => {
      switch (result.type) {
        case 'board':
          if (result.boardId) {
            // Switch to the board
            window.location.hash = `#board-${result.boardId}`
          }
          break
        case 'node':
          if (result.boardId && result.nodeId) {
            // Switch to the board and focus the node
            window.location.hash = `#board-${result.boardId}`
            // Focus the node after navigation
            setTimeout(() => {
              const nodeElement = document.querySelector(`[data-id="${result.nodeId}"]`)
              if (nodeElement) {
                ;(nodeElement as HTMLElement).focus?.()
              }
            }, 100)
          }
          break
        case 'task':
          // Open task view
          onOpenTools?.('kanban')
          break
        case 'list':
          // Open task view
          onOpenTools?.('kanban')
          break
      }
    },
    [onOpenTools]
  )

  const attachNodeToSelection = useCallback(
    (type: 'note' | 'checklist', data: any) => {
      if (!selectedNode) return
      const offsetX = 220
      const offsetY = 40
      const newNode = createNode({
        type,
        data,
        position: { x: selectedNode.position.x + offsetX, y: selectedNode.position.y + offsetY },
      })
      const newEdge: Edge = {
        id: `e${edges.length + 1}`,
        source: selectedNode.id,
        target: newNode.id,
        type: 'smoothstep',
      }
      setNodes(cur => cur.map((n: any) => ({ ...n, selected: false })).concat(newNode) as any)
      setEdges(cur => cur.concat(newEdge))
    },
    [createNode, edges.length, selectedNode, setEdges, setNodes]
  )

  // Save current board as a reusable template
  const saveAsTemplate = useCallback(async () => {
    const name = prompt('Template name?')?.trim()
    if (!name) return
    const payload = JSON.stringify({ nodes, edges })
    await db.templates.put({ id: `tpl_${Date.now()}`, name, data: payload, createdAt: Date.now() })
    alert('Template saved! Find it under Templates menu.')
  }, [edges, nodes])

  const onDeleteSelected = useCallback(() => {
    const selectedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    if (selectedNodeIds.size === 0 && edges.every(e => !e.selected)) return
    setNodes(cur => cur.filter(n => !n.selected))
    setEdges(cur =>
      cur.filter(
        e =>
          !e.selected &&
          !selectedNodeIds.has(e.source as string) &&
          !selectedNodeIds.has(e.target as string)
      )
    )
  }, [edges, nodes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const isTyping =
        !!active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      if (isTyping && !showSearch) return

      // Global search shortcut (Ctrl/Cmd + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        return
      }

      if (showSearch) return // Let search dialog handle its own keys

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        onDeleteSelected()
        return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          // redo
          if (historyIndex.current < history.current.length - 1) {
            isNavigatingHistory.current = true
            historyIndex.current += 1
            const snap = history.current[historyIndex.current]
            setNodes(snap.nodes)
            setEdges(snap.edges)
            queueMicrotask(() => {
              isNavigatingHistory.current = false
            })
          }
        } else {
          // undo
          if (historyIndex.current > 0) {
            isNavigatingHistory.current = true
            historyIndex.current -= 1
            const snap = history.current[historyIndex.current]
            setNodes(snap.nodes)
            setEdges(snap.edges)
            queueMicrotask(() => {
              isNavigatingHistory.current = false
            })
          }
        }
        return
      }
      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (historyIndex.current < history.current.length - 1) {
          isNavigatingHistory.current = true
          historyIndex.current += 1
          const snap = history.current[historyIndex.current]
          setNodes(snap.nodes)
          setEdges(snap.edges)
          queueMicrotask(() => {
            isNavigatingHistory.current = false
          })
        }
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        onAddChild()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onAddSibling()
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onAddChild, onAddSibling, onDeleteSelected, showSearch])

  const rfInstance = useRef<any>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [showUI, setShowUI] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark'
    } catch {
      return false
    }
  })
  const [search, setSearch] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [openMenu, setOpenMenu] = useState<
    null | 'insert' | 'templates' | 'file' | 'edit' | 'layout' | 'help'
  >(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const topbarRef = useRef<HTMLDivElement | null>(null)
	const [templates, setTemplates] = useState<BoardTemplate[]>([])

	useEffect(() => onOpenQuickPalette(() => setShowPalette(true)), [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])

	const refreshTemplates = useCallback(async () => {
		const all = await db.templates.toArray()
    all.sort((a, b) => b.createdAt - a.createdAt)
		setTemplates(all)
	}, [])

  const applyTemplateReplace = useCallback(
    async (tpl: BoardTemplate) => {
		try {
			const parsed = JSON.parse(tpl.data) as { nodes: Node[]; edges: Edge[] }
        setNodes(parsed.nodes.map(n => ({ ...n, type: 'editable' })))
        setEdges(parsed.edges.map(e => ({ type: 'labeled', ...e })))
		} catch (e) {
			console.error('Invalid template json', e)
		}
    },
    [setEdges, setNodes]
  )

  const getChildren = useCallback(
    (rootId: string): Node[] => {
		const visited = new Set<string>([rootId])
		const queue: string[] = [rootId]
		const out: Node[] = []
		while (queue.length) {
			const cur = queue.shift()!
			for (const e of edges) {
				if (e.source === cur && !visited.has(e.target as string)) {
					visited.add(e.target as string)
					queue.push(e.target as string)
            const n = nodes.find(x => x.id === e.target)
					if (n) out.push(n)
				}
			}
		}
		return out
    },
    [edges, nodes]
  )

	const createTasksFromBranch = useCallback(async () => {
		if (!selectedNode) return
		const children = getChildren(selectedNode.id)
    const listTitle = (selectedNode.data as NodeData)?.label || 'New List'
		const sort = Date.now()
		const listId = `l_${Date.now()}`
		await db.lists.put({ id: listId, workspaceId, title: listTitle, sort })
		let idx = 1
		for (const child of children) {
      const title = (child.data as NodeData)?.label || 'New Task'
      await db.tasks.put({
        id: `t_${Date.now()}_${idx++}`,
        listId,
        title,
        sort: idx,
        status: 'not-started',
      })
		}
		onOpenTools?.('kanban')
		alert(`Created ${children.length} tasks in list "${listTitle}"`)
	}, [db, getChildren, onOpenTools, selectedNode, workspaceId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  type TemplateId =
    | 'school-organized'
    | 'business-structured'
    | 'project-management'
    | 'knowledge-base'
    | 'personal-productivity'
    | 'decision-tree'
    | 'timeline'
    | 'swot-analysis'
    | 'mind-map-starter'
    | 'goal-planning'
    | 'life-dashboard'
    | 'brain-dump'
    | 'weekly-focus'
    | 'youtube-content'

  const insertTemplate = useCallback(
    (template: TemplateId) => {
      const templates = {
        'school-organized': {
          name: 'Academic Hub',
          structure: {
            root: 'Academic Success',
            sections: [
              {
                title: '📚 Courses',
                children: ['Current Semester', 'Prerequisites', 'Electives', 'Study Materials'],
              },
              {
                title: '📝 Assignments',
                children: ['Weekly Tasks', 'Term Papers', 'Group Projects', 'Lab Reports'],
              },
              {
                title: '📅 Schedule',
                children: ['Class Timetable', 'Study Blocks', 'Office Hours', 'Deadlines'],
              },
              {
                title: '🎯 Goals',
                children: ['Grade Targets', 'Skill Development', 'Extracurriculars', 'Career Prep'],
              },
              {
                title: '📖 Resources',
                children: ['Textbooks', 'Online Libraries', 'Study Groups', 'Tutoring'],
              },
            ],
          },
        },
        'business-structured': {
          name: 'Business Framework',
          structure: {
            root: 'Business Strategy',
            sections: [
              {
                title: '🎯 Vision & Mission',
                children: ['Core Values', 'Strategic Goals', 'Brand Identity', 'Market Position'],
              },
              {
                title: '📊 Operations',
                children: ['Process Mapping', 'Quality Control', 'Supply Chain', 'Risk Management'],
              },
              {
                title: '💰 Finance',
                children: [
                  'Budget Planning',
                  'Revenue Streams',
                  'Cost Analysis',
                  'Investment Strategy',
                ],
              },
              {
                title: '👥 Team',
                children: [
                  'Organizational Chart',
                  'Skill Gaps',
                  'Training Programs',
                  'Culture Building',
                ],
              },
              {
                title: '📈 Growth',
                children: [
                  'Market Expansion',
                  'Product Development',
                  'Partnerships',
                  'Competitive Analysis',
                ],
              },
            ],
          },
        },
        'project-management': {
          name: 'Project Hub',
          structure: {
            root: 'Project Management',
            sections: [
              {
                title: '📋 Planning',
                children: ['Scope Definition', 'Requirements', 'Timeline', 'Milestones'],
              },
              {
                title: '👥 Team',
                children: [
                  'Roles & Responsibilities',
                  'Communication Plan',
                  'Stakeholder Map',
                  'Resource Allocation',
                ],
              },
              {
                title: '⚡ Execution',
                children: [
                  'Task Breakdown',
                  'Dependencies',
                  'Progress Tracking',
                  'Quality Assurance',
                ],
              },
              {
                title: '📊 Monitoring',
                children: [
                  'Status Reports',
                  'Risk Register',
                  'Budget Tracking',
                  'Performance Metrics',
                ],
              },
              {
                title: '🔄 Review',
                children: ['Lessons Learned', 'Retrospectives', 'Success Metrics', 'Next Steps'],
              },
            ],
          },
        },
        'knowledge-base': {
          name: 'Knowledge Hub',
          structure: {
            root: 'Knowledge Management',
            sections: [
              {
                title: '📚 Learning',
                children: ['Topics of Interest', 'Books to Read', 'Courses', 'Skill Development'],
              },
              {
                title: '💡 Ideas',
                children: [
                  'Brainstorming',
                  'Innovation Pipeline',
                  'Problem Solving',
                  'Creative Projects',
                ],
              },
              {
                title: '🔗 Connections',
                children: ['Related Concepts', 'Cross-references', 'Applications', 'Implications'],
              },
              {
                title: '📝 Notes',
                children: [
                  'Meeting Notes',
                  'Research Findings',
                  'Personal Insights',
                  'Quick References',
                ],
              },
              {
                title: '🌟 Insights',
                children: ['Key Takeaways', 'Best Practices', 'Lessons Learned', 'Action Items'],
              },
            ],
          },
        },
        'personal-productivity': {
          name: 'Life Organization',
          structure: {
            root: 'Personal Productivity',
            sections: [
              {
                title: '🎯 Goals',
                children: [
                  'Short-term Goals',
                  'Long-term Vision',
                  'Quarterly Objectives',
                  'Personal Mission',
                ],
              },
              {
                title: '📅 Time Management',
                children: ['Daily Routines', 'Weekly Planning', 'Time Blocking', 'Priority Matrix'],
              },
              {
                title: '🏠 Life Areas',
                children: ['Health & Fitness', 'Relationships', 'Career', 'Personal Growth'],
              },
              {
                title: '💼 Work-Life',
                children: [
                  'Professional Development',
                  'Work Projects',
                  'Skill Building',
                  'Network Building',
                ],
              },
              {
                title: '🎨 Hobbies',
                children: [
                  'Creative Projects',
                  'Learning Activities',
                  'Travel Plans',
                  'Personal Interests',
                ],
              },
            ],
          },
        },
        'decision-tree': {
          name: 'Decision Framework',
          structure: {
            root: 'Decision Making',
            sections: [
              {
                title: '🔍 Analysis',
                children: [
                  'Problem Statement',
                  'Gather Information',
                  'Identify Options',
                  'Evaluate Criteria',
                ],
              },
              {
                title: '⚖️ Evaluation',
                children: [
                  'Pros & Cons',
                  'Risk Assessment',
                  'Impact Analysis',
                  'Stakeholder Views',
                ],
              },
              {
                title: '✅ Decision',
                children: [
                  'Recommended Choice',
                  'Rationale',
                  'Implementation Plan',
                  'Contingency Plans',
                ],
              },
              {
                title: '📊 Monitoring',
                children: [
                  'Success Metrics',
                  'Progress Tracking',
                  'Review Points',
                  'Adjustment Triggers',
                ],
              },
            ],
          },
        },
        timeline: {
          name: 'Timeline Planning',
          structure: {
            root: 'Timeline Management',
            sections: [
              {
                title: '🎯 Goals',
                children: [
                  'Vision Statement',
                  'Long-term Objectives',
                  'Success Criteria',
                  'Milestone Definition',
                ],
              },
              {
                title: '📅 Phases',
                children: [
                  'Planning Phase',
                  'Execution Phase',
                  'Monitoring Phase',
                  'Completion Phase',
                ],
              },
              {
                title: '⏰ Milestones',
                children: [
                  'Key Deliverables',
                  'Review Points',
                  'Decision Gates',
                  'Celebration Points',
                ],
              },
              {
                title: '📈 Progress',
                children: [
                  'Weekly Check-ins',
                  'Monthly Reviews',
                  'Quarterly Assessments',
                  'Annual Planning',
                ],
              },
            ],
          },
        },
        'swot-analysis': {
          name: 'SWOT Analysis',
          structure: {
            root: 'Strategic Analysis',
            sections: [
              {
                title: '💪 Strengths',
                children: [
                  'Core Competencies',
                  'Unique Advantages',
                  'Internal Resources',
                  'Market Position',
                ],
              },
              {
                title: '🔍 Weaknesses',
                children: [
                  'Areas for Improvement',
                  'Resource Gaps',
                  'Process Issues',
                  'Competitive Disadvantages',
                ],
              },
              {
                title: '🚀 Opportunities',
                children: [
                  'Market Trends',
                  'Partnership Potential',
                  'Technology Advances',
                  'Expansion Possibilities',
                ],
              },
              {
                title: '⚠️ Threats',
                children: [
                  'Competitive Risks',
                  'Market Changes',
                  'Regulatory Issues',
                  'Economic Factors',
                ],
              },
            ],
          },
        },
        'mind-map-starter': {
          name: 'Mind Map Starter',
          structure: {
            root: 'Central Topic',
            sections: [
              {
                title: '🌟 Key Concepts',
                children: ['Main Ideas', 'Core Principles', 'Important Facts', 'Key Questions'],
              },
              {
                title: '🔗 Connections',
                children: [
                  'Related Topics',
                  'Associated Ideas',
                  'Cross-references',
                  'Applications',
                ],
              },
              {
                title: '📝 Details',
                children: ['Supporting Information', 'Examples', 'Evidence', 'Explanations'],
              },
              {
                title: '🤔 Reflections',
                children: [
                  'Personal Thoughts',
                  'Questions to Explore',
                  'Areas for Research',
                  'Action Items',
                ],
              },
            ],
          },
        },
        'goal-planning': {
          name: 'Goal Achievement',
          structure: {
            root: 'Goal Setting',
            sections: [
              {
                title: '🎯 Vision',
                children: [
                  'Long-term Goals',
                  'Life Vision',
                  'Ultimate Objectives',
                  'Dream Outcomes',
                ],
              },
              {
                title: '📋 Strategy',
                children: [
                  'Action Plans',
                  'Resource Requirements',
                  'Timeline Planning',
                  'Milestone Setting',
                ],
              },
              {
                title: '💪 Motivation',
                children: [
                  'Why Important',
                  'Personal Drivers',
                  'Inspiration Sources',
                  'Accountability Partners',
                ],
              },
              {
                title: '📊 Tracking',
                children: [
                  'Progress Metrics',
                  'Check-in Schedule',
                  'Adjustment Points',
                  'Success Indicators',
                ],
              },
            ],
          },
        },
        // ADHD-Friendly Life Organization Templates
        'life-dashboard': {
          name: 'Life Dashboard',
          structure: {
            root: '🏠 My Life',
            sections: [
              {
                title: '💼 Work',
                children: ['Current Projects', 'Meetings', 'Deadlines', 'People'],
              },
              {
                title: '📚 School',
                children: ['Classes', 'Homework', 'Exams', 'Study Notes'],
              },
              {
                title: '👨‍👩‍👧 Family',
                children: ['Kids Activities', 'Family Events', 'Home Tasks', 'Quality Time'],
              },
              {
                title: '🎬 YouTube',
                children: ['Video Ideas', 'In Production', 'Upload Schedule', 'Analytics'],
              },
              {
                title: '🌟 Personal',
                children: ['Health', 'Hobbies', 'Learning', 'Relaxation'],
              },
              {
                title: '💡 Ideas',
                children: ['Brain Dump', 'Someday/Maybe', 'To Research', 'Inspiration'],
              },
            ],
          },
        },
        'brain-dump': {
          name: 'Brain Dump',
          structure: {
            root: '🧠 Brain Dump',
            sections: [
              {
                title: '🔴 Urgent',
                children: ['Do Today', 'Overdue', 'Blocking Others', 'Stressing Me'],
              },
              {
                title: '🟡 This Week',
                children: ['Must Do', 'Should Do', 'Want to Do', 'Waiting For'],
              },
              {
                title: '🟢 Later',
                children: ['Next Week', 'This Month', 'Someday', 'Maybe Never'],
              },
              {
                title: '💭 Random Thoughts',
                children: ['Ideas', 'Worries', 'Questions', 'Notes to Self'],
              },
            ],
          },
        },
        'weekly-focus': {
          name: 'Weekly Focus',
          structure: {
            root: '📆 This Week',
            sections: [
              {
                title: '🎯 Top 3 Priorities',
                children: ['Priority 1', 'Priority 2', 'Priority 3'],
              },
              {
                title: '📅 Monday-Wednesday',
                children: ['Morning Focus', 'Afternoon Tasks', 'Evening Wind-down'],
              },
              {
                title: '📅 Thursday-Friday',
                children: ['Morning Focus', 'Afternoon Tasks', 'Wrap Up Week'],
              },
              {
                title: '🏖️ Weekend',
                children: ['Family Time', 'Personal Projects', 'Rest & Recharge'],
              },
            ],
          },
        },
        'youtube-content': {
          name: 'YouTube Content',
          structure: {
            root: '🎬 YouTube',
            sections: [
              {
                title: '💡 Ideas Backlog',
                children: ['Video Ideas', 'Trending Topics', 'Audience Requests', 'Collaborations'],
              },
              {
                title: '🎥 In Production',
                children: ['Scripting', 'Filming', 'Editing', 'Thumbnails'],
              },
              {
                title: '📤 Ready to Upload',
                children: ['Final Review', 'SEO & Tags', 'Schedule', 'Promotion'],
              },
              {
                title: '📊 Published',
                children: ['This Week', 'This Month', 'Top Performers', 'Needs Improvement'],
              },
              {
                title: '📈 Growth',
                children: ['Analytics Review', 'Subscriber Goals', 'Revenue', 'Community'],
              },
            ],
          },
        },
      }

      const templateData = templates[template]
      if (!templateData) return

      const { root, sections } = templateData.structure
      const created: Node[] = []
      const createdEdges: Edge[] = []

      // Create root node with better styling
      const rootNode = createNode({
        position: { x: 0, y: 0 },
        data: {
          label: root,
          editing: false,
          fontSize: 20,
          color: '#f0f9ff',
          shape: 'rounded',
        },
        selected: false,
      })
      created.push(rootNode)

      // Layout sections in a grid with better spacing
      const sectionsPerRow = 3
      const sectionSpacing = 600 // Increased from 350
      const childSpacing = 150 // Increased from 100
      const childOffsetX = 400 // Increased from 300

      sections.forEach((section, sectionIndex) => {
        const row = Math.floor(sectionIndex / sectionsPerRow)
        const col = sectionIndex % sectionsPerRow

        const sectionX = (col - 1) * sectionSpacing
        const sectionY = (row - 0.5) * sectionSpacing

        const sectionNode = createNode({
          position: { x: sectionX, y: sectionY },
          data: {
            label: section.title,
            editing: false,
            fontSize: 16,
            color: '#fef3c7',
            shape: 'rounded',
          },
          selected: false,
        })
        created.push(sectionNode)
        createdEdges.push({
          id: `edge_${Date.now()}_${sectionIndex}`,
          source: rootNode.id,
          target: sectionNode.id,
          type: 'smoothstep',
        })

        // Add children in a column with better spacing
        const childrenCount = section.children.length
        const totalChildHeight = (childrenCount - 1) * childSpacing
        const startY = sectionY - totalChildHeight / 2

        section.children.forEach((child, childIndex) => {
          const childNode = createNode({
            position: {
              x: sectionX + childOffsetX,
              y: startY + childIndex * childSpacing,
            },
            data: {
              label: child,
              editing: false,
              fontSize: 14,
              color: '#e5e7eb',
              shape: 'ellipse',
            },
            selected: false,
          })
          created.push(childNode)
          createdEdges.push({
            id: `edge_${Date.now()}_${sectionIndex}_${childIndex}`,
            source: sectionNode.id,
            target: childNode.id,
            type: 'smoothstep',
          })
        })
      })

      setNodes(cur => cur.map((n: any) => ({ ...n, selected: false })).concat(created) as any)
      setEdges(cur => cur.concat(createdEdges))

      // Auto-arrange after creation with better spacing
      setTimeout(() => {
        const allNodes = [...nodes, ...created]
        const allEdges = [...edges, ...createdEdges]
        const incoming = new Set(allEdges.map(e => String(e.target)))
        const rootForLayout = allNodes.find(n => !incoming.has(n.id)) ?? allNodes[0]
        if (rootForLayout) {
          const laidOut = hierarchicalLayout(rootForLayout.id, allNodes, allEdges)
          setNodes(cur =>
            cur.map(n => {
              const next = laidOut.find(x => x.id === n.id)
              return next ? { ...n, position: next.position } : n
            })
          )
        }
      }, 150) // Slightly longer delay for smoother animation
    },
    [createNode, edges, nodes, setEdges, setNodes, hierarchicalLayout]
  )

  // --- visibility helpers (focus/hoist and collapsed branches)
  const buildChildrenMap = useCallback(() => {
    const map = new Map<string, string[]>()
    for (const e of edges) {
      const src = String(e.source)
      const tgt = String(e.target)
      if (!map.has(src)) map.set(src, [])
      map.get(src)!.push(tgt)
    }
    return map
  }, [edges])

  const getSubtreeIds = useCallback(
    (rootId: string): Set<string> => {
      const map = buildChildrenMap()
      const out = new Set<string>()
      const q = [rootId]
      while (q.length) {
        const cur = q.shift() as string
        if (out.has(cur)) continue
        out.add(cur)
        const kids = map.get(cur) ?? []
        for (const k of kids) q.push(k)
      }
      return out
    },
    [buildChildrenMap]
  )

  const collapsedHiddenIds = useMemo(() => {
    const hidden = new Set<string>()
    for (const n of nodes) {
      if ((n.data as NodeData)?.collapsed) {
        const sub = getSubtreeIds(n.id)
        sub.delete(n.id)
        sub.forEach(id => hidden.add(id))
      }
    }
    return hidden
  }, [getSubtreeIds, nodes])

  const focusVisibleIds = useMemo(() => {
    if (!focusRootId) return null
    return getSubtreeIds(focusRootId)
  }, [focusRootId, getSubtreeIds])

  const viewNodes = useMemo(() => {
    const isVisible = (id: string) => {
      if (collapsedHiddenIds.has(id)) return false
      if (focusVisibleIds) return focusVisibleIds.has(id)
      return true
    }
    return nodes.filter(n => isVisible(n.id))
  }, [collapsedHiddenIds, focusVisibleIds, nodes])

  const viewNodeIds = useMemo(() => new Set(viewNodes.map(n => n.id)), [viewNodes])

  const viewEdges = useMemo(() => {
    return edges.filter(e => viewNodeIds.has(String(e.source)) && viewNodeIds.has(String(e.target)))
  }, [edges, viewNodeIds])

  // --- layouts
  const applyRadialLayout = useCallback(() => {
    const incoming = new Set(edges.map(e => String(e.target)))
    const root = nodes.find(n => !incoming.has(n.id)) ?? nodes[0]
    if (!root) return
    const laidOut = radialLayout(root.id, nodes, edges)
    setNodes(cur =>
      cur.map(n => {
        const next = laidOut.find(x => x.id === n.id)
        return next ? { ...n, position: next.position } : n
      })
    )
  }, [edges, nodes, setNodes])

  const applyHierarchicalLayout = useCallback(() => {
    let rootId = focusRootId ?? ''
    if (!rootId) {
      const incoming = new Set(edges.map(e => String(e.target)))
      rootId = nodes.find(n => !incoming.has(n.id))?.id ?? nodes[0]?.id ?? ''
    }
    if (!rootId) return
    const laidOut = hierarchicalLayout(rootId, nodes, edges)
    setNodes(cur =>
      cur.map(n => {
        const next = laidOut.find(x => x.id === n.id)
        return next ? { ...n, position: next.position } : n
      })
    )
  }, [edges, focusRootId, hierarchicalLayout, nodes, setNodes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      {/* Focus Mode Indicator */}
      {focusRootId && (
        <div className="focus-mode-indicator">
          <span>🎯 Focus Mode</span>
          <span style={{ opacity: 0.8, fontWeight: 400 }}>
            {nodes.find(n => n.id === focusRootId)?.data?.label as string || 'Selected Branch'}
          </span>
          <button onClick={() => setFocusRootId(null)} title="Exit Focus Mode">
            ✕
          </button>
        </div>
      )}
      
      <div ref={topbarRef} className={`topbar ${showUI ? '' : 'hidden'}`}>
        <div className="brand">
          <span>Atlas Boards</span>
        </div>
        <div className="flex-1 px-4">
          <input className="title-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="toolbar-group">
          {/* Dropdown: Insert */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'insert' ? null : 'insert')
              }}
            >
              Insert ▾
            </button>
          </div>

          {/* Dropdown: Templates */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'templates' ? null : 'templates')
                void refreshTemplates()
              }}
            >
              Templates ▾
            </button>
          </div>

          {/* Dropdown: File */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'file' ? null : 'file')
              }}
            >
              File ▾
            </button>
          </div>

          {/* Dropdown: Edit */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'edit' ? null : 'edit')
              }}
            >
              Edit ▾
            </button>
          </div>

          {/* Dropdown: Layout */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'layout' ? null : 'layout')
              }}
            >
              Layout ▾
            </button>
          </div>

          {/* Search */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="toolbar-sep" />
            <button
              className="toolbar-btn"
              onClick={() => setShowSearch(true)}
              title="Search (Ctrl/Cmd + K)"
            >
              🔍 Search
            </button>
            <input
              className="rounded-md border px-2 py-1 text-sm"
              placeholder="Search nodes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const query = search.trim().toLowerCase()
                  if (!query) return
                  const index = nodes.findIndex(
                    n =>
                      typeof (n.data as NodeData)?.label === 'string' &&
                      ((n.data as NodeData).label as string).toLowerCase().includes(query)
                  )
                  if (index === -1) return
                  const node = nodes[index]
                  setNodes(cur => cur.map((n: any) => ({ ...n, selected: n.id === node.id })) as any)
                  rfInstance.current?.setCenter?.(node.position.x, node.position.y, {
                    zoom: 1.2,
                    duration: 500,
                  })
                }
              }}
            />
          </div>

          {/* Tasks/Tables */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button className="toolbar-btn" onClick={() => onOpenTools?.('kanban')}>
              Tasks
            </button>
            <button className="toolbar-btn" onClick={() => onOpenTools?.('tables')}>
              Tables
            </button>
          </div>

          {/* Dropdown: Help (mobile also contains search and links) */}
          <div className="relative ml-auto md:ml-0">
            <button
              className="toolbar-btn"
              onClick={e => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'help' ? null : 'help')
              }}
            >
              Help ▾
            </button>
          </div>
          <button className="toolbar-btn" onClick={() => tidyLayout(nodes, edges, setNodes)}>
            Tidy
          </button>
        </div>

        {/* Floating Menu Portal */}
        {openMenu && menuPos && (
          <div
            className="fixed z-[999] min-w-[14rem] rounded-md border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {openMenu === 'insert' && (
              <div className="flex flex-col gap-2">
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    onAddNode()
                  }}
                >
                  + Node
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    setNodes(cur =>
                      cur
                        .map((n: any) => ({ ...n, selected: false }))
                        .concat(
                          createNode({
                            type: 'note',
                            data: { text: 'Note', color: '#FEF08A', editing: true },
                            position: { x: 0, y: 0 },
                          }) as any
                        ) as any
                    )
                  }}
                >
                  + Note
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    setNodes(cur =>
                      cur
                        .map(n => ({ ...n, selected: false }))
                        .concat(
                          createNode({
                            type: 'checklist',
                            data: {
                              items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }],
                            },
                            position: { x: 0, y: 0 },
                          }) as any
                        ) as any
                    )
                  }}
                >
                  + Checklist
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    setNodes(cur =>
                      cur
                        .map(n => ({ ...n, selected: false }))
                        .concat(
                          createNode({
                            type: 'kanban',
                            data: { columns: [] },
                            position: { x: 0, y: 0 },
                          }) as any
                        ) as any
                    )
                  }}
                >
                  + Kanban Board
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    setNodes(cur =>
                      cur
                        .map(n => ({ ...n, selected: false }))
                        .concat(
                          createNode({
                            type: 'timeline',
                            data: { events: [] },
                            position: { x: 0, y: 0 },
                          }) as any
                        ) as any
                    )
                  }}
                >
                  + Timeline
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    setNodes(cur =>
                      cur
                        .map(n => ({ ...n, selected: false }))
                        .concat(
                          createNode({
                            type: 'matrix',
                            data: {
                              matrixData: {
                                title: 'Decision Matrix',
                                rows: ['Option A', 'Option B', 'Option C'],
                                columns: ['Cost', 'Quality', 'Time', 'Risk'],
                                cells: [],
                              },
                            },
                            position: { x: 0, y: 0 },
                          }) as any
                        ) as any
                    )
                  }}
                >
                  + Decision Matrix
                </button>
                <button
                  className="toolbar-btn w-full justify-start disabled:opacity-50"
                  disabled={!selectedNode}
                  onClick={() => {
                    setOpenMenu(null)
                    onAddChild()
                  }}
                >
                  + Child (Tab)
                </button>
                <button
                  className="toolbar-btn w-full justify-start disabled:opacity-50"
                  disabled={!selectedNode}
                  onClick={() => {
                    setOpenMenu(null)
                    onAddSibling()
                  }}
                >
                  + Sibling (Enter)
                </button>
              </div>
            )}
            {openMenu === 'templates' && (
              <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
                <div className="mb-2 text-sm font-medium">🎨 Professional Templates</div>

                <div className="space-y-1">
                  <div className="mb-1 text-xs font-medium text-slate-600">
                    📚 Academic & Learning
                  </div>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('school-organized')
                    }}
                  >
                    🎓 Academic Hub
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('knowledge-base')
                    }}
                  >
                    🧠 Knowledge Base
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="mb-1 text-xs font-medium text-slate-600">
                    💼 Business & Strategy
                  </div>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('business-structured')
                    }}
                  >
                    🏢 Business Framework
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('swot-analysis')
                    }}
                  >
                    🔍 SWOT Analysis
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('decision-tree')
                    }}
                  >
                    🌳 Decision Framework
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="mb-1 text-xs font-medium text-slate-600">
                    🚀 Project & Productivity
                  </div>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('project-management')
                    }}
                  >
                    📋 Project Hub
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('personal-productivity')
                    }}
                  >
                    ⚡ Life Organization
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('goal-planning')
                    }}
                  >
                    🎯 Goal Achievement
                  </button>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('timeline')
                    }}
                  >
                    📅 Timeline Planning
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="mb-1 text-xs font-medium text-slate-600">🌟 General Purpose</div>
                  <button
                    className="toolbar-btn w-full justify-start text-sm"
                    onClick={() => {
                      setOpenMenu(null)
                      insertTemplate('mind-map-starter')
                    }}
                  >
                    🗺️ Mind Map Starter
                  </button>
                </div>

                <div className="toolbar-sep" />

                <div className="space-y-1">
                  <div className="mb-1 text-xs font-medium text-slate-600">💾 Your Templates</div>
                  <button
                    className="toolbar-btn w-full justify-start"
                    onClick={() => {
                      setOpenMenu(null)
                      void saveAsTemplate()
                    }}
                  >
                    💾 Save current as template
                  </button>
                  {templates.length > 0 &&
                    templates.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                        <button
                          className="toolbar-btn flex-1 justify-start text-sm"
                          onClick={() => {
                            setOpenMenu(null)
                            void applyTemplateReplace(t)
                          }}
                        >
                          📄 {t.name}
                        </button>
                        <button
                          className="toolbar-btn text-xs"
                          onClick={async () => {
                            const name = prompt('Rename template', t.name)?.trim()
                            if (!name) return
                            await db.templates.put({ ...t, name })
                            void refreshTemplates()
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="toolbar-btn text-xs"
                          onClick={async () => {
                            await db.templates.delete(t.id)
                            void refreshTemplates()
                          }}
                        >
                          🗑️
                        </button>
                  </div>
                ))}
                </div>

                <div className="toolbar-sep" />

                <button
                  className="toolbar-btn w-full justify-start disabled:opacity-50"
                  disabled={!selectedNode}
                  onClick={() => {
                    setOpenMenu(null)
                    void createTasksFromBranch()
                  }}
                >
                  📋 Create Tasks from Branch
                </button>
              </div>
            )}
            {openMenu === 'file' && (
              <div className="flex flex-col gap-2">
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={async () => {
                    setOpenMenu(null)
                    const el = document.querySelector('.react-flow__renderer') as HTMLElement | null
                    if (!el) return
                    const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2 })
                    const link = document.createElement('a')
                    link.download = 'board.png'
                    link.href = dataUrl
                    link.click()
                  }}
                >
                  Export PNG
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={async () => {
                    setOpenMenu(null)
                    const payload = JSON.stringify({ nodes, edges }, null, 2)
                    const blob = new Blob([payload], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'board.json'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Export JSON
                </button>
                <label className="toolbar-btn w-full cursor-pointer justify-start">
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const text = await file.text()
                      try {
                        const parsed = JSON.parse(text) as { nodes: Node[]; edges: Edge[] }
                        setNodes(parsed.nodes.map(n => ({ ...n, type: 'editable', selected: n.selected ?? false })) as any)
                        setEdges(parsed.edges.map(e => ({ type: 'labeled', ...e })))
                      } catch (err) {
                        console.error('Invalid JSON', err)
                      } finally {
                        setOpenMenu(null)
                      }
                    }}
                  />
                </label>
              </div>
            )}
            {openMenu === 'edit' && (
              <div className="flex flex-col gap-2">
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    onDeleteSelected()
                  }}
                >
                  Delete (Del)
                </button>
              </div>
            )}
            {openMenu === 'layout' && (
              <div className="flex flex-col gap-2">
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    applyRadialLayout()
                  }}
                >
                  Radial
                </button>
                <button
                  className="toolbar-btn w-full justify-start"
                  onClick={() => {
                    setOpenMenu(null)
                    applyHierarchicalLayout()
                  }}
                >
                  Hierarchical
                </button>
              </div>
            )}
            {openMenu === 'help' && (
              <div className="text-sm">
                <div className="mb-2 font-medium">Shortcuts</div>
                <ul className="mb-3 space-y-1 text-neutral-600 dark:text-neutral-300">
                  <li>Undo: Cmd/Ctrl + Z</li>
                  <li>Redo: Shift + Cmd/Ctrl + Z</li>
                  <li>Add child: Tab</li>
                  <li>Add sibling: Enter</li>
                  <li>Delete selection: Del/Backspace</li>
                </ul>
                <div className="md:hidden">
                  <div className="mb-1 font-medium">Search</div>
                  <input
                    className="mb-2 w-full rounded-md border px-2 py-1"
                    placeholder="Search nodes..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const query = search.trim().toLowerCase()
                        if (!query) return
                        const index = nodes.findIndex(
                          n =>
                            typeof (n.data as any)?.label === 'string' &&
                            ((n.data as any).label as string).toLowerCase().includes(query)
                        )
                        if (index === -1) return
                        const node = nodes[index]
                        setNodes(cur => cur.map((n: any) => ({ ...n, selected: n.id === node.id })) as any)
                        rfInstance.current?.setCenter?.(node.position.x, node.position.y, {
                          zoom: 1.2,
                          duration: 500,
                        })
                        setOpenMenu(null)
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      className="toolbar-btn w-full"
                      onClick={() => {
                        setOpenMenu(null)
                        onOpenTools?.('kanban')
                      }}
                    >
                      Tasks
                    </button>
                    <button
                      className="toolbar-btn w-full"
                      onClick={() => {
                        setOpenMenu(null)
                        onOpenTools?.('tables')
                      }}
                    >
                      Tables
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="topbar-accent" />
      </div>

      {/* Left vertical toolbar */}
      <div className={`leftbar ${showUI ? '' : 'hidden'}`}>
        <button
          className="leftbar-btn"
          title="Zoom In"
          onClick={() => {
            const reactFlowInstance = (document.querySelector('.react-flow') as any)?.__rf
            reactFlowInstance?.zoomIn?.()
          }}
        >
          +
        </button>
        <button
          className="leftbar-btn"
          title="Zoom Out"
          onClick={() => {
            const reactFlowInstance = (document.querySelector('.react-flow') as any)?.__rf
            reactFlowInstance?.zoomOut?.()
          }}
        >
          −
        </button>
        <button
          className="leftbar-btn"
          title="Fit View"
          onClick={() => (document.querySelector('.react-flow') as any)?.__rf?.fitView?.()}
        >
          ⤢
        </button>
        <div className="toolbar-sep" />
        <button
          className="leftbar-btn"
          title="Toggle Minimap"
          onClick={() => setShowMinimap(v => !v)}
        >
          MM
        </button>
        <button
          className="leftbar-btn"
          title="Dark Mode"
          onClick={() => {
            setDark(prev => {
            const next = !prev
            const root = document.documentElement
            if (next) root.classList.add('dark')
            else root.classList.remove('dark')
              try {
                localStorage.setItem('theme', next ? 'dark' : 'light')
              } catch {}
            return next
          })
          }}
        >
          🌓
        </button>
        <button
          className="leftbar-btn"
          title="Present (hide UI)"
          onClick={() => setShowUI(v => !v)}
        >
          👁️
        </button>
        <button
          className={`leftbar-btn ${snapToGrid ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`}
          title="Snap to grid"
          onClick={() => setSnapToGrid(v => !v)}
        >
          #
        </button>
        <button
          className="leftbar-btn"
          title="Quick Create (Q)"
          onClick={() => setShowPalette(true)}
        >
          ⚡
        </button>
        <div className="toolbar-sep" />
        <button
          className="leftbar-btn"
          title="Align Left"
          onClick={() => {
            const selected = nodes.filter(n => n.selected)
          if (selected.length < 2) return
            const x = Math.min(...selected.map(n => n.position.x))
            setNodes(cur =>
              cur.map(n => (n.selected ? { ...n, position: { ...n.position, x } } : n))
            )
          }}
        >
          ⟸
        </button>
        <button
          className="leftbar-btn"
          title="Align Top"
          onClick={() => {
            const selected = nodes.filter(n => n.selected)
          if (selected.length < 2) return
            const y = Math.min(...selected.map(n => n.position.y))
            setNodes(cur =>
              cur.map(n => (n.selected ? { ...n, position: { ...n.position, y } } : n))
            )
          }}
        >
          ⟰
        </button>
        <button
          className="leftbar-btn"
          title="Distribute Horiz"
          onClick={() => {
            const selected = nodes
              .filter(n => n.selected)
              .sort((a, b) => a.position.x - b.position.x)
          if (selected.length < 3) return
          const minX = selected[0].position.x
          const maxX = selected[selected.length - 1].position.x
          const step = (maxX - minX) / (selected.length - 1)
            setNodes(cur =>
              cur.map(n => {
                const idx = selected.findIndex(s => s.id === n.id)
            if (idx === -1) return n
            return { ...n, position: { ...n.position, x: minX + step * idx } }
              })
            )
          }}
        >
          ⇔
        </button>
      </div>

      {/* Right inspector - persistent even without selection */}
      <div
        className={`absolute right-3 top-1/2 z-50 w-72 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-3 shadow ${showUI ? '' : 'hidden'}`}
      >
        <div className="mb-2 text-sm font-medium">Inspector</div>
        {selectedNode ? (
          <>
            {'label' in (selectedNode.data as NodeData) && (
            <div className="mb-2">
              <label className="block text-xs text-slate-600">Label</label>
              <input
                className="w-full rounded border bg-white px-2 py-1 text-sm text-neutral-900 placeholder-neutral-400"
                  value={(selectedNode.data as NodeData).label ?? ''}
                  onChange={e =>
                    setNodes(nodes =>
                      nodes.map(n =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, label: e.target.value } }
                          : n
                      ) as any
                    )
                }
              />
            </div>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600">Shape</label>
              <select
                className="w-full rounded border bg-white px-2 py-1 text-sm text-neutral-900"
                  value={(selectedNode.data as NodeData).shape ?? 'rect'}
                  onChange={e =>
                    setNodes(nodes =>
                      nodes.map(n =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, shape: e.target.value } }
                          : n
                      ) as any
                    )
                }
              >
                <option value="rect">Rectangle</option>
                <option value="rounded">Rounded</option>
                <option value="ellipse">Ellipse</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600">Font size</label>
              <input
                type="number"
                className="w-full rounded border bg-white px-2 py-1 text-sm text-neutral-900"
                  value={(selectedNode.data as NodeData).fontSize ?? 16}
                min={10}
                max={48}
                  onChange={e =>
                    setNodes(nodes =>
                      nodes.map(n =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, fontSize: Number(e.target.value) } }
                          : n
                      ) as any
                    )
                }
              />
            </div>
          </div>
          <div className="mb-2">
            <label className="block text-xs text-slate-600">Color</label>
            <input
              type="color"
              className="h-8 w-full cursor-pointer rounded border bg-white"
                value={(selectedNode.data as NodeData).color ?? '#ffffff'}
                onChange={e =>
                  setNodes(nodes =>
                    nodes.map(n =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, color: e.target.value } }
                        : n
                    ) as any
                  )
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              className="rounded bg-slate-200 px-3 py-1"
              onClick={() =>
                  setNodes(nodes =>
                    nodes.concat({
                      ...selectedNode,
                      id: `${selectedNode.id}-copy-${Math.floor(Math.random() * 1e6)}`,
                      position: {
                        x: selectedNode.position.x + 40,
                        y: selectedNode.position.y + 40,
                      },
                      selected: false,
                    })
                )
              }
            >
              Duplicate
            </button>
              <button
                className="rounded bg-rose-600 px-3 py-1 text-white"
                onClick={onDeleteSelected}
              >
              Delete
            </button>
          </div>
          <div className="mt-3 border-t pt-2 text-sm">
            <div className="mb-1 font-medium">Task Link</div>
              <button
                className="toolbar-btn w-full justify-start"
                onClick={async () => {
              // create or open a task linked to this node
              const existing = await db.tasks.where('nodeId').equals(selectedNode.id).first()
              if (existing) {
                emitOpenTask({ taskId: existing.id, view: 'list' })
                return
              }
              const listId = (await db.lists.toArray())[0]?.id ?? `l_${Date.now()}`
                  if (!(await db.lists.get(listId)))
                    await db.lists.put({ id: listId, workspaceId, title: 'General', sort: 1 })
                  const task: Task = {
                    id: `t_${Date.now()}`,
                    listId,
                    title: String((selectedNode.data as NodeData)?.label ?? 'New Task'),
                    sort: Date.now(),
                    status: 'not-started',
                    nodeId: selectedNode.id,
                  }
              await db.tasks.put(task)
              emitOpenTask({ taskId: task.id, view: 'list' })
                }}
              >
              Create/Open linked task
            </button>
              <button
                className="toolbar-btn w-full justify-start"
                onClick={async () => {
              const all = await db.tasks.toArray()
                  const q = prompt('Link to existing task (type part of the title):')
                    ?.toLowerCase()
                    .trim()
              if (!q) return
              const match = all.find(t => t.title.toLowerCase().includes(q))
                  if (!match) {
                    alert('No task found')
                    return
                  }
              await db.tasks.put({ ...match, nodeId: selectedNode.id })
              alert(`Linked to: ${match.title}`)
                }}
              >
              Link existing task
            </button>
              <div className="mt-3">
                <div className="mb-1 font-medium">References</div>
                <div className="mb-2">
                  <div className="mb-1 text-xs uppercase text-slate-500">Outbound</div>
                  {(() => {
                    const label = (selectedNode.data as NodeData)?.label as string | undefined
                    const titles = label ? extractOutboundTitles(label) : []
                    if (titles.length === 0)
                      return <div className="text-xs text-slate-500">No links</div>
                    return (
                      <div className="space-y-1">
                        {titles.map((t, i) => {
                          const target = findNodeByTitle(t)
                          return (
                            <div key={`${t}-${i}`} className="flex items-center gap-2">
                              <span className="flex-1 truncate">[[{t}]]</span>
                              {target ? (
                                <button
                                  className="rounded bg-slate-200 px-2 py-0.5"
                                  onClick={() => {
                                    setNodes(cur =>
                                      cur.map((n: any) => ({ ...n, selected: n.id === target.id })) as any
                                    )
                                    rfInstance.current?.setCenter?.(
                                      target.position.x,
                                      target.position.y,
                                      { zoom: 1.2, duration: 500 }
                                    )
                                  }}
                                >
                                  Open
                                </button>
                              ) : (
                                <button
                                  className="rounded bg-emerald-600 px-2 py-0.5 text-white"
                                  onClick={() => createAndLinkFromSelection(t)}
                                >
                                  Create
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase text-slate-500">Backlinks</div>
                  {(() => {
                    const myTitle = (selectedNode.data as NodeData)?.label as string | undefined
                    if (!myTitle) return <div className="text-xs text-slate-500">N/A</div>
                    const refs = nodes.filter(n => {
                      if (n.id === selectedNode.id) return false
                      const lbl = (n.data as NodeData)?.label as string | undefined
                      if (!lbl) return false
                      const outs = extractOutboundTitles(lbl)
                      return outs.includes(myTitle)
                    })
                    if (refs.length === 0)
                      return <div className="text-xs text-slate-500">No backlinks</div>
                    return (
                      <div className="space-y-1">
                        {refs.map(n => (
                          <div key={n.id} className="flex items-center gap-2">
                            <span className="flex-1 truncate">
                              {(n.data as NodeData)?.label ?? n.id}
                            </span>
                            <button
                              className="rounded bg-slate-200 px-2 py-0.5"
                              onClick={() => {
                                setNodes(cur => cur.map((x: any) => ({ ...x, selected: x.id === n.id })) as any)
                                rfInstance.current?.setCenter?.(n.position.x, n.position.y, {
                                  zoom: 1.2,
                                  duration: 500,
                                })
                              }}
                            >
                              Open
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
                <div className="mt-3 border-t pt-2 text-sm">
                  <div className="mb-1 font-medium">Focus</div>
                  <div className="flex gap-2">
                    {focusRootId === selectedNode?.id ? (
                      <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setFocusRootId(null)}>
                        Clear Focus
                      </button>
                    ) : (
                      <button className="rounded bg-slate-200 px-3 py-1" onClick={() => setFocusRootId(selectedNode?.id || null)}>
                        Focus Subtree
                      </button>
                    )}
                  </div>
                </div>
              </div>
          </div>
          </>
        ) : (
          <div className="text-xs text-slate-500">
            No node selected.
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="toolbar-btn" onClick={onAddNode}>
                + Node
              </button>
              <button
                className="toolbar-btn"
                onClick={() =>
                      setNodes(cur =>
                        cur
                          .map((n: any) => ({ ...n, selected: false }))
                          .concat(
                            createNode({
                              type: 'note',
                              data: { text: 'Note', color: '#FEF08A', editing: true },
                              position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                            })
                          ) as any
                      )
                }
              >
                + Note
              </button>
              <button
                className="toolbar-btn"
                onClick={() =>
                      setNodes(cur =>
                        cur
                          .map((n: any) => ({ ...n, selected: false }))
                          .concat(
                            createNode({
                              type: 'kanban',
                              data: { columns: [] },
                              position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                            })
                          ) as any
                      )
                }
              >
                + Kanban
              </button>
              <button
                className="toolbar-btn"
                onClick={() =>
                      setNodes(cur =>
                        cur
                          .map((n: any) => ({ ...n, selected: false }))
                          .concat(
                            createNode({
                              type: 'timeline',
                              data: { events: [] },
                              position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                            })
                          ) as any
                      )
                }
              >
                + Timeline
              </button>
              <button
                className="toolbar-btn"
                onClick={() =>
                      setNodes(cur =>
                        cur
                          .map((n: any) => ({ ...n, selected: false }))
                          .concat(
                            createNode({
                              type: 'matrix',
                              data: {
                                matrixData: {
                                  title: 'Decision Matrix',
                                  rows: ['Option A', 'Option B', 'Option C'],
                                  columns: ['Cost', 'Quality', 'Time', 'Risk'],
                                  cells: [],
                                },
                              },
                              position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                            })
                          ) as any
                      )
                }
              >
                + Matrix
              </button>
            </div>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={viewNodes}
        edges={viewEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params: any) => onConnect({ ...params, type: 'labeled', data: { label: '' } })}
        defaultEdgeOptions={{ type: 'labeled' }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={inst => {
          ;(document.querySelector('.react-flow') as any).__rf = inst
          rfInstance.current = inst
        }}
        snapToGrid={snapToGrid}
        snapGrid={[25, 25]}
        fitView
      >
        {showMinimap && <MiniMap />}
        <Controls />
        <Background />
      </ReactFlow>

      {/* Quick Create Palette */}
      <QuickPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        actions={[
          // Nodes
          { key: 'topic', label: 'Topic Node', icon: '🔷', category: 'Nodes', hint: 'Basic mind map node', run: () => onAddNode() },
          { key: 'child', label: 'Add Child Node', icon: '↘️', category: 'Nodes', hint: 'Press Tab', run: () => onAddChild() },
          { key: 'sibling', label: 'Add Sibling Node', icon: '➡️', category: 'Nodes', hint: 'Press Enter', run: () => onAddSibling() },
          // Attachments
          {
            key: 'note',
            label: 'Sticky Note',
            icon: '📝',
            category: 'Attachments',
            hint: 'Add thoughts and ideas',
            run: () =>
              setNodes(cur =>
                cur
                  .map((n: any) => ({ ...n, selected: false }))
                  .concat(
                    createNode({
                      type: 'note',
                      data: { text: 'Note', color: '#FEF08A', editing: true },
                      position: { x: 0, y: 0 },
                    }) as any
                  ) as any
              ),
          },
          {
            key: 'checklist',
            label: 'Checklist',
            icon: '✅',
            category: 'Attachments',
            hint: 'Track to-do items',
            run: () =>
              setNodes(cur =>
                cur
                  .map((n: any) => ({ ...n, selected: false }))
                  .concat(
                    createNode({
                      type: 'checklist',
                      data: { items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }] },
                      position: { x: 0, y: 0 },
                    }) as any
                  ) as any
              ),
          },
          {
            key: 'kanban',
            label: 'Kanban Board',
            icon: '📋',
            category: 'Attachments',
            hint: 'Visual task board',
            run: () =>
              setNodes(cur =>
                cur
                  .map((n: any) => ({ ...n, selected: false }))
                  .concat(
                    createNode({ type: 'kanban', data: { columns: [] }, position: { x: 0, y: 0 } }) as any
                  ) as any
              ),
          },
          {
            key: 'timeline',
            label: 'Timeline',
            icon: '📅',
            category: 'Attachments',
            hint: 'Schedule and deadlines',
            run: () =>
              setNodes(cur =>
                cur
                  .map((n: any) => ({ ...n, selected: false }))
                  .concat(
                    createNode({ type: 'timeline', data: { events: [] }, position: { x: 0, y: 0 } }) as any
                  ) as any
              ),
          },
          {
            key: 'matrix',
            label: 'Decision Matrix',
            icon: '🎯',
            category: 'Attachments',
            hint: 'Compare options',
            run: () =>
              setNodes(cur =>
                cur
                  .map((n: any) => ({ ...n, selected: false }))
                  .concat(
                    createNode({
                      type: 'matrix',
                      data: {
                        matrixData: {
                          title: 'Decision Matrix',
                          rows: ['Option A', 'Option B', 'Option C'],
                          columns: ['Cost', 'Quality', 'Time', 'Risk'],
                          cells: [],
                        },
                      },
                      position: { x: 0, y: 0 },
                    }) as any
                  ) as any
              ),
          },
          {
            key: 'attach_note',
            label: 'Attach Note to Selected',
            icon: '📎',
            category: 'Attachments',
            hint: 'Link a note to current node',
            run: () =>
              attachNodeToSelection('note', { text: 'Note', color: '#FEF08A', editing: true }),
          },
          {
            key: 'attach_check',
            label: 'Attach Checklist to Selected',
            icon: '🔗',
            category: 'Attachments',
            hint: 'Link a checklist to current node',
            run: () =>
              attachNodeToSelection('checklist', {
                items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }],
              }),
          },
          // Templates - Life & ADHD Friendly
          {
            key: 'tpl_life_dashboard',
            label: 'Life Dashboard',
            icon: '🏠',
            category: 'Templates',
            hint: 'Central hub for all life areas',
            run: () => insertTemplate('life-dashboard'),
          },
          {
            key: 'tpl_brain_dump',
            label: 'Brain Dump',
            icon: '🧠',
            category: 'Templates',
            hint: 'Get everything out of your head',
            run: () => insertTemplate('brain-dump'),
          },
          {
            key: 'tpl_weekly_focus',
            label: 'Weekly Focus',
            icon: '📆',
            category: 'Templates',
            hint: 'Plan your week simply',
            run: () => insertTemplate('weekly-focus'),
          },
          {
            key: 'tpl_productivity',
            label: 'Life Organization',
            icon: '⚡',
            category: 'Templates',
            hint: 'Personal productivity system',
            run: () => insertTemplate('personal-productivity'),
          },
          // Templates - Work & School
          {
            key: 'tpl_academic',
            label: 'School & Homework',
            icon: '📚',
            category: 'Templates',
            hint: 'Track classes and assignments',
            run: () => insertTemplate('school-organized'),
          },
          {
            key: 'tpl_project',
            label: 'Project Hub',
            icon: '💼',
            category: 'Templates',
            hint: 'Manage project tasks',
            run: () => insertTemplate('project-management'),
          },
          {
            key: 'tpl_youtube',
            label: 'YouTube Content',
            icon: '🎬',
            category: 'Templates',
            hint: 'Plan videos and content',
            run: () => insertTemplate('youtube-content'),
          },
          // Templates - Decision & Planning
          {
            key: 'tpl_goals',
            label: 'Goals & Vision',
            icon: '🎯',
            category: 'Templates',
            hint: 'Long-term goal planning',
            run: () => insertTemplate('goal-planning'),
          },
          {
            key: 'tpl_decision',
            label: 'Decision Framework',
            icon: '🌳',
            category: 'Templates',
            hint: 'Make better decisions',
            run: () => insertTemplate('decision-tree'),
          },
          // Navigation
          {
            key: 'nav_tasks',
            label: 'Go to Tasks',
            icon: '✓',
            category: 'Navigation',
            hint: 'View all tasks',
            run: () => onOpenTools?.('kanban'),
          },
          {
            key: 'nav_tables',
            label: 'Go to Tables',
            icon: '📊',
            category: 'Navigation',
            hint: 'View all tables',
            run: () => onOpenTools?.('tables'),
          },
        ]}
      />

      {/* Global Search Dialog */}
      <SearchDialog
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectResult={handleSearchResult}
      />

      {/* Welcome Screen */}
      {showWelcome && (
        <WelcomeScreen
          onSelectTemplate={(templateId) => {
            localStorage.setItem('atlas-welcome-shown', 'true')
            setShowWelcome(false)
            // Map welcome screen template IDs to our template system
            const templateMap: Record<string, string> = {
              'life-dashboard': 'life-dashboard',
              'weekly-planner': 'weekly-focus',
              'adhd-task-hub': 'brain-dump',
              'work-projects': 'project-management',
              'meeting-notes': 'knowledge-base',
              'school-hub': 'school-organized',
              'study-notes': 'knowledge-base',
              'youtube-content': 'youtube-content',
              'side-projects': 'project-management',
              'family-life': 'life-dashboard',
              'goals-vision': 'goal-planning',
              'blank': '',
            }
            const mappedTemplate = templateMap[templateId]
            if (mappedTemplate) {
              setTimeout(() => insertTemplate(mappedTemplate as any), 100)
            }
          }}
          onDismiss={() => {
            localStorage.setItem('atlas-welcome-shown', 'true')
            setShowWelcome(false)
          }}
        />
      )}
    </div>
  )
}

export default BoardCanvas
