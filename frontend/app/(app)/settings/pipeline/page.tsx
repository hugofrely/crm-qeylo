"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [newStage, setNewStage] = useState({ name: "", color: "#3b82f6" })
  const [creating, setCreating] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      setNewStage({ name: "", color: "#3b82f6" })
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

  const handleDelete = async (stageId: number) => {
    setDeleting(true)
    try {
      await apiFetch(`/pipeline-stages/${stageId}/`, { method: "DELETE" })
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
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#f59e0b",
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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/settings")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Retour aux param&egrave;tres
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personnalisez les &eacute;tapes de votre pipeline de vente
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle &eacute;tape</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={newStage.name}
                  onChange={(e) =>
                    setNewStage({ ...newStage, name: e.target.value })
                  }
                  placeholder="Ex: Qualification"
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStage({ ...newStage, color })}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        newStage.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
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
                  Cr&eacute;er
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stages list */}
      {stages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">
              Aucune &eacute;tape configur&eacute;e. Ajoutez votre premi&egrave;re &eacute;tape.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <Card key={stage.id}>
              <CardContent className="p-4">
                {editingId === stage.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="flex-1"
                      />
                    </div>
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
                      >
                        <X className="h-4 w-4 mr-1" />
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving || !editForm.name.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{
                        backgroundColor: stage.color || "#6b7280",
                      }}
                    />
                    <span className="font-medium text-sm flex-1">
                      {stage.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        onClick={() => handleReorder(stage.id, "up")}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === stages.length - 1}
                        onClick={() => handleReorder(stage.id, "down")}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(stage)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Dialog
                        open={deleteDialogOpen === stage.id}
                        onOpenChange={(open) =>
                          setDeleteDialogOpen(open ? stage.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Supprimer l&apos;&eacute;tape
                            </DialogTitle>
                          </DialogHeader>
                          <p className="text-muted-foreground text-sm">
                            &Ecirc;tes-vous s&ucirc;r de vouloir supprimer l&apos;&eacute;tape{" "}
                            <strong>{stage.name}</strong> ? Les deals associ&eacute;s
                            devront &ecirc;tre r&eacute;assign&eacute;s.
                          </p>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(null)}
                            >
                              Annuler
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(stage.id)}
                              disabled={deleting}
                            >
                              {deleting && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Supprimer
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
