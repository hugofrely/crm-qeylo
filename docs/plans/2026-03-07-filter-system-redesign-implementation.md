# Filter System Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mobile-only drawer filter system with a responsive approach: inline filter bar on desktop (lg+), drawer preserved on mobile.

**Architecture:** New `FilterBar` component for desktop inline filters + reusable filter sub-components. Existing `FilterPanel` (drawer) stays for mobile, hidden on desktop via `lg:hidden`. Backend gets search params for Tasks and Deals.

**Tech Stack:** Next.js, React, Tailwind CSS, Django REST Framework, shadcn/ui

---

### Task 1: Backend — Add search parameter to Tasks

**Files:**
- Modify: `backend/tasks/views.py:19-67`

**Step 1: Add search filtering to TaskViewSet.get_queryset()**

In `backend/tasks/views.py`, add search support after line 21 (after `params = self.request.query_params`):

```python
from django.db.models import Q

# Inside get_queryset(), after params = self.request.query_params:
search = params.get("search")
if search:
    words = search.strip().split()
    for word in words:
        qs = qs.filter(
            Q(description__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
            | Q(deal__name__icontains=word)
        )
```

Add `from django.db.models import Q` at the top of the file (line 1 area).

**Step 2: Test manually**

Run: `curl -s "http://localhost:8000/api/tasks/?search=test" -H "Authorization: Token <token>" | python -m json.tool | head -20`

**Step 3: Commit**

```bash
git add backend/tasks/views.py
git commit -m "feat: add search parameter to tasks endpoint"
```

---

### Task 2: Backend — Add search parameter to Deals pipeline_view

**Files:**
- Modify: `backend/deals/views.py:222-276`

**Step 1: Add search filtering to pipeline_view()**

In `backend/deals/views.py`, after the existing `deal_filters` block (around line 269), add search logic. This needs to happen inside the stage loop where deals are filtered:

```python
# After line 269 (created_before filter), add:
search = request.query_params.get("search")
```

Then in the stage loop (around line 274), after `if deal_filters:`, add:

```python
if search:
    words = search.strip().split()
    for word in words:
        deals = deals.filter(
            Q(name__icontains=word)
            | Q(notes__icontains=word)
            | Q(contact__first_name__icontains=word)
            | Q(contact__last_name__icontains=word)
        )
```

Add `from django.db.models import Q` at the top if not already imported.

**Step 2: Commit**

```bash
git add backend/deals/views.py
git commit -m "feat: add search parameter to deals pipeline endpoint"
```

---

### Task 3: Frontend — Add search to TaskFilters type and fetchTasks service

**Files:**
- Modify: `frontend/types/tasks.ts:32-41`
- Modify: `frontend/services/tasks.ts:4-16`

**Step 1: Add search to TaskFilters type**

In `frontend/types/tasks.ts`, add `search?: string` to the `TaskFilters` interface:

```typescript
export interface TaskFilters {
  search?: string  // NEW
  is_done?: "true" | "false"
  priority?: "high" | "normal" | "low"
  contact?: string
  due_date?: "overdue" | "today" | "this_week"
  assigned_to?: string
  due_date_gte?: string
  due_date_lte?: string
  page?: number
}
```

**Step 2: Add search param to fetchTasks**

In `frontend/services/tasks.ts`, add this line inside `fetchTasks` after existing params:

```typescript
if (filters.search) params.set("search", filters.search)
```

**Step 3: Commit**

```bash
git add frontend/types/tasks.ts frontend/services/tasks.ts
git commit -m "feat: add search param to tasks frontend service"
```

---

### Task 4: Frontend — Create reusable filter sub-components

**Files:**
- Create: `frontend/components/shared/FilterControls.tsx`

**Step 1: Create the filter controls file**

Create `frontend/components/shared/FilterControls.tsx` with these components:

```tsx
"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, RotateCcw } from "lucide-react"

// --- FilterSearchInput ---
interface FilterSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FilterSearchInput({ value, onChange, placeholder = "Rechercher...", className }: FilterSearchInputProps) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-9 bg-secondary/30 border-border/60 w-full"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// --- FilterPills ---
interface FilterPillsProps {
  options: { value: string; label: string; color?: string; count?: number }[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
  showAll?: boolean
}

export function FilterPills({ options, value, onChange, allLabel = "Tous", showAll = false }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {showAll && (
        <button
          onClick={() => onChange(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
            value === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {allLabel}
        </button>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
          {opt.label}
          {opt.count !== undefined && <span className="text-[10px] opacity-70">({opt.count})</span>}
        </button>
      ))}
    </div>
  )
}

// --- FilterSelect ---
interface FilterSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FilterSelect({ options, value, onChange, placeholder = "Tous", className }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-md border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs font-[family-name:var(--font-body)] ${className ?? ""}`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// --- FilterDateRange ---
interface FilterDateRangeProps {
  after: string
  before: string
  onAfterChange: (value: string) => void
  onBeforeChange: (value: string) => void
  className?: string
}

