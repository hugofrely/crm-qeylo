"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Loader2, MoreHorizontal, Pencil, Star, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { KanbanBoard } from "@/components/deals/KanbanBoard"
import { CreatePipelineDialog } from "@/components/deals/CreatePipelineDialog"
import { usePipelines } from "@/hooks/useDeals"
import { updatePipeline, deletePipeline } from "@/services/deals"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

export default function DealsPage() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false)
  const { pipelines, loading: pipelinesLoading, refresh: refreshPipelines } = usePipelines()
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [deleteMigrateTo, setDeleteMigrateTo] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0]
      setSelectedPipelineId(defaultPipeline.id)
    }
  }, [pipelines, selectedPipelineId])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleRename = async () => {
    if (!renamingId || !renameValue.trim()) return
    setRenameSaving(true)
    try {
      await updatePipeline(renamingId, { name: renameValue.trim() })
      setRenamingId(null)
      refreshPipelines()
    } catch (err) {
      console.error("Failed to rename pipeline:", err)
    } finally {
      setRenameSaving(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await updatePipeline(id, { is_default: true })
      refreshPipelines()
    } catch (err) {
      console.error("Failed to set default:", err)
    }
  }

  const handleDeletePipeline = async () => {
    if (!deleteDialogId) return
    setDeleting(true)
    try {
      const pipeline = pipelines.find((p) => p.id === deleteDialogId)
      if (pipeline && pipeline.deal_count > 0 && !deleteMigrateTo) return
      await deletePipeline(deleteDialogId, deleteMigrateTo || undefined)
      if (selectedPipelineId === deleteDialogId) {
        setSelectedPipelineId(null)
      }
      setDeleteDialogId(null)
      setDeleteMigrateTo("")
      refreshPipelines()
    } catch (err) {
      console.error("Failed to delete pipeline:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const deletePipelineData = pipelines.find((p) => p.id === deleteDialogId)

  return (
    <div className="p-8 lg:p-12 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Gérez vos deals par étape du pipeline
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau deal
        </Button>
      </div>

      {/* Pipeline tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {pipelines.map((p) => (
          <div key={p.id} className="group relative shrink-0 flex items-center -mb-px">
            {renamingId === p.id ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <Input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename()
                    if (e.key === "Escape") setRenamingId(null)
                  }}
                  className="h-7 w-32 text-sm"
                  disabled={renameSaving}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename} disabled={renameSaving || !renameValue.trim()}>
                  {renameSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSelectedPipelineId(p.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 font-[family-name:var(--font-body)] ${
                    selectedPipelineId === p.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {p.name}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-muted -ml-1 mr-1">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => { setRenamingId(p.id); setRenameValue(p.name) }}>
                      <Pencil className="h-4 w-4" />
                      Renommer
                    </DropdownMenuItem>
                    {!p.is_default && (
                      <DropdownMenuItem onClick={() => handleSetDefault(p.id)}>
                        <Star className="h-4 w-4" />
                        Définir par défaut
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => router.push("/settings/pipeline")}>
                      <Settings className="h-4 w-4" />
                      Gérer les étapes
                    </DropdownMenuItem>
                    {pipelines.length > 1 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}
        <button
          onClick={() => setCreatePipelineOpen(true)}
          className="shrink-0 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Kanban Board */}
      {selectedPipelineId && (
        <KanbanBoard
          pipelineId={selectedPipelineId}
          dialogOpen={dialogOpen}
          onDialogOpenChange={setDialogOpen}
        />
      )}

      <CreatePipelineDialog
        open={createPipelineOpen}
        onOpenChange={setCreatePipelineOpen}
        onCreated={(newPipeline) => {
          refreshPipelines()
          setSelectedPipelineId(newPipeline.id)
        }}
      />

      {/* Delete pipeline dialog */}
      <Dialog open={!!deleteDialogId} onOpenChange={(open) => { if (!open) { setDeleteDialogId(null); setDeleteMigrateTo("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le pipeline</DialogTitle>
          </DialogHeader>
          {deletePipelineData && deletePipelineData.deal_count > 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Ce pipeline contient <strong>{deletePipelineData.deal_count} deal{deletePipelineData.deal_count !== 1 ? "s" : ""}</strong>. Choisissez un pipeline de destination :
              </p>
              <select
                value={deleteMigrateTo}
                onChange={(e) => setDeleteMigrateTo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">-- Sélectionner --</option>
                {pipelines.filter((p) => p.id !== deleteDialogId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Êtes-vous sûr de vouloir supprimer le pipeline <strong>{deletePipelineData?.name}</strong> ?
            </p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogId(null); setDeleteMigrateTo("") }}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleDeletePipeline}
              disabled={deleting || (!!deletePipelineData && deletePipelineData.deal_count > 0 && !deleteMigrateTo)}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
