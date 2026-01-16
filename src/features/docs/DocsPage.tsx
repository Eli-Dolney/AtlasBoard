import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Doc } from '../../lib/db'
import { RichTextEditor } from '../../components/RichTextEditor'

interface DocsPageProps {
  workspaceId: string
}

const DOC_ICONS = ['📄', '📝', '📋', '📌', '📎', '🗂️', '📁', '📂', '🔖', '💡', '⭐', '🎯']

export default function DocsPage({ workspaceId }: DocsPageProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDocMeta, setEditingDocMeta] = useState<Doc | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const docs = useLiveQuery(
    () => db.docs.where('workspaceId').equals(workspaceId).reverse().sortBy('updatedAt'),
    [workspaceId],
    []
  )

  const selectedDoc = docs.find(d => d.id === selectedDocId)

  // Build tree structure
  const docTree = useMemo(() => {
    const rootDocs: Doc[] = []
    const childrenMap: Record<string, Doc[]> = {}

    docs.forEach(doc => {
      if (!doc.parentId) {
        rootDocs.push(doc)
      } else {
        if (!childrenMap[doc.parentId]) childrenMap[doc.parentId] = []
        childrenMap[doc.parentId].push(doc)
      }
    })

    return { rootDocs, childrenMap }
  }, [docs])

  // Filter docs by search
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs
    const query = searchQuery.toLowerCase()
    return docs.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query)
    )
  }, [docs, searchQuery])

  const createDoc = async (parentId?: string) => {
    const newDoc: Doc = {
      id: `doc_${Date.now()}`,
      workspaceId,
      parentId: parentId || null,
      title: 'Untitled',
      content: '',
      icon: '📄',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await db.docs.put(newDoc)
    setSelectedDocId(newDoc.id)
    setShowAddModal(false)
    
    // Expand parent if exists
    if (parentId) {
      setExpandedFolders(prev => new Set([...prev, parentId]))
    }
  }

  const updateDoc = async (id: string, updates: Partial<Doc>) => {
    await db.docs.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
  }

  const deleteDoc = async (id: string) => {
    // Also delete child docs
    const children = docTree.childrenMap[id] || []
    for (const child of children) {
      await deleteDoc(child.id)
    }
    await db.docs.delete(id)
    if (selectedDocId === id) setSelectedDocId(null)
  }

  const handleContentChange = useCallback(async (content: string) => {
    if (!selectedDocId) return
    await db.docs.update(selectedDocId, {
      content,
      updatedAt: Date.now()
    })
  }, [selectedDocId])

  const handleTitleChange = async (title: string) => {
    if (!selectedDocId) return
    await updateDoc(selectedDocId, { title })
  }

  const toggleFavorite = async (doc: Doc) => {
    await updateDoc(doc.id, { isFavorite: !doc.isFavorite })
  }

  const toggleFolder = (docId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  // Render doc tree item
  const renderDocItem = (doc: Doc, depth: number = 0) => {
    const children = docTree.childrenMap[doc.id] || []
    const hasChildren = children.length > 0
    const isExpanded = expandedFolders.has(doc.id)
    const isSelected = selectedDocId === doc.id

    return (
      <div key={doc.id}>
        <div
          className={`docs-tree-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => setSelectedDocId(doc.id)}
        >
          {hasChildren ? (
            <button
              className="docs-tree-toggle"
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(doc.id)
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="docs-tree-spacer" />
          )}
          <span className="docs-tree-icon">{doc.icon || '📄'}</span>
          <span className="docs-tree-title">{doc.title}</span>
          {doc.isFavorite && <span className="docs-tree-fav">⭐</span>}
          <button
            className="docs-tree-add btn btn-ghost btn-icon btn-sm"
            onClick={(e) => {
              e.stopPropagation()
              createDoc(doc.id)
            }}
            title="Add sub-page"
          >
            +
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className="docs-tree-children">
            {children.map(child => renderDocItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="docs-page">
      {/* Sidebar */}
      <div className="docs-sidebar">
        <div className="docs-sidebar-header">
          <h2 className="docs-sidebar-title">Documents</h2>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => createDoc()}
          >
            + New
          </button>
        </div>

        {/* Search */}
        <div className="docs-search">
          <input
            type="text"
            className="input"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Favorites Section */}
        {docs.filter(d => d.isFavorite).length > 0 && (
          <div className="docs-section">
            <div className="docs-section-header">⭐ Favorites</div>
            {docs
              .filter(d => d.isFavorite)
              .map(doc => (
                <div
                  key={doc.id}
                  className={`docs-tree-item ${selectedDocId === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  <span className="docs-tree-spacer" />
                  <span className="docs-tree-icon">{doc.icon || '📄'}</span>
                  <span className="docs-tree-title">{doc.title}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* Doc Tree */}
        <div className="docs-tree">
          {searchQuery ? (
            // Search results
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                className={`docs-tree-item ${selectedDocId === doc.id ? 'selected' : ''}`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <span className="docs-tree-spacer" />
                <span className="docs-tree-icon">{doc.icon || '📄'}</span>
                <span className="docs-tree-title">{doc.title}</span>
              </div>
            ))
          ) : (
            // Tree view
            docTree.rootDocs.map(doc => renderDocItem(doc))
          )}
        </div>

        {docs.length === 0 && (
          <div className="docs-empty-sidebar">
            <p>No documents yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => createDoc()}>
              Create your first doc
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="docs-editor">
        {selectedDoc ? (
          <>
            {/* Doc Header */}
            <div className="docs-editor-header">
              <button
                className="docs-icon-picker btn btn-ghost"
                onClick={() => {
                  const newIcon = DOC_ICONS[Math.floor(Math.random() * DOC_ICONS.length)]
                  updateDoc(selectedDoc.id, { icon: newIcon })
                }}
              >
                {selectedDoc.icon || '📄'}
              </button>
              <input
                type="text"
                className="docs-title-input"
                value={selectedDoc.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Untitled"
              />
              <div className="docs-editor-actions">
                <button
                  className={`btn btn-ghost btn-icon ${selectedDoc.isFavorite ? 'active' : ''}`}
                  onClick={() => toggleFavorite(selectedDoc)}
                  title={selectedDoc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {selectedDoc.isFavorite ? '⭐' : '☆'}
                </button>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => {
                    setEditingDocMeta(selectedDoc)
                    setShowAddModal(true)
                  }}
                  title="Settings"
                >
                  ⚙️
                </button>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => {
                    if (window.confirm('Delete this document?')) {
                      deleteDoc(selectedDoc.id)
                    }
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            {selectedDoc.parentId && (
              <div className="docs-breadcrumb">
                {getBreadcrumb(docs, selectedDoc).map((doc, i, arr) => (
                  <span key={doc.id}>
                    <button
                      className="docs-breadcrumb-item"
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      {doc.title}
                    </button>
                    {i < arr.length - 1 && <span className="docs-breadcrumb-sep">/</span>}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="docs-meta">
              <span>Last edited {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
            </div>

            {/* Content Editor */}
            <div className="docs-content">
              <RichTextEditor
                key={selectedDoc.id}
                content={selectedDoc.content}
                onChange={handleContentChange}
                placeholder="Start writing..."
              />
            </div>

            {/* Child pages */}
            {docTree.childrenMap[selectedDoc.id]?.length > 0 && (
              <div className="docs-children-section">
                <h3 className="docs-children-title">📑 Sub-pages</h3>
                <div className="docs-children-grid">
                  {docTree.childrenMap[selectedDoc.id].map(child => (
                    <div
                      key={child.id}
                      className="docs-child-card"
                      onClick={() => setSelectedDocId(child.id)}
                    >
                      <span className="docs-child-icon">{child.icon || '📄'}</span>
                      <span className="docs-child-title">{child.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="docs-empty">
            <div className="docs-empty-icon">📝</div>
            <h3>Select a document</h3>
            <p>Choose a document from the sidebar or create a new one</p>
            <button className="btn btn-primary" onClick={() => createDoc()}>
              + New Document
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showAddModal && editingDocMeta && (
        <DocSettingsModal
          doc={editingDocMeta}
          docs={docs}
          onSave={(updates) => {
            updateDoc(editingDocMeta.id, updates)
            setShowAddModal(false)
            setEditingDocMeta(null)
          }}
          onClose={() => {
            setShowAddModal(false)
            setEditingDocMeta(null)
          }}
        />
      )}
    </div>
  )
}

// Helper to get breadcrumb path
function getBreadcrumb(docs: Doc[], doc: Doc): Doc[] {
  const path: Doc[] = [doc]
  let current = doc
  
  while (current.parentId) {
    const parent = docs.find(d => d.id === current.parentId)
    if (!parent) break
    path.unshift(parent)
    current = parent
  }
  
  return path
}

// Doc Settings Modal
function DocSettingsModal({
  doc,
  docs,
  onSave,
  onClose
}: {
  doc: Doc
  docs: Doc[]
  onSave: (updates: Partial<Doc>) => void
  onClose: () => void
}) {
  const [icon, setIcon] = useState(doc.icon || '📄')
  const [parentId, setParentId] = useState(doc.parentId || '')

  // Get available parents (exclude self and children)
  const availableParents = docs.filter(d => {
    if (d.id === doc.id) return false
    // Check if d is a child of doc
    let current = d
    while (current.parentId) {
      if (current.parentId === doc.id) return false
      current = docs.find(dd => dd.id === current.parentId) || current
      if (!current.parentId) break
    }
    return true
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Document Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Icon</label>
            <div className="doc-icon-grid">
              {DOC_ICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  className={`doc-icon-option ${icon === i ? 'active' : ''}`}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Parent Document</label>
            <select
              className="input"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">None (root level)</option>
              {availableParents.map(d => (
                <option key={d.id} value={d.id}>{d.icon} {d.title}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => onSave({ icon, parentId: parentId || null })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
