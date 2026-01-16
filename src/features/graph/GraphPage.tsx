import { useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
} from '@reactflow/core'
import { Background } from '@reactflow/background'
import { Controls } from '@reactflow/controls'
import { db } from '../../lib/db'
import { extractOutboundTitles } from '../../lib/links'
import '@reactflow/core/dist/style.css'
import '@reactflow/controls/dist/style.css'

export default function GraphPage({ workspaceId }: { workspaceId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  
  // Simulation state
  const simulationRef = useRef<number>(0)
  const nodesRef = useRef<Node[]>([]) // Mutable ref for simulation
  const edgesRef = useRef<Edge[]>([])

  useEffect(() => {
    const load = async () => {
      const boards = await db.boards.where('workspaceId').equals(workspaceId).toArray()
      const allNodes: Node[] = []
      const allEdges: Edge[] = []
      
      // 1. Extract nodes and internal edges from all boards
      for (const board of boards) {
        try {
          const data = JSON.parse(board.data)
          if (data.nodes) {
            data.nodes.forEach((n: any) => {
              // prefix id with board id to avoid collisions
              const id = `${board.id}__${n.id}`
              allNodes.push({
                id,
                position: { x: Math.random() * 1000, y: Math.random() * 1000 },
                data: { 
                  label: n.data?.label || 'Untitled', 
                  boardId: board.id,
                  originalId: n.id,
                  color: n.data?.color || '#e2e8f0' 
                },
                type: 'default', // use default node for graph view
                style: { 
                    width: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    backgroundColor: n.data?.color || '#e2e8f0',
                    border: '1px solid #94a3b8',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    color: 'transparent', // hide text by default to keep it clean, show on hover?
                }
              })
            })
          }
          if (data.edges) {
            data.edges.forEach((e: any) => {
              allEdges.push({
                id: `${board.id}__${e.id}`,
                source: `${board.id}__${e.source}`,
                target: `${board.id}__${e.target}`,
                style: { stroke: '#cbd5e1', strokeWidth: 1 },
                type: 'default'
              })
            })
          }
        } catch (e) {
          console.error('Failed to parse board', board.id)
        }
      }

      // 2. Generate cross-links based on WikiLinks ([[Title]])
      // Map title -> list of node IDs
      const titleMap = new Map<string, string[]>()
      allNodes.forEach(n => {
        const label = (n.data.label as string).toLowerCase().trim()
        if (!titleMap.has(label)) titleMap.set(label, [])
        titleMap.get(label)!.push(n.id)
      })

      allNodes.forEach(sourceNode => {
        const label = sourceNode.data.label as string
        const outbound = extractOutboundTitles(label)
        outbound.forEach(targetTitle => {
          const targetIds = titleMap.get(targetTitle.toLowerCase().trim())
          if (targetIds) {
            targetIds.forEach(targetId => {
              if (targetId !== sourceNode.id) {
                allEdges.push({
                  id: `link_${sourceNode.id}_${targetId}`,
                  source: sourceNode.id,
                  target: targetId,
                  animated: true,
                  style: { stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '5 5' },
                })
              }
            })
          }
        })
      })

      nodesRef.current = allNodes
      edgesRef.current = allEdges
      setNodes(allNodes)
      setEdges(allEdges)
      setLoading(false)
    }
    load()
  }, [workspaceId, setNodes, setEdges])

  // Simple Force Simulation
  useEffect(() => {
    if (loading) return

    const nodes = nodesRef.current
    const edges = edgesRef.current
    
    const simulate = () => {
      const k = 200 // ideal length
      const repulsion = 5000
      
      // Reset forces
      const forces = new Map<string, { fx: number, fy: number }>()
      nodes.forEach(n => forces.set(n.id, { fx: 0, fy: 0 }))

      // Repulsion (N^2 - expensive but fine for < 200 nodes)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const u = nodes[i]
          const v = nodes[j]
          const dx = v.position.x - u.position.x
          const dy = v.position.y - u.position.y
          const distSq = dx * dx + dy * dy || 1
          const dist = Math.sqrt(distSq)
          const f = repulsion / distSq
          
          const fx = (dx / dist) * f
          const fy = (dy / dist) * f
          
          forces.get(u.id)!.fx -= fx
          forces.get(u.id)!.fy -= fy
          forces.get(v.id)!.fx += fx
          forces.get(v.id)!.fy += fy
        }
      }

      // Spring forces
      edges.forEach(e => {
        const u = nodes.find(n => n.id === e.source)
        const v = nodes.find(n => n.id === e.target)
        if (!u || !v) return
        
        const dx = v.position.x - u.position.x
        const dy = v.position.y - u.position.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - k) * 0.05 // spring constant

        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        forces.get(u.id)!.fx += fx
        forces.get(u.id)!.fy += fy
        forces.get(v.id)!.fx -= fx
        forces.get(v.id)!.fy -= fy
      })

      // Center gravity
      nodes.forEach(n => {
        const f = forces.get(n.id)!
        f.fx -= n.position.x * 0.01
        f.fy -= n.position.y * 0.01
      })

      // Apply
      let maxDisp = 0
      nodes.forEach(n => {
         const f = forces.get(n.id)!
         // limit velocity
         const vx = Math.max(-5, Math.min(5, f.fx))
         const vy = Math.max(-5, Math.min(5, f.fy))
         n.position.x += vx
         n.position.y += vy
         maxDisp = Math.max(maxDisp, Math.abs(vx), Math.abs(vy))
      })

      setNodes([...nodes]) // trigger render
      
      if (maxDisp > 0.1) {
        simulationRef.current = requestAnimationFrame(simulate)
      }
    }

    simulationRef.current = requestAnimationFrame(simulate)

    return () => cancelAnimationFrame(simulationRef.current)
  }, [loading, setNodes])

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-neutral-900">
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            minZoom={0.1}
        >
            <Background color="#94a3b8" gap={20} size={1} />
            <Controls />
            <Panel position="top-left" className="bg-white/80 p-2 rounded shadow backdrop-blur border border-slate-200">
                <div className="text-sm font-medium">Global Graph</div>
                <div className="text-xs text-slate-500">{nodes.length} nodes • {edges.length} links</div>
            </Panel>
        </ReactFlow>
    </div>
  )
}

