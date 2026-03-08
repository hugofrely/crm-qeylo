"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, RotateCcw, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { useTrash } from "@/hooks/useTrash"
import { restoreItems, permanentDeleteItems, emptyTrash } from "@/services/trash"
import type { TrashItem } from "@/types/trash"
import { useTranslations, useLocale } from "next-intl"

function TrashTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRestore,
  onPermanentDelete,
  t,
  locale,
}: {
  items: TrashItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onRestore: (ids: string[]) => void
  onPermanentDelete: (ids: string[]) => void
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Trash2 className="h-12 w-12 mb-4 opacity-30" />
        <p>{t("emptyState")}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-3 w-10">
              <input
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={onToggleAll}
                className="rounded border-input"
              />
            </th>
            <th className="p-3">{t("name")}</th>
            <th className="p-3">{t("deletedBy")}</th>
            <th className="p-3">{t("deletionDate")}</th>
            <th className="p-3">{t("source")}</th>
            <th className="p-3 text-right">{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-muted/50">
              <td className="p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggleSelect(item.id)}
                  className="rounded border-input"
                />
              </td>
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3 text-muted-foreground">
                {item.deleted_by_name || "-"}
              </td>
              <td className="p-3 text-muted-foreground">
                {new Date(item.deleted_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="p-3">
                {item.deletion_source && item.deletion_source !== "direct" ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Cascade
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">Direct</span>
                )}
              </td>
              <td className="p-3 text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRestore([item.id])}
                  title={t("restoreTitle")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onPermanentDelete([item.id])}
                  title={t("permanentDeleteTitle")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TrashPage() {
  const t = useTranslations("notifications.trash")
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState("contact")
  const { items, counts, loading, refresh } = useTrash(activeTab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false)
  const [emptying, setEmptying] = useState(false)

  const TYPE_LABELS: Record<string, string> = {
    contact: t("tabs.contact"),
    deal: t("tabs.deal"),
    task: t("tabs.task"),
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const handleRestore = async (ids: string[]) => {
    try {
      await restoreItems(activeTab, ids)
      toast.success(t("restoredSuccess", { count: ids.length }))
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error(t("restoreError"))
    }
  }

  const handlePermanentDelete = async (ids: string[]) => {
    try {
      await permanentDeleteItems(activeTab, ids)
      toast.success(t("deletedSuccess", { count: ids.length }))
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  const handleEmpty = async () => {
    setEmptying(true)
    try {
      await emptyTrash()
      toast.success(t("emptiedSuccess"))
      setEmptyDialogOpen(false)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error(t("emptyError"))
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <PageHeader title={t("title")}>
        {counts.total > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setEmptyDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("emptyTrash")}
          </Button>
        )}
      </PageHeader>

      <div>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("retentionWarning")}
        </div>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()) }}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                  {counts[key as keyof typeof counts] > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                      {counts[key as keyof typeof counts]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t("selected", { count: selectedIds.size })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(Array.from(selectedIds))}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t("restore")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handlePermanentDelete(Array.from(selectedIds))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t("delete")}
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            Object.keys(TYPE_LABELS).map((key) => (
              <TabsContent key={key} value={key}>
                <TrashTable
                  items={items}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleAll={toggleAll}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                  t={t}
                  locale={locale}
                />
              </TabsContent>
            ))
          )}
        </Tabs>
      </div>

      <Dialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("emptyDialogTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("emptyDialogMessage", { count: counts.total })}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEmptyDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleEmpty} disabled={emptying}>
              {emptying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("emptyPermanently")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
