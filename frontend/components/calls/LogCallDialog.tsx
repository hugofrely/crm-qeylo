"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Phone, PhoneIncoming, PhoneOutgoing, Loader2 } from "lucide-react"
import { createCall } from "@/services/calls"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LogCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId?: string
  contactName?: string
  dealId?: string
  onSuccess?: () => void
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function LogCallDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  dealId,
  onSuccess,
}: LogCallDialogProps) {
  const tCalls = useTranslations("notifications.calls")
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound")
  const [outcome, setOutcome] = useState<string>("answered")
  const [minutes, setMinutes] = useState<number>(0)
  const [seconds, setSeconds] = useState<number>(0)
  const [startedAt, setStartedAt] = useState<string>(toLocalDatetimeString(new Date()))
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!contactId) return
    setSubmitting(true)
    try {
      const durationSeconds = minutes * 60 + seconds
      await createCall({
        contact: contactId,
        deal: dealId,
        direction,
        outcome,
        duration_seconds: durationSeconds > 0 ? durationSeconds : undefined,
        started_at: new Date(startedAt).toISOString(),
        notes: notes || undefined,
      })
      toast.success("Appel enregistré")
      onSuccess?.()
      onOpenChange(false)
      // Reset form
      setDirection("outbound")
      setOutcome("answered")
      setMinutes(0)
      setSeconds(0)
      setStartedAt(toLocalDatetimeString(new Date()))
      setNotes("")
    } catch (err) {
      console.error("Failed to log call:", err)
      toast.error(tCalls("saveError"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Logger un appel
          </DialogTitle>
          {contactName && (
            <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
              {contactName}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction toggle */}
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-body)]">Direction</Label>
            <div className="flex gap-1 rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setDirection("outbound")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors font-[family-name:var(--font-body)] ${
                  direction === "outbound"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PhoneOutgoing className="h-4 w-4" />
                Sortant
              </button>
              <button
                type="button"
                onClick={() => setDirection("inbound")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors font-[family-name:var(--font-body)] ${
                  direction === "inbound"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PhoneIncoming className="h-4 w-4" />
                Entrant
              </button>
            </div>
          </div>

          {/* Outcome selector */}
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-body)]">Résultat</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="font-[family-name:var(--font-body)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="answered">Répondu</SelectItem>
                <SelectItem value="voicemail">Messagerie</SelectItem>
                <SelectItem value="no_answer">Pas de réponse</SelectItem>
                <SelectItem value="busy">Occupé</SelectItem>
                <SelectItem value="wrong_number">Mauvais numéro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-body)]">Durée</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">min</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">sec</span>
              </div>
            </div>
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-body)]">Date et heure</Label>
            <Input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="font-[family-name:var(--font-body)]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="font-[family-name:var(--font-body)]">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur l'appel..."
              rows={3}
              className="font-[family-name:var(--font-body)]"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !contactId}
            className="w-full gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span className="font-[family-name:var(--font-body)]">{tCalls("saveCall")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
