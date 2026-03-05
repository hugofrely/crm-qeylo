"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Save,
  Loader2,
  Zap,
  ZapOff,
  History,
  PenLine,
} from "lucide-react"
import { toast } from "sonner"
import type { Node, Edge } from "@xyflow/react"
import dynamic from "next/dynamic"
import ExecutionHistory from "@/components/workflows/ExecutionHistory"

const WorkflowBuilder = dynamic(
  () => import("@/components/workflows/WorkflowBuilder"),
  { ssr: false }
)

interface WorkflowData {
  id: string
  name: string
  description: string
  is_active: boolean
  nodes: Array<{
    id: string
    node_type: string
    node_subtype: string
    config: Record<string, unknown>
    position_x: number
    position_y: number
  }>
  edges: Array<{
    id: string
    source_node: string
    target_node: string
    source_handle: string
    label: string
  }>
}

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const workflowId = params.id as string

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [activeTab, setActiveTab] = useState<"builder" | "history">(
    searchParams.get("tab") === "history" ? "history" : "builder"
  )

  // Store current graph state for saving
  const graphRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<WorkflowData>(`/workflows/${workflowId}/`)
        setWorkflow(data)
        setName(data.name)
      } catch {
        toast.error("Workflow introuvable")
        router.push("/workflows")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [workflowId, router])

  const handleGraphChange = useCallback((nodes: Node[], edges: Edge[]) => {
    graphRef.current = { nodes, edges }
  }, [])

  const handleSave = async () => {
    if (!workflow) return
    setSaving(true)

    const { nodes, edges } = graphRef.current

    // Map nodes to API format
    const apiNodes = nodes.map((n) => ({
      id: n.id,
      node_type: (n.data as Record<string, unknown>).node_type as string,
      node_subtype: (n.data as Record<string, unknown>).node_subtype as string || "",
      config: (n.data as Record<string, unknown>).config || {},
      position_x: n.position.x,
      position_y: n.position.y,
    }))

    const apiEdges = edges.map((e) => ({
      source_node: e.source,
      target_node: e.target,
      source_handle: e.sourceHandle || "",
      label: "",
    }))

    try {
      await apiFetch(`/workflows/${workflowId}/`, {
        method: "PUT",
        json: {
          name,
          description: workflow.description,
          is_active: workflow.is_active,
          nodes: apiNodes,
          edges: apiEdges,
        },
      })
      toast.success("Workflow sauvegardé")
    } catch {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    if (!workflow) return
    try {
      const data = await apiFetch<{ is_active: boolean }>(
        `/workflows/${workflowId}/toggle/`,
        { method: "POST" }
      )
      setWorkflow({ ...workflow, is_active: data.is_active })
      toast.success(data.is_active ? "Workflow activé" : "Workflow désactivé")
    } catch {
      toast.error("Erreur")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workflow) return null

  // Convert API data to React Flow format
  const initialNodes: Node[] = workflow.nodes.map((n) => ({
    id: n.id,
    type: n.node_type,
    position: { x: n.position_x, y: n.position_y },
    data: {
      node_type: n.node_type,
      node_subtype: n.node_subtype,
      config: n.config,
    },
  }))

  const initialEdges: Edge[] = workflow.edges.map((e) => ({
    id: e.id,
    source: e.source_node,
    target: e.target_node,
    sourceHandle: e.source_handle || undefined,
    animated: true,
    style: { stroke: "var(--border)" },
  }))

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/workflows")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Name */}
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="h-8 max-w-[300px] text-sm font-medium"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
          >
            {name}
            <PenLine className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-1 ml-4 bg-secondary/30 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("builder")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "builder"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Builder
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
              activeTab === "history"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3 w-3" />
            Historique
          </button>
        </div>

        <div className="flex-1" />

        {/* Toggle */}
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors"
          title={workflow.is_active ? "Désactiver" : "Activer"}
        >
          {workflow.is_active ? (
            <>
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-primary">Actif</span>
            </>
          ) : (
            <>
              <ZapOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inactif</span>
            </>
          )}
        </button>

        {/* Save */}
        {activeTab === "builder" && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Sauvegarder
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "builder" ? (
          <WorkflowBuilder
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onChange={handleGraphChange}
          />
        ) : (
          <div className="p-6 max-w-3xl mx-auto overflow-y-auto h-full">
            <ExecutionHistory workflowId={workflowId} />
          </div>
        )}
      </div>
    </div>
  )
}
