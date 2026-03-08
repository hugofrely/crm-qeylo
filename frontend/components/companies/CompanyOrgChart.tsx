"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { fetchCompanyOrgChart } from "@/services/companies"
import type { OrgChartData } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { RelationshipDialog } from "./RelationshipDialog"
import { useTranslations } from "next-intl"

// Custom node component for org chart
function ContactNode({ data }: { data: { name: string; job_title: string; email: string } }) {
  return (
    <div className="bg-background border border-border rounded-lg px-4 py-3 shadow-sm min-w-[180px]">
      <div className="font-medium text-sm">{data.name}</div>
      {data.job_title && (
        <div className="text-xs text-muted-foreground mt-0.5">{data.job_title}</div>
      )}
      {data.email && (
        <div className="text-xs text-muted-foreground mt-0.5">{data.email}</div>
      )}
    </div>
  )
}

const nodeTypes = { contact: ContactNode }

interface Props {
  companyId: string
}

export function CompanyOrgChart({ companyId }: Props) {
  const t = useTranslations('companies')
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data: OrgChartData = await fetchCompanyOrgChart(companyId)

      // Auto-layout nodes in a grid
      const flowNodes: Node[] = data.nodes.map((n, i) => ({
        id: n.id,
        type: "contact",
        position: { x: (i % 3) * 250, y: Math.floor(i / 3) * 120 },
        data: { name: n.name, job_title: n.job_title, email: n.email },
      }))

      const flowEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10 },
      }))

      setNodes(flowNodes)
      setEdges(flowEdges)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('orgChart.noContacts')}</p>
        <p className="text-sm mt-1">{t('orgChart.linkContactsHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t('orgChart.addRelationship')}
        </Button>
      </div>
      <div className="h-[500px] border rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <RelationshipDialog
        companyId={companyId}
        open={showDialog}
        onOpenChange={setShowDialog}
        onCreated={load}
      />
    </div>
  )
}
