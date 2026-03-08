"use client"

import { useEffect, useState, useCallback } from "react"
import { useOrganization } from "@/lib/organization"
import { fetchDashboard } from "@/services/dashboard"
import { updateReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Settings2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import type { Report, WidgetConfig } from "@/types"
import { ReportWidget } from "@/components/reports/ReportWidget"
import { WidgetEditor } from "@/components/reports/WidgetEditor"
import { WidgetChart } from "@/components/reports/WidgetChart"

const SIZE_CLASSES: Record<string, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-2",
  large: "col-span-1 lg:col-span-3",
}

export default function DashboardPage() {
  const { orgVersion } = useOrganization()
  const [dashboard, setDashboard] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await fetchDashboard()
      setDashboard(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => {
    load()
  }, [load])

  const saveWidgets = async (widgets: WidgetConfig[]) => {
    if (!dashboard) return
    try {
      const updated = await updateReport(dashboard.id, { widgets })
      setDashboard(updated)
    } catch {
      // silently fail
    }
  }

  const handleAddWidget = () => {
    setEditingWidget(null)
    setEditorOpen(true)
  }

  const handleEditWidget = (widget: WidgetConfig) => {
    setEditingWidget(widget)
    setEditorOpen(true)
  }

  const handleSaveWidget = (widget: WidgetConfig) => {
    if (!dashboard) return
    const exists = dashboard.widgets.find((w) => w.id === widget.id)
    const newWidgets = exists
      ? dashboard.widgets.map((w) => (w.id === widget.id ? widget : w))
      : [...dashboard.widgets, widget]
    saveWidgets(newWidgets)
  }

  const handleDuplicateWidget = (widget: WidgetConfig) => {
    if (!dashboard) return
    const copy = { ...widget, id: crypto.randomUUID(), title: `${widget.title} (copie)` }
    saveWidgets([...dashboard.widgets, copy])
  }

  const handleDeleteWidget = (widgetId: string) => {
    if (!dashboard) return
    saveWidgets(dashboard.widgets.filter((w) => w.id !== widgetId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Impossible de charger le tableau de bord.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <PageHeader title="Tableau de bord">
        {editing && (
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleAddWidget}>
            <Plus className="h-3.5 w-3.5" />
            Widget
          </Button>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setEditing(!editing)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {editing ? "Terminer" : "Personnaliser"}
        </Button>
      </PageHeader>

      {/* Widget grid */}
      {dashboard.widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun widget</p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-[family-name:var(--font-body)]">
            Personnalisez votre tableau de bord en ajoutant des widgets
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => { setEditing(true); handleAddWidget() }}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un widget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboard.widgets.map((widget) => (
            <div key={widget.id} className={SIZE_CLASSES[widget.size] || "col-span-1"}>
              {editing ? (
                <ReportWidget
                  widget={widget}
                  onEdit={handleEditWidget}
                  onDuplicate={handleDuplicateWidget}
                  onDelete={handleDeleteWidget}
                  compare={widget.type === "kpi_card"}
                />
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="text-sm font-medium tracking-tight">{widget.title}</h3>
                  </div>
                  <div className="p-4">
                    <WidgetChart widget={widget} compare={widget.type === "kpi_card"} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <WidgetEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          widget={editingWidget}
          onSave={handleSaveWidget}
        />
      )}
    </div>
  )
}
