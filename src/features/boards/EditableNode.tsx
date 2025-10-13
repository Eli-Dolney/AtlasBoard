import React, { useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow, type Edge } from '@reactflow/core'
import { NodeResizer } from '@reactflow/node-resizer'
import { NodeToolbar } from '@reactflow/node-toolbar'
import '@reactflow/node-resizer/dist/style.css'
import { parseWikilinks } from '../../lib/links'

export function EditableNode({ id, data, selected }: NodeProps) {
  const { setNodes, setEdges, getNodes, setCenter } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<string>(data?.label ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const isCollapsed = Boolean(data?.collapsed)

  useEffect(() => {
    setValue(data?.label ?? '')
  }, [data?.label])

  // auto-enter edit mode when a new node sets data.editing transiently
  useEffect(() => {
    if (data?.editing) {
      setIsEditing(true)
      // clear the transient flag so it doesn't persist
      setNodes(nodes =>
        nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, editing: false } } : n))
      )
    }
  }, [data?.editing, id, setNodes])

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const commit = (next: string) => {
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, label: next } } : n))
    )
    setIsEditing(false)
  }

  const cancel = () => {
    setValue(data?.label ?? '')
    setIsEditing(false)
  }

  const shape = data?.shape ?? 'rect' // rect | rounded | ellipse | circle | diamond
  const color = data?.color ?? '#ffffff'
  const fontSize: number = data?.fontSize ?? 16

  const baseStyles: React.CSSProperties = { background: color }

  let shapeStyles: React.CSSProperties = {}
  switch (shape) {
    case 'rounded':
      shapeStyles = { borderRadius: 12 }
      break
    case 'ellipse':
      shapeStyles = { borderRadius: 9999 }
      break
    case 'circle':
      shapeStyles = {
        borderRadius: '9999px',
        aspectRatio: '1 / 1',
        width: 160,
        padding: 0,
        display: 'grid',
        placeItems: 'center',
      }
      break
    case 'diamond':
      // use clip-path for a real diamond while keeping content readable
      shapeStyles = {
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        padding: '2.5rem 3rem',
      }
      break
    default:
      shapeStyles = {}
  }

  const handleLinkClick = (title: string) => {
    const nodes = getNodes()
    const target = nodes.find(
      n => typeof (n.data as any)?.label === 'string' && ((n.data as any).label as string) === title
    )
    if (target) {
      setNodes(cur => cur.map(n => ({ ...n, selected: n.id === target.id })))
      try {
        setCenter?.(target.position.x, target.position.y, { zoom: 1.2, duration: 500 })
      } catch {}
      return
    }
    if (!confirm(`Create node "${title}" and link it as a child?`)) return
    setNodes(cur => {
      const me = cur.find(n => n.id === id)
      const newId = `n${Date.now()}_${Math.round(Math.random() * 1000)}`
      const newNode = {
        id: newId,
        type: 'editable',
        data: { label: title },
        position: { x: (me?.position.x ?? 0) + 200, y: (me?.position.y ?? 0) + 120 },
        selected: false,
      }
      // link current -> new
      setEdges?.(eds =>
        eds.concat({ id: `e_${Date.now()}`, source: id, target: newId, type: 'smoothstep' } as Edge)
      )
      return cur.concat(newNode as any)
    })
  }

  const renderLabel = (text: string | undefined) => {
    const content = String(text ?? '')
    const tokens = parseWikilinks(content)
    return (
      <span>
        {tokens.map((t, i) =>
          t.type === 'text' ? (
            <span key={i}>{t.value}</span>
          ) : (
            <button
              key={i}
              className="text-blue-600 underline hover:text-blue-800"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation()
                handleLinkClick(t.title)
              }}
            >
              [[{t.title}]]
            </button>
          )
        )}
      </span>
    )
  }

  return (
    <div
      className={`relative min-w-[160px] text-sm ${selected ? 'ring-2 ring-blue-400' : ''}`}
      onDoubleClick={e => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      onPointerDown={e => {
        // allow text selection / editing without dragging the node
        if (isEditing) e.stopPropagation()
      }}
    >
      <div
        className="border border-slate-300 px-4 py-2 shadow-sm"
        style={{ ...baseStyles, ...shapeStyles }}
      >
        <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
          <button
            className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            Edit
          </button>
          <button
            className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
            onPointerDown={e => e.stopPropagation()}
            onClick={() =>
              setNodes(nodes =>
                nodes.map(n =>
                  n.id === id
                    ? { ...n, data: { ...n.data, collapsed: !Boolean(n.data?.collapsed) } }
                    : n
                )
              )
            }
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
          <select
            className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
            onPointerDown={e => e.stopPropagation()}
            value={shape}
            onChange={e => {
              const next = e.target.value
              setNodes(nodes =>
                nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, shape: next } } : n))
              )
            }}
          >
            <option value="rect">Rectangle</option>
            <option value="rounded">Rounded</option>
            <option value="ellipse">Ellipse</option>
            <option value="circle">Circle</option>
            <option value="diamond">Diamond</option>
          </select>
          <input
            type="color"
            className="h-7 w-10 cursor-pointer bg-white"
            onPointerDown={e => e.stopPropagation()}
            value={color}
            onChange={e =>
              setNodes(nodes =>
                nodes.map(n =>
                  n.id === id ? { ...n, data: { ...n.data, color: e.target.value } } : n
                )
              )
            }
          />
          <button
            className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              // duplicate
              setNodes(nodes => {
                const original = nodes.find(n => n.id === id)
                if (!original) return nodes
                const clone = {
                  ...original,
                  id: `${original.id}-copy-${Math.floor(Math.random() * 1e6)}`,
                  position: { x: original.position.x + 40, y: original.position.y + 40 },
                  selected: false,
                }
                return nodes.concat(clone)
              })
            }}
          >
            Duplicate
          </button>
        </NodeToolbar>

        {!isCollapsed && <NodeResizer isVisible={selected} minWidth={140} minHeight={40} />}

        {isEditing ? (
          <input
            ref={inputRef}
            className="nodrag nowheel w-full text-neutral-900 outline-none"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={() => commit(value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit(value)
              if (e.key === 'Escape') cancel()
            }}
            onPointerDown={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            draggable={false}
          />
        ) : (
          <div style={{ fontSize, color: '#111827' }}>{renderLabel(data?.label)}</div>
        )}
      </div>

      {/* extra connection points (hidden when collapsed to reduce clutter) */}
      {!isCollapsed && (
        <>
          <Handle type="target" position={Position.Top} id="t" />
          <Handle type="source" position={Position.Bottom} id="b" />
          <Handle type="source" position={Position.Left} id="l" />
          <Handle type="target" position={Position.Right} id="r" />
          <Handle type="source" position={Position.Top} id="t2" style={{ left: '25%' }} />
          <Handle type="source" position={Position.Top} id="t3" style={{ left: '75%' }} />
          <Handle type="source" position={Position.Bottom} id="b2" style={{ left: '25%' }} />
          <Handle type="source" position={Position.Bottom} id="b3" style={{ left: '75%' }} />
        </>
      )}
    </div>
  )
}

export default EditableNode