export function FilterDateRange({ after, before, onAfterChange, onBeforeChange, className }: FilterDateRangeProps) {
  const inputClass = "h-9 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-xs"
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <input type="date" value={after} onChange={(e) => onAfterChange(e.target.value)} className={inputClass} />
      <span className="text-muted-foreground text-xs">→</span>
      <input type="date" value={before} onChange={(e) => onBeforeChange(e.target.value)} className={inputClass} />
    </div>
  )
}

// --- FilterNumberRange ---
interface FilterNumberRangeProps {
  min: string
  max: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  placeholderMin?: string
  placeholderMax?: string
  className?: string
}

export function FilterNumberRange({ min, max, onMinChange, onMaxChange, placeholderMin = "Min", placeholderMax = "Max", className }: FilterNumberRangeProps) {
  const inputClass = "h-9 w-20 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-xs"
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <input type="number" placeholder={placeholderMin} value={min} onChange={(e) => onMinChange(e.target.value)} className={inputClass} />
      <span className="text-muted-foreground text-xs">→</span>
      <input type="number" placeholder={placeholderMax} value={max} onChange={(e) => onMaxChange(e.target.value)} className={inputClass} />
    </div>
  )
}

// --- FilterResetButton ---
interface FilterResetButtonProps {
  activeFilterCount: number
  onReset: () => void
}

