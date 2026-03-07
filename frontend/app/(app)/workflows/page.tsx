"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchWorkflows as fetchWorkflowsApi, fetchWorkflowTemplates as fetchTemplatesApi, createWorkflow, toggleWorkflow, deleteWorkflow } from "@/services/workflows"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
import {
  Plus,
  Loader2,
  Zap,
  ZapOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  History,
  LayoutTemplate,
} from "lucide-react"
import { toast } from "sonner"
import posthog from "posthog-js"
import type { Workflow, WorkflowTemplate } from "@/types"

const TRIGGER_LABELS: Record<string, string> = {
  "deal.stage_changed": "Deal change de stage",
  "deal.created": "Deal créé",
  "deal.won": "Deal gagné",
  "deal.lost": "Deal perdu",
  "contact.created": "Contact créé",
  "contact.updated": "Contact mis à jour",
  "contact.lead_score_changed": "Score changé",
  "task.created": "Tâche créée",
  "task.completed": "Tâche complétée",
  "task.overdue": "Tâche en retard",
  "email.sent": "Email envoyé",
  "note.added": "Note ajoutée",
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await fetchWorkflowsApi()
      setWorkflows(data)
    } catch {
      console.error("Failed to fetch workflows")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await fetchTemplatesApi()
      setTemplates(data)
    } catch {
      console.error("Failed to fetch templates")
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
    fetchTemplates()
  }, [fetchWorkflows, fetchTemplates])

  const handleCreateBlank = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const data = await createWorkflow({
        name: newName.trim(),
        nodes: [],
        edges: [],
      })
      posthog.capture("workflow_created", { from_template: false })
      setCreateDialogOpen(false)
      setNewName("")
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      const data = await createWorkflow({
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
      })
      posthog.capture("workflow_created", { from_template: true, template: template.name })
      setTemplateDialogOpen(false)
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la création")
    }
  }

  const handleToggle = async (workflow: Workflow) => {
    try {
      const data = await toggleWorkflow(workflow.id)
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: data.is_active } : w
        )
      )
      posthog.capture("workflow_toggled", { is_active: data.is_active })
      toast.success(data.is_active ? "Workflow activé" : "Workflow désactivé")
    } catch {
      toast.error("Erreur")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow(id)
      posthog.capture("workflow_deleted")
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success("Workflow supprimé")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const columns: DataTableColumn<Workflow>[] = [
    {
      key: "status",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      render: (w) => (
        <button onClick={(e) => { e.stopPropagation(); handleToggle(w) }} title={w.is_active ? "Désactiver" : "Activer"}>
          {w.is_active ? <Zap className="h-5 w-5 text-primary" /> : <ZapOff className="h-5 w-5 text-muted-foreground/40" />}
        </button>
      ),
    },
    {
      key: "name",
      header: "Nom",
      render: (w) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{w.name}</span>
            {w.is_active && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Actif</span>
            )}
          </div>
          {w.trigger_type && (
            <span className="text-xs text-muted-foreground">{TRIGGER_LABELS[w.trigger_type] || w.trigger_type}</span>
          )}
        </div>
      ),
    },
    {
      key: "executions",
      header: "Executions",
      headerClassName: "hidden md:table-cell text-right",
      className: "hidden md:table-cell text-right text-sm text-muted-foreground tabular-nums",
      render: (w) => <>{w.execution_count}</>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      render: (w) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${w.id}`) }}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${w.id}?tab=history`) }}>
              <History className="h-4 w-4 mr-2" /> Historique
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(w.id) }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader
        title="Workflows"
        subtitle="Automatisez vos processus CRM avec des workflows visuels"
      >
        <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={workflows}
        loading={loading}
        emptyIcon={<Zap className="h-10 w-10 text-muted-foreground/30 mb-2" />}
        emptyMessage="Aucun workflow. Créez votre premier workflow ou utilisez un template."
        onRowClick={(w) => router.push(`/workflows/${w.id}`)}
        rowKey={(w) => w.id}
      />

      {/* Create blank dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nom
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Suivi de négociation"
                className="h-11 bg-secondary/30 border-border/60"
                onKeyDown={(e) => e.key === "Enter" && handleCreateBlank()}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreateBlank}
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Templates de workflows</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 font-[family-name:var(--font-body)] max-h-[60vh] overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateFromTemplate(template)}
                className="w-full text-left rounded-lg border border-border p-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {template.description}
                </p>
                <span className="text-[10px] text-muted-foreground/60 ml-6 mt-1 block">
                  {TRIGGER_LABELS[template.trigger_type] || template.trigger_type}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
