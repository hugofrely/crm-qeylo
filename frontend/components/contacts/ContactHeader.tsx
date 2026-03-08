"use client"

import { useState } from "react"
import type { Contact, ContactCategory } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Phone,
  Pencil,
  Save,
  X,
  Loader2,
  Trash2,
  Check,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

export interface ContactHeaderProps {
  contact: Contact
  availableCategories: ContactCategory[]
  editing: boolean
  saving: boolean
  hasEmailAccount: boolean
  onToggleEdit: () => void
  onSave: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onToggleCategory: (categoryId: string) => void
  onOpenActivityDialog: () => void
  onOpenEmailDialog: () => void
  onOpenCallDialog?: () => void
}

export function ContactHeader({
  contact,
  availableCategories,
  editing,
  saving,
  hasEmailAccount,
  onToggleEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleCategory,
  onOpenEmailDialog,
  onOpenCallDialog,
}: ContactHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const contactCategoryIds = (contact.categories || []).map((c) => c.id)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="font-[family-name:var(--font-body)]">Sauvegarder</span>
        </Button>
        <Button size="sm" variant="outline" onClick={onCancelEdit} className="gap-1.5">
          <X className="h-4 w-4" />
          <span className="font-[family-name:var(--font-body)]">Annuler</span>
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Avatar + Name */}
      <div className="text-center space-y-3 p-5 pb-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold mx-auto font-[family-name:var(--font-body)]">
          {contact.first_name?.[0]}{contact.last_name?.[0]}
        </div>
        <div>
          <h1 className="text-lg font-semibold font-[family-name:var(--font-body)]">
            {contact.first_name} {contact.last_name}
          </h1>
          {(contact.job_title || contact.company || contact.company_entity_name) && (
            <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
              {contact.job_title}
              {contact.job_title && (contact.company_entity_name || contact.company) ? " @ " : ""}
              {contact.company_entity && contact.company_entity_name ? (
                <Link href={`/companies/${contact.company_entity}`} className="text-primary hover:underline">
                  {contact.company_entity_name}
                </Link>
              ) : (
                contact.company
              )}
            </p>
          )}
          <p className="text-muted-foreground text-xs mt-1 font-[family-name:var(--font-body)]">
            Créé le {formatDate(contact.created_at)}
          </p>
          {contact.numeric_score != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium font-[family-name:var(--font-body)]",
                contact.lead_score === "hot"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : contact.lead_score === "warm"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}
            >
              {contact.numeric_score}/100
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {contact.email && hasEmailAccount && (
            <Button variant="outline" size="sm" onClick={onOpenEmailDialog} className="gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="font-[family-name:var(--font-body)]">Email</span>
            </Button>
          )}
          {contact.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${contact.phone}`} className="gap-1.5">
                <Phone className="h-4 w-4" />
                <span className="font-[family-name:var(--font-body)]">Appeler</span>
              </a>
            </Button>
          )}
          {onOpenCallDialog && (
            <Button variant="outline" size="sm" onClick={onOpenCallDialog} className="gap-1.5">
              <Phone className="h-4 w-4" />
              <span className="font-[family-name:var(--font-body)]">Log appel</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer le contact</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                Etes-vous sur de vouloir supprimer{" "}
                <strong>{contact.first_name} {contact.last_name}</strong> ?
                Cette action est irreversible.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Supprimer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories */}
      {availableCategories.length > 0 && (
        <div className="px-5 pb-4 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            Categories
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => {
              const isSelected = contactCategoryIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border font-[family-name:var(--font-body)] ${
                    isSelected
                      ? "border-transparent text-white"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                  style={isSelected ? { backgroundColor: cat.color } : undefined}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
