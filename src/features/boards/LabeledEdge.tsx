import React, { useEffect, useRef, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  useReactFlow,
} from '@reactflow/core'

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  const { setEdges } = useReactFlow()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState<string>(data?.label ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  useEffect(() => {
    setValue(data?.label ?? '')
  }, [data?.label])

  const commit = (next: string) => {
    setEdges(edges =>
      edges.map(e => (e.id === id ? { ...e, data: { ...e.data, label: next } } : e))
    )
    setIsEditing(false)
  }

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onDoubleClick={e => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs shadow outline-none"
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={() => commit(value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commit(value)
                if (e.key === 'Escape') setIsEditing(false)
              }}
              onPointerDown={e => e.stopPropagation()}
            />
          ) : (
            <div
              className="rounded bg-white/70 px-1 text-xs text-slate-700 shadow"
              onPointerDown={e => e.stopPropagation()}
            >
              {data?.label ?? ''}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
