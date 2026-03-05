"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Trash2,
  Save,
  Copy,
  Send,
  Check,
  X,
  Plus,
} from "lucide-react"
import {
  updateQuote,
  deleteQuote,
  duplicateQuote,
  sendQuote,
  acceptQuote,
  refuseQuote,
} from "@/services/quotes"
import type { Quote, QuoteLine } from "@/types"

interface QuoteEditorProps {
  quote: Quote
  onUpdate: () => void
  onDelete: () => void
}

const STATUS_CONFIG: Record<
  Quote["status"],
  { label: string; className: string }
> = {
  draft: { label: "Brouillon", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Envoyé", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepté", className: "bg-green-100 text-green-700" },
  refused: { label: "Refusé", className: "bg-red-100 text-red-700" },
}

const UNIT_OPTIONS: { value: QuoteLine["unit"]; label: string }[] = [
  { value: "unit", label: "Unité" },
  { value: "hour", label: "Heure" },
  { value: "day", label: "Jour" },
  { value: "fixed", label: "Forfait" },
]

function toNum(v: string | number): number {
  const n = typeof v === "string" ? parseFloat(v) : v
  return isNaN(n) ? 0 : n
}

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

function emptyLine(order: number): QuoteLine {
  return {
    description: "",
    quantity: 1,
    unit_price: 0,
    unit: "unit",
    tax_rate: 20,
    discount_percent: 0,
    discount_amount: 0,
    order,
  }
}