export function FilterResetButton({ activeFilterCount, onReset }: FilterResetButtonProps) {
  if (activeFilterCount === 0) return null
  return (
    <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-muted-foreground h-9 text-xs">
      <RotateCcw className="h-3 w-3" />
      Réinitialiser ({activeFilterCount})
    </Button>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/FilterControls.tsx
git commit -m "feat: create reusable filter sub-components"
```

---

### Task 5: Frontend — Create FilterBar component

**Files:**
- Create: `frontend/components/shared/FilterBar.tsx`

**Step 1: Create the FilterBar container**

Create `frontend/components/shared/FilterBar.tsx`:

```tsx
"use client"

import * as React from "react"
import { FilterResetButton } from "./FilterControls"

interface FilterBarProps {
  activeFilterCount: number
  onReset: () => void
  children: React.ReactNode
}

export function FilterBar({ activeFilterCount, onReset, children }: FilterBarProps) {
  return (
    <div className="hidden lg:flex flex-wrap items-center gap-2">
      {children}
      <FilterResetButton activeFilterCount={activeFilterCount} onReset={onReset} />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/FilterBar.tsx
git commit -m "feat: create FilterBar desktop container component"
```

---

### Task 6: Frontend — Make FilterPanel and FilterTriggerButton responsive

**Files:**
- Modify: `frontend/components/shared/FilterPanel.tsx:17-78`

**Step 1: Add lg:hidden to FilterPanel backdrop and drawer**

In `frontend/components/shared/FilterPanel.tsx`:

- Line 24 (backdrop div): change `className` to add `lg:hidden`:
  ```
  className="fixed inset-0 z-40 bg-black/20 m-0 animate-in fade-in duration-200 lg:hidden"
  ```

- Line 30 (drawer div): change `className` to add `lg:hidden`:
  ```
  className="fixed inset-y-0 right-0 z-50 w-[320px] max-w-[85vw] bg-background border-l border-border overflow-y-auto shadow-xl animate-in slide-in-from-right duration-300 lg:hidden"
  ```

**Step 2: Add lg:hidden to FilterTriggerButton**

In the same file, modify the `FilterTriggerButton` component (line 63). Wrap the button with `lg:hidden`:

```tsx
export function FilterTriggerButton({ open, onOpenChange, activeFilterCount }: FilterTriggerButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={() => onOpenChange(!open)}
      className="gap-2 lg:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filtres
      {activeFilterCount > 0 && (
        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px]">
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  )
}
```

**Step 3: Commit**

```bash
git add frontend/components/shared/FilterPanel.tsx
git commit -m "feat: hide FilterPanel and FilterTriggerButton on desktop"
```

---

### Task 7: Frontend — Contacts page: add FilterBar

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Add imports**

Add these imports at the top:

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterPills, FilterSelect } from "@/components/shared/FilterControls"
```

**Step 2: Add FilterBar between PageHeader and content**

After the closing `</PageHeader>` tag (line 337) and before the `<DuplicateDetectionDialog>`, add the desktop filter bar:

```tsx
{/* Desktop filter bar */}
<FilterBar
  activeFilterCount={activeFilterCount}
  onReset={() => { setSearch(""); setSelectedCategory(null); setSelectedSegment(null) }}
>
  <FilterSearchInput
    value={search}
    onChange={setSearch}
    placeholder="Rechercher un contact..."
    className="w-64"
  />
  {categories.length > 0 && (
    <FilterPills
      options={categories.map((cat) => ({ value: cat.id, label: cat.name, color: cat.color, count: cat.contact_count ?? undefined }))}
      value={selectedCategory}
      onChange={(v) => { setSelectedCategory(v); setSelectedSegment(null) }}
      showAll
    />
  )}
</FilterBar>
```

Note: The Segment filter uses `SegmentSelector` which is a complex component — keep it only in the mobile drawer for now to avoid duplication complexity.

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat: add desktop FilterBar to contacts page"
```

---

### Task 8: Frontend — Tasks page: add search state and FilterBar

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Step 1: Add imports**

Add these imports:

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterPills } from "@/components/shared/FilterControls"
```

**Step 2: Add search state**

After line 39 (`const [filterOpen, setFilterOpen] = useState(false)`), add:

```typescript
const [search, setSearch] = useState("")
```

**Step 3: Include search in activeFilterCount**

Change line 41 to include search:

```typescript
const activeFilterCount = [search, priority, dueDate, contactId, assignedTo].filter(Boolean).length
```

**Step 4: Include search in filters**

After line 52 (`if (assignedTo) filters.assigned_to = assignedTo`), add:

```typescript
if (search) filters.search = search
```

**Step 5: Add debounced effect for search**

Add a useEffect to reset page on search change:

```typescript
useEffect(() => {
  setPage(1)
}, [search])
```

**Step 6: Add FilterBar after PageHeader**

After closing `</PageHeader>` (line 151), add:

```tsx
{/* Desktop filter bar */}
<FilterBar
  activeFilterCount={activeFilterCount}
  onReset={() => { setSearch(""); setPriority(null); setDueDate(null); setContactId(null); setContactLabel(null); contactAutocomplete.reset(); setAssignedTo(null); setAssignedLabel(null); memberAutocomplete.reset() }}
>
  <FilterSearchInput
    value={search}
    onChange={setSearch}
    placeholder="Rechercher une tâche..."
    className="w-64"
  />
  <FilterPills
    options={priorityOptions}
    value={priority}
    onChange={(v) => { setPriority(v); resetPage() }}
  />
  {viewMode === "list" && (
    <FilterPills
      options={dueDateOptions}
      value={dueDate}
      onChange={(v) => { setDueDate(v); resetPage() }}
    />
  )}
</FilterBar>
```

**Step 7: Add search to mobile drawer FilterPanel**

Inside the existing `<FilterPanel>`, add a search FilterSection at the top:

```tsx
<FilterSection label="Recherche">
  <FilterSearchInput value={search} onChange={setSearch} placeholder="Rechercher une tâche..." />
</FilterSection>
```

**Step 8: Update onReset in FilterPanel to include search**

Update the `onReset` prop of `FilterPanel` to also clear search:

```typescript
onReset={() => { setSearch(""); setPriority(null); setDueDate(null); setContactId(null); setContactLabel(null); contactAutocomplete.reset(); setAssignedTo(null); setAssignedLabel(null); memberAutocomplete.reset() }}
```

**Step 9: Commit**

```bash
git add frontend/app/\(app\)/tasks/page.tsx
git commit -m "feat: add search and desktop FilterBar to tasks page"
```

---

### Task 9: Frontend — Deals page: add search state and FilterBar

**Files:**
- Modify: `frontend/app/(app)/deals/page.tsx`

**Step 1: Add imports**

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterSelect, FilterNumberRange, FilterDateRange } from "@/components/shared/FilterControls"
```

**Step 2: Add search state**

After line 63 (`const [filterCreatedBy, setFilterCreatedBy] = useState("")`), add:

```typescript
const [filterSearch, setFilterSearch] = useState("")
```

**Step 3: Include search in filters useMemo**

In the `filters` useMemo (line 68-81), add:

```typescript
if (filterSearch) f.search = filterSearch
```

**Step 4: Update resetFilters to include search**

In `resetFilters` function, add:

```typescript
setFilterSearch("")
```

**Step 5: Add FilterBar after PageHeader**

After `</PageHeader>` (line 187), add:

```tsx
{/* Desktop filter bar */}
<FilterBar activeFilterCount={activeFilterCount} onReset={resetFilters}>
  <FilterSearchInput
    value={filterSearch}
    onChange={setFilterSearch}
    placeholder="Rechercher un deal..."
    className="w-64"
  />
  <FilterNumberRange
    min={filterAmountMin}
    max={filterAmountMax}
    onMinChange={setFilterAmountMin}
    onMaxChange={setFilterAmountMax}
    placeholderMin="Montant min"
    placeholderMax="Montant max"
  />
  <FilterDateRange
    after={filterExpectedCloseAfter}
    before={filterExpectedCloseBefore}
    onAfterChange={setFilterExpectedCloseAfter}
    onBeforeChange={setFilterExpectedCloseBefore}
  />
  {members.length > 0 && (
    <FilterSelect
      options={members.map((m) => ({ value: m.user_id, label: `${m.first_name} ${m.last_name}` }))}
      value={filterCreatedBy}
      onChange={setFilterCreatedBy}
      placeholder="Créé par"
    />
  )}
</FilterBar>
```

**Step 6: Add search to mobile drawer**

In the `<FilterPanel>`, add at the top:

```tsx
<FilterSection label="Recherche">
  <FilterSearchInput value={filterSearch} onChange={setFilterSearch} placeholder="Rechercher un deal..." />
</FilterSection>
```

**Step 7: Commit**

```bash
git add frontend/app/\(app\)/deals/page.tsx
git commit -m "feat: add search and desktop FilterBar to deals page"
```

---

### Task 10: Frontend — Products page: add FilterBar

**Files:**
- Modify: `frontend/app/(app)/products/page.tsx`

**Step 1: Add imports**

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterSelect, FilterPills } from "@/components/shared/FilterControls"
```

**Step 2: Add FilterBar after PageHeader**

After `</PageHeader>` (line 291), add:

```tsx
{/* Desktop filter bar */}
<FilterBar
  activeFilterCount={activeFilterCount}
  onReset={() => { setSearch(""); setSelectedCategory(""); setShowActive("active") }}
>
  <FilterSearchInput
    value={search}
    onChange={setSearch}
    placeholder="Rechercher un produit..."
    className="w-64"
  />
  <FilterSelect
    options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
    value={selectedCategory}
    onChange={setSelectedCategory}
    placeholder="Toutes catégories"
  />
  <FilterPills
    options={[
      { value: "active", label: "Actifs" },
      { value: "archived", label: "Archivés" },
      { value: "all", label: "Tous" },
    ]}
    value={showActive}
    onChange={(v) => setShowActive((v ?? "active") as "active" | "archived" | "all")}
  />
</FilterBar>
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/products/page.tsx
git commit -m "feat: add desktop FilterBar to products page"
```

---

### Task 11: Frontend — Funnel page: add FilterBar

**Files:**
- Modify: `frontend/app/(app)/pipeline/funnel/page.tsx`

**Step 1: Read the full file to understand the current structure**

Read the full `frontend/app/(app)/pipeline/funnel/page.tsx`.

**Step 2: Add imports**

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSelect, FilterPills } from "@/components/shared/FilterControls"
```

**Step 3: Add FilterBar after PageHeader**

Add the desktop filter bar with pipeline select, mode pills, and period select. Adapt based on the existing filter state variables: `pipelineId`, `filterMode`, `dateRange`.

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/pipeline/funnel/page.tsx
git commit -m "feat: add desktop FilterBar to funnel page"
```

---

### Task 12: Frontend — Email Templates page: add FilterBar

**Files:**
- Modify: `frontend/app/(app)/settings/email-templates/page.tsx`

**Step 1: Add imports**

```typescript
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterPills } from "@/components/shared/FilterControls"
```

**Step 2: Add FilterBar after PageHeader**

```tsx
<FilterBar
  activeFilterCount={activeFilterCount}
  onReset={() => { setSearch(""); setFilter("all") }}
>
  <FilterSearchInput
    value={search}
    onChange={setSearch}
    placeholder="Rechercher un template..."
    className="w-64"
  />
  <FilterPills
    options={[
      { value: "all", label: "Tous" },
      { value: "mine", label: "Mes templates" },
      { value: "shared", label: "Partagés" },
    ]}
    value={filter}
    onChange={(v) => setFilter((v ?? "all") as "all" | "mine" | "shared")}
  />
</FilterBar>
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/settings/email-templates/page.tsx
git commit -m "feat: add desktop FilterBar to email templates page"
```

---

### Task 13: Visual review and final commit

**Step 1: Run the dev server**

```bash
cd frontend && npm run dev
```

**Step 2: Visual checks**

Check each page at desktop and mobile viewport sizes:
- [ ] Contacts: FilterBar visible on desktop, drawer on mobile
- [ ] Tasks: Search + priority/due date pills on desktop
- [ ] Deals: Search + amount/date ranges on desktop
- [ ] Products: Search + category select + status pills on desktop
- [ ] Funnel: Pipeline/mode/period filters on desktop
- [ ] Email Templates: Search + visibility pills on desktop
- [ ] All pages: FilterTriggerButton hidden on desktop, visible on mobile
- [ ] All pages: Drawer still works correctly on mobile

**Step 3: Fix any visual issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete filter system redesign - responsive inline filters"
```
