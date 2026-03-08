"use client"

import { useState, useEffect } from "react"
import { Route, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  fetchRoutingRules,
  createRoutingRule,
  deleteRoutingRule,
  updateRoutingRule,
  fetchRoundRobinState,
  updateRoundRobinState,
} from "@/services/routing"
import { fetchMembers } from "@/services/organizations"
import type { LeadRoutingRule } from "@/types/contacts"
import { toast } from "sonner"

interface RoutingSettingsProps {
  orgId: string
}

interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function RoutingSettings({ orgId }: RoutingSettingsProps) {
  const [rules, setRules] = useState<LeadRoutingRule[]>([])
  const [eligibleIds, setEligibleIds] = useState<string[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAssignTo, setNewAssignTo] = useState("")
  const [newConditionField, setNewConditionField] = useState("source")
  const [newConditionValue, setNewConditionValue] = useState("")

  useEffect(() => {
    Promise.all([
      fetchRoutingRules(),
      fetchRoundRobinState(),
      fetchMembers(orgId),
    ]).then(([rulesData, rrState, membersData]) => {
      setRules(rulesData)
      setEligibleIds(rrState.eligible_user_ids)
      setMembers(membersData.members)
    }).catch(() => {
      toast.error("Erreur lors du chargement")
    }).finally(() => setLoading(false))
  }, [orgId])

  const handleToggleEligible = async (userId: string, checked: boolean) => {
    const newIds = checked
      ? [...eligibleIds, userId]
      : eligibleIds.filter((id) => id !== userId)
    setEligibleIds(newIds)
    try {
      await updateRoundRobinState(newIds)
    } catch {
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleCreateRule = async () => {
    if (!newName || !newAssignTo || !newConditionValue) {
      toast.error("Remplissez tous les champs")
      return
    }
    setSaving(true)
    try {
      const rule = await createRoutingRule({
        name: newName,
        priority: rules.length,
        conditions: { [newConditionField]: newConditionValue },
        assign_to: newAssignTo,
        is_active: true,
      })
      setRules((prev) => [...prev, rule])
      setShowForm(false)
      setNewName("")
      setNewAssignTo("")
      setNewConditionValue("")
      toast.success("Règle créée")
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRoutingRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success("Règle supprimée")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleToggleRule = async (rule: LeadRoutingRule) => {
    try {
      await updateRoutingRule(rule.id, { is_active: !rule.is_active })
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      )
    } catch {
      toast.error("Erreur lors de la mise à jour")
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
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl tracking-tight">Lead routing</h2>
            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
              Assignation automatique des nouveaux contacts
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 font-[family-name:var(--font-body)]">
        {/* Round Robin */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
            Round-robin — Membres éligibles
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Les nouveaux leads sans règle spécifique seront distribués tour à tour entre ces membres.
          </p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={eligibleIds.includes(m.user_id)}
                    onCheckedChange={(checked) => handleToggleEligible(m.user_id, !!checked)}
                  />
                  <span className="text-sm">
                    {m.first_name} {m.last_name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Règles prioritaires
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </div>

          {rules.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground italic">
              Aucune règle. Le round-robin sera utilisé pour tous les leads.
            </p>
          )}

          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={rule.is_active}
                    onCheckedChange={() => handleToggleRule(rule)}
                  />
                  <div>
                    <p className="text-sm font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(rule.conditions).map(([k, v]) => `${k} = ${v}`).join(", ")}
                      {" → "}
                      {rule.assign_to_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom de la règle</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Leads tech → Paul"
                  className="h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Condition</Label>
                  <select
                    value={newConditionField}
                    onChange={(e) => setNewConditionField(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="source">Source</option>
                    <option value="industry">Industrie</option>
                    <option value="country">Pays</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Valeur</Label>
                  <Input
                    value={newConditionValue}
                    onChange={(e) => setNewConditionValue(e.target.value)}
                    placeholder="Ex: website"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Assigner à</Label>
                <select
                  value={newAssignTo}
                  onChange={(e) => setNewAssignTo(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Sélectionner un membre</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleCreateRule} disabled={saving}>
                  {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Créer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
