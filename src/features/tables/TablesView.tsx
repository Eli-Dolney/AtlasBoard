import React, { useEffect, useMemo, useState } from 'react'
import { db, type TableColumn, type TableMeta, type TableRow } from '../../lib/db'

export default function TablesView({ workspaceId }: { workspaceId: string }) {
  const [tables, setTables] = useState<TableMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [rows, setRows] = useState<TableRow[]>([])

  useEffect(() => {
    void (async () => {
      const ts = await db.tableMetas.where('workspaceId').equals(workspaceId).sortBy('createdAt')
      setTables(ts)
      setActiveId(ts[0]?.id ?? null)
    })()
  }, [workspaceId])

  useEffect(() => {
    if (!activeId) return
    void (async () => {
      const cs = await db.tableColumns.where('tableId').equals(activeId).sortBy('sort')
      const rs = await db.tableRows.where('tableId').equals(activeId).sortBy('sort')
      setColumns(cs)
      setRows(rs)
    })()
  }, [activeId])

  const addTable = async () => {
    const id = `tbl_${Date.now()}`
    const meta: TableMeta = { id, workspaceId, name: 'New Table', createdAt: Date.now() }
    await db.tableMetas.put(meta)
    const defaultCols: TableColumn[] = [
      { id: `c_${Date.now()}_1`, tableId: id, name: 'Name', type: 'text', sort: 1 },
      { id: `c_${Date.now()}_2`, tableId: id, name: 'Status', type: 'select', options: ['Todo', 'Doing', 'Done'], sort: 2 },
    ]
    await db.tableColumns.bulkPut(defaultCols)
    await db.tableRows.put({ id: `r_${Date.now()}`, tableId: id, sort: 1, cells: { [defaultCols[0].id]: 'First row', [defaultCols[1].id]: 'Todo' } })
    setTables((cur) => cur.concat(meta))
    setActiveId(id)
  }

  const addRow = async () => {
    if (!activeId) return
    const sort = rows.length ? Math.max(...rows.map((r) => r.sort)) + 1 : 1
    const row: TableRow = { id: `r_${Date.now()}`, tableId: activeId, sort, cells: {} }
    await db.tableRows.put(row)
    setRows((cur) => cur.concat(row))
  }

  const addColumn = async () => {
    if (!activeId) return
    const sort = columns.length ? Math.max(...columns.map((c) => c.sort)) + 1 : 1
    const col: TableColumn = { id: `c_${Date.now()}`, tableId: activeId, name: 'Column', type: 'text', sort }
    await db.tableColumns.put(col)
    setColumns((cur) => cur.concat(col))
  }

  const deleteColumn = async (colId: string) => {
    await db.tableColumns.delete(colId)
    setColumns((cur) => cur.filter((c) => c.id !== colId))
    // Remove cell values for this column in all rows
    const nextRows = rows.map((r) => {
      const { [colId]: _removed, ...rest } = r.cells
      return { ...r, cells: rest }
    })
    await db.tableRows.bulkPut(nextRows)
    setRows(nextRows)
  }

  const deleteRow = async (rowId: string) => {
    await db.tableRows.delete(rowId)
    setRows((cur) => cur.filter((r) => r.id !== rowId))
  }

  const activeTable = useMemo(() => tables.find((t) => t.id === activeId) ?? null, [activeId, tables])

  // If there are no tables, show an empty state with CTA
  if (!activeTable) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-3 border-t border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-neutral-800">
        <div>No tables yet.</div>
        <button className="rounded bg-neutral-200 px-3 py-1 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100" onClick={() => void addTable()}>
          + Create your first table
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-[40vh] flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-2 dark:border-neutral-800">
        {tables.map((t) => (
          <button key={t.id} className={`rounded px-3 py-1 text-sm ${t.id === activeId ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-neutral-100 dark:bg-neutral-800'}`} onClick={() => setActiveId(t.id)}>
            {t.name}
          </button>
        ))}
        <button className="rounded bg-neutral-200 px-3 py-1 text-sm dark:bg-neutral-700" onClick={addTable}>+ New table</button>
      </div>

      {activeTable && (
        <div className="flex-1 overflow-auto p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              className="rounded border bg-white px-2 py-1 text-sm text-neutral-900"
              value={activeTable.name}
              onChange={async (e) => {
                const next = { ...activeTable, name: e.target.value }
                await db.tableMetas.put(next)
                setTables((cur) => cur.map((x) => (x.id === next.id ? next : x)))
              }}
            />
            <button className="rounded bg-neutral-200 px-2 py-1 text-sm dark:bg-neutral-700" onClick={addColumn}>+ Column</button>
            <button className="rounded bg-neutral-200 px-2 py-1 text-sm dark:bg-neutral-700" onClick={addRow}>+ Row</button>
          </div>
          <div className="w-max min-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.id} className="border border-neutral-200 bg-neutral-50 px-3 py-1 text-left text-xs font-medium dark:border-neutral-800 dark:bg-neutral-900">
                      <input
                        className="w-full rounded border bg-white px-1 py-0.5 text-xs text-neutral-900"
                        value={c.name}
                        onChange={async (e) => {
                          const next = { ...c, name: e.target.value }
                          await db.tableColumns.put(next)
                          setColumns((cur) => cur.map((x) => (x.id === c.id ? next : x)))
                        }}
                      />
                      <div className="mt-1 text-right">
                        <button className="rounded bg-rose-600 px-2 py-0.5 text-[10px] text-white" onClick={() => void deleteColumn(c.id)}>Delete</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {columns.map((c) => (
                      <td key={c.id} className="border border-neutral-200 px-3 py-1 text-sm dark:border-neutral-800">
                        <input
                          className="w-full bg-white text-neutral-900 outline-none"
                          value={(r.cells[c.id] as string) ?? ''}
                          onChange={async (e) => {
                            const cells = { ...r.cells, [c.id]: e.target.value }
                            const next = { ...r, cells }
                            await db.tableRows.put(next)
                            setRows((cur) => cur.map((x) => (x.id === r.id ? next : x)))
                          }}
                        />
                      </td>
                    ))}
                    <td className="border border-neutral-200 px-3 py-1 text-right dark:border-neutral-800">
                      <button className="rounded bg-rose-600 px-2 py-0.5 text-xs text-white" onClick={() => void deleteRow(r.id)}>Delete row</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


