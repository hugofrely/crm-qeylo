"use client"

import { useEffect, useState } from "react"
import { fetchFunnel } from "@/services/reports"
import { fetchPipelines } from "@/services/deals"
import { FunnelChart } from "@/components/reports/FunnelChart"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import type { FunnelResponse } from "@/types"

const DATE_RANGES = [
  { value: "", label: "Toutes les periodes" },
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "last_3_months", label: "3 derniers mois" },
  { value: "last_6_months", label: "6 derniers mois" },
  { value: "this_year", label: "Cette annee" },
]

function formatDurationTable(iso: string): string {
  const match = iso.match(/P(\d+)DT(\d+)H/)
  if (!match) return iso
  const days = parseInt(match[1])
  const hours = parseInt(match[2])
  if (days > 0) return `${days}j ${hours}h`
  return `${hours}h`
}

export default function FunnelPage() {
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [pipelineId, setPipelineId] = useState("")
  const [filterMode, setFilterMode] = useState<"" | "cohort" | "activity">("")
  const [dateRange, setDateRange] = useState("")
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

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
      <PageHeader title="Entonnoir de conversion">
        {data && (
          <div className="text-right">
            <div className="text-3xl font-light tracking-tight">{data.overall_conversion}%</div>
            <div className="text-xs text-muted-foreground">Conversion globale</div>
          </div>
        )}
        <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
      </PageHeader>

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
            Selectionnez un pipeline
          </div>
        )}
      </div>

      {/* Summary table */}
      {data && data.stages.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Etape</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Entres</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Sortis vers suivant</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Conversion</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Duree moy.</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Montant</th>
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
      )}

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} onReset={resetFilters} activeFilterCount={activeFilterCount}>
        <FilterSection label="Pipeline">
          <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={selectClass}>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </FilterSection>
        <FilterSection label="Mode de filtre">
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value as "" | "cohort" | "activity")} className={selectClass}>
            <option value="">Tous les deals</option>
            <option value="cohort">Par cohorte d&apos;entree</option>
            <option value="activity">Par activite</option>
          </select>
        </FilterSection>
        <FilterSection label="Periode">
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
