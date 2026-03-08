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
import { useTranslations } from "next-intl"
import type { Contact } from "@/types"

const RELATIONSHIP_TYPE_KEYS = [
  "reports_to",
  "manages",
  "assistant_of",
  "colleague",
  "decision_maker",
  "influencer",
  "champion",
  "blocker",
] as const

interface Props {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function RelationshipDialog({ companyId, open, onOpenChange, onCreated }: Props) {
  const t = useTranslations('companies')
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
      toast.success(t('relationship.created'))
      onOpenChange(false)
      onCreated()
      setFromContact("")
      setToContact("")
      setRelType("")
      setNotes("")
    } catch {
      toast.error(t('relationship.createError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('relationship.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('relationship.fromContact')}</Label>
            <Select value={fromContact} onValueChange={setFromContact}>
              <SelectTrigger>
                <SelectValue placeholder={t('relationship.selectContact')} />
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
            <Label>{t('relationship.relationType')}</Label>
            <Select value={relType} onValueChange={setRelType}>
              <SelectTrigger>
                <SelectValue placeholder={t('relationship.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`relationship.types.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('relationship.toContact')}</Label>
            <Select value={toContact} onValueChange={setToContact}>
              <SelectTrigger>
                <SelectValue placeholder={t('relationship.selectContact')} />
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
            <Label>{t('relationship.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('relationship.notesPlaceholder')}
            />
          </div>
          <Button onClick={handleSubmit} disabled={saving || !fromContact || !toContact || !relType} className="w-full">
            {saving ? t('relationship.creating') : t('relationship.createButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
