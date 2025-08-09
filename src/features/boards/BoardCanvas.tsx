import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, addEdge, useEdgesState, useNodesState, type Edge, type Node, type OnConnect, useReactFlow } from '@reactflow/core'
import { MiniMap } from '@reactflow/minimap'
import { Controls } from '@reactflow/controls'
import { Background } from '@reactflow/background'
import '@reactflow/core/dist/style.css'
import '@reactflow/minimap/dist/style.css'
import '@reactflow/controls/dist/style.css'
// background package does not ship a separate style entry; core styles are enough
import { db } from '../../lib/db'
import { debounce } from '../../lib/autosave'
import { EditableNode } from './EditableNode'
import LabeledEdge from './LabeledEdge'
import * as htmlToImage from 'html-to-image'
import NoteNode from './NoteNode'
import ChecklistNode from './ChecklistNode'
import QuickPalette from './QuickPalette'

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

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      <div className={`topbar ${showUI ? '' : 'hidden'}`}>
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
        <button
          className="toolbar-btn"
          onClick={() =>
            setNodes((cur) =>
              cur
                .map((n) => ({ ...n, selected: false }))
                .concat(
                  createNode({
                    type: 'checklist',
                    data: { items: [{ id: `${Date.now()}_1`, text: 'New item', done: false }] },
                    position: { x: Math.random() * 400 - 200, y: Math.random() * 200 - 100 },
                  }),
                ),
            )
          }
        >
          + Checklist
        </button>
          <span className="toolbar-sep" />
        <button
          className="toolbar-btn disabled:opacity-50"
          onClick={onAddChild}
          disabled={!selectedNode}
        >
          + Child (Tab)
        </button>
        <button className="toolbar-btn" onClick={onDeleteSelected}>
          Delete (Del)
        </button>
          <span className="toolbar-sep" />
        <button
          className="toolbar-btn"
          onClick={async () => {
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
          className="toolbar-btn"
          onClick={async () => {
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
        <label className="toolbar-btn cursor-pointer">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              try {
                const parsed = JSON.parse(text) as { nodes: Node[]; edges: Edge[] }
                setNodes(parsed.nodes.map((n) => ({ ...n, type: 'editable' })))
                setEdges(parsed.edges.map((e) => ({ type: 'labeled', ...e })))
              } catch (err) {
                console.error('Invalid JSON', err)
              }
            }}
          />
        </label>
        </div>
        <div className="toolbar-group text-xs text-neutral-500">
          <span>Undo: Cmd/Ctrl+Z</span>
          <span className="toolbar-sep" />
          <span>Redo: Shift+Cmd/Ctrl+Z</span>
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
                let index = nodes.findIndex((n) => (typeof (n.data as any)?.label === 'string') && ((n.data as any).label as string).toLowerCase().includes(query))
                if (index === -1) return
                const node = nodes[index]
                setNodes((cur) => cur.map((n) => ({ ...n, selected: n.id === node.id })))
                rfInstance.current?.setCenter?.(node.position.x, node.position.y, { zoom: 1.2, duration: 500 })
              }
            }}
          />
        </div>
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => onOpenTools?.('kanban')}>Tasks</button>
          <button className="toolbar-btn" onClick={() => onOpenTools?.('tables')}>Tables</button>
        </div>
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
      <div className={`absolute right-3 top-3 z-50 w-72 rounded-md border border-slate-200 bg-white p-3 shadow ${showUI ? '' : 'hidden'}`}>
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
        ]}
      />
    </div>
  )
}

export default BoardCanvas


