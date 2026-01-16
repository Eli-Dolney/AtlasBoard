import { useEffect, useMemo, useState } from 'react'
import { db, type TableColumn, type TableMeta, type TableRow } from '../../lib/db'
import { onCreateTable } from '../../lib/events'
import { useLiveQuery } from 'dexie-react-hooks'

// Column type icons
const columnTypeIcons: Record<string, string> = {
  text: 'Aa',
  number: '#',
  select: '▼',
  date: '📅',
  checkbox: '☑',
  url: '🔗',
}

export default function TablesView({ workspaceId }: { workspaceId: string }) {
  const tables = useLiveQuery(
    () => db.tableMetas.where('workspaceId').equals(workspaceId).sortBy('createdAt'),
    [workspaceId],
    [] as TableMeta[]
  )
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)

  // Auto-select first table if none selected
  useEffect(() => {
    if (tables && tables.length > 0 && !activeId) {
      setActiveId(tables[0].id)
    }
  }, [tables, activeId])

  const columns = useLiveQuery(
    async () => {
      if (!activeId) return []
      return db.tableColumns.where('tableId').equals(activeId).sortBy('sort')
    },
    [activeId],
    [] as TableColumn[]
  )

  const rows = useLiveQuery(
    async () => {
      if (!activeId) return []
      return db.tableRows.where('tableId').equals(activeId).sortBy('sort')
    },
    [activeId],
    [] as TableRow[]
  )

  const addTable = async () => {
    const id = `tbl_${Date.now()}`
    const meta: TableMeta = { id, workspaceId, name: 'New Table', createdAt: Date.now() }
    await db.tableMetas.put(meta)
    const defaultCols: TableColumn[] = [
      { id: `c_${Date.now()}_1`, tableId: id, name: 'Name', type: 'text', sort: 1 },
      {
        id: `c_${Date.now()}_2`,
        tableId: id,
        name: 'Status',
        type: 'select',
        options: ['To Do', 'In Progress', 'Done'],
        sort: 2,
      },
      { id: `c_${Date.now()}_3`, tableId: id, name: 'Notes', type: 'text', sort: 3 },
    ]
    await db.tableColumns.bulkPut(defaultCols)
    await db.tableRows.put({
      id: `r_${Date.now()}`,
      tableId: id,
      sort: 1,
      cells: { [defaultCols[0].id]: 'First item', [defaultCols[1].id]: 'To Do' },
    })
    setActiveId(id)
    setEditingTableId(id)
  }

  // Global command: create table
  useEffect(
    () =>
      onCreateTable(() => {
        void addTable()
      }),
    []
  )

  const addRow = async () => {
    if (!activeId || !rows) return
    const sort = rows.length ? Math.max(...rows.map(r => r.sort)) + 1 : 1
    const row: TableRow = { id: `r_${Date.now()}`, tableId: activeId, sort, cells: {} }
    await db.tableRows.put(row)
  }

  const addColumn = async () => {
    if (!activeId || !columns) return
    const sort = columns.length ? Math.max(...columns.map(c => c.sort)) + 1 : 1
    const col: TableColumn = {
      id: `c_${Date.now()}`,
      tableId: activeId,
      name: 'New Column',
      type: 'text',
      sort,
    }
    await db.tableColumns.put(col)
    setEditingColumnId(col.id)
  }

  const deleteColumn = async (colId: string) => {
    if (!window.confirm('Delete this column?')) return
    await db.tableColumns.delete(colId)
    if (rows) {
      const nextRows = rows.map(r => {
        const { [colId]: _removed, ...rest } = r.cells
        return { ...r, cells: rest }
      })
      await db.tableRows.bulkPut(nextRows)
    }
  }

  const deleteRow = async (rowId: string) => {
    await db.tableRows.delete(rowId)
  }

  const deleteTable = async (tableId: string) => {
    if (!window.confirm('Delete this table and all its data?')) return
    // Delete all columns and rows
    const tableCols = await db.tableColumns.where('tableId').equals(tableId).toArray()
    const tableRows = await db.tableRows.where('tableId').equals(tableId).toArray()
    for (const col of tableCols) await db.tableColumns.delete(col.id)
    for (const row of tableRows) await db.tableRows.delete(row.id)
    await db.tableMetas.delete(tableId)
    
    // Select another table
    const remaining = tables?.filter(t => t.id !== tableId)
    if (remaining && remaining.length > 0) {
      setActiveId(remaining[0].id)
    } else {
      setActiveId(null)
    }
  }

  const activeTable = useMemo(() => tables?.find(t => t.id === activeId) ?? null, [activeId, tables])

  // Status colors for select columns
  const getSelectColor = (value: string) => {
    const val = value.toLowerCase()
    if (val.includes('done') || val.includes('complete')) return 'var(--color-success)'
    if (val.includes('progress') || val.includes('doing')) return 'var(--status-in-progress)'
    if (val.includes('blocked') || val.includes('stuck')) return 'var(--color-error)'
    if (val.includes('todo') || val.includes('to do')) return 'var(--status-todo)'
    return 'var(--brand-primary)'
  }

  // Empty state
  if (tables && tables.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: '50vh' }}>
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No tables yet</div>
        <div className="empty-state-description">
          Create your first table to start organizing your data in a structured way.
        </div>
        <button className="btn btn-primary" onClick={addTable}>
          + Create Table
        </button>
      </div>
    )
  }

  if (!tables) return null
  if (!activeTable) return null

  return (
    <div className="table-container" style={{ minHeight: '60vh' }}>
      {/* Table Tabs */}
      <div className="table-toolbar">
        <div className="table-tabs">
          {tables.map(t => (
            <div key={t.id} className="relative group">
              {editingTableId === t.id ? (
                <input
                  type="text"
                  className="input input-sm"
                  autoFocus
                  value={t.name}
                  onChange={async e => {
                    await db.tableMetas.put({ ...t, name: e.target.value })
                  }}
                  onBlur={() => setEditingTableId(null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setEditingTableId(null)
                    }
                  }}
                  style={{ width: 120 }}
                />
              ) : (
                <button
                  className={`table-tab ${t.id === activeId ? 'active' : ''}`}
                  onClick={() => setActiveId(t.id)}
                  onDoubleClick={() => setEditingTableId(t.id)}
                >
                  {t.name}
                </button>
              )}
            </div>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={addTable}
          >
            + New Table
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary btn-sm"
            onClick={addColumn}
          >
            + Column
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={addRow}
          >
            + Row
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => deleteTable(activeId!)}
            title="Delete table"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Table Content */}
      {activeTable && columns && rows && (
        <div className="table-wrapper" style={{ maxHeight: 'calc(60vh - 60px)', overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                {columns.map(c => (
                  <th key={c.id} style={{ minWidth: 150 }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span 
                          className="text-xs opacity-50"
                          title={c.type}
                        >
                          {columnTypeIcons[c.type] || 'Aa'}
                        </span>
                        {editingColumnId === c.id ? (
                          <input
                            type="text"
                            className="input input-sm flex-1"
                            autoFocus
                            value={c.name}
                            onChange={async e => {
                              await db.tableColumns.put({ ...c, name: e.target.value })
                            }}
                            onBlur={() => setEditingColumnId(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === 'Escape') {
                                setEditingColumnId(null)
                              }
                            }}
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:opacity-70"
                            onClick={() => setEditingColumnId(c.id)}
                          >
                            {c.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <select
                          className="text-xs opacity-50 bg-transparent border-none cursor-pointer"
                          value={c.type}
                          onChange={async e => {
                            await db.tableColumns.put({ ...c, type: e.target.value as TableColumn['type'] })
                          }}
                          title="Column type"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="select">Select</option>
                          <option value="date">Date</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="url">URL</option>
                        </select>
                        <button
                          className="btn btn-ghost btn-sm opacity-50 hover:opacity-100"
                          onClick={() => deleteColumn(c.id)}
                          style={{ padding: 2, width: 20, height: 20, fontSize: '0.7rem' }}
                          title="Delete column"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rowIndex) => (
                <tr key={r.id} className="group">
                  <td className="text-center" style={{ color: 'var(--text-tertiary)' }}>
                    {rowIndex + 1}
                  </td>
                  {columns.map(c => (
                    <td key={c.id}>
                      {c.type === 'select' ? (
                        <select
                          className="w-full bg-transparent border-none cursor-pointer text-sm"
                          value={(r.cells[c.id] as string) ?? ''}
                          onChange={async e => {
                            const cells = { ...r.cells, [c.id]: e.target.value }
                            await db.tableRows.put({ ...r, cells })
                          }}
                          style={{ 
                            color: r.cells[c.id] ? getSelectColor(r.cells[c.id] as string) : 'var(--text-tertiary)'
                          }}
                        >
                          <option value="">Select...</option>
                          {(c.options || ['To Do', 'In Progress', 'Done']).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : c.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={r.cells[c.id] === true || r.cells[c.id] === 'true'}
                          onChange={async e => {
                            const cells = { ...r.cells, [c.id]: e.target.checked }
                            await db.tableRows.put({ ...r, cells })
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: 'var(--brand-primary)' }}
                        />
                      ) : c.type === 'date' ? (
                        <input
                          type="date"
                          className="data-table-input"
                          value={(r.cells[c.id] as string) ?? ''}
                          onChange={async e => {
                            const cells = { ...r.cells, [c.id]: e.target.value }
                            await db.tableRows.put({ ...r, cells })
                          }}
                        />
                      ) : c.type === 'number' ? (
                        <input
                          type="number"
                          className="data-table-input"
                          value={(r.cells[c.id] as string) ?? ''}
                          onChange={async e => {
                            const cells = { ...r.cells, [c.id]: e.target.value }
                            await db.tableRows.put({ ...r, cells })
                          }}
                        />
                      ) : c.type === 'url' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="url"
                            className="data-table-input flex-1"
                            placeholder="https://..."
                            value={(r.cells[c.id] as string) ?? ''}
                            onChange={async e => {
                              const cells = { ...r.cells, [c.id]: e.target.value }
                              await db.tableRows.put({ ...r, cells })
                            }}
                          />
                          {r.cells[c.id] && (
                            <a
                              href={r.cells[c.id] as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-50 hover:opacity-100"
                              title="Open link"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <input
                          className="data-table-input"
                          value={(r.cells[c.id] as string) ?? ''}
                          onChange={async e => {
                            const cells = { ...r.cells, [c.id]: e.target.value }
                            await db.tableRows.put({ ...r, cells })
                          }}
                        />
                      )}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100"
                      onClick={() => deleteRow(r.id)}
                      style={{ padding: 2, width: 24, height: 24, fontSize: '0.75rem' }}
                      title="Delete row"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Add row button at bottom */}
          <button
            className="w-full p-3 text-left hover:bg-[var(--bg-hover)] transition-colors"
            style={{ 
              color: 'var(--text-tertiary)',
              borderTop: '1px solid var(--border-light)'
            }}
            onClick={addRow}
          >
            + New row
          </button>
        </div>
      )}
    </div>
  )
}
