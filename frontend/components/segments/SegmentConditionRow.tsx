"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { SegmentCondition } from "@/types"

function getFieldOptions(t: ReturnType<typeof useTranslations>) {
  return [
    { group: t("fieldGroups.contact"), fields: [
      { value: "first_name", label: t("fields.first_name") },
      { value: "last_name", label: t("fields.last_name") },
      { value: "email", label: t("fields.email") },
      { value: "phone", label: t("fields.phone") },
      { value: "job_title", label: t("fields.job_title") },
      { value: "source", label: t("fields.source") },
      { value: "lead_score", label: t("fields.lead_score") },
      { value: "city", label: t("fields.city") },
      { value: "country", label: t("fields.country") },
      { value: "industry", label: t("fields.industry") },
      { value: "language", label: t("fields.language") },
      { value: "preferred_channel", label: t("fields.preferred_channel") },
      { value: "decision_role", label: t("fields.decision_role") },
      { value: "tags", label: t("fields.tags") },
      { value: "categories", label: t("fields.categories") },
      { value: "estimated_budget", label: t("fields.estimated_budget") },
    ]},
    { group: t("fieldGroups.company"), fields: [
      { value: "company.name", label: t("fields.company_name") },
      { value: "company.industry", label: t("fields.company_industry") },
      { value: "company.annual_revenue", label: t("fields.company_annual_revenue") },
      { value: "company.employee_count", label: t("fields.company_employee_count") },
      { value: "company.health_score", label: t("fields.company_health_score") },
      { value: "company.city", label: t("fields.company_city") },
      { value: "company.country", label: t("fields.company_country") },
      { value: "company.source", label: t("fields.company_source") },
    ]},
    { group: t("fieldGroups.dates"), fields: [
      { value: "created_at", label: t("fields.created_at") },
      { value: "updated_at", label: t("fields.updated_at") },
      { value: "birthday", label: t("fields.birthday") },
    ]},
    { group: t("fieldGroups.relations"), fields: [
      { value: "deals_count", label: t("fields.deals_count") },
      { value: "open_deals_count", label: t("fields.open_deals_count") },
      { value: "tasks_count", label: t("fields.tasks_count") },
      { value: "open_tasks_count", label: t("fields.open_tasks_count") },
      { value: "last_interaction_date", label: t("fields.last_interaction_date") },
      { value: "has_deal_closing_within", label: t("fields.has_deal_closing_within") },
    ]},
  ]
}

function getTextOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "equals", label: t("textOperators.equals") },
    { value: "not_equals", label: t("textOperators.not_equals") },
    { value: "contains", label: t("textOperators.contains") },
    { value: "not_contains", label: t("textOperators.not_contains") },
    { value: "is_empty", label: t("textOperators.is_empty") },
    { value: "is_not_empty", label: t("textOperators.is_not_empty") },
  ]
}

function getSelectOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "equals", label: t("selectOperators.equals") },
    { value: "not_equals", label: t("selectOperators.not_equals") },
    { value: "in", label: t("selectOperators.in") },
    { value: "not_in", label: t("selectOperators.not_in") },
  ]
}

function getNumericOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "equals", label: t("numericOperators.equals") },
    { value: "not_equals", label: t("numericOperators.not_equals") },
    { value: "greater_than", label: t("numericOperators.greater_than") },
    { value: "less_than", label: t("numericOperators.less_than") },
    { value: "between", label: t("numericOperators.between") },
    { value: "is_empty", label: t("numericOperators.is_empty") },
  ]
}

function getDateOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "within_last", label: t("dateOperators.within_last") },
    { value: "within_next", label: t("dateOperators.within_next") },
    { value: "before", label: t("dateOperators.before") },
    { value: "after", label: t("dateOperators.after") },
    { value: "is_empty", label: t("dateOperators.is_empty") },
  ]
}

function getRelationOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "has_any", label: t("relationOperators.has_any") },
    { value: "has_none", label: t("relationOperators.has_none") },
    { value: "greater_than", label: t("relationOperators.greater_than") },
    { value: "less_than", label: t("relationOperators.less_than") },
    { value: "equals", label: t("relationOperators.equals") },
  ]
}

function getLeadScoreOptions(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "hot", label: t("leadScoreOptions.hot") },
    { value: "warm", label: t("leadScoreOptions.warm") },
    { value: "cold", label: t("leadScoreOptions.cold") },
  ]
}

function getChannelOptions(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "email", label: t("channelOptions.email") },
    { value: "phone", label: t("channelOptions.phone") },
    { value: "linkedin", label: t("channelOptions.linkedin") },
    { value: "other", label: t("channelOptions.other") },
  ]
}

function getDecisionRoleOptions(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "decision_maker", label: t("decisionRoleOptions.decision_maker") },
    { value: "influencer", label: t("decisionRoleOptions.influencer") },
    { value: "user", label: t("decisionRoleOptions.user") },
    { value: "other", label: t("decisionRoleOptions.other") },
  ]
}

function getHealthScoreOptions(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "excellent", label: t("healthScoreOptions.excellent") },
    { value: "good", label: t("healthScoreOptions.good") },
    { value: "at_risk", label: t("healthScoreOptions.at_risk") },
    { value: "churned", label: t("healthScoreOptions.churned") },
  ]
}

function getCompanyNameOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "equals", label: t("companyNameOperators.equals") },
    { value: "not_equals", label: t("companyNameOperators.not_equals") },
    { value: "is_empty", label: t("companyNameOperators.is_empty") },
    { value: "is_not_empty", label: t("companyNameOperators.is_not_empty") },
  ]
}

function getCategoryOperators(t: ReturnType<typeof useTranslations>) {
  return [
    { value: "in", label: t("categoryOperators.in") },
    { value: "not_in", label: t("categoryOperators.not_in") },
    { value: "has_any", label: t("categoryOperators.has_any") },
    { value: "has_none", label: t("categoryOperators.has_none") },
  ]
}

const COMPANY_NUMERIC_FIELDS = ["company.annual_revenue", "company.employee_count"]

const DATE_FIELDS = ["created_at", "updated_at", "birthday"]
const NUMERIC_FIELDS = ["estimated_budget"]
const RELATION_FIELDS = ["deals_count", "open_deals_count", "tasks_count", "open_tasks_count", "last_interaction_date", "has_deal_closing_within"]

const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty", "has_any", "has_none"]

function getOperatorsForField(field: string, t: ReturnType<typeof useTranslations>) {
  if (field === "company.name") return getCompanyNameOperators(t)
  if (field === "company.health_score") return getSelectOperators(t)
  if (COMPANY_NUMERIC_FIELDS.includes(field)) return getNumericOperators(t)
  if (field.startsWith("company.")) return getTextOperators(t)
  if (field === "categories") return getCategoryOperators(t)
  if (DATE_FIELDS.includes(field)) return getDateOperators(t)
  if (NUMERIC_FIELDS.includes(field)) return getNumericOperators(t)
  if (RELATION_FIELDS.includes(field)) return getRelationOperators(t)
  if (field === "lead_score" || field === "preferred_channel" || field === "decision_role") return getSelectOperators(t)
  return getTextOperators(t)
}

function getSelectFieldOptions(field: string, t: ReturnType<typeof useTranslations>): { value: string; label: string }[] | null {
  if (field === "lead_score") return getLeadScoreOptions(t)
  if (field === "preferred_channel") return getChannelOptions(t)
  if (field === "decision_role") return getDecisionRoleOptions(t)
  if (field === "company.health_score") return getHealthScoreOptions(t)
  return null
}

interface Props {
  condition: SegmentCondition
  onChange: (condition: SegmentCondition) => void
  onRemove: () => void
  customFields?: { id: string; label: string; field_type: string }[]
  categories?: { id: string; name: string }[]
  companies?: { id: string; name: string }[]
  onCompanySearch?: (query: string) => void
}

function CompanyAutocompleteInput({
  value,
  companies,
  onChange,
  onSearch,
  placeholder,
}: {
  value: string
  companies: { id: string; name: string }[]
  onChange: (id: string) => void
  onSearch?: (query: string) => void
  placeholder: string
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const selected = companies.find((c) => c.id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative flex-1 basis-[140px]">
      <Input
        value={selected ? selected.name : query}
        onChange={(e) => {
          const q = e.target.value
          setQuery(q)
          onSearch?.(q)
          setOpen(q.length >= 2)
          if (selected) onChange("")
        }}
        onFocus={() => { if (query.length >= 2) setOpen(true) }}
        className="h-9 bg-secondary/30 border-border/60"
        placeholder={placeholder}
      />
      {open && companies.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => {
                onChange(c.id)
                setQuery(c.name)
                setOpen(false)
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SegmentConditionRow({ condition, onChange, onRemove, customFields = [], categories = [], companies = [], onCompanySearch }: Props) {
  const t = useTranslations("segments.conditionRow")

  const allFields = [
    ...getFieldOptions(t),
    ...(customFields.length > 0 ? [{
      group: t("fieldGroups.customFields"),
      fields: customFields.map(cf => ({ value: `custom_field.${cf.id}`, label: cf.label })),
    }] : []),
  ]

  const operators = getOperatorsForField(condition.field, t)
  const needsValue = !NO_VALUE_OPERATORS.includes(condition.operator)
  const selectOptions = getSelectFieldOptions(condition.field, t)
  const isDateDuration = ["within_last", "within_next"].includes(condition.operator)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value, operator: getOperatorsForField(e.target.value, t)[0]?.value ?? "equals", value: "" })}
        className="flex h-9 flex-1 basis-[140px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
      >
        <option value="">{t("fieldPlaceholder")}</option>
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
          {condition.field === "company.name" ? (
            <CompanyAutocompleteInput
              value={condition.value as string ?? ""}
              companies={companies}
              onChange={(id) => onChange({ ...condition, value: id })}
              onSearch={onCompanySearch}
              placeholder={t("searchCompany")}
            />
          ) : condition.field === "categories" && categories.length > 0 ? (
            <select
              value={condition.value as string ?? ""}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex h-9 flex-1 basis-[100px] rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-sm"
            >
              <option value="">{t("categoryPlaceholder")}</option>
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
                <option value="days">{t("dateUnits.days")}</option>
                <option value="weeks">{t("dateUnits.weeks")}</option>
                <option value="months">{t("dateUnits.months")}</option>
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
              placeholder={t("valuePlaceholder")}
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
