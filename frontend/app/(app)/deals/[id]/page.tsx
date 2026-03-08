"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { QuoteEditor } from "@/components/deals/QuoteEditor"
import { apiUploadImage } from "@/lib/api"
import { fetchDeal, updateDeal, deleteDeal, fetchPipelineStages } from "@/services/deals"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import { fetchQuotes, fetchQuote, createQuote } from "@/services/quotes"
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Phone,
  Calendar,
  Users,
} from "lucide-react"
import { EntityLink } from "@/components/shared/EntityLink"
import { CommentSection } from "@/components/collaboration/CommentSection"
import { NextActions } from "@/components/deals/NextActions"
import { LogCallDialog } from "@/components/calls/LogCallDialog"
import { CreateMeetingDialog } from "@/components/calendar/CreateMeetingDialog"
import type { Deal, Stage, QuoteListItem, Quote } from "@/types"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Envoyé", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepté", className: "bg-green-100 text-green-700" },
  refused: { label: "Refusé", className: "bg-red-100 text-red-700" },
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // Deal data
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [stages, setStages] = useState<Stage[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable fields
  const [name, setName] = useState("")
  const [stageId, setStageId] = useState("")
  const [probability, setProbability] = useState("")
  const [expectedClose, setExpectedClose] = useState("")
  const [notes, setNotes] = useState("")

  // Quotes
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null)
  const [expandedQuote, setExpandedQuote] = useState<Quote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [creatingQuote, setCreatingQuote] = useState(false)

  // Dialogs
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)

  // Tabs (managed by Shadcn Tabs)

  const loadDeal = useCallback(async () => {
    try {
      const d = await fetchDeal(id)
      setDeal(d)
      setName(d.name)
      setStageId(d.stage)
      setProbability(d.probability != null ? String(d.probability) : "")
      setExpectedClose(d.expected_close || "")
      setNotes(d.notes || "")
    } catch (err) {
      console.error("Failed to load deal:", err)
    }
  }, [id])

  const loadQuotes = useCallback(async () => {
    try {
      const q = await fetchQuotes(id)
      setQuotes(q)
    } catch (err) {
      console.error("Failed to load quotes:", err)
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([loadDeal(), loadQuotes()])
      try {
        const s = await fetchPipelineStages()
        setStages(s)
      } catch (err) {
        console.error("Failed to load stages:", err)
      }
      setLoading(false)
    }
    init()
  }, [loadDeal, loadQuotes])

  const handleExpandQuote = async (quoteId: string) => {
    if (expandedQuoteId === quoteId) {
      setExpandedQuoteId(null)
      setExpandedQuote(null)
      return
    }
    setExpandedQuoteId(quoteId)
    setLoadingQuote(true)
    try {
      const q = await fetchQuote(quoteId)
      setExpandedQuote(q)
    } catch (err) {
      console.error("Failed to load quote:", err)
    } finally {
      setLoadingQuote(false)
    }
  }

  const handleCreateQuote = async () => {
    setCreatingQuote(true)
    try {
      const newQuote = await createQuote({ deal: id })
      await loadQuotes()
      // Expand the new quote
      setExpandedQuoteId(newQuote.id)
      setExpandedQuote(newQuote)
    } catch (err) {
      console.error("Failed to create quote:", err)
    } finally {
      setCreatingQuote(false)
    }
  }

  const handleQuoteUpdate = async () => {
    await loadQuotes()
    await loadDeal()
    if (expandedQuoteId) {
      try {
        const q = await fetchQuote(expandedQuoteId)
        setExpandedQuote(q)
      } catch {
        setExpandedQuoteId(null)
        setExpandedQuote(null)
      }
    }
  }

  const handleQuoteDelete = async () => {
    setExpandedQuoteId(null)
    setExpandedQuote(null)
    await loadQuotes()
    await loadDeal()
  }

  const handleSave = async () => {
    if (!name.trim() || !stageId) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        stage: stageId,
        probability: probability ? parseInt(probability, 10) : null,
        expected_close: expectedClose || null,
        notes: notes.trim(),
      }
      await updateDeal(id, payload)
      await loadDeal()
    } catch (err) {
      console.error("Failed to save deal:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce deal ? Cette action est irréversible.")) return
    setDeleting(true)
    try {
      await deleteDeal(id)
      toast("Element supprime", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreItems("deal", [id])
              toast.success("Element restaure")
            } catch {
              toast.error("Erreur lors de la restauration")
            }
          },
        },
        duration: 5000,
      })
      router.push("/deals")
    } catch (err) {
      console.error("Failed to delete deal:", err)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Deal introuvable.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au pipeline
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up font-[family-name:var(--font-body)]">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/deals")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Retour au pipeline</span>
      </Button>

      {/* 2-column layout — stacks on mobile */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANEL — Info */}
        <div className="w-full lg:w-[340px] lg:shrink-0">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Deal header */}
            <div className="p-5 border-b border-border">
              <h1 className="text-lg font-semibold truncate">{deal.name}</h1>
              {deal.contact_name && deal.contact && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <EntityLink type="contact" id={deal.contact} name={deal.contact_name} className="text-sm" />
                </div>
              )}
              <div className="mt-3 text-xl font-semibold text-green-700">
                {formatAmount(deal.amount)}
              </div>
            </div>

            {/* Next best actions */}
            <div className="p-5 border-b border-border">
              <NextActions dealId={id} />
            </div>

            {/* Quick actions */}
            <div className="p-5 border-b border-border">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Actions rapides</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => setCallDialogOpen(true)}>
                  <Phone className="h-3.5 w-3.5" />
                  Logger un appel
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => setMeetingDialogOpen(true)}>
                  <Calendar className="h-3.5 w-3.5" />
                  Planifier un meeting
                </Button>
              </div>
            </div>

            {/* Deal fields */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="deal-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nom
                </Label>
                <Input
                  id="deal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 bg-secondary/30 border-border/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-stage" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Étape
                </Label>
                <select
                  id="deal-stage"
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-probability" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Probabilité (%)
                </Label>
                <Input
                  id="deal-probability"
                  type="number"
                  min="0"
                  max="100"
                  value={probability}
                  onChange={(e) => setProbability(e.target.value)}
                  placeholder="50"
                  className="h-9 bg-secondary/30 border-border/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deal-close" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Date de clôture prévue
                </Label>
                <Input
                  id="deal-close"
                  type="date"
                  value={expectedClose}
                  onChange={(e) => setExpectedClose(e.target.value)}
                  className="h-9 bg-secondary/30 border-border/60"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving || !name.trim() || !stageId}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — Tabs */}
        <div className="flex-1 min-w-0 w-full rounded-xl border border-border bg-card overflow-hidden">
          <Tabs defaultValue="devis">
            <div className="px-2 pt-2">
              <TabsList>
                <TabsTrigger value="devis">
                  <FileText className="h-3.5 w-3.5" />
                  Devis
                </TabsTrigger>
                <TabsTrigger value="notes">
                  Notes
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <Users className="h-3.5 w-3.5" />
                  Commentaires
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Devis tab */}
            <TabsContent value="devis" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium">
                  {quotes.length} devis
                </h2>
                <Button variant="outline" size="sm" onClick={handleCreateQuote} disabled={creatingQuote} className="gap-1.5">
                  {creatingQuote ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Nouveau devis
                </Button>
              </div>

              {quotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Aucun devis pour ce deal.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {quotes.map((q) => {
                  const config = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft
                  const isExpanded = expandedQuoteId === q.id

                  return (
                    <div key={q.id} className="rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => handleExpandQuote(q.id)}
                        className="w-full text-left p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-medium text-sm">{q.number}</span>
                          <Badge className={config.className}>{config.label}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(q.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">
                            {formatAmount(q.total_ttc)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t">
                          {loadingQuote ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : expandedQuote ? (
                            <QuoteEditor
                              quote={expandedQuote}
                              onUpdate={handleQuoteUpdate}
                              onDelete={handleQuoteDelete}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* Notes tab */}
            <TabsContent value="notes" className="p-6">
              <RichTextEditor
                content={notes}
                onChange={setNotes}
                placeholder="Notes sur ce deal..."
                minHeight="200px"
                onImageUpload={apiUploadImage}
              />
              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Enregistrer les notes
                </Button>
              </div>
            </TabsContent>
            {/* Comments tab */}
            <TabsContent value="comments" className="p-6">
              <CommentSection entityType="deal" entityId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <LogCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        dealId={id}
        contactId={deal.contact || undefined}
        contactName={deal.contact_name || undefined}
        onSuccess={() => loadDeal()}
      />

      <CreateMeetingDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        dealId={id}
        contactId={deal.contact || undefined}
        contactName={deal.contact_name || undefined}
        onSuccess={() => loadDeal()}
      />
    </div>
  )
}
