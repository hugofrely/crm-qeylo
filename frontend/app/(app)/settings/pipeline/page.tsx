"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Save,
  X,
  GripVertical,
} from "lucide-react"

interface Stage {
  id: number
  name: string
  order: number
  color: string
}

export default function PipelineSettingsPage() {
  const router = useRouter()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: "", color: "#6b7280" })
  const [saving, setSaving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newStage, setNewStage] = useState({ name: "", color: "#0D4F4F" })
  const [creating, setCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteDealCount, setDeleteDealCount] = useState<number>(0)
  const [deleteChecking, setDeleteChecking] = useState(false)
  const [migrateToId, setMigrateToId] = useState<string>("")

  const fetchStages = useCallback(async () => {
    try {
      const data = await apiFetch<Stage[]>("/pipeline-stages/")
      setStages(data.sort((a, b) => a.order - b.order))
    } catch (err) {
      console.error("Failed to fetch stages:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  const handleCreate = async () => {
    if (!newStage.name.trim()) return
    setCreating(true)
    try {
      const maxOrder = stages.length > 0
        ? Math.max(...stages.map((s) => s.order))
        : 0
      await apiFetch("/pipeline-stages/", {
        method: "POST",
        json: { ...newStage, order: maxOrder + 1 },
      })
      setNewStage({ name: "", color: "#0D4F4F" })
      setAddDialogOpen(false)
      fetchStages()
    } catch (err) {
      console.error("Failed to create stage:", err)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (stage: Stage) => {
    setEditingId(stage.id)
    setEditForm({ name: stage.name, color: stage.color })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return
    setSaving(true)
    try {
      await apiFetch(`/pipeline-stages/${editingId}/`, {
        method: "PATCH",
        json: editForm,
      })
      setEditingId(null)
      fetchStages()
    } catch (err) {
      console.error("Failed to update stage:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDeleteDialog = async (stageId: number) => {
    setDeleteDialogOpen(stageId)
    setDeleteDealCount(0)
    setMigrateToId("")
    setDeleteChecking(true)
    try {
      await apiFetch(`/pipeline-stages/${stageId}/`, { method: "DELETE" })
      // No deals — stage deleted directly
      setDeleteDialogOpen(null)
      fetchStages()
    } catch (err) {
      try {
        const error = JSON.parse((err as Error).message)
        if (error.deal_count) {
          setDeleteDealCount(error.deal_count)
        } else {
          console.error("Failed to delete stage:", err)
          setDeleteDialogOpen(null)
        }
      } catch {
        console.error("Failed to delete stage:", err)
        setDeleteDialogOpen(null)
      }
    } finally {
      setDeleteChecking(false)
    }
  }

  const handleDeleteWithMigration = async (stageId: number) => {
    if (!migrateToId) return
    setDeleting(true)
    try {
      await apiFetch(`/pipeline-stages/${stageId}/?migrate_to=${migrateToId}`, { method: "DELETE" })
      setDeleteDialogOpen(null)
      fetchStages()
    } catch (err) {
      console.error("Failed to delete stage:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleReorder = async (stageId: number, direction: "up" | "down") => {
    const sortedStages = [...stages].sort((a, b) => a.order - b.order)
    const index = sortedStages.findIndex((s) => s.id === stageId)
    if (index === -1) return

    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sortedStages.length) return

    const currentOrder = sortedStages[index].order
    const swapOrder = sortedStages[swapIndex].order

    try {
      await Promise.all([
        apiFetch(`/pipeline-stages/${sortedStages[index].id}/`, {
          method: "PATCH",
          json: { order: swapOrder },
        }),
        apiFetch(`/pipeline-stages/${sortedStages[swapIndex].id}/`, {
          method: "PATCH",
          json: { order: currentOrder },
        }),
      ])
      fetchStages()
    } catch (err) {
      console.error("Failed to reorder stages:", err)
    }
  }

  const PRESET_COLORS = [
    "#0D4F4F",
    "#C44133",
    "#22c55e",
    "#C9946E",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#6b7280",
    "#f97316",
    "#14b8a6",
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/settings")} className="gap-2 text-muted-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-[family-name:var(--font-body)] text-sm">Retour aux paramètres</span>
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Personnalisez les étapes de votre pipeline de vente
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle étape</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 font-[family-name:var(--font-body)]">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nom</Label>
                <Input
                  value={newStage.name}
                  onChange={(e) =>
                    setNewStage({ ...newStage, name: e.target.value })
                  }
                  placeholder="Ex: Qualification"
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Couleur</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStage({ ...newStage, color })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newStage.color === color
                          ? "border-foreground scale-110 shadow-md"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newStage.name.trim()}
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stages list */}
      {stages.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucune étape configurée. Ajoutez votre première étape.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4">
                {editingId === stage.id ? (
                  <div className="space-y-3 font-[family-name:var(--font-body)]">
                    <Input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="h-11 bg-secondary/30 border-border/60"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setEditForm({ ...editForm, color })
                          }
                          className={`h-7 w-7 rounded-full border-2 transition-all ${
                            editForm.color === color
                              ? "border-foreground scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        className="gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving || !editForm.name.trim()}
                        className="gap-1.5"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 font-[family-name:var(--font-body)]">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: stage.color || "#6b7280",
                      }}
                    />
                    <span className="font-medium text-sm flex-1">
                      {stage.name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => handleReorder(stage.id, "up")}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                        disabled={index === stages.length - 1}
                        onClick={() => handleReorder(stage.id, "down")}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        onClick={() => handleEdit(stage)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                        onClick={() => handleOpenDeleteDialog(stage.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete with migration dialog */}
      <Dialog
        open={deleteDialogOpen !== null && (deleteChecking || deleteDealCount > 0)}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogOpen(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;étape</DialogTitle>
          </DialogHeader>
          {deleteChecking ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 font-[family-name:var(--font-body)]">
              <p className="text-sm text-muted-foreground">
                L&apos;étape <strong>{stages.find((s) => s.id === deleteDialogOpen)?.name}</strong> contient{" "}
                <strong>{deleteDealCount} deal{deleteDealCount > 1 ? "s" : ""}</strong>.
                Choisissez une étape vers laquelle migrer ces deals avant la suppression.
              </p>
              <div className="space-y-1.5">
                <Label>Migrer les deals vers</Label>
                <select
                  value={migrateToId}
                  onChange={(e) => setMigrateToId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">— Sélectionner une étape —</option>
                  {stages
                    .filter((s) => s.id !== deleteDialogOpen)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteDialogOpen && handleDeleteWithMigration(deleteDialogOpen)}
                  disabled={deleting || !migrateToId}
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Migrer et supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
