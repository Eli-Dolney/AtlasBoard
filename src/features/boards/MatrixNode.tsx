import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@reactflow/core'
import { NodeToolbar } from '@reactflow/node-toolbar'

type MatrixCell = {
  id: string
  content: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
}

type MatrixNodeData = {
  title: string
  rows: string[]
  columns: string[]
  cells: MatrixCell[][]
}

export default function MatrixNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow()
  const [matrixData, setMatrixData] = useState<MatrixNodeData>(
    data?.matrixData ?? {
      title: 'Decision Matrix',
      rows: ['Option A', 'Option B', 'Option C'],
      columns: ['Cost', 'Quality', 'Time', 'Risk'],
      cells: [
        [
          { id: '1', content: 'Low cost, good value', priority: 'high' },
          { id: '2', content: 'Excellent quality', priority: 'high' },
          { id: '3', content: '6-8 weeks', priority: 'medium' },
          { id: '4', content: 'Minimal risk', priority: 'high' },
        ],
        [
          { id: '5', content: 'Moderate cost', priority: 'medium' },
          { id: '6', content: 'Good quality', priority: 'medium' },
          { id: '7', content: '4-6 weeks', priority: 'high' },
          { id: '8', content: 'Low risk', priority: 'high' },
        ],
        [
          { id: '9', content: 'Higher cost', priority: 'low' },
          { id: '10', content: 'Premium quality', priority: 'high' },
          { id: '11', content: '8-10 weeks', priority: 'low' },
          { id: '12', content: 'Higher risk', priority: 'low' },
        ],
      ],
    }
  )

  useEffect(() => setMatrixData(data?.matrixData ?? ({} as MatrixNodeData)), [data?.matrixData])

  const commit = (next: MatrixNodeData) => {
    setMatrixData(next)
    setNodes(nodes =>
      nodes.map(n => (n.id === id ? { ...n, data: { ...n.data, matrixData: next } } : n))
    )
  }

  const updateCell = (rowIndex: number, colIndex: number, updates: Partial<MatrixCell>) => {
    const newCells = [...matrixData.cells]
    newCells[rowIndex] = [...newCells[rowIndex]]
    newCells[rowIndex][colIndex] = { ...newCells[rowIndex][colIndex], ...updates }
    commit({ ...matrixData, cells: newCells })
  }

  const addRow = () => {
    const newRow = matrixData.columns.map((_, colIndex) => ({
      id: `cell_${Date.now()}_${colIndex}`,
      content: 'New item',
    }))
    commit({
      ...matrixData,
      rows: [...matrixData.rows, `Option ${String.fromCharCode(65 + matrixData.rows.length)}`],
      cells: [...matrixData.cells, newRow],
    })
  }

  const addColumn = () => {
    const newColumn = matrixData.rows.map((_, rowIndex) => ({
      id: `cell_${rowIndex}_${Date.now()}`,
      content: 'New criteria',
    }))
    commit({
      ...matrixData,
      columns: [...matrixData.columns, `Criteria ${matrixData.columns.length + 1}`],
      cells: matrixData.cells.map((row, rowIndex) => [...row, newColumn[rowIndex]]),
    })
  }

  return (
    <div
      className={`relative min-w-[600px] max-w-[800px] rounded-md border border-slate-300 bg-white p-4 shadow ${selected ? 'ring-2 ring-blue-400' : ''}`}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} className="flex gap-2">
        <button
          className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
          onPointerDown={e => e.stopPropagation()}
          onClick={addRow}
        >
          + Row
        </button>
        <button
          className="rounded bg-white/90 px-2 py-1 text-neutral-900 shadow"
          onPointerDown={e => e.stopPropagation()}
          onClick={addColumn}
        >
          + Column
        </button>
      </NodeToolbar>

      <div className="mb-4">
        <input
          type="text"
          className="w-full rounded border-0 bg-transparent text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={matrixData.title}
          onChange={e => commit({ ...matrixData, title: e.target.value })}
          placeholder="Matrix Title"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="min-w-[150px] border border-slate-300 bg-slate-100 p-2 text-left font-medium text-slate-700">
                Options
              </th>
              {matrixData.columns.map((column, colIndex) => (
                <th
                  key={colIndex}
                  className="min-w-[120px] border border-slate-300 bg-slate-100 p-2 text-center font-medium text-slate-700"
                >
                  <input
                    type="text"
                    className="w-full rounded border-0 bg-transparent text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={column}
                    onChange={e => {
                      const newColumns = [...matrixData.columns]
                      newColumns[colIndex] = e.target.value
                      commit({ ...matrixData, columns: newColumns })
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixData.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-slate-300 bg-slate-50 p-2 font-medium text-slate-700">
                  <input
                    type="text"
                    className="w-full rounded border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={matrixData.rows[rowIndex]}
                    onChange={e => {
                      const newRows = [...matrixData.rows]
                      newRows[rowIndex] = e.target.value
                      commit({ ...matrixData, rows: newRows })
                    }}
                  />
                </td>
                {row.map((cell, colIndex) => (
                  <td key={cell.id} className="border border-slate-300 p-2">
                    <div className="relative">
                      <textarea
                        className="min-h-[60px] w-full resize-none rounded border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={cell.content}
                        onChange={e => updateCell(rowIndex, colIndex, { content: e.target.value })}
                        placeholder="Enter evaluation..."
                      />
                      <select
                        className="absolute right-1 top-1 rounded border px-1 py-0.5 text-xs"
                        value={cell.priority || 'medium'}
                        onChange={e =>
                          updateCell(rowIndex, colIndex, {
                            priority: e.target.value as MatrixCell['priority'],
                          })
                        }
                      >
                        <option value="low">🔴 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟢 High</option>
                      </select>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary section */}
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-2 text-sm font-medium text-slate-700">Priority Summary:</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-green-600">High Priority</div>
            <div className="text-slate-600">
              {matrixData.cells.flat().filter(cell => cell.priority === 'high').length} items
            </div>
          </div>
          <div>
            <div className="font-medium text-yellow-600">Medium Priority</div>
            <div className="text-slate-600">
              {matrixData.cells.flat().filter(cell => cell.priority === 'medium').length} items
            </div>
          </div>
          <div>
            <div className="font-medium text-red-600">Low Priority</div>
            <div className="text-slate-600">
              {matrixData.cells.flat().filter(cell => cell.priority === 'low').length} items
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
