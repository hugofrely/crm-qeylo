"use client"

import { useState, useEffect } from "react"
import { Flame, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchScoringRules, updateScoringRule } from "@/services/scoring"
import { fetchOrgSettings, updateOrgSettings } from "@/services/organizations"
import type { ScoringRule } from "@/types/contacts"
import { toast } from "sonner"

const EVENT_LABELS: Record<string, string> = {
  email_sent: "Email envoyé",
  email_opened: "Email ouvert",
  email_clicked: "Email cliqué",
  call_made: "Appel effectué",
  call_answered: "Appel décroché",
  deal_created: "Deal créé",
  deal_won: "Deal gagné",
  meeting: "Réunion",
  note_added: "Note ajoutée",
  task_completed: "Tâche terminée",
}

interface ScoringSettingsProps {
  orgId: string
}

export default function ScoringSettings({ orgId }: ScoringSettingsProps) {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [hotThreshold, setHotThreshold] = useState(70)
  const [warmThreshold, setWarmThreshold] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchScoringRules(),
      fetchOrgSettings(orgId),
    ]).then(([rulesData, settings]) => {
      setRules(rulesData)
      setHotThreshold((settings as Record<string, number>).scoring_hot_threshold ?? 70)
      setWarmThreshold((settings as Record<string, number>).scoring_warm_threshold ?? 30)
    }).catch(() => {
      toast.error("Erreur lors du chargement des règles de scoring")
    }).finally(() => setLoading(false))
  }, [orgId])

  const handlePointsChange = async (rule: ScoringRule, points: number) => {
    setSaving(true)
    try {
      await updateScoringRule(rule.id, { points })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, points } : r)))
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (rule: ScoringRule, is_active: boolean) => {
    setSaving(true)
    try {
      await updateScoringRule(rule.id, { is_active })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active } : r)))
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  const handleThresholdSave = async () => {
    setSaving(true)
    try {
      await updateOrgSettings(orgId, {
        scoring_hot_threshold: hotThreshold,
        scoring_warm_threshold: warmThreshold,
      } as Record<string, unknown>)
      toast.success("Seuils mis à jour")
    } catch {
      toast.error("Erreur lors de la mise à jour")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl tracking-tight">Lead scoring</h2>
            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
              Attribuez des points automatiquement selon les activités des contacts
            </p>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
        </div>
      </div>

      <div className="p-6 space-y-6 font-[family-name:var(--font-body)]">
        {/* Scoring rules */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Points par activité
          </p>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggle(rule, !!checked)}
                  />
                  <span className="text-sm">{EVENT_LABELS[rule.event_type] || rule.event_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={rule.points}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val)) {
                        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, points: val } : r)))
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val)) handlePointsChange(rule, val)
                    }}
                    className="w-20 h-8 text-center text-sm"
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Thresholds */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Seuils de qualification
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                Chaud (HOT) ≥
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={hotThreshold}
                onChange={(e) => setHotThreshold(parseInt(e.target.value, 10) || 0)}
                onBlur={handleThresholdSave}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
                Tiède (WARM) ≥
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={warmThreshold}
                onChange={(e) => setWarmThreshold(parseInt(e.target.value, 10) || 0)}
                onBlur={handleThresholdSave}
                className="h-8"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            En dessous de {warmThreshold} = Froid (COLD)
          </p>
        </div>
      </div>
    </div>
  )
}
