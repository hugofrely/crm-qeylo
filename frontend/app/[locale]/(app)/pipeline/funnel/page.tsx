"use client"

import { useEffect, useState } from "react"
import { fetchFunnel } from "@/services/reports"
import { fetchPipelines } from "@/services/deals"
import { FunnelChart } from "@/components/reports/FunnelChart"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSelect, FilterPills } from "@/components/shared/FilterControls"
import { useTranslations } from "next-intl"
import type { FunnelResponse } from "@/types"

function formatDurationTable(iso: string): string {
  const match = iso.match(/P(\d+)DT(\d+)H/)
  if (!match) return iso
  const days = parseInt(match[1])
  const hours = parseInt(match[2])
  if (days > 0) return `${days}j ${hours}h`
  return `${hours}h`
}

export default function FunnelPage() {
  const t = useTranslations("pipeline")

  const DATE_RANGES = [
    { value: "", label: t("allPeriods") },
    { value: "this_month", label: t("thisMonth") },
    { value: "last_month", label: t("lastMonth") },
    { value: "last_3_months", label: t("last3Months") },
    { value: "last_6_months", label: t("last6Months") },
    { value: "this_year", label: t("thisYear") },
  ]

  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [pipelineId, setPipelineId] = useState("")
  const [filterMode, setFilterMode] = useState<"" | "cohort" | "activity">("")
  const [dateRange, setDateRange] = useState("")
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const activeFilterCount = [filterMode, dateRange].filter(Boolean).length

  const resetFilters = () => {
    setFilterMode("")
    setDateRange("")
  }

  useEffect(() => {
    fetchPipelines().then((p) => {
      setPipelines(p)
      if (p.length > 0) setPipelineId(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (!pipelineId) return
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchFunnel({
          pipeline_id: pipelineId,
          filter_mode: filterMode || undefined,
          date_range: dateRange || undefined,
        })
        setData(result)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [pipelineId, filterMode, dateRange])

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full"

  return (
    <div className="p-8 lg:p-12 space-y-8 animate-fade-in-up">
      <PageHeader title={t("title")}>
        {data && (
          <div className="text-right">
            <div className="text-3xl font-light tracking-tight">{data.overall_conversion}%</div>
            <div className="text-xs text-muted-foreground">{t("overallConversion")}</div>
          </div>
        )}
        <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
      </PageHeader>

      {/* Desktop filter bar */}
      <FilterBar open={filterOpen} activeFilterCount={activeFilterCount} onReset={resetFilters}>
        {pipelines.length > 1 && (
          <FilterSelect
            label={t("filterPipeline")}
            options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
            value={pipelineId}
            onChange={setPipelineId}
            placeholder={t("filterPipeline")}
          />
        )}
        <FilterPills
          label={t("filterMode")}
          options={[
            { value: "cohort", label: t("filterModeCohort") },
            { value: "activity", label: t("filterModeActivity") },
          ]}
          value={filterMode || null}
          onChange={(v) => setFilterMode((v ?? "") as "" | "cohort" | "activity")}
        />
        <FilterSelect
          label={t("filterPeriod")}
          options={DATE_RANGES.filter((d) => d.value).map((d) => ({ value: d.value, label: d.label }))}
          value={dateRange}
          onChange={setDateRange}
          placeholder={t("allPeriods")}
        />
      </FilterBar>

      {/* Funnel */}
      <div className="rounded-xl border border-border bg-card p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : data ? (
          <FunnelChart stages={data.stages} />
        ) : (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            {t("selectPipeline")}
          </div>
        )}
      </div>

      {/* Summary table */}
      {data && data.stages.length > 0 && (
        <>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTable(!showTable)}
              className="gap-2 text-muted-foreground"
            >
              {showTable ? t("hideDetails") : t("showDetails")}
            </Button>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-out ${showTable ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableStage")}</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableEntered")}</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableExitedToNext")}</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableConversion")}</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableAvgDuration")}</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">{t("tableAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stages.map((stage) => (
                    <tr key={stage.stage_id} className="border-b last:border-0">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.stage_name}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{stage.entered}</td>
                      <td className="py-3 px-4 text-right">{stage.exited_to_next}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={stage.conversion_rate >= 50 ? "text-emerald-600" : stage.conversion_rate >= 25 ? "text-amber-600" : "text-red-600"}>
                          {stage.conversion_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {stage.avg_duration ? formatDurationTable(stage.avg_duration) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {stage.total_amount.toLocaleString("fr-FR")} EUR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} onReset={resetFilters} activeFilterCount={activeFilterCount}>
        <FilterSection label={t("filterPipeline")}>
          <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FilterSection>
        <FilterSection label={t("filterModeLabel")}>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as "" | "cohort" | "activity")} className={selectClass}>
            <option value="">{t("allDeals")}</option>
            <option value="cohort">{t("filterModeCohort")}</option>
            <option value="activity">{t("filterModeActivity")}</option>
          </select>
        </FilterSection>
        <FilterSection label={t("filterPeriod")}>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={selectClass}>
            {DATE_RANGES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </FilterSection>
      </FilterPanel>
    </div>
  )
}
