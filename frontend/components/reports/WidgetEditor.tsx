"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
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

const CHART_TYPE_KEYS = [
  "bar_chart", "line_chart", "pie_chart", "donut_chart", "stacked_bar_chart",
  "area_chart", "kpi_card", "table", "funnel_chart", "forecast_chart",
  "win_loss_chart", "loss_reasons_chart", "velocity_chart", "leaderboard_table",
  "quota_progress",
] as const

const ANALYTICS_TYPES = ["forecast_chart", "win_loss_chart", "loss_reasons_chart", "velocity_chart", "leaderboard_table", "quota_progress"]

const SOURCE_KEYS = ["deals", "contacts", "tasks", "activities", "quotes"] as const

const METRICS_BY_SOURCE: Record<string, string[]> = {
  deals: ["count", "sumAmount", "avgAmount"],
  contacts: ["count"],
  tasks: ["count"],
  activities: ["count"],
  quotes: ["count", "sumAmount", "avgAmount"],
}

const METRIC_VALUES: Record<string, string> = {
  count: "count",
  sumAmount: "sum:amount",
  avgAmount: "avg:amount",
}

const GROUP_BY_KEYS_BY_SOURCE: Record<string, string[]> = {
  deals: ["month", "week", "stage", "pipeline", "outcome"],
  contacts: ["month", "week", "source", "leadScore", "category"],
  tasks: ["month", "week", "priority", "status"],
  activities: ["month", "week", "entryType", "user"],
  quotes: ["month", "week", "status"],
}

const GROUP_BY_VALUES: Record<string, string> = {
  month: "month",
  week: "week",
  stage: "stage",
  pipeline: "pipeline",
  outcome: "outcome",
  source: "source",
  leadScore: "lead_score",
  category: "category",
  priority: "priority",
  status: "status",
  entryType: "entry_type",
  user: "user",
}

const DATE_RANGE_KEYS = [
  "noFilter", "today", "thisWeek", "thisMonth", "lastMonth",
  "last3Months", "last6Months", "last12Months", "thisYear",
] as const

const DATE_RANGE_VALUES: Record<string, string> = {
  noFilter: "",
  today: "today",
  thisWeek: "this_week",
  thisMonth: "this_month",
  lastMonth: "last_month",
  last3Months: "last_3_months",
  last6Months: "last_6_months",
  last12Months: "last_12_months",
  thisYear: "this_year",
}

const SIZE_KEYS = ["small", "medium", "large"] as const

export function WidgetEditor({ open, onOpenChange, widget, onSave }: WidgetEditorProps) {
  const t = useTranslations("dashboard")
  const tEditor = useTranslations("dashboard.editor")
  const tChartTypes = useTranslations("dashboard.chartTypes")
  const tSources = useTranslations("dashboard.sources")
  const tMetrics = useTranslations("dashboard.metrics")
  const tGroupBy = useTranslations("dashboard.groupByOptions")
  const tDateRanges = useTranslations("dashboard.dateRanges")
  const tSizes = useTranslations("dashboard.sizes")

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
    const groupOptions = GROUP_BY_KEYS_BY_SOURCE[newSource]
    const currentGroupByKey = Object.entries(GROUP_BY_VALUES).find(([, v]) => v === groupBy)?.[0]
    if (groupOptions && currentGroupByKey && !groupOptions.includes(currentGroupByKey)) {
      setGroupBy(GROUP_BY_VALUES[groupOptions[0]] || "month")
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

    if (ANALYTICS_TYPES.includes(chartType)) {
      if (pipelineId) filters.pipeline_id = pipelineId
      if (dateRange) filters.period = dateRange
      onSave({
        id: widget?.id || crypto.randomUUID(),
        type: chartType,
        title: title.trim(),
        source: "deals",
        metric: "count",
        group_by: null,
        filters,
        size,
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
          <DialogTitle>{widget ? tEditor("editTitle") : tEditor("addTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{tEditor("titleLabel")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tEditor("titlePlaceholder")} />
          </div>

          <div className="space-y-1.5">
            <Label>{tEditor("chartType")}</Label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value as WidgetConfig["type"])} className={selectClass}>
              {CHART_TYPE_KEYS.map((key) => (
                <option key={key} value={key}>{tChartTypes(key)}</option>
              ))}
            </select>
          </div>

          {chartType === "funnel_chart" || ANALYTICS_TYPES.includes(chartType) ? (
            <>
              <div className="space-y-1.5">
                <Label>{tEditor("pipeline")}</Label>
                <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
                  <option value="">{tEditor("selectPipeline")}</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{tEditor("filterMode")}</Label>
                  <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={selectClass}>
                    <option value="">{tEditor("filterModeAll")}</option>
                    <option value="cohort">{tEditor("filterModeCohort")}</option>
                    <option value="activity">{tEditor("filterModeActivity")}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{tEditor("period")}</Label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    {DATE_RANGE_KEYS.map((key) => (
                      <option key={key} value={DATE_RANGE_VALUES[key]}>{tDateRanges(key)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{tEditor("dataSource")}</Label>
                  <select value={source} onChange={(e) => handleSourceChange(e.target.value as WidgetConfig["source"])} className={selectClass}>
                    {SOURCE_KEYS.map((key) => (
                      <option key={key} value={key}>{tSources(key)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>{tEditor("metric")}</Label>
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className={selectClass}>
                    {(METRICS_BY_SOURCE[source] || []).map((key) => (
                      <option key={key} value={METRIC_VALUES[key]}>{tMetrics(key)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {chartType !== "kpi_card" && (
                <div className="space-y-1.5">
                  <Label>{tEditor("groupBy")}</Label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={selectClass}>
                    {(GROUP_BY_KEYS_BY_SOURCE[source] || []).map((key) => (
                      <option key={key} value={GROUP_BY_VALUES[key]}>{tGroupBy(key)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{tEditor("period")}</Label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
                    {DATE_RANGE_KEYS.map((key) => (
                      <option key={key} value={DATE_RANGE_VALUES[key]}>{tDateRanges(key)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>{tEditor("size")}</Label>
                  <select value={size} onChange={(e) => setSize(e.target.value as WidgetConfig["size"])} className={selectClass}>
                    {SIZE_KEYS.map((key) => (
                      <option key={key} value={key}>{tSizes(key)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tEditor("cancel")}</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>{tEditor("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
