"use client"

import { useCallback, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Zap, HelpCircle, Cog, Clock, Trash2 } from "lucide-react"
import TriggerNode from "./nodes/TriggerNode"
import ConditionNode from "./nodes/ConditionNode"
import ActionNode from "./nodes/ActionNode"
import DelayNode from "./nodes/DelayNode"
import NodeConfigPanel from "./NodeConfigPanel"

interface WorkflowBuilderProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  onChange: (nodes: Node[], edges: Edge[]) => void
}

const PALETTE_ITEMS = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-blue-500" },
  { type: "condition", label: "Condition", icon: HelpCircle, color: "text-amber-500" },
  { type: "action", label: "Action", icon: Cog, color: "text-emerald-500" },
  { type: "delay", label: "Délai", icon: Clock, color: "text-gray-500" },
]

let nodeIdCounter = 0
function generateNodeId() {
  return `node_${Date.now()}_${++nodeIdCounter}`
}

export default function WorkflowBuilder({ initialNodes, initialEdges, onChange }: WorkflowBuilderProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      condition: ConditionNode,
      action: ActionNode,
      delay: DelayNode,
    }),
    []
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: "var(--border)" },
        },
        edges
      )
      setEdges(newEdges)
      onChange(nodes, newEdges)
    },
    [edges, nodes, setEdges, onChange]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)

      const removedIds = new Set(
        changes.filter((c) => c.type === "remove").map((c) => c.id)
      )

      setNodes((currentNodes) => {
        const finalNodes = removedIds.size > 0
          ? currentNodes.filter((n) => !removedIds.has(n.id))
          : currentNodes

        setEdges((currentEdges) => {
          const finalEdges = removedIds.size > 0
            ? currentEdges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target))
            : currentEdges
          onChange(finalNodes, finalEdges)
          return currentEdges
        })
        return currentNodes
      })
    },
    [onNodesChange, setNodes, setEdges, onChange]
  )

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)

      const removedIds = new Set(
        changes.filter((c) => c.type === "remove").map((c) => c.id)
      )

      setNodes((currentNodes) => {
        setEdges((currentEdges) => {
          const finalEdges = removedIds.size > 0
            ? currentEdges.filter((e) => !removedIds.has(e.id))
            : currentEdges
          onChange(currentNodes, finalEdges)
          return currentEdges
        })
        return currentNodes
      })
    },
    [onEdgesChange, setNodes, setEdges, onChange]
  )

  const addNode = useCallback(
    (type: string) => {
      const id = generateNodeId()
      const newNode: Node = {
        id,
        type,
        position: { x: 250, y: (nodes.length + 1) * 150 },
        data: {
          node_type: type,
          node_subtype: "",
          config: type === "delay" ? { duration_seconds: 3600 } : {},
        },
      }
      const newNodes = [...nodes, newNode]
      setNodes(newNodes)
      onChange(newNodes, edges)
      setSelectedNodeId(id)
    },
    [nodes, edges, setNodes, onChange]
  )

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      if (data._delete) {
        const newNodes = nodes.filter((n) => n.id !== nodeId)
        const newEdges = edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
        setNodes(newNodes)
        setEdges(newEdges)
        onChange(newNodes, newEdges)
        setSelectedNodeId(null)
        return
      }
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, data } : n
      )
      setNodes(newNodes)
      onChange(newNodes, edges)
    },
    [nodes, edges, setNodes, setEdges, onChange]
  )

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode="Delete"
          className="bg-secondary/10"
        >
          <Background gap={15} size={1} />
          <Controls className="!bg-card !border-border !shadow-sm" />
          <MiniMap
            className="!bg-card !border-border"
            maskColor="rgb(0 0 0 / 0.1)"
            nodeColor={(node) => {
              switch (node.type) {
                case "trigger": return "#3b82f6"
                case "condition": return "#f59e0b"
                case "action": return "#10b981"
                case "delay": return "#6b7280"
                default: return "#6b7280"
              }
            }}
          />

          {/* Floating palette */}
          <Panel position="top-left" className="!m-3">
            <div className="bg-card border border-border rounded-lg shadow-sm p-2 space-y-1">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-2 pb-1">
                Ajouter
              </div>
              {PALETTE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addNode(item.type)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs font-medium hover:bg-secondary/50 transition-colors"
                >
                  <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={handleNodeUpdate}
        />
      )}
    </div>
  )
}
