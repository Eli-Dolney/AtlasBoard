import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Note } from '../../lib/db'
import { RichTextEditor } from '../../components/RichTextEditor'

interface NotesPageProps {
  workspaceId: string
}

const noteColors = [
  { name: 'Default', value: '#ffffff', border: '#e2e8f0' },
  { name: 'Yellow', value: '#fef9c3', border: '#fde047' },
  { name: 'Green', value: '#dcfce7', border: '#86efac' },
  { name: 'Blue', value: '#dbeafe', border: '#93c5fd' },
  { name: 'Pink', value: '#fce7f3', border: '#f9a8d4' },
  { name: 'Purple', value: '#f3e8ff', border: '#d8b4fe' },
  { name: 'Orange', value: '#ffedd5', border: '#fdba74' },
]

export default function NotesPage({ workspaceId }: NotesPageProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const notes = useLiveQuery(
    () => db.notes.where('workspaceId').equals(workspaceId).reverse().sortBy('updatedAt'),
    [workspaceId],
    []
  )

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes
    const query = searchQuery.toLowerCase()
    return notes.filter(
      n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        (n.tags ?? []).some(t => t.toLowerCase().includes(query))
    )
  }, [notes, searchQuery])

  const selectedNote = useMemo(
    () => notes.find(n => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  )

  const createNote = async () => {
    const id = `note_${Date.now()}`
    const now = Date.now()
    const note: Note = {
      id,
      workspaceId,
      title: 'Untitled Note',
      content: '',
      color: '#ffffff',
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.put(note)
    setSelectedNoteId(id)
  }

  const updateNote = async (id: string, updates: Partial<Note>) => {
    await db.notes.update(id, { ...updates, updatedAt: Date.now() })
  }

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return
    await db.notes.delete(id)
    if (selectedNoteId === id) {
      setSelectedNoteId(null)
    }
  }

  const getPreviewText = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    const text = div.textContent || div.innerText || ''
    return text.slice(0, 100) + (text.length > 100 ? '...' : '')
  }

  return (
    <div className="notes-page">
      {/* Sidebar / List */}
      <div className="notes-sidebar">
        <div className="notes-sidebar-header">
          <h2 className="notes-sidebar-title">Notes</h2>
          <button className="btn btn-primary btn-sm" onClick={createNote}>
            + New
          </button>
        </div>

        <div className="notes-search">
          <input
            type="text"
            className="input input-sm"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notes-view-toggle">
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>

        <div className={`notes-list ${viewMode === 'grid' ? 'notes-grid' : ''}`}>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
              style={{ background: note.color || '#ffffff' }}
              onClick={() => setSelectedNoteId(note.id)}
            >
              <div className="note-item-title">{note.title || 'Untitled'}</div>
              <div className="note-item-preview">{getPreviewText(note.content)}</div>
              <div className="note-item-meta">
                <span className="note-item-date">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                {note.tags && note.tags.length > 0 && (
                  <div className="note-item-tags">
                    {note.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="note-item-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredNotes.length === 0 && (
            <div className="notes-empty">
              <p>No notes yet</p>
              <button className="btn btn-primary btn-sm" onClick={createNote}>
                Create your first note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="notes-editor">
        {selectedNote ? (
          <>
            <div className="notes-editor-header">
              <input
                type="text"
                className="notes-title-input"
                value={selectedNote.title}
                onChange={e => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note title..."
              />
              <div className="notes-editor-actions">
                {/* Color picker */}
                <div className="notes-color-picker">
                  {noteColors.map(color => (
                    <button
                      key={color.value}
                      className={`notes-color-btn ${selectedNote.color === color.value ? 'active' : ''}`}
                      style={{ background: color.value, borderColor: color.border }}
                      onClick={() => updateNote(selectedNote.id, { color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => deleteNote(selectedNote.id)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>

            {/* Tags input */}
            <div className="notes-tags-section">
              <input
                type="text"
                className="input input-sm"
                placeholder="Add tags (comma separated)..."
                value={(selectedNote.tags ?? []).join(', ')}
                onChange={e => {
                  const tags = e.target.value
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean)
                  updateNote(selectedNote.id, { tags })
                }}
              />
            </div>

            <div
              className="notes-editor-content"
              style={{ background: selectedNote.color || '#ffffff' }}
            >
              <RichTextEditor
                content={selectedNote.content}
                onChange={content => updateNote(selectedNote.id, { content })}
                className="notes-rich-editor"
              />
            </div>

            <div className="notes-editor-footer">
              <span className="text-caption">
                Created {new Date(selectedNote.createdAt).toLocaleString()}
              </span>
              <span className="text-caption">
                Last edited {new Date(selectedNote.updatedAt).toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <div className="notes-editor-empty">
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">Select a note</div>
              <div className="empty-state-description">
                Choose a note from the sidebar or create a new one
              </div>
              <button className="btn btn-primary" onClick={createNote}>
                + Create Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
