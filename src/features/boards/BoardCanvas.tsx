import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, addEdge, useEdgesState, useNodesState, type Edge, type Node, type OnConnect, useReactFlow } from '@reactflow/core'
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
import QuickPalette from './QuickPalette'
import { emitOpenTask } from '../../lib/events'

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
	walk(rootId, 220)
	return nodes.map((n) => (placed.has(n.id) ? { ...n, position: placed.get(n.id)! } : n))
}

// move tidyLayout definition here (before insertTemplate)
const tidyLayout = (function () {
	return function (this: void, nodes: Node[], edges: Edge[], setNodes: ReturnType<typeof useNodesState>[1]) {
		const incoming = new Set(edges.map((e) => e.target as string))
		const root = nodes.find((n) => !incoming.has(n.id)) ?? nodes[0]
		if (!root) return
		const laidOut = radialLayout(root.id, nodes, edges)
		setNodes((cur) =>
			cur.map((n) => {
				const next = laidOut.find((x) => x.id === n.id)
				return next ? { ...n, position: next.position } : n
			}),
		)
	}
})()

type BoardCanvasProps = {
  boardId: string
  workspaceId: string
  onOpenTools?: (tab: 'kanban' | 'tables') => void
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ boardId, workspaceId, onOpenTools }) => {
  const initialNodes = useMemo<Node[]>(() => [
    {
      id: 'n1',
      position: { x: 0, y: 0 },
      data: { label: 'Central Idea' },
      type: 'editable',
    },
  ], [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([])
  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState('Untitled Board')

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
          const upgradedNodes: Node[] = parsed.nodes.map((n) => ({
            ...n,
            type: 'editable',
            data: { label: n?.data?.label ?? 'New Node', ...n.data },
          }))
          setNodes(upgradedNodes)
          setEdges(parsed.edges)
        } catch {
          // ignore malformed
        }
      }
      setTitle(rec?.title ?? 'Untitled Board')
      setLoaded(true)
    })()
  }, [boardId, setEdges, setNodes])

  const persist = useMemo(() => debounce(async (n: Node[], e: Edge[]) => {
    const payload = JSON.stringify({ nodes: n, edges: e })
    await db.boards.put({
      id: boardId,
      workspaceId,
      title,
      data: payload,
      updatedAt: Date.now(),
    })
  }, 500), [boardId, workspaceId, title])

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

  const onConnect = useCallback<OnConnect>((connection) => {
    setEdges((eds) => addEdge(connection, eds))
  }, [setEdges])

  const deselectAll = useCallback(() => {
    setNodes((current) => current.map((n) => ({ ...n, selected: false })))
  }, [setNodes])

  const createNode = useCallback(
    (partial: Partial<Node> & { position: { x: number; y: number } }): Node => {
      const id = `n${Date.now()}_${Math.round(Math.random() * 1000)}`
      return {
        id,
        type: partial.type ?? 'editable',
        data: { label: 'New Node', editing: true, ...(partial.data as object) },
        position: partial.position,
        selected: true,
      } as Node
    },
    [],
  )

  const onAddNode = useCallback(() => {
    const node = createNode({
      position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
    })
    setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(node))
  }, [createNode, setNodes])

  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes])

  const onAddChild = useCallback(() => {
    if (!selectedNode) return
    const offsetX = 200
    const offsetY = 120
    const newNode = createNode({
      position: { x: (selectedNode.position?.x ?? 0) + offsetX, y: (selectedNode.position?.y ?? 0) + offsetY },
    })
    const newEdge: Edge = {
      id: `e${edges.length + 1}`,
      source: selectedNode.id,
      target: newNode.id,
      type: 'smoothstep',
    }
    setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(newNode))
    setEdges((cur) => cur.concat(newEdge))
  }, [createNode, edges.length, selectedNode, setEdges, setNodes])

  const findIncomingEdge = useCallback(() => {
    if (!selectedNode) return undefined
    return edges.find((e) => e.target === selectedNode.id)
  }, [edges, selectedNode])

  const onAddSibling = useCallback(() => {
    if (!selectedNode) return
    const incoming = findIncomingEdge()
    const newNode = createNode({
      position: { x: selectedNode.position.x + 220, y: selectedNode.position.y },
    })
    setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(newNode))
    if (incoming) {
      const newEdge: Edge = {
        id: `e${edges.length + 1}`,
        source: incoming.source,
        target: newNode.id,
        type: 'smoothstep',
      }
      setEdges((cur) => cur.concat(newEdge))
    }
  }, [createNode, edges.length, findIncomingEdge, selectedNode, setEdges, setNodes])

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
      setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(newNode))
      setEdges((cur) => cur.concat(newEdge))
    },
    [createNode, edges.length, selectedNode, setEdges, setNodes],
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
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    if (selectedNodeIds.size === 0 && edges.every((e) => !e.selected)) return
    setNodes((cur) => cur.filter((n) => !n.selected))
    setEdges((cur) =>
      cur.filter((e) => !e.selected && !selectedNodeIds.has(e.source as string) && !selectedNodeIds.has(e.target as string)),
    )
  }, [edges, nodes])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      if (isTyping) return
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
  }, [onAddChild, onAddSibling, onDeleteSelected])

  const nodeTypes = useMemo(() => ({ editable: EditableNode, note: NoteNode, checklist: ChecklistNode }), [])
  const edgeTypes = useMemo(() => ({ labeled: LabeledEdge }), [])
  const rfInstance = useRef<any>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  const [dark, setDark] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [search, setSearch] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [openMenu, setOpenMenu] = useState<null | 'insert' | 'templates' | 'file' | 'edit' | 'help'>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const topbarRef = useRef<HTMLDivElement | null>(null)
	const [templates, setTemplates] = useState<BoardTemplate[]>([])

	const refreshTemplates = useCallback(async () => {
		const all = await db.templates.toArray()
		all.sort((a,b)=>b.createdAt - a.createdAt)
		setTemplates(all)
	}, [])

	const applyTemplateReplace = useCallback(async (tpl: BoardTemplate) => {
		try {
			const parsed = JSON.parse(tpl.data) as { nodes: Node[]; edges: Edge[] }
			setNodes(parsed.nodes.map((n) => ({ ...n, type: 'editable' })))
			setEdges(parsed.edges.map((e) => ({ type: 'labeled', ...e })))
		} catch (e) {
			console.error('Invalid template json', e)
		}
	}, [setEdges, setNodes])

	const getChildren = useCallback((rootId: string): Node[] => {
		const visited = new Set<string>([rootId])
		const queue: string[] = [rootId]
		const out: Node[] = []
		while (queue.length) {
			const cur = queue.shift()!
			for (const e of edges) {
				if (e.source === cur && !visited.has(e.target as string)) {
					visited.add(e.target as string)
					queue.push(e.target as string)
					const n = nodes.find((x) => x.id === e.target)
					if (n) out.push(n)
				}
			}
		}
		return out
	}, [edges, nodes])

	const createTasksFromBranch = useCallback(async () => {
		if (!selectedNode) return
		const children = getChildren(selectedNode.id)
		const listTitle = (selectedNode.data as any)?.label || 'New List'
		const sort = Date.now()
		const listId = `l_${Date.now()}`
		await db.lists.put({ id: listId, workspaceId, title: listTitle, sort })
		let idx = 1
		for (const child of children) {
			const title = (child.data as any)?.label || 'New Task'
			await db.tasks.put({ id: `t_${Date.now()}_${idx++}`, listId, title, sort: idx, status: 'not-started' })
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

  type TemplateId = 'school' | 'business'
  const insertTemplate = useCallback(
    (template: TemplateId) => {
      // Radial placement around (0,0)
      const centerX = 0
      const centerY = 0
      const radius = 260
      const rootLabel = template === 'school' ? 'School' : 'Business'
      const topics =
        template === 'school'
          ? [
              'Classes',
              'Homework',
              'Tests',
              'Projects',
              'Study Plan',
              'Schedule',
              'Grades',
              'Deadlines',
              'Clubs',
              'Notes',
              'Resources',
              'To-dos',
            ]
          : [
              'Product',
              'Marketing',
              'Sales',
              'Roadmap',
              'Finance',
              'Operations',
              'Hiring',
              'Metrics',
              'Customers',
              'Support',
              'Partners',
              'Tasks',
            ]

      const created: Node[] = []
      const createdEdges: Edge[] = []

      const root = createNode({ position: { x: centerX, y: centerY }, data: { label: rootLabel, editing: false } })
      created.push(root)

      topics.forEach((t, i) => {
        const angle = (i / topics.length) * Math.PI * 2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        const node = createNode({ position: { x, y }, data: { label: t, editing: false } })
        created.push(node)
        createdEdges.push({ id: `te_${Date.now()}_${i}`, source: root.id, target: node.id, type: 'smoothstep' })
      })

      // A couple of sensible sub-nodes depending on template
      const addSub = (parentLabel: string, labels: string[]) => {
        const parent = created.find((n) => (n.data as any)?.label === parentLabel)
        if (!parent) return
        labels.forEach((lbl, idx) => {
          const node = createNode({
            position: { x: parent.position.x + 180, y: parent.position.y + idx * 90 - 45 },
            data: { label: lbl, editing: false },
          })
          created.push(node)
          createdEdges.push({ id: `te_sub_${Date.now()}_${lbl}` as string, source: parent.id, target: node.id, type: 'smoothstep' })
        })
      }

      if (template === 'school') {
        addSub('Homework', ['Math', 'Science', 'History'])
        addSub('Study Plan', ['Weekly Review', 'Exam Prep'])
      } else {
        addSub('Marketing', ['Content', 'Paid Ads'])
        addSub('Product', ['Backlog', 'Bugs'])
      }

      setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(created))
      setEdges((cur) => cur.concat(createdEdges))
      // schedule tidy with current state on next tick
      setTimeout(() => tidyLayout(nodes, edges.concat(createdEdges), setNodes), 0)
    },
    [createNode, edges, nodes, setEdges, setNodes],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      <div ref={topbarRef} className={`topbar ${showUI ? '' : 'hidden'}`}>
        <div className="brand">
          <span>Atlas Boards</span>
        </div>
        <div className="flex-1 px-4">
          <input
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="toolbar-group">
          {/* Dropdown: Insert */}
          <div className="relative">
            <button
              className="toolbar-btn"
              onClick={(e) => {
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
              onClick={(e) => {
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
              onClick={(e) => {
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
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'edit' ? null : 'edit')
              }}
            >
              Edit ▾
            </button>
          </div>

          {/* Search */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="toolbar-sep" />
            <input
              className="rounded-md border px-2 py-1 text-sm"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = search.trim().toLowerCase()
                  if (!query) return
                  const index = nodes.findIndex((n) => (typeof (n.data as any)?.label === 'string') && ((n.data as any).label as string).toLowerCase().includes(query))
                  if (index === -1) return
                  const node = nodes[index]
                  setNodes((cur) => cur.map((n) => ({ ...n, selected: n.id === node.id })))
                  rfInstance.current?.setCenter?.(node.position.x, node.position.y, { zoom: 1.2, duration: 500 })
                }
              }}
            />
          </div>

          {/* Tasks/Tables */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button className="toolbar-btn" onClick={() => onOpenTools?.('kanban')}>Tasks</button>
            <button className="toolbar-btn" onClick={() => onOpenTools?.('tables')}>Tables</button>
          </div>

          {/* Dropdown: Help (mobile also contains search and links) */}
          <div className="relative ml-auto md:ml-0">
            <button
              className="toolbar-btn"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenuPos({ x: r.left, y: r.bottom + 8 })
                setOpenMenu(openMenu === 'help' ? null : 'help')
              }}
            >
              Help ▾
            </button>
          </div>
          <button className="toolbar-btn" onClick={tidyLayout}>Tidy</button>
        </div>

        {/* Floating Menu Portal */}
        {openMenu && menuPos && (
          <div
            className="fixed z-[999] min-w-[14rem] rounded-md border border-neutral-200 bg-white p-2 shadow-2xl dark:border-neutral-700 dark:bg-neutral-800"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {openMenu === 'insert' && (
              <div className="flex flex-col gap-2">
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); onAddNode() }}>+ Node</button>
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(createNode({ type: 'note', data: { text: 'Note', color: '#FEF08A', editing: true }, position: { x: 0, y: 0 } }))) }}>+ Note</button>
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(createNode({ type: 'checklist', data: { items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }] }, position: { x: 0, y: 0 } }))) }}>+ Checklist</button>
                <button className="toolbar-btn w-full justify-start disabled:opacity-50" disabled={!selectedNode} onClick={() => { setOpenMenu(null); onAddChild() }}>+ Child (Tab)</button>
                <button className="toolbar-btn w-full justify-start disabled:opacity-50" disabled={!selectedNode} onClick={() => { setOpenMenu(null); onAddSibling() }}>+ Sibling (Enter)</button>
              </div>
            )}
            {openMenu === 'templates' && (
              <div className="flex flex-col gap-2">
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); insertTemplate('school') }}>School (preset)</button>
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); insertTemplate('business') }}>Business (preset)</button>
                <div className="toolbar-sep" />
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); void saveAsTemplate() }}>Save current as template</button>
                {templates.length > 0 && <div className="text-xs mt-1 opacity-70 px-1">Saved templates</div>}
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button className="toolbar-btn flex-1 justify-start" onClick={() => { setOpenMenu(null); void applyTemplateReplace(t) }}>Apply (replace): {t.name}</button>
                    <button className="toolbar-btn" onClick={async ()=>{ const name = prompt('Rename template', t.name)?.trim(); if(!name) return; await db.templates.put({ ...t, name }); void refreshTemplates() }}>Rename</button>
                    <button className="toolbar-btn" onClick={async ()=>{ await db.templates.delete(t.id); void refreshTemplates() }}>Delete</button>
                  </div>
                ))}
                <div className="toolbar-sep" />
                <button className="toolbar-btn w-full justify-start disabled:opacity-50" disabled={!selectedNode} onClick={() => { setOpenMenu(null); void createTasksFromBranch() }}>Create Tasks from Branch</button>
              </div>
            )}
            {openMenu === 'file' && (
              <div className="flex flex-col gap-2">
                <button className="toolbar-btn w-full justify-start" onClick={async () => { setOpenMenu(null); const el = document.querySelector('.react-flow__renderer') as HTMLElement | null; if (!el) return; const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2 }); const link = document.createElement('a'); link.download = 'board.png'; link.href = dataUrl; link.click() }}>Export PNG</button>
                <button className="toolbar-btn w-full justify-start" onClick={async () => { setOpenMenu(null); const payload = JSON.stringify({ nodes, edges }, null, 2); const blob = new Blob([payload], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'board.json'; a.click(); URL.revokeObjectURL(url) }}>Export JSON</button>
                <label className="toolbar-btn w-full justify-start cursor-pointer">
                  Import JSON
                  <input type="file" accept="application/json" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); try { const parsed = JSON.parse(text) as { nodes: Node[]; edges: Edge[] }; setNodes(parsed.nodes.map((n) => ({ ...n, type: 'editable' }))); setEdges(parsed.edges.map((e) => ({ type: 'labeled', ...e }))); } catch (err) { console.error('Invalid JSON', err) } finally { setOpenMenu(null) } }} />
                </label>
              </div>
            )}
            {openMenu === 'edit' && (
              <div className="flex flex-col gap-2">
                <button className="toolbar-btn w-full justify-start" onClick={() => { setOpenMenu(null); onDeleteSelected() }}>Delete (Del)</button>
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
                  <input className="mb-2 w-full rounded-md border px-2 py-1" placeholder="Search nodes..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const query = search.trim().toLowerCase(); if (!query) return; const index = nodes.findIndex((n) => (typeof (n.data as any)?.label === 'string') && ((n.data as any).label as string).toLowerCase().includes(query)); if (index === -1) return; const node = nodes[index]; setNodes((cur) => cur.map((n) => ({ ...n, selected: n.id === node.id }))); rfInstance.current?.setCenter?.(node.position.x, node.position.y, { zoom: 1.2, duration: 500 }); setOpenMenu(null) } }} />
                  <div className="flex items-center gap-2">
                    <button className="toolbar-btn w-full" onClick={() => { setOpenMenu(null); onOpenTools?.('kanban') }}>Tasks</button>
                    <button className="toolbar-btn w-full" onClick={() => { setOpenMenu(null); onOpenTools?.('tables') }}>Tables</button>
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
        <button className="leftbar-btn" title="Zoom In" onClick={() => (document.querySelector('.react-flow') as any)?.__rf?.zoomIn?.()}>
          +
        </button>
        <button className="leftbar-btn" title="Zoom Out" onClick={() => (document.querySelector('.react-flow') as any)?.__rf?.zoomOut?.()}>
          −
        </button>
        <button className="leftbar-btn" title="Fit View" onClick={() => (document.querySelector('.react-flow') as any)?.__rf?.fitView?.()}>⤢</button>
        <div className="toolbar-sep" />
        <button className="leftbar-btn" title="Toggle Minimap" onClick={() => setShowMinimap((v) => !v)}>MM</button>
        <button className="leftbar-btn" title="Dark Mode" onClick={() => { setDark((v) => !v); document.documentElement.classList.toggle('dark')}}>🌓</button>
        <button className="leftbar-btn" title="Present (hide UI)" onClick={() => setShowUI((v) => !v)}>👁️</button>
        <button className={`leftbar-btn ${snapToGrid ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`} title="Snap to grid" onClick={() => setSnapToGrid((v) => !v)}>#</button>
        <button className="leftbar-btn" title="Quick Create (Q)" onClick={() => setShowPalette(true)}>⚡</button>
        <div className="toolbar-sep" />
        <button className="leftbar-btn" title="Align Left" onClick={() => {
          const selected = nodes.filter((n) => n.selected)
          if (selected.length < 2) return
          const x = Math.min(...selected.map((n) => n.position.x))
          setNodes((cur) => cur.map((n) => (n.selected ? { ...n, position: { ...n.position, x } } : n)))
        }}>⟸</button>
        <button className="leftbar-btn" title="Align Top" onClick={() => {
          const selected = nodes.filter((n) => n.selected)
          if (selected.length < 2) return
          const y = Math.min(...selected.map((n) => n.position.y))
          setNodes((cur) => cur.map((n) => (n.selected ? { ...n, position: { ...n.position, y } } : n)))
        }}>⟰</button>
        <button className="leftbar-btn" title="Distribute Horiz" onClick={() => {
          const selected = nodes.filter((n) => n.selected).sort((a,b) => a.position.x - b.position.x)
          if (selected.length < 3) return
          const minX = selected[0].position.x
          const maxX = selected[selected.length - 1].position.x
          const step = (maxX - minX) / (selected.length - 1)
          setNodes((cur) => cur.map((n) => {
            const idx = selected.findIndex((s) => s.id === n.id)
            if (idx === -1) return n
            return { ...n, position: { ...n.position, x: minX + step * idx } }
          }))
        }}>⇔</button>
      </div>

      {/* Right inspector - persistent even without selection */}
      <div className={`absolute right-3 top-1/2 z-50 w-72 -translate-y-1/2 rounded-md border border-slate-200 bg-white p-3 shadow ${showUI ? '' : 'hidden'}`}>
        <div className="mb-2 text-sm font-medium">Inspector</div>
        {selectedNode ? (
          <>
          {'label' in (selectedNode.data as any) && (
            <div className="mb-2">
              <label className="block text-xs text-slate-600">Label</label>
              <input
                className="w-full rounded border bg-white px-2 py-1 text-sm text-neutral-900 placeholder-neutral-400"
                value={(selectedNode.data as any).label ?? ''}
                onChange={(e) =>
                  setNodes((nodes) => nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n)))
                }
              />
            </div>
          )}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600">Shape</label>
              <select
                className="w-full rounded border bg-white px-2 py-1 text-sm text-neutral-900"
                value={(selectedNode.data as any).shape ?? 'rect'}
                onChange={(e) =>
                  setNodes((nodes) => nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, shape: e.target.value } } : n)))
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
                value={(selectedNode.data as any).fontSize ?? 16}
                min={10}
                max={48}
                onChange={(e) =>
                  setNodes((nodes) =>
                    nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, fontSize: Number(e.target.value) } } : n)),
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
              value={(selectedNode.data as any).color ?? '#ffffff'}
              onChange={(e) =>
                setNodes((nodes) => nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, color: e.target.value } } : n)))
              }
            />
          </div>
          <div className="flex gap-2">
            <button
              className="rounded bg-slate-200 px-3 py-1"
              onClick={() =>
                setNodes((nodes) =>
                  nodes.concat({ ...selectedNode, id: `${selectedNode.id}-copy-${Math.floor(Math.random() * 1e6)}`, position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 }, selected: false }),
                )
              }
            >
              Duplicate
            </button>
            <button className="rounded bg-rose-600 px-3 py-1 text-white" onClick={onDeleteSelected}>
              Delete
            </button>
          </div>
          <div className="mt-3 border-t pt-2 text-sm">
            <div className="mb-1 font-medium">Task Link</div>
            <button className="toolbar-btn w-full justify-start" onClick={async ()=>{
              // create or open a task linked to this node
              const existing = await db.tasks.where('nodeId').equals(selectedNode.id).first()
              if (existing) {
                emitOpenTask(existing.id, 'list')
                return
              }
              const listId = (await db.lists.toArray())[0]?.id ?? `l_${Date.now()}`
              if (!(await db.lists.get(listId))) await db.lists.put({ id: listId, workspaceId, title: 'General', sort: 1 })
              const task: Task = { id: `t_${Date.now()}`, listId, title: String((selectedNode.data as any)?.label ?? 'New Task'), sort: Date.now(), status: 'not-started', nodeId: selectedNode.id }
              await db.tasks.put(task)
              emitOpenTask(task.id, 'list')
            }}>
              Create/Open linked task
            </button>
            <button className="toolbar-btn w-full justify-start" onClick={async ()=>{
              const all = await db.tasks.toArray()
              const q = prompt('Link to existing task (type part of the title):')?.toLowerCase().trim()
              if (!q) return
              const match = all.find(t => t.title.toLowerCase().includes(q))
              if (!match) { alert('No task found'); return }
              await db.tasks.put({ ...match, nodeId: selectedNode.id })
              alert(`Linked to: ${match.title}`)
            }}>
              Link existing task
            </button>
          </div>
          </>
        ) : (
          <div className="text-xs text-slate-500">
            No node selected.
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="toolbar-btn" onClick={onAddNode}>+ Node</button>
              <button
                className="toolbar-btn"
                onClick={() =>
                  setNodes((cur) =>
                    cur
                      .map((n) => ({ ...n, selected: false }))
                      .concat(
                        createNode({
                          type: 'note',
                          data: { text: 'Note', color: '#FEF08A', editing: true },
                          position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                        }),
                      ),
                  )
                }
              >
                + Note
              </button>
            </div>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params) => onConnect({ ...params, type: 'labeled', data: { label: '' } })}
        defaultEdgeOptions={{ type: 'labeled' }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(inst) => { (document.querySelector('.react-flow') as any).__rf = inst; rfInstance.current = inst }}
        snapToGrid={snapToGrid}
        snapGrid={[25,25]}
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
          { key: 'topic', label: 'Topic Node', run: () => onAddNode() },
          { key: 'note', label: 'Note', run: () => setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(createNode({ type: 'note', data: { text: 'Note', color: '#FEF08A', editing: true }, position: { x: 0, y: 0 } }))) },
          { key: 'checklist', label: 'Checklist', run: () => setNodes((cur) => cur.map((n) => ({ ...n, selected: false })).concat(createNode({ type: 'checklist', data: { items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }] }, position: { x: 0, y: 0 } }))) },
          { key: 'child', label: 'Child of Selection', hint: 'Tab', run: () => onAddChild() },
          { key: 'sibling', label: 'Sibling of Selection', hint: 'Enter', run: () => onAddSibling() },
          { key: 'attach_note', label: 'Attach Note to Selection', run: () => attachNodeToSelection('note', { text: 'Note', color: '#FEF08A', editing: true }) },
          { key: 'attach_check', label: 'Attach Checklist to Selection', run: () => attachNodeToSelection('checklist', { items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }] }) },
          { key: 'tpl_school', label: 'Insert Template: School', run: () => insertTemplate('school') },
          { key: 'tpl_business', label: 'Insert Template: Business', run: () => insertTemplate('business') },
        ]}
      />
    </div>
  )
}

export default BoardCanvas


