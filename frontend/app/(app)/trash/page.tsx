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

const TYPE_LABELS: Record<string, string> = {
  contact: "Contacts",
  deal: "Deals",
  task: "Taches",
}

function TrashTable({
  items,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRestore,
  onPermanentDelete,
}: {
  items: TrashItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  onRestore: (ids: string[]) => void
  onPermanentDelete: (ids: string[]) => void
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Trash2 className="h-12 w-12 mb-4 opacity-30" />
        <p>La corbeille est vide</p>
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
            <th className="p-3">Nom</th>
            <th className="p-3">Supprime par</th>
            <th className="p-3">Date de suppression</th>
            <th className="p-3">Source</th>
            <th className="p-3 text-right">Actions</th>
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
                {new Date(item.deleted_at).toLocaleDateString("fr-FR", {
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
                  title="Restaurer"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onPermanentDelete([item.id])}
                  title="Supprimer definitivement"
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
  const [activeTab, setActiveTab] = useState("contact")
  const { items, counts, loading, refresh } = useTrash(activeTab)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false)
  const [emptying, setEmptying] = useState(false)

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
      toast.success(`${ids.length} element(s) restaure(s)`)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors de la restauration")
    }
  }

  const handlePermanentDelete = async (ids: string[]) => {
    try {
      await permanentDeleteItems(activeTab, ids)
      toast.success(`${ids.length} element(s) supprime(s) definitivement`)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleEmpty = async () => {
    setEmptying(true)
    try {
      await emptyTrash()
      toast.success("Corbeille videe")
      setEmptyDialogOpen(false)
      setSelectedIds(new Set())
      refresh()
    } catch {
      toast.error("Erreur lors du vidage de la corbeille")
    } finally {
      setEmptying(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Corbeille">
        {counts.total > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setEmptyDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vider la corbeille
          </Button>
        )}
      </PageHeader>

      <div className="px-6 pb-2">
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Les elements sont supprimes definitivement apres 30 jours.
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
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
                  {selectedIds.size} selectionne(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(Array.from(selectedIds))}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restaurer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handlePermanentDelete(Array.from(selectedIds))}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
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
                />
              </TabsContent>
            ))
          )}
        </Tabs>
      </div>

      <Dialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider la corbeille</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irreversible. Tous les elements de la corbeille
            ({counts.total}) seront supprimes definitivement.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEmptyDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleEmpty} disabled={emptying}>
              {emptying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vider definitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
