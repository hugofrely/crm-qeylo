"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Users } from "lucide-react"
import { SegmentRuleGroup } from "./SegmentRuleGroup"
import { previewSegment } from "@/services/segments"
import { fetchCustomFieldDefinitions, fetchContactCategories } from "@/services/contacts"
import { fetchCompanies } from "@/services/companies"
import type { Segment, SegmentRules, SegmentRuleGroup as RuleGroupType } from "@/types"

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"]

const DEFAULT_RULES: SegmentRules = {
  logic: "AND",
  groups: [{ logic: "AND", conditions: [{ field: "", operator: "equals", value: "" }] }],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment?: Segment | null
  onSave: (data: Partial<Segment>) => Promise<void>
}

export function SegmentBuilder({ open, onOpenChange, segment, onSave }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [icon, setIcon] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [rules, setRules] = useState<SegmentRules>(DEFAULT_RULES)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customFields, setCustomFields] = useState<{ id: string; label: string; field_type: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [companyResults, setCompanyResults] = useState<{ id: string; name: string }[]>([])

  const handleCompanySearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCompanyResults([])
      return
    }
    try {
      const data = await fetchCompanies({ search: query })
      setCompanyResults(data.results.map((c) => ({ id: c.id, name: c.name })))
    } catch {
      setCompanyResults([])
    }
  }, [])

  useEffect(() => {
    if (open) {
      if (segment) {
        setName(segment.name)
        setDescription(segment.description)
        setColor(segment.color)
        setIcon(segment.icon)
        setIsPinned(segment.is_pinned)
        setRules(segment.rules)
      } else {
        setName("")
        setDescription("")
        setColor("#3b82f6")
        setIcon("")
        setIsPinned(false)
        setRules(DEFAULT_RULES)
      }
      setPreviewCount(null)
      fetchCustomFieldDefinitions().then((defs) =>
        setCustomFields(defs.map((d) => ({ id: d.id, label: d.label, field_type: d.field_type })))
      ).catch(() => {})
      fetchContactCategories().then((cats) =>
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })))
      ).catch(() => {})
    }
  }, [open, segment])

  const loadPreview = useCallback(async () => {
    const hasConditions = rules.groups.some((g) => g.conditions.some((c) => c.field))
    if (!hasConditions) {
      setPreviewCount(null)
      return
    }
    setPreviewLoading(true)
    try {
      const result = await previewSegment(rules)
      setPreviewCount(result.count)
    } catch {
      setPreviewCount(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [rules])

  useEffect(() => {
    const timer = setTimeout(loadPreview, 500)
    return () => clearTimeout(timer)
  }, [loadPreview])

  const updateGroup = (index: number, group: RuleGroupType) => {
    const groups = [...rules.groups]
    groups[index] = group
    setRules({ ...rules, groups })
  }

  const removeGroup = (index: number) => {
    const groups = rules.groups.filter((_, i) => i !== index)
    setRules({ ...rules, groups })
  }

  const addGroup = () => {
    setRules({
      ...rules,
      groups: [...rules.groups, { logic: "AND", conditions: [{ field: "", operator: "equals", value: "" }] }],
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        is_pinned: isPinned,
        rules,
      })
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to save segment:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{segment ? "Modifier le segment" : "Nouveau segment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Name & description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Nom
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contacts chauds ce mois"
                className="h-10 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionnel..."
                className="h-10 bg-secondary/30 border-border/60"
              />
            </div>
          </div>

          {/* Color & pinned */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Couleur
              </Label>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                id="is_pinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_pinned" className="text-sm font-[family-name:var(--font-body)]">
                Epingler dans les contacts
              </Label>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                Regles
              </Label>
              {rules.groups.length > 1 && (
                <select
                  value={rules.logic}
                  onChange={(e) => setRules({ ...rules, logic: e.target.value as "AND" | "OR" })}
                  className="h-7 rounded-md border border-border/60 bg-secondary/30 px-2 text-xs font-medium"
                >
                  <option value="AND">Tous les groupes (ET)</option>
                  <option value="OR">Au moins un groupe (OU)</option>
                </select>
              )}
            </div>

            {rules.groups.map((group, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="flex items-center justify-center py-1">
                    <span className="text-xs font-medium text-muted-foreground bg-background px-2">
                      {rules.logic === "AND" ? "ET" : "OU"}
                    </span>
                  </div>
                )}
                <SegmentRuleGroup
                  group={group}
                  onChange={(g) => updateGroup(index, g)}
                  onRemove={() => removeGroup(index)}
                  canRemove={rules.groups.length > 1}
                  customFields={customFields}
                  categories={categories}
                  companies={companyResults}
                  onCompanySearch={handleCompanySearch}
                />
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={addGroup}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un groupe
            </Button>
          </div>

          {/* Preview count */}
          <div className="flex items-center gap-2 rounded-lg bg-secondary/30 px-4 py-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-[family-name:var(--font-body)]">
              {previewLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calcul...
                </span>
              ) : previewCount !== null ? (
                <span>
                  <strong>{previewCount}</strong> contact{previewCount !== 1 ? "s" : ""} correspondent
                </span>
              ) : (
                <span className="text-muted-foreground">Definissez des regles pour voir le nombre de contacts</span>
              )}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {segment ? "Enregistrer" : "Creer le segment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
