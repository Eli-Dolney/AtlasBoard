import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'
import { RichTextEditor } from '../../components/RichTextEditor'
import { db, type Task } from '../../lib/db'
import { emitOpenTask } from '../../lib/events'

const WORKSPACE_ID = 'default-ws'

// Sticky note color presets
const noteColors = [
  { name: 'Yellow', value: '#fef9c3', border: '#fde047' },
  { name: 'Green', value: '#dcfce7', border: '#86efac' },
  { name: 'Blue', value: '#dbeafe', border: '#93c5fd' },
  { name: 'Pink', value: '#fce7f3', border: '#f9a8d4' },
  { name: 'Purple', value: '#f3e8ff', border: '#d8b4fe' },
  { name: 'Orange', value: '#ffedd5', border: '#fdba74' },
  { name: 'Red', value: '#fee2e2', border: '#fca5a5' },
  { name: 'Cyan', value: '#cffafe', border: '#67e8f9' },
]

export default function NoteNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [value, setValue] = useState<string>(data?.text ?? 'Note')
  const [color, setColor] = useState<string>(data?.color ?? '#fef9c3')

  useEffect(() => setValue(data?.text ?? 'Note'), [data?.text])
  useEffect(() => setColor(data?.color ?? '#fef9c3'), [data?.color])

  const handleChange = (html: string) => {
    setValue(html)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, text: html } } : n))
    )
  }

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, color: newColor } } : n))
    )
  }

  const handleCreateTask = async (text: string) => {
    if (!text.trim()) return
    
    let list = await db.lists.where('workspaceId').equals(WORKSPACE_ID).first()
    if (!list) {
      const listId = `l_${Date.now()}`
      await db.lists.put({ id: listId, workspaceId: WORKSPACE_ID, title: 'General', sort: 0 })
      list = { id: listId } as any
    }

    const task: Task = {
      id: `t_${Date.now()}`,
      listId: list!.id,
      title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      description: text.length > 100 ? text : undefined,
      status: 'not-started',
      sort: Date.now(),
      nodeId: id
    }
    await db.tasks.put(task)
    emitOpenTask({ taskId: task.id, view: 'list' })
  }

  useEffect(() => {
    if (data?.editing) {
      setNodes(nodes =>
        nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, editing: false } } : n))
      )
    }
  }, [data?.editing, id, setNodes])

  const currentColorInfo = noteColors.find(c => c.value === color) || noteColors[0]

  return (
    <div 
      className={`relative transition-all duration-200 ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      style={{ filter: selected ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-1 p-1.5 rounded-lg bg-white shadow-lg border border-slate-200">
        {noteColors.map(preset => (
          <button
            key={preset.value}
            className={`w-6 h-6 rounded transition-transform hover:scale-110 ${color === preset.value ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
            style={{ background: preset.value, border: `2px solid ${preset.border}` }}
            onPointerDown={e => e.stopPropagation()}
            onClick={() => handleColorChange(preset.value)}
            title={preset.name}
          />
        ))}
      </NodeToolbar>

      {/* Sticky note with folded corner effect */}
      <div
        className="min-w-[220px] max-w-[320px] rounded-sm px-4 py-3 relative"
        style={{ 
          background: color,
          borderLeft: `4px solid ${currentColorInfo.border}`,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Folded corner decoration */}
        <div 
          className="absolute top-0 right-0 w-6 h-6"
          style={{
            background: `linear-gradient(135deg, transparent 50%, ${currentColorInfo.border} 50%)`,
          }}
        />
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 text-xs font-medium" style={{ color: '#64748b' }}>
          <span>📝</span>
          <span>Note</span>
        </div>
        
        <RichTextEditor 
          content={value} 
          onChange={handleChange} 
          onCreateTask={handleCreateTask}
          autoFocus={Boolean(data?.editing)}
          className="text-slate-800 text-sm leading-relaxed"
        />
      </div>

      <Handle 
        type="target" 
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
      />
    </div>
  )
}
