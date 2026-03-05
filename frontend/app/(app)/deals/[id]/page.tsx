"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { QuoteEditor } from "@/components/deals/QuoteEditor"
import { apiUploadImage } from "@/lib/api"
import { fetchDeal, updateDeal, deleteDeal, fetchPipelineStages } from "@/services/deals"
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
} from "lucide-react"
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

  // Tabs
  const [activeTab, setActiveTab] = useState<"devis" | "notes">("devis")

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
    <div className="animate-fade-in-up font-[family-name:var(--font-body)]">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/deals")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Pipeline
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left content (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setActiveTab("devis")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "devis"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-1.5 -mt-0.5" />
              Devis
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "notes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Notes
            </button>
          </div>

          {/* Devis tab */}
          {activeTab === "devis" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {quotes.length} devis
                </h2>
                <Button size="sm" onClick={handleCreateQuote} disabled={creatingQuote}>
                  {creatingQuote ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Nouveau devis
                </Button>
              </div>

              {quotes.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucun devis pour ce deal.
                    </p>
                  </CardContent>
                </Card>
              )}

              {quotes.map((q) => {
                const config = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft
                const isExpanded = expandedQuoteId === q.id

                return (
                  <Card key={q.id}>
                    <button
                      onClick={() => handleExpandQuote(q.id)}
                      className="w-full text-left"
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                      </CardContent>
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
                  </Card>
                )
              })}
            </div>
          )}

          {/* Notes tab */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <RichTextEditor
                content={notes}
                onChange={setNotes}
                placeholder="Notes sur ce deal..."
                minHeight="200px"
                onImageUpload={apiUploadImage}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Enregistrer les notes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar (1/3) */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="deal-name" className="text-xs text-muted-foreground">
                  Nom
                </Label>
                <Input
                  id="deal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Stage */}
              <div className="space-y-1.5">
                <Label htmlFor="deal-stage" className="text-xs text-muted-foreground">
                  Étape
                </Label>
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

              {/* Contact (read-only) */}
              {deal.contact_name && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contact</Label>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/30 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {deal.contact_name}
                  </div>
                </div>
              )}

              {/* Amount (read-only, from quotes) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Montant</Label>
                <div className="h-9 px-3 rounded-md border border-input bg-muted/30 text-sm flex items-center font-semibold text-green-700">
                  {formatAmount(deal.amount)}
                </div>
              </div>

              {/* Probability */}
              <div className="space-y-1.5">
                <Label htmlFor="deal-probability" className="text-xs text-muted-foreground">
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
                />
              </div>

              {/* Expected close date */}
              <div className="space-y-1.5">
                <Label htmlFor="deal-close" className="text-xs text-muted-foreground">
                  Date de clôture prévue
                </Label>
                <Input
                  id="deal-close"
                  type="date"
                  value={expectedClose}
                  onChange={(e) => setExpectedClose(e.target.value)}
                />
              </div>

              {/* Notes (sidebar mini) */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <RichTextEditor
                  content={notes}
                  onChange={setNotes}
                  placeholder="Notes..."
                  minHeight="80px"
                  onImageUpload={apiUploadImage}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
