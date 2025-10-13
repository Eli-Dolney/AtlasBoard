import { useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

export default function NoteNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [value, setValue] = useState<string>(data?.text ?? 'Note')
  const [color, setColor] = useState<string>(data?.color ?? '#FEF08A') // yellow-200
  const containerRef = useRef<HTMLDivElement>(null)

  const lowlight = createLowlight(common)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 px-1 rounded',
        },
      }),
      TextStyle.configure({}),
      Color.configure({}),
      Underline.configure({}),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none [&_.task-list]:list-none [&_.task-item]:flex [&_.task-item]:items-center [&_.task-item]:gap-2 [&_.task-item>label]:flex-1 [&_.task-item>input]:mr-2',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      setValue(html)
      setNodes(nodes =>
        nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, text: html } } : n))
      )
    },
  })

  useEffect(() => setValue(data?.text ?? 'Note'), [data?.text])
  useEffect(() => setColor(data?.color ?? '#FEF08A'), [data?.color])
  useEffect(() => {
    if (data?.editing) {
      // Focus editor next tick
      setTimeout(() => editor?.commands.focus('end'), 0)
      setNodes(nodes =>
        nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, editing: false } } : n))
      )
    }
  }, [data?.editing, editor, id, setNodes])

  return (
    <div className={`relative ${selected ? 'ring-2 ring-blue-400' : ''}`}>
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <input
          type="color"
          className="h-7 w-10 cursor-pointer bg-white"
          value={color}
          onPointerDown={e => e.stopPropagation()}
          onChange={e =>
            setNodes(nodes =>
              nodes.map(n =>
                n.id === id ? { ...n, data: { ...n.data, color: e.target.value } } : n
              )
            )
          }
        />
      </NodeToolbar>

      <div
        ref={containerRef}
        className="min-w-[200px] max-w-[320px] rounded-md border border-yellow-300 px-3 py-2 shadow"
        style={{ background: color }}
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="mb-2 flex flex-wrap gap-1 text-xs">
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          >
            <span className="bg-yellow-200 px-1">H</span>
          </button>
          <div className="mx-1 border-l border-gray-300"></div>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            ☑ Tasks
          </button>
          <div className="mx-1 border-l border-gray-300"></div>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            {'</>'} Code
          </button>
          <button
            className="rounded bg-white px-2 py-0.5 text-neutral-900 shadow"
            onMouseDown={e => e.preventDefault()}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            `Code`
          </button>
          <div className="mx-1 border-l border-gray-300"></div>
          <select
            className="rounded bg-white px-2 py-0.5 text-xs text-neutral-900 shadow"
            onChange={e => {
              const color = e.target.value
              if (color) {
                editor?.chain().focus().setColor(color).run()
              }
            }}
          >
            <option value="">Color</option>
            <option value="#ef4444">Red</option>
            <option value="#f97316">Orange</option>
            <option value="#eab308">Yellow</option>
            <option value="#22c55e">Green</option>
            <option value="#3b82f6">Blue</option>
            <option value="#8b5cf6">Purple</option>
          </select>
          <div className="mx-1 border-l border-gray-300"></div>
          <label className="cursor-pointer rounded bg-white px-2 py-0.5 text-neutral-900 shadow">
            📎
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={async e => {
                const file = e.target.files?.[0]
                if (file) {
                  // For now, just insert filename as placeholder
                  // In a full implementation, you'd upload to a storage service
                  editor
                    ?.chain()
                    .focus()
                    .insertContent(`<strong>📎 ${file.name}</strong><br/>`)
                    .run()
                }
              }}
            />
          </label>
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
