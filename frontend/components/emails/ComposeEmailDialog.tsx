"use client"

import { useState, useEffect } from "react"
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
import { fetchEmailAccounts, sendEmail } from "@/services/emails"
import { toast } from "sonner"
import { Send, Loader2 } from "lucide-react"
import type { EmailAccount } from "@/types"

interface ComposeEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactEmail: string
  contactName: string
  onSent?: () => void
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  contactId,
  contactEmail,
  contactName,
  onSent,
}: ComposeEmailDialogProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedProvider, setSelectedProvider] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      fetchEmailAccounts()
        .then((data) => {
          setAccounts(data.filter((a) => a.is_active))
          if (data.length === 1) {
            setSelectedProvider(data[0].provider)
          }
        })
        .catch(() => {})
    }
  }, [open])

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Remplissez l'objet et le corps de l'email")
      return
    }

    setSending(true)
    try {
      const bodyHtml = body
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("")

      await sendEmail({
        contact_id: contactId,
        subject,
        body_html: bodyHtml,
        ...(selectedProvider && { provider: selectedProvider }),
      })

      toast.success(`Email envoye a ${contactName}`)
      setSubject("")
      setBody("")
      onOpenChange(false)
      onSent?.()
    } catch {
      toast.error("Erreur lors de l'envoi de l'email")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer un email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-[family-name:var(--font-body)]">
          {accounts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.provider}>
                      {acc.email_address} ({acc.provider === "gmail" ? "Gmail" : "Outlook"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">A</Label>
            <Input value={contactEmail} disabled className="bg-secondary/30" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Objet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ecrivez votre message..."
              rows={8}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
