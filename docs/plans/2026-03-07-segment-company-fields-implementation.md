# Segment Company Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the segment system so contacts can be filtered by their linked company's properties (name via autocomplete, industry, revenue, employee count, health score, city, country, source).

**Architecture:** Add `company.*` prefixed fields to the segment engine backend that translate to `company_entity__*` ORM lookups. On the frontend, add a new "Entreprise" field group in the segment builder with an autocomplete input for company name (reusing existing `useCompanyAutocomplete` hook) and standard inputs for other company fields.

**Tech Stack:** Django 5 + DRF (backend), Next.js + React (frontend)

---

## Task 1: Update segment engine to handle `company.*` fields

**Files:**
- Modify: `backend/segments/engine.py`

**Step 1: Add company field mappings**

In `backend/segments/engine.py`, add these constants after the existing `NUMERIC_FIELDS` set (around line 46):

```python
COMPANY_FIELD_MAP = {
    "company.name": "company_entity__name",
    "company.industry": "company_entity__industry",
    "company.annual_revenue": "company_entity__annual_revenue",
    "company.employee_count": "company_entity__employee_count",
    "company.health_score": "company_entity__health_score",
    "company.city": "company_entity__city",
    "company.country": "company_entity__country",
    "company.source": "company_entity__source",
}

COMPANY_NUMERIC_FIELDS = {"company.annual_revenue", "company.employee_count"}
COMPANY_SELECT_FIELDS = {"company.health_score"}
```

**Step 2: Remove old `company` text field from FIELD_MAP**

In `FIELD_MAP`, remove the line `"company": "company",` (line 17).

**Step 3: Add company field routing in `build_condition_q`**

In `build_condition_q`, add this block after the `custom_field` check (after line 64):

```python
    if field.startswith("company."):
        return _build_company_field_q(field, operator, value)
```

**Step 4: Implement `_build_company_field_q`**

Add this function before `build_group_q`:

```python
def _build_company_field_q(field: str, operator: str, value) -> Q:
    """Build Q for company.* prefixed fields."""
    if field == "company.name" and operator == "is_empty":
        return Q(company_entity__isnull=True)
    if field == "company.name" and operator == "is_not_empty":
        return Q(company_entity__isnull=False)
    if field == "company.name" and operator in ("equals", "not_equals"):
        # value is a company UUID
        if operator == "equals":
            return Q(company_entity__id=value)
        return ~Q(company_entity__id=value)

    orm_field = COMPANY_FIELD_MAP.get(field)
    if not orm_field:
        return Q()

    if field in COMPANY_NUMERIC_FIELDS:
        return _build_numeric_q(orm_field, operator, value)
    if field in COMPANY_SELECT_FIELDS:
        return _build_text_q(orm_field, operator, value)
    return _build_text_q(orm_field, operator, value)
```

**Step 5: Verify manually**

Run: `python backend/manage.py shell -c "from segments.engine import COMPANY_FIELD_MAP; print(COMPANY_FIELD_MAP)"`
Expected: prints the company field map dict.

**Step 6: Commit**

```bash
git add backend/segments/engine.py
git commit -m "feat(segments): add company.* field support in segment engine"
```

---

## Task 2: Update frontend SegmentConditionRow with company fields

**Files:**
- Modify: `frontend/components/segments/SegmentConditionRow.tsx`

**Step 1: Update FIELD_OPTIONS**

Replace the `{ value: "company", label: "Entreprise" }` entry in the Contact group with a new "Entreprise" group. The `FIELD_OPTIONS` array should look like:

```typescript
const FIELD_OPTIONS = [
  { group: "Contact", fields: [
    { value: "first_name", label: "Prenom" },
    { value: "last_name", label: "Nom" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telephone" },
    { value: "job_title", label: "Poste" },
    { value: "source", label: "Source" },
    { value: "lead_score", label: "Score" },
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
  { group: "Entreprise", fields: [
    { value: "company.name", label: "Entreprise" },
    { value: "company.industry", label: "Industrie (entreprise)" },
    { value: "company.annual_revenue", label: "CA annuel" },
    { value: "company.employee_count", label: "Nombre d'employes" },
    { value: "company.health_score", label: "Score sante" },
    { value: "company.city", label: "Ville (entreprise)" },
    { value: "company.country", label: "Pays (entreprise)" },
    { value: "company.source", label: "Source (entreprise)" },
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
```

**Step 2: Add company-specific constants**

Add these after the existing `DECISION_ROLE_OPTIONS`:

```typescript
const HEALTH_SCORE_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Bon" },
  { value: "at_risk", label: "A risque" },
  { value: "churned", label: "Perdu" },
]

const COMPANY_NAME_OPERATORS = [
  { value: "equals", label: "est" },
  { value: "not_equals", label: "n'est pas" },
  { value: "is_empty", label: "n'a pas d'entreprise" },
  { value: "is_not_empty", label: "a une entreprise" },
]

const COMPANY_NUMERIC_FIELDS = ["company.annual_revenue", "company.employee_count"]
```

**Step 3: Update `getOperatorsForField`**

Update the function to handle company fields:

