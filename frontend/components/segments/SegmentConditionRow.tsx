"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { SegmentCondition } from "@/types"

const FIELD_OPTIONS = [
  { group: "Contact", fields: [
    { value: "first_name", label: "Prenom" },
    { value: "last_name", label: "Nom" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telephone" },
    { value: "company", label: "Entreprise" },
    { value: "job_title", label: "Poste" },
    { value: "source", label: "Source" },
    { value: "lead_score", label: "Lead score" },
    { value: "city", label: "Ville" },
    { value: "country", label: "Pays" },
    { value: "industry", label: "Industrie" },
    { value: "language", label: "Langue" },
    { value: "preferred_channel", label: "Canal prefere" },
    { value: "decision_role", label: "Role de decision" },
    { value: "tags", label: "Tags" },
    { value: "categories", label: "Categories" },
    { value: "estimated_budget", label: "Budget estime" },
  ]},
  { group: "Dates", fields: [
    { value: "created_at", label: "Date de creation" },
    { value: "updated_at", label: "Date de modification" },
    { value: "birthday", label: "Anniversaire" },
  ]},
  { group: "Relations", fields: [
    { value: "deals_count", label: "Nombre de deals" },
    { value: "open_deals_count", label: "Deals ouverts" },
    { value: "tasks_count", label: "Nombre de taches" },
    { value: "open_tasks_count", label: "Taches ouvertes" },
    { value: "last_interaction_date", label: "Derniere interaction" },
    { value: "has_deal_closing_within", label: "Deal qui ferme dans" },
  ]},
]

const TEXT_OPERATORS = [
  { value: "equals", label: "est egal a" },
  { value: "not_equals", label: "n'est pas egal a" },
  { value: "contains", label: "contient" },
  { value: "not_contains", label: "ne contient pas" },
  { value: "is_empty", label: "est vide" },
  { value: "is_not_empty", label: "n'est pas vide" },
]

const SELECT_OPERATORS = [
  { value: "equals", label: "est" },
  { value: "not_equals", label: "n'est pas" },
  { value: "in", label: "est parmi" },
  { value: "not_in", label: "n'est pas parmi" },
]

const NUMERIC_OPERATORS = [
  { value: "equals", label: "est egal a" },
  { value: "not_equals", label: "n'est pas" },
  { value: "greater_than", label: "superieur a" },
  { value: "less_than", label: "inferieur a" },
  { value: "between", label: "entre" },
  { value: "is_empty", label: "est vide" },
]

const DATE_OPERATORS = [
  { value: "within_last", label: "dans les derniers" },
  { value: "within_next", label: "dans les prochains" },
  { value: "before", label: "avant le" },
  { value: "after", label: "apres le" },
  { value: "is_empty", label: "est vide" },
]

const RELATION_OPERATORS = [
  { value: "has_any", label: "a au moins 1" },
  { value: "has_none", label: "n'en a aucun" },
  { value: "greater_than", label: "plus de" },
  { value: "less_than", label: "moins de" },
  { value: "equals", label: "exactement" },
]

const LEAD_SCORE_OPTIONS = [
  { value: "hot", label: "Chaud" },
  { value: "warm", label: "Tiede" },
  { value: "cold", label: "Froid" },
]

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Telephone" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Autre" },
]

const DECISION_ROLE_OPTIONS = [
  { value: "decision_maker", label: "Decideur" },
  { value: "influencer", label: "Influenceur" },
  { value: "user", label: "Utilisateur" },
  { value: "other", label: "Autre" },
]

const DATE_FIELDS = ["created_at", "updated_at", "birthday"]
const NUMERIC_FIELDS = ["estimated_budget"]
const RELATION_FIELDS = ["deals_count", "open_deals_count", "tasks_count", "open_tasks_count", "last_interaction_date", "has_deal_closing_within"]
const SELECT_FIELDS: Record<string, { value: string; label: string }[]> = {
  lead_score: LEAD_SCORE_OPTIONS,
  preferred_channel: CHANNEL_OPTIONS,
  decision_role: DECISION_ROLE_OPTIONS,
}
const CATEGORY_OPERATORS = [
  { value: "in", label: "est parmi" },
  { value: "not_in", label: "n'est pas parmi" },
  { value: "has_any", label: "a au moins une" },
  { value: "has_none", label: "n'en a aucune" },
]

const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty", "has_any", "has_none"]

function getOperatorsForField(field: string) {
  if (field === "categories") return CATEGORY_OPERATORS
  if (DATE_FIELDS.includes(field)) return DATE_OPERATORS
  if (NUMERIC_FIELDS.includes(field)) return NUMERIC_OPERATORS
  if (RELATION_FIELDS.includes(field)) return RELATION_OPERATORS
  if (field in SELECT_FIELDS) return SELECT_OPERATORS
  return TEXT_OPERATORS
}

interface Props {
  condition: SegmentCondition
  onChange: (condition: SegmentCondition) => void
  onRemove: () => void
  customFields?: { id: string; label: string; field_type: string }[]
  categories?: { id: string; name: string }[]
}

export function SegmentConditionRow({ condition, onChange, onRemove, customFields = [], categories = [] }: Props) {
  const allFields = [
    ...FIELD_OPTIONS,
    ...(customFields.length > 0 ? [{
      group: "Champs personnalises",
      fields: customFields.map(cf => ({ value: `custom_field.${cf.id}`, label: cf.label })),
    }] : []),
  ]

  const operators = getOperatorsForField(condition.field)
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator)
  const selectOptions = SELECT_FIELDS[condition.field]
  const isDateDuration = ["within_last", "within_next"].includes(condition.operator)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value, operator: getOperatorsForField(e.target.value)[0]?.value ?? "equals", value: "" })}
        className="flex h-9 flex-1 basis-[140px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
      >
        <option value="">-- Champ --</option>
        {allFields.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.fields.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="flex h-9 flex-1 basis-[120px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input */}
      {needsValue && (
        <>
          {condition.field === "categories" && categories.length > 0 ? (
            <select
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex h-9 flex-1 basis-[100px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
            >
              <option value="">-- Categorie --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          ) : selectOptions ? (
            <select
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex h-9 flex-1 basis-[100px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
            >
              <option value="">--</option>
              {selectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : isDateDuration ? (
            <div className="flex items-center gap-1 flex-1 basis-[100px]">
              <Input
                type="number"
                min={1}
                value={condition.value as number ?? ""}
                onChange={(e) => onChange({ ...condition, value: parseInt(e.target.value) || "" })}
                className="h-9 w-20 bg-secondary/30 border-border/60"
                placeholder="30"
              />
              <select
                value={condition.unit ?? "days"}
                onChange={(e) => onChange({ ...condition, unit: e.target.value })}
                className="flex h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
              >
                <option value="days">jours</option>
                <option value="weeks">semaines</option>
                <option value="months">mois</option>
              </select>
            </div>
          ) : DATE_FIELDS.includes(condition.field) && ["before", "after", "equals"].includes(condition.operator) ? (
            <Input
              type="date"
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="h-9 bg-secondary/30 border-border/60 flex-1 basis-[120px]"
            />
          ) : (
            <Input
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="h-9 bg-secondary/30 border-border/60 flex-1 basis-[100px]"
              placeholder="Valeur..."
            />
          )}
        </>
      )}

      {/* Remove button */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
