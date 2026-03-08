"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiUploadImage } from "@/lib/api"
import { createDeal, updateDeal, deleteDeal } from "@/services/deals"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import posthog from "posthog-js"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { handleQuotaError } from "@/lib/quota-error"
import { useTranslations } from "next-intl"
import type { Deal, Stage } from "@/types"

interface DealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal?: Deal | null
  stages: Stage[]
  defaultStageId?: string
  onSuccess: () => void
}

export function DealDialog({
  open,
  onOpenChange,
  deal,
  stages,
  defaultStageId,
  onSuccess,
}: DealDialogProps) {
  const t = useTranslations("deals")
  const isEditing = !!deal

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [stageId, setStageId] = useState("")
  const [contactId, setContactId] = useState("")
  const [contactLabel, setContactLabel] = useState("")
  const [probability, setProbability] = useState("")
  const [expectedClose, setExpectedClose] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const contactAutocomplete = useContactAutocomplete()

  useEffect(() => {
    if (open) {
      if (deal) {
        setName(deal.name)
        setAmount(String(deal.amount))
        setStageId(deal.stage)
        setContactId(deal.contact || "")
        setContactLabel(deal.contact_name || "")
        setProbability(deal.probability != null ? String(deal.probability) : "")
        setExpectedClose(deal.expected_close || "")
        setNotes(deal.notes || "")
      } else {
        setName("")
        setAmount("")
        setStageId(defaultStageId || stages[0]?.id || "")
        setContactId("")
        setContactLabel("")
        setProbability("")
        setExpectedClose("")
        setNotes("")
      }
      contactAutocomplete.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal, defaultStageId, stages])

  const handleSave = async () => {
    if (!name.trim() || !stageId) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        stage: stageId,
        contact: contactId || null,
        probability: probability ? parseInt(probability, 10) : null,
        expected_close: expectedClose || null,
        notes: notes.trim(),
      }

      if (isEditing) {
        await updateDeal(deal!.id, payload)
        posthog.capture("deal_edited", { amount: payload.amount })
      } else {
        await createDeal(payload)
        posthog.capture("deal_created", { amount: payload.amount, has_contact: !!payload.contact })
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      if (handleQuotaError(err)) return
      console.error("Failed to save deal:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deal) return
    if (!window.confirm(t("confirmDeleteDeal"))) return
    setDeleting(true)
    try {
      const dealId = deal.id
      await deleteDeal(dealId)
      posthog.capture("deal_deleted")
      toast(t("elementDeleted"), {
        action: {
          label: t("cancel"),
          onClick: async () => {
            try {
              await restoreItems("deal", [dealId])
              toast.success(t("elementRestored"))
              onSuccess()
            } catch {
              toast.error(t("restoreError"))
            }
          },
        },
        duration: 5000,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error("Failed to delete deal:", err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("dialogTitleEdit") : t("dialogTitleNew")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-[family-name:var(--font-body)]">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-name">{t("dialogDealName")}</Label>
            <Input
              id="deal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogDealNamePlaceholder")}
            />
          </div>

          {/* Montant + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-amount">{t("dialogAmount")}</Label>
              <Input
                id="deal-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-stage">{t("dialogStage")}</Label>
              <select
                id="deal-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact autocomplete */}
          <div className="space-y-1.5">
            <Label>{t("dialogAssociatedContact")}</Label>
            <div ref={contactAutocomplete.wrapperRef} className="relative">
              {contactId ? (
                <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                  <span>{contactLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContactId("")
                      setContactLabel("")
                      contactAutocomplete.reset()
                    }}
                    className="ml-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={contactAutocomplete.query}
                    onChange={(e) => contactAutocomplete.search(e.target.value)}
                    onFocus={() => {
                      if (contactAutocomplete.results.length > 0) contactAutocomplete.setOpen(true)
                    }}
                    placeholder={t("searchContactPlaceholder")}
                    className="pl-8"
                  />
                  {contactAutocomplete.searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
              {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                  {contactAutocomplete.results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setContactId(c.id)
                        setContactLabel(`${c.first_name} ${c.last_name}`)
                        contactAutocomplete.reset()
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                    >
                      {c.first_name} {c.last_name}
                    </button>
                  ))}
                </div>
              )}
              {contactAutocomplete.open && contactAutocomplete.query && !contactAutocomplete.searching && contactAutocomplete.results.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                  {t("noContactFound")}
                </div>
              )}
            </div>
          </div>

          {/* Probabilité + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-probability">{t("dialogProbability")}</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-close-date">{t("dialogCloseDate")}</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-notes">{t("dialogNotes")}</Label>
            <RichTextEditor
              content={notes}
              onChange={setNotes}
              placeholder={t("dialogNotesPlaceholder")}
              minHeight="80px"
              onImageUpload={apiUploadImage}
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isEditing ? (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("dialogDelete")}
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !stageId || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? t("dialogSave") : t("dialogCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
