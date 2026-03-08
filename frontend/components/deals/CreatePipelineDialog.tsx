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
import { handleQuotaError } from "@/lib/quota-error"
import { useTranslations } from "next-intl"
import type { Pipeline } from "@/types"

interface CreatePipelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (pipeline: Pipeline) => void
}

export function CreatePipelineDialog({ open, onOpenChange, onCreated }: CreatePipelineDialogProps) {
  const t = useTranslations("deals")

  const TEMPLATES = [
    { key: "prospection", label: t("templateProspection"), description: t("templateProspectionDesc") },
    { key: "upsell", label: t("templateUpsell"), description: t("templateUpsellDesc") },
    { key: "partenariats", label: t("templatePartnerships"), description: t("templatePartnershipsDesc") },
    { key: "", label: t("templateEmpty"), description: t("templateEmptyDesc") },
  ]

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
      if (handleQuotaError(err)) return
      console.error("Failed to create pipeline:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createPipelineTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label>{t("createPipelineName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createPipelineNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("createPipelineTemplate")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => setTemplate(tpl.key)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    template === tpl.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("createPipelineCancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("createPipelineCreate")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
