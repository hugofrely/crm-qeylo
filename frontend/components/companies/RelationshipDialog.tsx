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
import { toast } from "sonner"
import { fetchCompanyContacts, createContactRelationship } from "@/services/companies"
import type { Contact } from "@/types"

const RELATIONSHIP_TYPES = [
  { value: "reports_to", label: "Rend compte a" },
  { value: "manages", label: "Manage" },
  { value: "assistant_of", label: "Assistant de" },
  { value: "colleague", label: "Collegue" },
  { value: "decision_maker", label: "Decideur" },
  { value: "influencer", label: "Influenceur" },
  { value: "champion", label: "Champion" },
  { value: "blocker", label: "Bloqueur" },
]

interface Props {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function RelationshipDialog({ companyId, open, onOpenChange, onCreated }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [fromContact, setFromContact] = useState("")
  const [toContact, setToContact] = useState("")
  const [relType, setRelType] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetchCompanyContacts(companyId).then(setContacts)
    }
  }, [open, companyId])

  const handleSubmit = async () => {
    if (!fromContact || !toContact || !relType) return
    try {
      setSaving(true)
      await createContactRelationship(fromContact, {
        from_contact: fromContact,
        to_contact: toContact,
        relationship_type: relType,
        notes,
      })
      toast.success("Relation creee")
      onOpenChange(false)
      onCreated()
      setFromContact("")
      setToContact("")
      setRelType("")
      setNotes("")
    } catch {
      toast.error("Erreur lors de la creation")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle relation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>De (contact)</Label>
            <Select value={fromContact} onValueChange={setFromContact}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type de relation</Label>
            <Select value={relType} onValueChange={setRelType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vers (contact)</Label>
            <Select value={toContact} onValueChange={setToContact}>
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
            />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !fromContact || !toContact || !relType} className="w-full">
            {saving ? "Creation..." : "Creer la relation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
