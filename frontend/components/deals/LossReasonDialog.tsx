"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { fetchLossReasons, updateDeal } from "@/services/deals"
import { useTranslations } from "next-intl"
import type { DealLossReason } from "@/types"

interface LossReasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dealId: string
  newStageId: string
  onConfirm: () => void
  onCancel: () => void
}

export function LossReasonDialog({
  open,
  onOpenChange,
  dealId,
  newStageId,
  onConfirm,
  onCancel,
}: LossReasonDialogProps) {
  const t = useTranslations("deals")
  const [reasons, setReasons] = useState<DealLossReason[]>([])
  const [selectedReason, setSelectedReason] = useState("")
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLossReasons().then(setReasons).catch(() => {})
      setSelectedReason("")
      setComment("")
    }
  }, [open])

  const handleConfirm = async () => {
    if (!selectedReason) return
    setSaving(true)
    try {
      await updateDeal(dealId, {
        stage: newStageId,
        loss_reason: selectedReason,
        loss_comment: comment,
      })
      onConfirm()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save loss reason:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("lossReasonTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 font-[family-name:var(--font-body)]">
          <div className="space-y-1.5">
            <Label>{t("lossReasonLabel")}</Label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className={selectClass}
            >
              <option value="">{t("lossReasonPlaceholder")}</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("lossCommentLabel")}</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("lossCommentPlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>{t("lossCancel")}</Button>
          <Button onClick={handleConfirm} disabled={!selectedReason || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("lossConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
