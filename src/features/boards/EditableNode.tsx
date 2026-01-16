import React, { useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow, type Edge } from '@reactflow/core'
import { NodeResizer } from '@reactflow/node-resizer'
import { NodeToolbar } from '@reactflow/node-toolbar'
import '@reactflow/node-resizer/dist/style.css'
import { parseWikilinks } from '../../lib/links'

// Color presets for quick selection
const colorPresets = [
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Yellow', value: '#fef9c3' },
  { name: 'Orange', value: '#ffedd5' },
  { name: 'Red', value: '#fee2e2' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Cyan', value: '#cffafe' },
  { name: 'Gray', value: '#f3f4f6' },
]

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

  const shape = data?.shape ?? 'rounded' // rect | rounded | ellipse | circle | diamond
  const color = data?.color ?? '#ffffff'
  const fontSize: number = data?.fontSize ?? 14

  // Determine if it's a dark background
  const isDark = color && color !== '#ffffff' && color !== '#f3f4f6'

  const baseStyles: React.CSSProperties = { 
    background: color,
    borderColor: isDark ? 'transparent' : '#e2e8f0'
  }

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
        width: 120,
        padding: 0,
        display: 'grid',
        placeItems: 'center',
      }
      break
    case 'diamond':
      shapeStyles = {
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        padding: '2.5rem 3rem',
      }
      break
    default:
      shapeStyles = { borderRadius: 4 }
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

  const setColor = (newColor: string) => {
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, color: newColor } } : n))
    )
  }

  const setShape = (newShape: string) => {
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, shape: newShape } } : n))
    )
  }

  return (
    <div
      className={`relative min-w-[140px] text-sm transition-all duration-200 ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      style={{ filter: selected ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      onDoubleClick={e => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      onPointerDown={e => {
        if (isEditing) e.stopPropagation()
      }}
    >
      <div
        className="border-2 px-4 py-3"
        style={{ ...baseStyles, ...shapeStyles }}
      >
        <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 p-1 rounded-lg bg-white shadow-lg border border-slate-200">
          {/* Color presets */}
          <div className="flex gap-0.5 pr-2 border-r border-slate-200">
            {colorPresets.slice(0, 6).map(preset => (
              <button
                key={preset.value}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${color === preset.value ? 'border-blue-500' : 'border-transparent'}`}
                style={{ background: preset.value }}
                onPointerDown={e => e.stopPropagation()}
                onClick={() => setColor(preset.value)}
                title={preset.name}
              />
            ))}
          </div>
          
          {/* Shape selector */}
          <select
            className="text-xs bg-transparent border-none cursor-pointer text-slate-600"
            onPointerDown={e => e.stopPropagation()}
            value={shape}
            onChange={e => setShape(e.target.value)}
          >
            <option value="rect">▭ Rect</option>
            <option value="rounded">▢ Rounded</option>
            <option value="ellipse">⬭ Ellipse</option>
            <option value="circle">⬤ Circle</option>
            <option value="diamond">◇ Diamond</option>
          </select>
          
          {/* Actions */}
          <button
            className="px-2 py-0.5 text-xs rounded hover:bg-slate-100 text-slate-600"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              setIsEditing(true)
            }}
          >
            ✏️
          </button>
          <button
            className="px-2 py-0.5 text-xs rounded hover:bg-slate-100 text-slate-600"
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
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '➕' : '➖'}
          </button>
          <button
            className="px-2 py-0.5 text-xs rounded hover:bg-slate-100 text-slate-600"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
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
            title="Duplicate"
          >
            📋
          </button>
        </NodeToolbar>

        {!isCollapsed && <NodeResizer isVisible={selected} minWidth={120} minHeight={36} />}

        {isEditing ? (
          <input
            ref={inputRef}
            className="nodrag nowheel w-full bg-transparent text-slate-900 outline-none font-medium"
            style={{ fontSize }}
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
          <div 
            className="font-medium text-center"
            style={{ fontSize, color: '#1e293b' }}
          >
            {renderLabel(data?.label)}
          </div>
        )}
      </div>

      {/* Connection handles */}
      {!isCollapsed && (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            id="t" 
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="b"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
          />
          <Handle 
            type="source" 
            position={Position.Left} 
            id="l"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
          />
          <Handle 
            type="target" 
            position={Position.Right} 
            id="r"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
          />
        </>
      )}
      
      {/* Collapsed indicator */}
      {isCollapsed && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center font-bold">
          +
        </div>
      )}
    </div>
  )
}

export default EditableNode
