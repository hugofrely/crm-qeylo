"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  fetchPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  fetchPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
} from "@/services/deals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
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
  Star,
  Layers,
} from "lucide-react"
import { CreatePipelineDialog } from "@/components/deals/CreatePipelineDialog"
import type { Pipeline, Stage } from "@/types"

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#6b7280", "#f97316", "#14b8a6",
]

export default function PipelineSettingsPage() {
  const router = useRouter()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false)

  // Pipeline rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)

  // Pipeline delete
  const [deletePipelineDialogId, setDeletePipelineDialogId] = useState<string | null>(null)
  const [deletePipelineMigrateTo, setDeletePipelineMigrateTo] = useState("")
  const [deletingPipeline, setDeletingPipeline] = useState(false)

  // Stage management
  const [stages, setStages] = useState<Stage[]>([])
  const [stagesLoading, setStagesLoading] = useState(false)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", color: "#6b7280" })
  const [stageSaving, setStageSaving] = useState(false)
  const [addStageDialogOpen, setAddStageDialogOpen] = useState(false)
  const [newStage, setNewStage] = useState({ name: "", color: "#3b82f6" })
  const [creatingStage, setCreatingStage] = useState(false)
  const [deleteStageDialogOpen, setDeleteStageDialogOpen] = useState<string | null>(null)
  const [deletingStage, setDeletingStage] = useState(false)

  const loadPipelines = useCallback(async () => {
    try {
      const data = await fetchPipelines()
      setPipelines(data)
    } catch (err) {
      console.error("Failed to fetch pipelines:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPipelines()
  }, [loadPipelines])

  const loadStages = useCallback(async (pipelineId: string) => {
    setStagesLoading(true)
    try {
      const data = await fetchPipelineStages(pipelineId)
      setStages(data.sort((a, b) => a.order - b.order))
    } catch (err) {
      console.error("Failed to fetch stages:", err)
    } finally {
      setStagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedPipeline) {
      loadStages(selectedPipeline.id)
    }
  }, [selectedPipeline, loadStages])

  // Pipeline actions
  const handleRename = async () => {
    if (!renamingId || !renameValue.trim()) return
    setRenameSaving(true)
    try {
      await updatePipeline(renamingId, { name: renameValue.trim() })
      setRenamingId(null)
      loadPipelines()
    } catch (err) {
      console.error("Failed to rename pipeline:", err)
    } finally {
      setRenameSaving(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await updatePipeline(id, { is_default: true })
      loadPipelines()
    } catch (err) {
      console.error("Failed to set default:", err)
    }
  }

  const handleDeletePipeline = async () => {
    if (!deletePipelineDialogId) return
    setDeletingPipeline(true)
    try {
      const pipeline = pipelines.find((p) => p.id === deletePipelineDialogId)
      if (pipeline && pipeline.deal_count > 0 && !deletePipelineMigrateTo) return
      await deletePipeline(deletePipelineDialogId, deletePipelineMigrateTo || undefined)
      setDeletePipelineDialogId(null)
      setDeletePipelineMigrateTo("")
      loadPipelines()
    } catch (err) {
      console.error("Failed to delete pipeline:", err)
    } finally {
      setDeletingPipeline(false)
    }
  }

  // Stage actions
  const handleCreateStage = async () => {
    if (!newStage.name.trim() || !selectedPipeline) return
    setCreatingStage(true)
    try {
      const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) : 0
      await createPipelineStage({
        ...newStage,
        order: maxOrder + 1,
        pipeline: selectedPipeline.id,
      })
      setNewStage({ name: "", color: "#3b82f6" })
      setAddStageDialogOpen(false)
      loadStages(selectedPipeline.id)
    } catch (err) {
      console.error("Failed to create stage:", err)
    } finally {
      setCreatingStage(false)
    }
  }

  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id)
    setEditForm({ name: stage.name, color: stage.color })
  }

  const handleSaveEditStage = async () => {
    if (!editingStageId || !editForm.name.trim() || !selectedPipeline) return
    setStageSaving(true)
    try {
      await updatePipelineStage(editingStageId, editForm)
      setEditingStageId(null)
      loadStages(selectedPipeline.id)
    } catch (err) {
      console.error("Failed to update stage:", err)
    } finally {
      setStageSaving(false)
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!selectedPipeline) return
    setDeletingStage(true)
    try {
      await deletePipelineStage(stageId)
      setDeleteStageDialogOpen(null)
      loadStages(selectedPipeline.id)
    } catch (err) {
      console.error("Failed to delete stage:", err)
    } finally {
      setDeletingStage(false)
    }
  }

  const handleReorderStage = async (stageId: string, direction: "up" | "down") => {
    if (!selectedPipeline) return
    const sortedStages = [...stages].sort((a, b) => a.order - b.order)
    const index = sortedStages.findIndex((s) => s.id === stageId)
    if (index === -1) return
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sortedStages.length) return
    const currentOrder = sortedStages[index].order
    const swapOrder = sortedStages[swapIndex].order
    try {
      await Promise.all([
        updatePipelineStage(sortedStages[index].id, { order: swapOrder }),
        updatePipelineStage(sortedStages[swapIndex].id, { order: currentOrder }),
      ])
      loadStages(selectedPipeline.id)
    } catch (err) {
      console.error("Failed to reorder stages:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ═══ STAGE CONFIG VIEW ═══
  if (selectedPipeline) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setSelectedPipeline(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux pipelines
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedPipeline.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Personnalisez les étapes de ce pipeline
            </p>
          </div>
          <Dialog open={addStageDialogOpen} onOpenChange={setAddStageDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle étape</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={newStage.name}
                    onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
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
                          newStage.color === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddStageDialogOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreateStage} disabled={creatingStage || !newStage.name.trim()}>
                    {creatingStage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {stagesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">Aucune étape configurée. Ajoutez votre première étape.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <Card key={stage.id}>
                <CardContent className="p-4">
                  {editingStageId === stage.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditForm({ ...editForm, color })}
                            className={`h-7 w-7 rounded-full border-2 transition-all ${
                              editForm.color === color ? "border-foreground scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingStageId(null)}>
                          <X className="h-4 w-4 mr-1" /> Annuler
                        </Button>
                        <Button size="sm" onClick={handleSaveEditStage} disabled={stageSaving || !editForm.name.trim()}>
                          {stageSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: stage.color || "#6b7280" }} />
                      <span className="font-medium text-sm flex-1">{stage.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => handleReorderStage(stage.id, "up")}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === stages.length - 1} onClick={() => handleReorderStage(stage.id, "down")}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditStage(stage)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Dialog open={deleteStageDialogOpen === stage.id} onOpenChange={(open) => setDeleteStageDialogOpen(open ? stage.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supprimer l&apos;étape</DialogTitle>
                            </DialogHeader>
                            <p className="text-muted-foreground text-sm">
                              Êtes-vous sûr de vouloir supprimer l&apos;étape <strong>{stage.name}</strong> ?
                            </p>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" onClick={() => setDeleteStageDialogOpen(null)}>Annuler</Button>
                              <Button variant="destructive" onClick={() => handleDeleteStage(stage.id)} disabled={deletingStage}>
                                {deletingStage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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

  // ═══ PIPELINE LIST VIEW ═══
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.push("/settings")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Retour aux paramètres
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos pipelines de vente et leurs étapes
          </p>
        </div>
        <Button onClick={() => setCreatePipelineOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">Aucun pipeline configuré.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pipelines.map((pipeline) => (
            <Card key={pipeline.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
              if (renamingId !== pipeline.id && deletePipelineDialogId !== pipeline.id) {
                setSelectedPipeline(pipeline)
              }
            }}>
              <CardContent className="p-4">
                {renamingId === pipeline.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleRename} disabled={renameSaving || !renameValue.trim()}>
                      {renameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRenamingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pipeline.name}</span>
                        {pipeline.is_default && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Par défaut
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pipeline.stage_count} étape{pipeline.stage_count !== 1 ? "s" : ""} · {pipeline.deal_count} deal{pipeline.deal_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!pipeline.is_default && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(pipeline.id)} title="Définir par défaut">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRenamingId(pipeline.id); setRenameValue(pipeline.name) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {pipelines.length > 1 && (
                        <Dialog open={deletePipelineDialogId === pipeline.id} onOpenChange={(open) => {
                          setDeletePipelineDialogId(open ? pipeline.id : null)
                          if (!open) setDeletePipelineMigrateTo("")
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Supprimer le pipeline</DialogTitle>
                            </DialogHeader>
                            {pipeline.deal_count > 0 ? (
                              <div className="space-y-3">
                                <p className="text-muted-foreground text-sm">
                                  Ce pipeline contient <strong>{pipeline.deal_count} deal{pipeline.deal_count !== 1 ? "s" : ""}</strong>. Choisissez un pipeline de destination :
                                </p>
                                <select
                                  value={deletePipelineMigrateTo}
                                  onChange={(e) => setDeletePipelineMigrateTo(e.target.value)}
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                  <option value="">-- Sélectionner --</option>
                                  {pipelines.filter((p) => p.id !== pipeline.id).map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                Êtes-vous sûr de vouloir supprimer le pipeline <strong>{pipeline.name}</strong> ?
                              </p>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                              <Button variant="outline" onClick={() => setDeletePipelineDialogId(null)}>Annuler</Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeletePipeline}
                                disabled={deletingPipeline || (pipeline.deal_count > 0 && !deletePipelineMigrateTo)}
                              >
                                {deletingPipeline && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Supprimer
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreatePipelineDialog
        open={createPipelineOpen}
        onOpenChange={setCreatePipelineOpen}
        onCreated={() => {
          loadPipelines()
        }}
      />
    </div>
  )
}
