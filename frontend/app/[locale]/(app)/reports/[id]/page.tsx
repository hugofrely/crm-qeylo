"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useOrganization } from "@/lib/organization"
import { fetchReport, updateReport, deleteReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2, ArrowLeft, Trash2, Check, Pencil } from "lucide-react"
import type { Report, WidgetConfig } from "@/types"
import { ReportWidget } from "@/components/reports/ReportWidget"
import { WidgetEditor } from "@/components/reports/WidgetEditor"

const DATE_RANGES = [
  { value: "", label: "Toutes les périodes" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "last_12_months", label: "12 derniers mois" },
  { value: "this_year", label: "Cette année" },
]

const SIZE_CLASSES: Record<string, string> = {
  small: "col-span-1",
  medium: "col-span-1 lg:col-span-2",
  large: "col-span-1 lg:col-span-3",
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { orgVersion } = useOrganization()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [globalDateRange, setGlobalDateRange] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchReport(params.id as string)
      setReport(data)
      setNameInput(data.name)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [params.id, orgVersion])

  useEffect(() => { load() }, [load])

  const saveWidgets = async (widgets: WidgetConfig[]) => {
    if (!report) return
    try {
      const updated = await updateReport(report.id, { widgets })
      setReport(updated)
    } catch {
      // silently fail
    }
  }

  const handleSaveName = async () => {
    if (!report || !nameInput.trim()) return
    try {
      const updated = await updateReport(report.id, { name: nameInput.trim() })
      setReport(updated)
      setEditingName(false)
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
    if (!report) return
    const exists = report.widgets.find((w) => w.id === widget.id)
    const newWidgets = exists
      ? report.widgets.map((w) => (w.id === widget.id ? widget : w))
      : [...report.widgets, widget]
    saveWidgets(newWidgets)
  }

  const handleDuplicateWidget = (widget: WidgetConfig) => {
    if (!report) return
    const copy = { ...widget, id: crypto.randomUUID(), title: `${widget.title} (copie)` }
    saveWidgets([...report.widgets, copy])
  }

  const handleDeleteWidget = (widgetId: string) => {
    if (!report) return
    saveWidgets(report.widgets.filter((w) => w.id !== widgetId))
  }

  const handleDeleteReport = async () => {
    if (!report) return
    try {
      await deleteReport(report.id)
      router.push("/reports")
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8 lg:p-12">
        <p className="text-muted-foreground">Rapport introuvable.</p>
      </div>
    )
  }

  const selectClass =
    "h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-9 text-lg font-medium w-64"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <Button size="icon" className="h-8 w-8" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => !report.is_template && setEditingName(true)}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-2xl tracking-tight">{report.name}</h1>
              {!report.is_template && (
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={globalDateRange}
            onChange={(e) => setGlobalDateRange(e.target.value)}
            className={selectClass}
          >
            {DATE_RANGES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={handleAddWidget}>
            <Plus className="h-3.5 w-3.5" />
            Widget
          </Button>
          {!report.is_template && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDeleteReport}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {report.widgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <p className="text-sm text-muted-foreground">Aucun widget</p>
          <p className="text-xs text-muted-foreground/60 mt-1 font-[family-name:var(--font-body)]">
            Ajoutez votre premier widget pour visualiser vos donnees
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={handleAddWidget}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un widget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {report.widgets.map((widget) => (
            <div key={widget.id} className={SIZE_CLASSES[widget.size] || "col-span-1"}>
              <ReportWidget
                widget={widget}
                globalDateRange={globalDateRange}
                onEdit={handleEditWidget}
                onDuplicate={handleDuplicateWidget}
                onDelete={handleDeleteWidget}
              />
            </div>
          ))}
        </div>
      )}

      <WidgetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />
    </div>
  )
}
