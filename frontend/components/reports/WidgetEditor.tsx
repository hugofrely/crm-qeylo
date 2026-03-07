"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WidgetConfig } from "@/types"

interface WidgetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widget: WidgetConfig | null
  onSave: (widget: WidgetConfig) => void
}

const CHART_TYPES = [
  { value: "bar_chart", label: "Barres" },
  { value: "line_chart", label: "Lignes" },
  { value: "pie_chart", label: "Camembert" },
  { value: "kpi_card", label: "KPI" },
  { value: "table", label: "Tableau" },
  { value: "funnel_chart", label: "Entonnoir" },
  { value: "forecast_chart", label: "Forecast" },
  { value: "win_loss_chart", label: "Win/Loss" },
  { value: "loss_reasons_chart", label: "Raisons de perte" },
  { value: "velocity_chart", label: "Vélocité" },
  { value: "leaderboard_table", label: "Leaderboard" },
  { value: "quota_progress", label: "Progression quota" },
] as const

const ANALYTICS_TYPES = ["forecast_chart", "win_loss_chart", "loss_reasons_chart", "velocity_chart", "leaderboard_table", "quota_progress"]

const SOURCES = [
  { value: "deals", label: "Deals" },
  { value: "contacts", label: "Contacts" },
  { value: "tasks", label: "Tâches" },
  { value: "activities", label: "Activités" },
  { value: "quotes", label: "Devis" },
] as const

const METRICS_BY_SOURCE: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "count", label: "Nombre" },
    { value: "sum:amount", label: "Somme des montants" },
    { value: "avg:amount", label: "Montant moyen" },
  ],
  contacts: [{ value: "count", label: "Nombre" }],
  tasks: [{ value: "count", label: "Nombre" }],
  activities: [{ value: "count", label: "Nombre" }],
  quotes: [{ value: "count", label: "Nombre" }],
}

const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  deals: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "stage", label: "Par stage" },
    { value: "pipeline", label: "Par pipeline" },
  ],
  contacts: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "source", label: "Par source" },
    { value: "lead_score", label: "Par score" },
  ],
  tasks: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "priority", label: "Par priorité" },
    { value: "is_done", label: "Par statut" },
  ],
  activities: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "entry_type", label: "Par type" },
  ],
  quotes: [
    { value: "month", label: "Par mois" },
    { value: "week", label: "Par semaine" },
    { value: "status", label: "Par statut" },
  ],
}

const DATE_RANGES = [
  { value: "", label: "Pas de filtre" },
  { value: "today", label: "Aujourd'hui" },
  { value: "this_week", label: "Cette semaine" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "last_12_months", label: "12 derniers mois" },
  { value: "this_year", label: "Cette année" },
]

const SIZES = [
  { value: "small", label: "Petit" },
  { value: "medium", label: "Moyen" },
  { value: "large", label: "Grand" },
] as const

export function WidgetEditor({ open, onOpenChange, widget, onSave }: WidgetEditorProps) {
  const [title, setTitle] = useState("")
  const [chartType, setChartType] = useState<WidgetConfig["type"]>("bar_chart")
  const [source, setSource] = useState<WidgetConfig["source"]>("deals")
  const [metric, setMetric] = useState("count")
  const [groupBy, setGroupBy] = useState<string>("month")
  const [dateRange, setDateRange] = useState("")
  const [size, setSize] = useState<WidgetConfig["size"]>("medium")
  const [pipelineId, setPipelineId] = useState("")
  const [filterMode, setFilterMode] = useState<string>("")
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (chartType === "funnel_chart" || ANALYTICS_TYPES.includes(chartType)) {
      import("@/services/deals").then((mod) => {
        mod.fetchPipelines().then(setPipelines)
      })
    }
  }, [chartType])

  useEffect(() => {
    if (open && widget && widget.type === "funnel_chart") {
      setPipelineId((widget.filters?.pipeline_id as string) || "")
      setFilterMode((widget.filters?.filter_mode as string) || "")
    }
  }, [open, widget])

  useEffect(() => {
    if (open && widget) {
      setTitle(widget.title)
      setChartType(widget.type)
      setSource(widget.source)
      setMetric(widget.metric)
      setGroupBy(widget.group_by || "month")
      setDateRange((widget.filters?.date_range as string) || "")
      setSize(widget.size)
    } else if (open) {
      setTitle("")
      setChartType("bar_chart")
      setSource("deals")
      setMetric("count")
      setGroupBy("month")
      setDateRange("")
      setSize("medium")
    }
  }, [open, widget])

  const handleSourceChange = (newSource: WidgetConfig["source"]) => {
    setSource(newSource)
    setMetric("count")
    const groupOptions = GROUP_BY_OPTIONS[newSource]
    if (groupOptions && !groupOptions.find((o) => o.value === groupBy)) {
      setGroupBy(groupOptions[0]?.value || "month")
    }
  }

  const handleSave = () => {
    if (!title.trim()) return
    const filters: Record<string, unknown> = {}
    if (dateRange) filters.date_range = dateRange

    if (chartType === "funnel_chart") {
      if (pipelineId) filters.pipeline_id = pipelineId
      if (filterMode) filters.filter_mode = filterMode
      onSave({
        id: widget?.id || crypto.randomUUID(),
        type: "funnel_chart",
        title: title.trim(),
        source: "deals",
        metric: "count",
        group_by: null,
        filters,
        size: "large",
      })
      onOpenChange(false)
      return
    }

    onSave({
      id: widget?.id || crypto.randomUUID(),
      type: chartType,
      title: title.trim(),
      source,
      metric,
      group_by: chartType === "kpi_card" ? null : groupBy,
      filters,
      size,
    })
    onOpenChange(false)
  }

  const selectClass =
    "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{widget ? "Modifier" : "Ajouter"} un widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du widget" />
          </div>

          <div className="space-y-1.5">
            <Label>Type de graphique</Label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value as WidgetConfig["type"])} className={selectClass}>
              {CHART_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {chartType === "funnel_chart" ? (
            <>
              <div className="space-y-1.5">
                <Label>Pipeline</Label>
                <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
                  <option value="">Selectionner...</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Mode de filtre</Label>
                  <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={selectClass}>
                    <option value="">Tous</option>
                    <option value="cohort">Cohorte</option>
                    <option value="activity">Activite</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Periode</Label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    {DATE_RANGES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Source de donnees</Label>
                  <select value={source} onChange={(e) => handleSourceChange(e.target.value as WidgetConfig["source"])} className={selectClass}>
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Metrique</Label>
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
                    {(METRICS_BY_SOURCE[source] || []).map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {chartType !== "kpi_card" && (
                <div className="space-y-1.5">
                  <Label>Grouper par</Label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={selectClass}>
                    {(GROUP_BY_OPTIONS[source] || []).map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Periode</Label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    {DATE_RANGES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Taille</Label>
                  <select value={size} onChange={(e) => setSize(e.target.value as WidgetConfig["size"])} className={selectClass}>
                    {SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