export function QuoteEditor({ quote, onUpdate, onDelete }: QuoteEditorProps) {
  const [lines, setLines] = useState<QuoteLine[]>(
    quote.lines.length > 0 ? quote.lines : [emptyLine(0)]
  )
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(
    toNum(quote.global_discount_percent)
  )
  const [validUntil, setValidUntil] = useState(quote.valid_until || "")
  const [notes, setNotes] = useState(quote.notes || "")
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const statusConfig = STATUS_CONFIG[quote.status]

  // Calculations
  const calculations = useMemo(() => {
    let subtotalHt = 0
    let totalTax = 0

    const lineCalcs = lines.map((line) => {
      const qty = toNum(line.quantity)
      const price = toNum(line.unit_price)
      const discPct = toNum(line.discount_percent)
      const taxRate = toNum(line.tax_rate)

      const lineSubtotal = qty * price
      const lineDiscount = lineSubtotal * (discPct / 100)
      const lineHt = lineSubtotal - lineDiscount
      const lineTax = lineHt * (taxRate / 100)

      subtotalHt += lineSubtotal
      totalTax += lineTax

      return { lineHt, lineSubtotal, lineDiscount, lineTax }
    })

    const globalDiscount = subtotalHt * (globalDiscountPercent / 100)
    const totalHt = subtotalHt - globalDiscount
    // Recalculate tax after global discount
    const adjustedTotalTax =
      globalDiscountPercent > 0
        ? totalTax * (1 - globalDiscountPercent / 100)
        : totalTax
    const totalTtc = totalHt + adjustedTotalTax

    return {
      lineCalcs,
      subtotalHt,
      globalDiscount,
      totalHt,
      totalTax: adjustedTotalTax,
      totalTtc,
    }
  }, [lines, globalDiscountPercent])

  const updateLine = useCallback(
    (index: number, field: keyof QuoteLine, value: string | number) => {
      setLines((prev) => {
        const updated = [...prev]
        updated[index] = { ...updated[index], [field]: value }
        return updated
      })
    },
    []
  )

  const removeLine = useCallback((index: number) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i }))
    })
  }, [])

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine(prev.length)])
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateQuote(quote.id, {
        lines: lines.map((l, i) => ({
          ...l,
          order: i,
          quantity: toNum(l.quantity),
          unit_price: toNum(l.unit_price),
          tax_rate: toNum(l.tax_rate),
          discount_percent: toNum(l.discount_percent),
          discount_amount: 0,
        })),
        global_discount_percent: globalDiscountPercent,
        valid_until: validUntil || null,
        notes,
      })
      onUpdate()
    } catch (err) {
      console.error("Failed to save quote:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (
    action: string,
    fn: (id: string) => Promise<unknown>
  ) => {
    if (
      action === "delete" &&
      !window.confirm("Supprimer ce devis ? Cette action est irréversible.")
    )
      return
    setActionLoading(action)
    try {
      await fn(quote.id)
      if (action === "delete") {
        onDelete()
      } else {
        onUpdate()
      }
    } catch (err) {
      console.error(`Failed to ${action} quote:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-4 p-4 font-[family-name:var(--font-body)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{quote.number}</span>
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`valid-${quote.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
            Valide jusqu&apos;au
          </Label>
          <Input
            id={`valid-${quote.id}`}
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-40 h-8 text-xs"
          />
        </div>
      </div>

      {/* Lines table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 min-w-[200px]">Description</th>
              <th className="pb-2 px-2 w-20">Qté</th>
              <th className="pb-2 px-2 w-28">Prix unit.</th>
              <th className="pb-2 px-2 w-24">Unité</th>
              <th className="pb-2 px-2 w-20">TVA%</th>
              <th className="pb-2 px-2 w-20">Remise%</th>
              <th className="pb-2 px-2 w-28 text-right">Total HT</th>
              <th className="pb-2 pl-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-b border-border/40">
                <td className="py-1.5 pr-2">
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                    placeholder="Description du produit/service"
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, "quantity", e.target.value)}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <select
                    value={line.unit}
                    onChange={(e) =>
                      updateLine(index, "unit", e.target.value as QuoteLine["unit"])
                    }
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={line.tax_rate}
                    onChange={(e) => updateLine(index, "tax_rate", e.target.value)}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={line.discount_percent}
                    onChange={(e) =>
                      updateLine(index, "discount_percent", e.target.value)
                    }
                    className="h-8 text-xs"
                  />
                </td>
                <td className="py-1.5 px-2 text-right text-xs font-medium whitespace-nowrap">
                  {formatEur(calculations.lineCalcs[index]?.lineHt ?? 0)}
                </td>
                <td className="py-1.5 pl-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeLine(index)}
                    disabled={lines.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={addLine} className="text-xs">
        <Plus className="h-3.5 w-3.5 mr-1" />
        Ajouter une ligne
      </Button>

      {/* Global discount + totals */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Remise globale (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={globalDiscountPercent}
            onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
            className="w-20 h-8 text-xs text-right"
          />
        </div>

        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span>{formatEur(calculations.subtotalHt)}</span>
          </div>
          {globalDiscountPercent > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Remise globale</span>
              <span>-{formatEur(calculations.globalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium">{formatEur(calculations.totalHt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">TVA</span>
            <span>{formatEur(calculations.totalTax)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>Total TTC</span>
            <span>{formatEur(calculations.totalTtc)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes du devis..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            Enregistrer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("duplicate", duplicateQuote)}
            disabled={!!actionLoading}
          >
            {actionLoading === "duplicate" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            Dupliquer
          </Button>
          {quote.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("send", sendQuote)}
              disabled={!!actionLoading}
            >
              {actionLoading === "send" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              Envoyer
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-green-700 hover:text-green-800"
                onClick={() => handleAction("accept", acceptQuote)}
                disabled={!!actionLoading}
              >
                {actionLoading === "accept" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                Accepter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-700 hover:text-red-800"
                onClick={() => handleAction("refuse", refuseQuote)}
                disabled={!!actionLoading}
              >
                {actionLoading === "refuse" ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5 mr-1" />
                )}
                Refuser
              </Button>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => handleAction("delete", deleteQuote)}
          disabled={!!actionLoading}
        >
          {actionLoading === "delete" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 mr-1" />
          )}
          Supprimer
        </Button>
      </div>
    </div>
  )
}
