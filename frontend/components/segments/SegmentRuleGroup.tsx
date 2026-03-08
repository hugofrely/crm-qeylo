// frontend/components/segments/SegmentRuleGroup.tsx
"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { SegmentConditionRow } from "./SegmentConditionRow"
import type { SegmentRuleGroup as RuleGroupType, SegmentCondition } from "@/types"

interface Props {
  group: RuleGroupType
  onChange: (group: RuleGroupType) => void
  onRemove: () => void
  canRemove: boolean
  customFields?: { id: string; label: string; field_type: string }[]
  categories?: { id: string; name: string }[]
  companies?: { id: string; name: string }[]
  onCompanySearch?: (query: string) => void
}

export function SegmentRuleGroup({ group, onChange, onRemove, canRemove, customFields, categories, companies, onCompanySearch }: Props) {
  const t = useTranslations("segments.ruleGroup")

  const updateCondition = (index: number, condition: SegmentCondition) => {
    const conditions = [...group.conditions]
    conditions[index] = condition
    onChange({ ...group, conditions })
  }

  const removeCondition = (index: number) => {
    const conditions = group.conditions.filter((_, i) => i !== index)
    onChange({ ...group, conditions })
  }

  const addCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, { field: "", operator: "equals", value: "" }],
    })
  }

  return (
    <div className="rounded-lg border border-border/60 bg-secondary/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground font-[family-name:var(--font-body)]">
            {t("linkedBy")}
          </span>
          <select
            value={group.logic}
            onChange={(e) => onChange({ ...group, logic: e.target.value as "AND" | "OR" })}
            className="h-7 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
          >
            <option value="AND">{t("and")}</option>
            <option value="OR">{t("or")}</option>
          </select>
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {group.conditions.map((condition, index) => (
          <SegmentConditionRow
            key={index}
            condition={condition}
            onChange={(c) => updateCondition(index, c)}
            onRemove={() => removeCondition(index)}
            customFields={customFields}
            categories={categories}
            companies={companies}
            onCompanySearch={onCompanySearch}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs gap-1.5"
        onClick={addCondition}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("addCondition")}
      </Button>
    </div>
  )
}
