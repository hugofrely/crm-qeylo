"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
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

export default function WorkflowsPage() {
  const router = useRouter()
  const t = useTranslations("workflows")
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
      toast.error(t("createError"))
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
      toast.error(t("createError"))
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
      toast.success(data.is_active ? t("activated") : t("deactivated"))
    } catch {
      toast.error(t("error"))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow(id)
      posthog.capture("workflow_deleted")
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success(t("deleted"))
    } catch {
      toast.error(t("deleteError"))
    }
  }

  const columns: DataTableColumn<Workflow>[] = [
    {
      key: "status",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      render: (w) => (
        <button onClick={(e) => { e.stopPropagation(); handleToggle(w) }} title={w.is_active ? t("deactivate") : t("activate")}>
          {w.is_active ? <Zap className="h-5 w-5 text-primary" /> : <ZapOff className="h-5 w-5 text-muted-foreground/40" />}
        </button>
      ),
    },
    {
      key: "name",
      header: t("columnName"),
      render: (w) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{w.name}</span>
            {w.is_active && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{t("active")}</span>
            )}
          </div>
          {w.trigger_type && (
            <span className="text-xs text-muted-foreground">{t(`triggerLabels.${w.trigger_type}` as any) || w.trigger_type}</span>
          )}
        </div>
      ),
    },
    {
      key: "executions",
      header: t("columnExecutions"),
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
              <Pencil className="h-4 w-4 mr-2" /> {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${w.id}?tab=history`) }}>
              <History className="h-4 w-4 mr-2" /> {t("history")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(w.id) }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      >
        <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          {t("templates")}
        </Button>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("new")}
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={workflows}
        loading={loading}
        emptyIcon={<Zap className="h-10 w-10 text-muted-foreground/30 mb-2" />}
        emptyMessage={t("emptyMessage")}
        onRowClick={(w) => router.push(`/workflows/${w.id}`)}
        rowKey={(w) => w.id}
      />

      {workflows.length < 3 && templates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">{t("availableTemplates")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateFromTemplate(template)}
                className="text-left p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-card transition-colors"
              >
                <p className="text-sm font-medium">{template.name}</p>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create blank dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("createDialog.name")}
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("createDialog.placeholder")}
                className="h-11 bg-secondary/30 border-border/60"
                onKeyDown={(e) => e.key === "Enter" && handleCreateBlank()}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t("createDialog.cancel")}
              </Button>
              <Button
                onClick={handleCreateBlank}
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("createDialog.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("templateDialog.title")}</DialogTitle>
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
                  {t(`triggerLabels.${template.trigger_type}` as any) || template.trigger_type}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
