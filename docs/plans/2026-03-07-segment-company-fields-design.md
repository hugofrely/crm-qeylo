# Segment Company Fields Design

**Goal:** Update the segment system to support filtering contacts by their linked company (`company_entity` FK) using an autocomplete for company name and direct filters on company properties.

**Context:** The `company` field on Contact was migrated from a plain text field to a FK `company_entity` pointing to the `Company` model. The segment engine and builder need to reflect this.

---

## Approach: Prefixed `company.*` fields

Add fields prefixed with `company.` in both the segment engine and the frontend builder. The backend translates these to ORM lookups via `company_entity__`.

### New segment fields

| Segment field | ORM lookup | Type | Operators |
|---|---|---|---|
| `company.name` | `company_entity__name` / `company_entity__id` | Autocomplete | equals, not_equals, is_empty, is_not_empty |
| `company.industry` | `company_entity__industry` | Text | equals, not_equals, contains, not_contains, is_empty, is_not_empty |
| `company.annual_revenue` | `company_entity__annual_revenue` | Numeric | equals, not_equals, greater_than, less_than, between, is_empty |
| `company.employee_count` | `company_entity__employee_count` | Numeric | equals, not_equals, greater_than, less_than, between, is_empty |
| `company.health_score` | `company_entity__health_score` | Select (excellent/good/at_risk/churned) | equals, not_equals |
| `company.city` | `company_entity__city` | Text | equals, contains, is_empty, is_not_empty |
| `company.country` | `company_entity__country` | Text | equals, contains, is_empty, is_not_empty |
| `company.source` | `company_entity__source` | Text | equals, contains, is_empty, is_not_empty |

### Backend changes

**`backend/segments/engine.py`:**
- Add `COMPANY_FIELD_MAP` mapping `company.*` suffixes to `company_entity__*` ORM lookups
- Add `COMPANY_NUMERIC_FIELDS` set: `{"company.annual_revenue", "company.employee_count"}`
- Add `COMPANY_SELECT_FIELDS` set: `{"company.health_score"}`
- In `build_condition_q`: detect `company.` prefix, extract the sub-field, route to appropriate `_build_*_q` function with the ORM lookup
- For `company.name` with `equals` operator: the value is a company UUID, translate to `company_entity__id=value`
- For `company.name` with `is_empty`/`is_not_empty`: translate to `company_entity__isnull=True/False`
- Remove old `"company": "company"` from `FIELD_MAP`

**`backend/companies/views.py`** (or new endpoint):
- Add `GET /api/companies/autocomplete/?q=<search>` endpoint
- Returns `[{id, name}]` filtered by organization, limited to 20 results
- Searches by `name__icontains`

### Frontend changes

**`frontend/components/segments/SegmentConditionRow.tsx`:**
- Replace the "Entreprise" field in the Contact group with a new **"Entreprise"** field group containing all 8 company fields
- For `company.name`: render an autocomplete input that calls `/companies/autocomplete/`, stores the company ID as value, displays company name
- For `company.health_score`: render a select with options Excellent/Bon/A risque/Perdu
- For `company.annual_revenue` and `company.employee_count`: use numeric operators
- For text fields (`company.industry`, `company.city`, `company.country`, `company.source`): use standard text operators

**`frontend/services/companies.ts`** (or segments service):
- Add `searchCompaniesAutocomplete(query: string)` function

### Migration of existing segments

Existing segments using the old `company` text field will no longer match after this change. Since the data was migrated from text to FK, old rules referencing `"field": "company"` should be considered stale. No automatic migration — they simply won't match and users can update their segment rules.
