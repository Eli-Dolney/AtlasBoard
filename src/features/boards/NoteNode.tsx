import React, { useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

export default function NoteNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [value, setValue] = useState<string>(data?.text ?? 'Note')
  const [color, setColor] = useState<string>(data?.color ?? '#FEF08A') // yellow-200
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [StarterKit, Link],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      setValue(html)
      setNodes((nodes) => nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: html } } : n)))
    },
  })

  useEffect(() => setValue(data?.text ?? 'Note'), [data?.text])
  useEffect(() => setColor(data?.color ?? '#FEF08A'), [data?.color])
  useEffect(() => {
    if (data?.editing) {
      // Focus editor next tick
      setTimeout(() => editor?.commands.focus('end'), 0)
      setNodes((nodes) => nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, editing: false } } : n)))
    }
  }, [data?.editing, editor, id, setNodes])

  const commit = (next: string) => {
    setNodes((nodes) => nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: next } } : n)))
  }

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-400' : ''}`}>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <input
          type="color"
          className="h-7 w-10 cursor-pointer bg-white"
          value={color}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) =>
            setNodes((nodes) => nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, color: e.target.value } } : n)))
          }
        />
      </NodeToolbar>

      <div
        ref={containerRef}
        className="min-w-[200px] max-w-[320px] rounded-md border border-yellow-300 shadow px-3 py-2"
        style={{ background: color }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex gap-1 text-xs">
          <button className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow" onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()}>
            B
          </button>
          <button className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow" onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            I
          </button>
          <button className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow" onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            • List
          </button>
          <button className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow" onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().setParagraph().run()}>
            P
          </button>
        </div>
        <div className="prose prose-sm max-w-none text-neutral-900">
          <EditorContent editor={editor} />
        </div>
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}


