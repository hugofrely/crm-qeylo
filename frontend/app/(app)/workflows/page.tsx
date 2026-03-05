"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  trigger_type: string | null
  execution_count: number
  last_execution_at: string | null
  created_at: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  trigger_type: string
  nodes: Array<Record<string, unknown>>
  edges: Array<Record<string, unknown>>
}

const TRIGGER_LABELS: Record<string, string> = {
  "deal.stage_changed": "Deal change de stage",
  "deal.created": "Deal cr\u00e9\u00e9",
  "deal.won": "Deal gagn\u00e9",
  "deal.lost": "Deal perdu",
  "contact.created": "Contact cr\u00e9\u00e9",
  "contact.updated": "Contact mis \u00e0 jour",
  "contact.lead_score_changed": "Lead score chang\u00e9",
  "task.created": "T\u00e2che cr\u00e9\u00e9e",
  "task.completed": "T\u00e2che compl\u00e9t\u00e9e",
  "task.overdue": "T\u00e2che en retard",
  "email.sent": "Email envoy\u00e9",
  "note.added": "Note ajout\u00e9e",
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await apiFetch<Workflow[]>("/workflows/")
      setWorkflows(data)
    } catch {
      console.error("Failed to fetch workflows")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<WorkflowTemplate[]>("/workflows/templates/")
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
      const data = await apiFetch<Workflow>("/workflows/", {
        method: "POST",
        json: {
          name: newName.trim(),
          nodes: [],
          edges: [],
        },
      })
      setCreateDialogOpen(false)
      setNewName("")
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la cr\u00e9ation")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      const data = await apiFetch<Workflow>("/workflows/", {
        method: "POST",
        json: {
          name: template.name,
          description: template.description,
          nodes: template.nodes,
          edges: template.edges,
        },
      })
      setTemplateDialogOpen(false)
      router.push(`/workflows/${data.id}`)
    } catch {
      toast.error("Erreur lors de la cr\u00e9ation")
    }
  }

  const handleToggle = async (workflow: Workflow) => {
    try {
      const data = await apiFetch<{ is_active: boolean }>(
        `/workflows/${workflow.id}/toggle/`,
        { method: "POST" }
      )
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: data.is_active } : w
        )
      )
      toast.success(data.is_active ? "Workflow activ\u00e9" : "Workflow d\u00e9sactiv\u00e9")
    } catch {
      toast.error("Erreur")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/workflows/${id}/`, { method: "DELETE" })
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success("Workflow supprim\u00e9")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
    setMenuOpenId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Automatisez vos processus CRM avec des workflows visuels
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setTemplateDialogOpen(true)}
            className="gap-2"
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Workflows list */}
      {workflows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20 space-y-3">
          <Zap className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucun workflow. Cr\u00e9ez votre premier workflow ou utilisez un template.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
              Voir les templates
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              Cr\u00e9er un workflow
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-xl border border-border bg-card overflow-hidden hover:bg-secondary/10 transition-colors"
            >
              <div className="p-4 flex items-center gap-4 font-[family-name:var(--font-body)]">
                {/* Status indicator */}
                <button
                  onClick={() => handleToggle(workflow)}
                  className="shrink-0"
                  title={workflow.is_active ? "D\u00e9sactiver" : "Activer"}
                >
                  {workflow.is_active ? (
                    <Zap className="h-5 w-5 text-primary" />
                  ) : (
                    <ZapOff className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </button>

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/workflows/${workflow.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {workflow.name}
                    </span>
                    {workflow.is_active && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Actif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {workflow.trigger_type && (
                      <span className="text-xs text-muted-foreground">
                        {TRIGGER_LABELS[workflow.trigger_type] || workflow.trigger_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60">
                      {workflow.execution_count} ex\u00e9cution{workflow.execution_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === workflow.id ? null : workflow.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpenId === workflow.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpenId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                        <button
                          onClick={() => {
                            router.push(`/workflows/${workflow.id}`)
                            setMenuOpenId(null)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            router.push(`/workflows/${workflow.id}?tab=history`)
                            setMenuOpenId(null)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary/50 transition-colors"
                        >
                          <History className="h-3.5 w-3.5" />
                          Historique
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/8 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                placeholder="Ex: Suivi de n\u00e9gociation"
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
                Cr\u00e9er
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
