import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
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
import { useEffect } from 'react'

type RichTextEditorProps = {
  content: string
  onChange: (html: string) => void
  onCreateTask?: (text: string) => void
  editable?: boolean
  simple?: boolean
  className?: string
  autoFocus?: boolean
}

const lowlight = createLowlight(common)

export function RichTextEditor({
  content,
  onChange,
  onCreateTask,
  editable = true,
  simple = false,
  className = '',
  autoFocus = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: simple ? false : undefined,
        bulletList: simple ? false : undefined,
        orderedList: simple ? false : undefined,
        codeBlock: false, // we use lowlight
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-sm my-2',
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
          class: 'task-list list-none p-0',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item flex items-start gap-2',
        },
      }),
    ],
    content,
    editable,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[2rem] ${className}`,
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (!editor.isFocused) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editable, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="rich-text-editor relative">
      {editable && (
        <div className={`mb-2 flex flex-wrap gap-1 border-b border-slate-200 pb-2 ${simple ? 'hidden' : ''}`}>
          <button
            className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </button>
          <button
            className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </button>
          <button
            className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('underline') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </button>
          <button
             className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('highlight') ? 'bg-slate-200' : ''}`}
             onClick={() => editor.chain().focus().toggleHighlight().run()}
           >
             H
           </button>
           
           <div className="mx-1 w-px bg-slate-300" />

           <button
             className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('taskList') ? 'bg-slate-200' : ''}`}
             onClick={() => editor.chain().focus().toggleTaskList().run()}
           >
             ☑
           </button>
           <button
             className={`rounded px-2 py-1 hover:bg-slate-100 ${editor.isActive('codeBlock') ? 'bg-slate-200' : ''}`}
             onClick={() => editor.chain().focus().toggleCodeBlock().run()}
           >
             {'</>'}
           </button>
        </div>
      )}

      {editable && (
        <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex gap-1 rounded bg-white p-1 shadow-lg border border-slate-200">
          <button
            className={`rounded px-2 py-0.5 text-xs hover:bg-slate-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button
            className={`rounded px-2 py-0.5 text-xs hover:bg-slate-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            className={`rounded px-2 py-0.5 text-xs hover:bg-slate-100 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            className={`rounded px-2 py-0.5 text-xs hover:bg-slate-100 ${editor.isActive('taskList') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑ List
          </button>
        </FloatingMenu>
      )}
      
      {/* Bubble menu for quick formatting on selection */}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex gap-1 rounded bg-white p-1 shadow-lg border border-slate-200">
          <button
            className={`rounded px-2 py-0.5 hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            className={`rounded px-2 py-0.5 hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            className={`rounded px-2 py-0.5 hover:bg-slate-100 ${editor.isActive('strike') ? 'bg-slate-200' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </button>
          
          {onCreateTask && (
             <>
                <div className="mx-1 w-px bg-slate-200" />
                <button
                    className="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                        const selection = editor.state.selection
                        const text = selection.content().content.textBetween(0, selection.content().size, ' ')
                        if (text) onCreateTask(text)
                    }}
                >
                    + Task
                </button>
             </>
          )}
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