```typescript
function getOperatorsForField(field: string) {
  if (field === "company.name") return COMPANY_NAME_OPERATORS
  if (field === "company.health_score") return SELECT_OPERATORS
  if (COMPANY_NUMERIC_FIELDS.includes(field)) return NUMERIC_OPERATORS
  if (field.startsWith("company.")) return TEXT_OPERATORS
  if (field === "categories") return CATEGORY_OPERATORS
  if (DATE_FIELDS.includes(field)) return DATE_OPERATORS
  if (NUMERIC_FIELDS.includes(field)) return NUMERIC_OPERATORS
  if (RELATION_FIELDS.includes(field)) return RELATION_OPERATORS
  if (field in SELECT_FIELDS) return SELECT_OPERATORS
  return TEXT_OPERATORS
}
```

**Step 4: Update SELECT_FIELDS**

Add `company.health_score` to the `SELECT_FIELDS` map:

```typescript
const SELECT_FIELDS: Record<string, { value: string; label: string }[]> = {
  lead_score: LEAD_SCORE_OPTIONS,
  preferred_channel: CHANNEL_OPTIONS,
  decision_role: DECISION_ROLE_OPTIONS,
  "company.health_score": HEALTH_SCORE_OPTIONS,
}
```

**Step 5: Commit**

```bash
git add frontend/components/segments/SegmentConditionRow.tsx
git commit -m "feat(segments): add company fields to segment condition row"
```

---

## Task 3: Add company name autocomplete input in SegmentConditionRow

**Files:**
- Modify: `frontend/components/segments/SegmentConditionRow.tsx`

**Step 1: Add imports and company autocomplete props**

Add to Props interface:

```typescript
interface Props {
  condition: SegmentCondition
  onChange: (condition: SegmentCondition) => void
  onRemove: () => void
  customFields?: { id: string; label: string; field_type: string }[]
  categories?: { id: string; name: string }[]
  companies?: { id: string; name: string }[]
  onCompanySearch?: (query: string) => void
}
```

**Step 2: Implement company autocomplete value input**

In the value input section of the JSX, add a company name autocomplete block. Insert this before the `categories` check in the conditional rendering:

```tsx
{condition.field === "company.name" && companies ? (
  <CompanyAutocompleteInput
    value={condition.value as string ?? ""}
    companies={companies}
    onChange={(id) => onChange({ ...condition, value: id })}
    onSearch={onCompanySearch}
  />
) : condition.field === "categories" && categories.length > 0 ? (
  // ... existing categories code
```

**Step 3: Create `CompanyAutocompleteInput` component**

Add this component at the top of the file (or as a separate small component inside the same file):

```tsx
function CompanyAutocompleteInput({
  value,
  companies,
  onChange,
  onSearch,
}: {
  value: string
  companies: { id: string; name: string }[]
  onChange: (id: string) => void
  onSearch?: (query: string) => void
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
        placeholder="Rechercher une entreprise..."
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
```

Add `useState`, `useRef`, `useEffect` to the imports if not already present.

**Step 4: Commit**

```bash
git add frontend/components/segments/SegmentConditionRow.tsx
git commit -m "feat(segments): add company name autocomplete in segment builder"
```

---

## Task 4: Wire company autocomplete in SegmentBuilder and SegmentRuleGroup

**Files:**
- Modify: `frontend/components/segments/SegmentBuilder.tsx`
- Modify: `frontend/components/segments/SegmentRuleGroup.tsx`

**Step 1: Add company search state in SegmentBuilder**

In `SegmentBuilder`, add state and search handler:

```typescript
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
```

Add the import at the top:
```typescript
import { fetchCompanies } from "@/services/companies"
```

**Step 2: Pass companies to SegmentRuleGroup**

Update the `SegmentRuleGroup` rendering in SegmentBuilder to pass `companies` and `onCompanySearch`:

```tsx
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
```

**Step 3: Update SegmentRuleGroup Props and pass-through**

In `SegmentRuleGroup`, update Props:

```typescript
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
```

Pass them to `SegmentConditionRow`:

```tsx
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
```

**Step 4: Commit**

```bash
git add frontend/components/segments/SegmentBuilder.tsx frontend/components/segments/SegmentRuleGroup.tsx
git commit -m "feat(segments): wire company autocomplete through segment builder"
```

---

## Task 5: Manual end-to-end verification

**Step 1: Start backend**

Run: `cd backend && python manage.py runserver`

**Step 2: Start frontend**

Run: `cd frontend && npm run dev`

**Step 3: Test in browser**

1. Go to `/segments`, create a new segment
2. In the condition builder, verify the "Entreprise" group appears with all 8 fields
3. Select "Entreprise" field, verify autocomplete works (type 2+ chars, dropdown appears)
4. Select a company, verify it stores the ID
5. Select "CA annuel", verify numeric operators appear
6. Select "Score sante", verify select dropdown with Excellent/Bon/A risque/Perdu
7. Save the segment, verify contact count preview works
8. Go to segment detail page, verify matching contacts are shown

**Step 4: Commit if any fixes needed**

```bash
git add -u
git commit -m "fix(segments): polish company fields in segment builder"
```
