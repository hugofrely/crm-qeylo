"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createPipeline } from "@/services/deals"
import type { Pipeline } from "@/types"

const TEMPLATES = [
  { key: "prospection", label: "Prospection", description: "6 étapes classiques de vente" },
  { key: "upsell", label: "Upsell", description: "5 étapes pour la vente additionnelle" },
  { key: "partenariats", label: "Partenariats", description: "5 étapes pour les partenariats" },
  { key: "", label: "Vide", description: "Créez vos propres étapes" },
]

interface CreatePipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (pipeline: Pipeline) => void
}

export function CreatePipelineDialog({ open, onOpenChange, onCreated }: CreatePipelineDialogProps) {
  const [name, setName] = useState("")
  const [template, setTemplate] = useState("prospection")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const pipeline = await createPipeline({
        name: name.trim(),
        ...(template ? { template } : {}),
      })
      setName("")
      setTemplate("prospection")
      onOpenChange(false)
      onCreated(pipeline)
    } catch (err) {
      console.error("Failed to create pipeline:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau pipeline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prospection B2B"
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTemplate(t.key)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    template === t.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
