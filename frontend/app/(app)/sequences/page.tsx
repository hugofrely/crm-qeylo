"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchSequences, createSequence } from "@/services/sequences"
import { fetchEmailAccounts } from "@/services/emails"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/shared/PageHeader"
import {
  Plus,
  Loader2,
  Zap,
  Users,
  Reply,
} from "lucide-react"
import { toast } from "sonner"
import type { Sequence } from "@/types/sequences"
import type { EmailAccount } from "@/types"

type FilterTab = "all" | "draft" | "active" | "paused"

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  paused: "En pause",
  archived: "Archivée",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-600",
  paused: "bg-yellow-500/10 text-yellow-600",
  archived: "bg-red-500/10 text-red-600",
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "draft", label: "Brouillon" },
  { key: "active", label: "Actives" },
  { key: "paused", label: "En pause" },
]

export default function SequencesPage() {
  const router = useRouter()
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newEmailAccount, setNewEmailAccount] = useState("")
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [creating, setCreating] = useState(false)

  const loadSequences = useCallback(async () => {
    try {
      const data = await fetchSequences()
      setSequences(data)
    } catch {
      console.error("Failed to fetch sequences")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSequences()
  }, [loadSequences])

  useEffect(() => {
    if (createDialogOpen) {
      fetchEmailAccounts()
        .then(setEmailAccounts)
        .catch(() => {})
    }
  }, [createDialogOpen])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const data = await createSequence({
        name: newName.trim(),
        description: newDescription.trim(),
        email_account: newEmailAccount || null,
      })
      setCreateDialogOpen(false)
      setNewName("")
      setNewDescription("")
      setNewEmailAccount("")
      router.push(`/sequences/${data.id}`)
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setCreating(false)
    }
  }

  const filtered = filter === "all"
    ? sequences
    : sequences.filter((s) => s.status === filter)

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader
        title="Séquences"
        subtitle="Automatisez vos séquences d'emails de prospection"
      >
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle séquence
        </Button>
      </PageHeader>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Zap className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Aucune séquence</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((seq) => (
            <div
              key={seq.id}
              onClick={() => router.push(`/sequences/${seq.id}`)}
              className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-medium text-sm truncate">{seq.name}</h3>
                <span
                  className={`shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[seq.status] || ""}`}
                >
                  {STATUS_LABELS[seq.status] || seq.status}
                </span>
              </div>
              {seq.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {seq.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {seq.stats.total_enrolled}
                </span>
                <span className="flex items-center gap-1">
                  <Reply className="h-3.5 w-3.5" />
                  {seq.stats.reply_rate.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-3">
                Par {seq.created_by_name}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle séquence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nom
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Prospection à froid"
                className="h-11 bg-secondary/30 border-border/60"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description optionnelle"
                className="h-11 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Compte email
              </Label>
              <select
                value={newEmailAccount}
                onChange={(e) => setNewEmailAccount(e.target.value)}
                className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm"
              >
                <option value="">Aucun (sélectionner plus tard)</option>
                {emailAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
