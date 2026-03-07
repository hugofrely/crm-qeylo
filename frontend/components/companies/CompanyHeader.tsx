"use client"

import { useState } from "react"
import type { Company } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Pencil,
  Save,
  X,
  Loader2,
  Trash2,
} from "lucide-react"
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

function getHealthBadge(score: string) {
  switch (score) {
    case "excellent":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Excellent</Badge>
    case "good":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Bon</Badge>
    case "at_risk":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">A risque</Badge>
    case "churned":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Churned</Badge>
    default:
      return null
  }
}

export interface CompanyHeaderProps {
  company: Company
  editing: boolean
  saving: boolean
  onToggleEdit: () => void
  onSave: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

export function CompanyHeader({
  company,
  editing,
  saving,
  onToggleEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: CompanyHeaderProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      {/* Icon + Name */}
      <div className="text-center space-y-3 p-5 pb-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Building2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-lg font-semibold font-[family-name:var(--font-body)]">
            {company.name}
          </h1>
          {company.industry && (
            <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
              {company.industry}
            </p>
          )}
          {company.health_score && (
            <div className="mt-2 flex justify-center">
              {getHealthBadge(company.health_score)}
            </div>
          )}
          <p className="text-muted-foreground text-xs mt-2 font-[family-name:var(--font-body)]">
            Cree le {formatDate(company.created_at)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 pt-1">
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
                <DialogTitle>Supprimer l'entreprise</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                Etes-vous sur de vouloir supprimer{" "}
                <strong>{company.name}</strong> ?
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
    </>
  )
}
