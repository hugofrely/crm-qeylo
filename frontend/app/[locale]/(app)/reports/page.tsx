"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useOrganization } from "@/lib/organization"
import { fetchReports, createReport } from "@/services/reports"
import { Button } from "@/components/ui/button"
import {
  Plus, Loader2, FileText, BarChart3, Users, ListTodo,
  PieChart, FileBarChart,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import type { Report } from "@/types"

const TEMPLATE_ICONS: Record<string, typeof FileText> = {
  "Performance commerciale": BarChart3,
  "Pipeline": PieChart,
  "Activite equipe": ListTodo,
  "Contacts & Sources": Users,
  "Devis": FileBarChart,
}

export default function ReportsPage() {
  const router = useRouter()
  const t = useTranslations("dashboard.reports")
  const { orgVersion } = useOrganization()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchReports()
      setReports(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { load() }, [load])

  const templates = reports.filter((r) => r.is_template)
  const custom = reports.filter((r) => !r.is_template)

  const handleCreate = async () => {
    try {
      const report = await createReport({
        name: t("defaultReportName"),
        widgets: [],
      })
      router.push(`/reports/${report.id}`)
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

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10 animate-fade-in-up">
      <PageHeader title={t("title")} subtitle={t("subtitle")}>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("newReport")}
        </Button>
      </PageHeader>

      {templates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">{t("templates")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((report) => {
              const Icon = TEMPLATE_ICONS[report.name] || FileText
              return (
                <button
                  key={report.id}
                  onClick={() => router.push(`/reports/${report.id}`)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/8 text-primary group-hover:bg-primary/12 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{report.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                        {report.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        {t("widgetCount", { count: report.widgets.length })}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">{t("myReports")}</h2>
        {custom.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{t("noCustomReports")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1 font-[family-name:var(--font-body)]">
              {t("noCustomReportsHint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {custom.map((report) => (
              <button
                key={report.id}
                onClick={() => router.push(`/reports/${report.id}`)}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/8 group-hover:text-primary shrink-0 transition-colors">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                <h3 className="text-sm font-medium">{report.name}</h3>
                {report.description && (
                  <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                    {report.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {t("widgetCount", { count: report.widgets.length })} · {t("modifiedOn", { date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(report.updated_at)) })}
                </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
