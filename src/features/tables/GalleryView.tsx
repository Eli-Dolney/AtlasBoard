import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type TableMeta, type TableColumn, type TableRow } from '../../lib/db'

interface GalleryViewProps {
  workspaceId: string
  tableId?: string
  onRowClick?: (rowId: string) => void
}

const CARD_COLORS = [
  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)',
]

export default function GalleryView({ workspaceId, tableId, onRowClick }: GalleryViewProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tableId || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayField, setDisplayField] = useState<string | null>(null)
  const [coverField, setCoverField] = useState<string | null>(null)

  const tables = useLiveQuery(
    () => db.tableMetas.where('workspaceId').equals(workspaceId).toArray(),
    [workspaceId],
    []
  )

  const columns = useLiveQuery(
    () => selectedTableId 
      ? db.tableColumns.where('tableId').equals(selectedTableId).sortBy('sort')
      : Promise.resolve([]),
    [selectedTableId],
    []
  )

  const rows = useLiveQuery(
    () => selectedTableId
      ? db.tableRows.where('tableId').equals(selectedTableId).sortBy('sort')
      : Promise.resolve([]),
    [selectedTableId],
    []
  )

  // Auto-select first table
  useMemo(() => {
    if (!selectedTableId && tables.length > 0) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  // Auto-select display field (first text column)
  useMemo(() => {
    if (!displayField && columns.length > 0) {
      const textCol = columns.find(c => c.type === 'text')
      if (textCol) setDisplayField(textCol.id)
    }
  }, [columns, displayField])

  // Filter rows by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    
    const query = searchQuery.toLowerCase()
    return rows.filter(row => {
      return Object.values(row.cells).some(cell => 
        String(cell).toLowerCase().includes(query)
      )
    })
  }, [rows, searchQuery])

  const getCardTitle = (row: TableRow) => {
    if (displayField && row.cells[displayField]) {
      return String(row.cells[displayField])
    }
    // Fallback to first cell with value
    for (const col of columns) {
      if (row.cells[col.id]) {
        return String(row.cells[col.id])
      }
    }
    return 'Untitled'
  }

  const getCardCover = (row: TableRow): string | null => {
    if (coverField && row.cells[coverField]) {
      const value = String(row.cells[coverField])
      if (value.startsWith('http')) return value
    }
    // Check for URL columns
    const urlCol = columns.find(c => c.type === 'url')
    if (urlCol && row.cells[urlCol.id]) {
      const value = String(row.cells[urlCol.id])
      if (value.match(/\.(jpg|jpeg|png|gif|webp)/i)) return value
    }
    return null
  }

  const getCardColor = (index: number) => {
    return CARD_COLORS[index % CARD_COLORS.length]
  }

  const selectedTable = tables.find(t => t.id === selectedTableId)

  if (tables.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="gallery-empty-icon">🖼️</div>
        <h3>No tables yet</h3>
        <p>Create a table first to view it in gallery mode</p>
      </div>
    )
  }

  return (
    <div className="gallery-view">
      {/* Header */}
      <div className="gallery-header">
        <div className="gallery-table-select">
          <label>Table:</label>
          <select
            className="input"
            value={selectedTableId || ''}
            onChange={e => setSelectedTableId(e.target.value)}
          >
            {tables.map(table => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
          </select>
        </div>

        <div className="gallery-search">
          <input
            type="text"
            className="input"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="gallery-display-select">
          <label>Display:</label>
          <select
            className="input"
            value={displayField || ''}
            onChange={e => setDisplayField(e.target.value)}
          >
            {columns.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="gallery-grid">
        {filteredRows.length === 0 ? (
          <div className="gallery-no-results">
            <p>No items found{searchQuery && ` for "${searchQuery}"`}</p>
          </div>
        ) : (
          filteredRows.map((row, index) => {
            const title = getCardTitle(row)
            const cover = getCardCover(row)
            
            return (
              <div
                key={row.id}
                className="gallery-card"
                onClick={() => onRowClick?.(row.id)}
              >
                {/* Card Cover */}
                <div 
                  className="gallery-card-cover"
                  style={{ 
                    background: cover ? `url(${cover}) center/cover` : getCardColor(index)
                  }}
                >
                  {!cover && (
                    <span className="gallery-card-initial">
                      {title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="gallery-card-content">
                  <h3 className="gallery-card-title">{title}</h3>
                  
                  {/* Show other fields */}
                  <div className="gallery-card-fields">
                    {columns
                      .filter(col => col.id !== displayField)
                      .slice(0, 3)
                      .map(col => {
                        const value = row.cells[col.id]
                        if (!value) return null
                        
                        return (
                          <div key={col.id} className="gallery-card-field">
                            <span className="gallery-card-field-label">{col.name}</span>
                            <span className="gallery-card-field-value">
                              {col.type === 'checkbox' 
                                ? (value ? '✓' : '✗')
                                : col.type === 'date'
                                ? new Date(value as string).toLocaleDateString()
                                : String(value)
                              }
                            </span>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Stats */}
      <div className="gallery-stats">
        <span>{filteredRows.length} items</span>
        {searchQuery && rows.length !== filteredRows.length && (
          <span className="gallery-stats-filtered">
            (filtered from {rows.length})
          </span>
        )}
      </div>
    </div>
  )
}
