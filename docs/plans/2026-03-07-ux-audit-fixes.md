# UX Audit Fixes - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all ~34 UX/UI issues from AUDIT-UX.md — contrasts, spacing, filters, sidebar, tables, mobile, empty states, and new features.

**Architecture:** Layered approach — design tokens first, then shared components, then page-by-page fixes. Each task is self-contained and committable.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui, Radix UI, dnd-kit, Lucide icons

**Design doc:** `docs/plans/2026-03-07-ux-audit-fixes-design.md`

---

## Task 1: Design Tokens — Fix Contrasts & Add Variables

**Files:**
- Modify: `frontend/app/globals.css:62-112` (light theme), `frontend/app/globals.css:114-156` (dark theme), `frontend/app/globals.css:9-60` (theme inline)

**Step 1: Update light theme CSS variables**

In `:root` block (line 62), change and add:

```css
/* Change line 79 */
--muted-foreground: #504F4A;     /* was #64635E — ratio 3.8:1 -> ~5.2:1 */

/* Add after line 94 (after --stone-custom) */
--table-header-bg: #F0EDE8;
--border-strong: #C8C5BF;
```

**Step 2: Update dark theme variables**

In `.dark` block (line 114), change and add:

```css
/* Change line 126 */
--muted-foreground: #9E9B95;     /* Keep existing — already good contrast in dark */

/* Add after line 140 (after --stone-custom) */
--table-header-bg: #2D2D28;
--border-strong: #4A4A44;
```

**Step 3: Register in @theme inline block**

Add after line 59 (before closing `}`):

```css
--color-table-header-bg: var(--table-header-bg);
--color-border-strong: var(--border-strong);
```

**Step 4: Commit**

```bash
git add frontend/app/globals.css
git commit -m "fix: update design tokens for WCAG AA contrast compliance

- Darken muted-foreground from #64635E to #504F4A (ratio 3.8:1 -> 5.2:1)
- Add --table-header-bg and --border-strong tokens
- Add dark mode equivalents

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Sidebar — Grouped Navigation & Contrast Fixes

**Files:**
- Modify: `frontend/components/Sidebar.tsx`

**Step 1: Replace flat `navigation` array with grouped structure**

Replace lines 39-51 with:

```tsx
const navigationGroups = [
  {
    label: "CRM",
    items: [
      { name: "Chat", href: "/chat", icon: MessageSquare },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Segments", href: "/segments", icon: ListFilter },
      { name: "Pipeline", href: "/deals", icon: Kanban },
      { name: "Entonnoir", href: "/pipeline/funnel", icon: Filter },
    ],
  },
  {
    label: "Gestion",
    items: [
      { name: "Produits", href: "/products", icon: Package },
      { name: "Tâches", href: "/tasks", icon: CheckSquare },
      { name: "Workflows", href: "/workflows", icon: Workflow },
    ],
  },
  {
    label: "Analyse",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { name: "Rapports", href: "/reports", icon: FileBarChart },
    ],
  },
]

const utilityItems = [
  { name: "Corbeille", href: "/trash", icon: Trash2 },
]
```

**Step 2: Update the nav rendering (replace lines 148-169)**

```tsx
<nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
  {navigationGroups.map((group) => (
    <div key={group.label}>
      <span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/40 px-3 pt-3 pb-1 font-[family-name:var(--font-body)]">
        {group.label}
      </span>
      {group.items.map((item) => {
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
              isActive
                ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)] shadow-sm"
                : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
            )}
          >
            <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[var(--sidebar-primary)]")} />
            {item.name}
          </Link>
        )
      })}
    </div>
  ))}
</nav>
```

Note the changes:
- `py-2.5` -> `py-2` for tighter spacing
- `/60` -> `/80` for inactive link contrast
- Added `overflow-y-auto` to nav for small screens

**Step 3: Move Corbeille to bottom section (replace lines 171-189)**

Replace the bottom section (separator + Settings) with:

```tsx
{/* Bottom section */}
<div className="mx-5 h-px bg-[var(--sidebar-border)]" />
<div className="px-3 py-2 space-y-0.5">
  {utilityItems.map((item) => {
    const isActive = pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
          isActive
            ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
            : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {item.name}
      </Link>
    )
  })}
  <Link
    href="/settings"
    onClick={() => setMobileOpen(false)}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
      pathname.startsWith("/settings")
        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
        : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
    )}
  >
    <Settings className="h-[18px] w-[18px] shrink-0" />
    Paramètres
  </Link>
</div>
```

**Step 4: Fix user email contrast (line 201)**

Change `text-[var(--sidebar-foreground)]/40` to `text-[var(--sidebar-foreground)]/60`

**Step 5: Commit**

```bash
git add frontend/components/Sidebar.tsx
git commit -m "feat: restructure sidebar with grouped navigation and contrast fixes

- Group nav items into CRM, Gestion, Analyse sections
- Move Corbeille to bottom utility section
- Increase inactive link opacity 60% -> 80%
- Increase email opacity 40% -> 60%
- Tighter spacing for better vertical density

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Collapsible FilterBar System

**Files:**
- Modify: `frontend/components/shared/FilterBar.tsx`
- Modify: `frontend/components/shared/FilterPanel.tsx:63-79` (FilterTriggerButton)

**Step 1: Update FilterBar to accept `open` prop**

Replace entire `frontend/components/shared/FilterBar.tsx`:

```tsx
"use client"

import * as React from "react"
import { FilterResetButton } from "./FilterControls"

interface FilterBarProps {
  open: boolean
  activeFilterCount: number
  onReset: () => void
  children: React.ReactNode
}

export function FilterBar({ open, activeFilterCount, onReset, children }: FilterBarProps) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-out ${
        open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg px-4 py-3">
        {children}
        <div className="self-end">
          <FilterResetButton activeFilterCount={activeFilterCount} onReset={onReset} />
        </div>
      </div>
    </div>
  )
}
```

Changes:
- Added `open` prop (was always visible with `hidden lg:flex`)
- Removed `hidden lg:flex` — now controlled by `open`
- `bg-muted/50` -> `bg-card` for better contrast with body
- `border-border/40` -> `border-border` for stronger border
- Slide-down animation via `max-h` transition

**Step 2: Update FilterTriggerButton to work on all breakpoints**

In `frontend/components/shared/FilterPanel.tsx`, line 68, change:

```tsx
className="gap-2 lg:hidden"
```
to:
```tsx
className="gap-2"
```

**Step 3: Update all pages that use FilterBar to pass `open` prop**

The following pages need `open={filterOpen}` added to `<FilterBar>`:

- `frontend/app/(app)/contacts/page.tsx` line 342: `<FilterBar activeFilterCount=...` -> `<FilterBar open={filterOpen} activeFilterCount=...`
- `frontend/app/(app)/deals/page.tsx` line 195: same change
- `frontend/app/(app)/tasks/page.tsx` line 162: same change
- `frontend/app/(app)/pipeline/funnel/page.tsx`: same change
- `frontend/app/(app)/products/page.tsx`: same change

For contacts page, also remove the duplicate `<FilterPanel>` `lg:hidden` constraint since FilterBar now handles both states.

**Step 4: Commit**

```bash
git add frontend/components/shared/FilterBar.tsx frontend/components/shared/FilterPanel.tsx frontend/app/\(app\)/contacts/page.tsx frontend/app/\(app\)/deals/page.tsx frontend/app/\(app\)/tasks/page.tsx frontend/app/\(app\)/pipeline/funnel/page.tsx frontend/app/\(app\)/products/page.tsx
git commit -m "feat: make FilterBar collapsible on all breakpoints

- FilterBar hidden by default, toggled via FilterTriggerButton
- FilterTriggerButton visible on all breakpoints (was lg:hidden)
- FilterBar uses bg-card for better contrast with body
- Slide-down animation with max-h transition
- Applied to Contacts, Pipeline, Tasks, Products, Funnel pages

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Table Headers & Data Density

**Files:**
- Modify: `frontend/components/shared/DataTable.tsx:65`
- Modify: `frontend/components/contacts/ContactTable.tsx:45,60-117`
- Modify: `frontend/components/tasks/TaskList.tsx:33-59,87`

**Step 1: Update table header backgrounds**

In `DataTable.tsx` line 65, change:
```tsx
className="bg-secondary/30 hover:bg-secondary/30"
```
to:
```tsx
className="bg-table-header-bg hover:bg-table-header-bg"
```

In `ContactTable.tsx` line 45, same change.

In `TaskList.tsx` line 87, same change.

**Step 2: Update ContactTable for higher density**

Replace the `<TableCell>` for the name column (lines 60-118) with a more compact layout:

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-1.5">
      <span className="font-medium text-sm font-[family-name:var(--font-body)]">
        {contact.first_name} {contact.last_name}
      </span>
      {contact.lead_score && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              contact.lead_score === "hot"
                ? "bg-rose-500"
                : contact.lead_score === "warm"
                  ? "bg-amber-500"
                  : "bg-blue-500"
            }`}
          />
          {contact.lead_score === "hot" ? "Chaud" : contact.lead_score === "warm" ? "Tiede" : "Froid"}
        </span>
      )}
    </div>
    {contact.categories && contact.categories.length > 0 && (
      <div className="flex items-center gap-1">
        {contact.categories.slice(0, 2).map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: cat.color + "20", color: cat.color }}
          >
            {cat.name}
          </span>
        ))}
        {contact.categories.length > 2 && (
          <span className="text-[10px] text-muted-foreground" title={contact.categories.slice(2).map(c => c.name).join(", ")}>
            +{contact.categories.length - 2}
          </span>
        )}
      </div>
    )}
  </div>
  {contact.job_title && (
    <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
      {contact.job_title}
    </p>
  )}
</TableCell>
```

Key changes:
- Categories inline with name (max 2, rest as tooltip)
- Tags removed from visible display (were taking a full line)
- Job title on second line (more compact)
- Lead score shows text label: "Chaud", "Tiede", "Froid"

**Step 3: Fix priority badge contrast in TaskList**

In `TaskList.tsx`, replace `getPriorityBadge` function (lines 33-60):

```tsx
function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return (
        <Badge className="bg-red-50 text-red-800 hover:bg-red-50">
          Haute
        </Badge>
      )
    case "normal":
      return (
        <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-50">
          Normale
        </Badge>
      )
    case "low":
      return (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
          Basse
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {priority}
        </Badge>
      )
  }
}
```

**Step 4: Add mobile due date display in TaskList**

After the task description `<p>` element (line 120), add:

```tsx
{/* Mobile-only due date */}
{task.due_date && (
  <span className={`md:hidden text-xs mt-0.5 block font-[family-name:var(--font-body)] ${
    !task.is_done && isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"
  }`}>
    {!task.is_done && isOverdue(task.due_date) && "⚠ "}
    {formatDate(task.due_date)}
  </span>
)}
```

Also on the task title, change any `truncate` or `whitespace-nowrap` to allow wrapping on mobile.

**Step 5: Commit**

```bash
git add frontend/components/shared/DataTable.tsx frontend/components/contacts/ContactTable.tsx frontend/components/tasks/TaskList.tsx
git commit -m "fix: improve table headers, contact density, and task contrast

- Table headers use --table-header-bg for distinct background
- ContactTable: compact single-line layout, lead score text labels
- TaskList: priority badge contrast fix for WCAG AA
- TaskList: show due date on mobile below task title

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Contact Multi-Select

**Files:**
- Modify: `frontend/components/contacts/ContactTable.tsx`
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Add selection state to contacts page**

In `contacts/page.tsx`, add state after line 55:

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

const toggleSelectAll = () => {
  if (selectedIds.size === contacts.length) {
    setSelectedIds(new Set())
  } else {
    setSelectedIds(new Set(contacts.map((c) => c.id)))
  }
}

const clearSelection = () => setSelectedIds(new Set())
```

Clear selection when contacts change (add to fetchContacts effect):
```tsx
// After setContacts(...) calls, add:
setSelectedIds(new Set())
```

**Step 2: Pass selection props to ContactTable**

Update `<ContactTable>` usage:

```tsx
<ContactTable
  contacts={contacts}
  selectedIds={selectedIds}
  onToggleSelect={toggleSelect}
  onToggleAll={toggleSelectAll}
/>
```

**Step 3: Update ContactTable component**

Add `Checkbox` import and update props:

```tsx
import { Checkbox } from "@/components/ui/checkbox"

interface ContactTableProps {
  contacts: Contact[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
}
```

Add checkbox column in TableHeader:
```tsx
<TableHead className="w-10">
  <Checkbox
    checked={contacts.length > 0 && selectedIds.size === contacts.length}
    onCheckedChange={onToggleAll}
  />
</TableHead>
```

Add checkbox cell in each row:
```tsx
<TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
  <Checkbox
    checked={selectedIds.has(contact.id)}
    onCheckedChange={() => onToggleSelect(contact.id)}
  />
</TableCell>
```

**Step 4: Add floating action bar in contacts page**

Add before the `<ContactTable>` section:

```tsx
{selectedIds.size > 0 && (
  <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
    <span className="text-sm font-medium">{selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} selectionne{selectedIds.size > 1 ? "s" : ""}</span>
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={clearSelection}>Annuler</Button>
      <Button variant="outline" size="sm" onClick={() => handleBulkExport(selectedIds)}>Exporter</Button>
      <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(selectedIds)}>Supprimer</Button>
    </div>
  </div>
)}
```

Implement the bulk action handlers (call API with selected IDs).

**Step 5: Commit**

```bash
git add frontend/components/contacts/ContactTable.tsx frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat: add multi-select and bulk actions to contacts table

- Checkbox column with select-all header
- Floating action bar for bulk delete/export
- Selection cleared on filter/page change

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: DealCard Currency Fix & Kanban Scroll Indicator

**Files:**
- Modify: `frontend/components/deals/DealCard.tsx:7,70-73`
- Modify: `frontend/components/deals/KanbanBoard.tsx`

**Step 1: Fix DealCard currency**

In `DealCard.tsx`:
- Line 7: Remove `DollarSign` from imports
- Replace lines 70-73:

```tsx
<span className="text-sm font-semibold text-primary">
  {formatAmount(deal.amount)}
</span>
```

The `formatAmount` function at line 16 already uses `Intl.NumberFormat` with EUR — it's correct. We just remove the `DollarSign` icon and `text-green-700` (replaced by `text-primary` which works in both themes).

**Step 2: Add scroll fade indicator to KanbanBoard**

In `KanbanBoard.tsx`, wrap the kanban scroll container. Find the `flex gap-4 overflow-x-auto` div and wrap it:

```tsx
<div className="relative flex-1 min-h-0">
  {/* Left fade */}
  <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity ${scrollLeft > 0 ? 'opacity-100' : 'opacity-0'}`} />

  {/* Kanban container */}
  <div
    ref={scrollRef}
    onScroll={handleScroll}
    className="flex gap-4 overflow-x-auto pb-4 h-full"
  >
    {/* ...existing kanban content... */}
  </div>

  {/* Right fade */}
  <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
</div>
```

Add scroll tracking state:

```tsx
const scrollRef = useRef<HTMLDivElement>(null)
const [scrollLeft, setScrollLeft] = useState(0)
const [canScrollRight, setCanScrollRight] = useState(false)

const handleScroll = () => {
  if (!scrollRef.current) return
  const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
  setScrollLeft(scrollLeft)
  setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
}

useEffect(() => {
  handleScroll()
  window.addEventListener("resize", handleScroll)
  return () => window.removeEventListener("resize", handleScroll)
}, [])
```

**Step 3: Commit**

```bash
git add frontend/components/deals/DealCard.tsx frontend/components/deals/KanbanBoard.tsx
git commit -m "fix: remove $ sign from EUR amounts and add kanban scroll indicators

- DealCard: remove DollarSign icon, use theme-aware text-primary color
- KanbanBoard: gradient fade indicators for horizontal scroll edges

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Tabs Warning Fix & Funnel Table Toggle

**Files:**
- Modify: `frontend/app/(app)/deals/page.tsx:244`
- Modify: `frontend/app/(app)/pipeline/funnel/page.tsx`

**Step 1: Fix Tabs controlled/uncontrolled warning**

In `deals/page.tsx` line 244, change:
```tsx
<Tabs value={selectedPipelineId ?? undefined} onValueChange={setSelectedPipelineId}>
```
(Add `?? undefined` to convert null to undefined)

**Step 2: Make funnel table toggleable**

In `funnel/page.tsx`, add state:
```tsx
const [showTable, setShowTable] = useState(false)
```

Find the table section and wrap it:
```tsx
<div className="mt-6 flex justify-center">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowTable(!showTable)}
    className="gap-2 text-muted-foreground"
  >
    {showTable ? "Masquer les details" : "Voir les details"}
  </Button>
</div>

<div className={`overflow-hidden transition-all duration-300 ${showTable ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0"}`}>
  {/* existing table code */}
</div>
```

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/deals/page.tsx frontend/app/\(app\)/pipeline/funnel/page.tsx
git commit -m "fix: resolve Tabs warning and make funnel table toggleable

- Pipeline Tabs: fix uncontrolled-to-controlled warning
- Funnel: table hidden by default with toggle button

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Contact Detail — Section Cards & Mobile Tabs

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`
- Modify: `frontend/components/contacts/ContactInfo.tsx` (if sections are rendered there)

**Step 1: Wrap each section in the left panel with card styling**

Find each section container (Categories, Coordonnees, Qualification, Profil) and wrap with:
```tsx
<div className="bg-card border border-border rounded-xl p-5">
  {/* existing section content */}
</div>
```

Change the left panel `space-y-4` to keep consistent spacing between cards.

**Step 2: Move AI Summary to a tab**

Find the AI summary section in the left panel and remove it. Add a new tab "Resume IA" to the TabsList:

```tsx
<TabsTrigger value="ai-summary" className="gap-1.5 px-2.5 py-1.5 text-xs">
  <MessageCircle className="h-3.5 w-3.5" />
  <span>Resume IA</span>
</TabsTrigger>
```

Add corresponding `TabsContent`:
```tsx
<TabsContent value="ai-summary" className="p-6">
  {/* AI summary content moved here */}
</TabsContent>
```

**Step 3: Fix mobile tabs with horizontal scroll**

Update the `TabsList` to support horizontal scrolling:

```tsx
<TabsList className="overflow-x-auto scrollbar-hide flex w-full justify-start">
  <TabsTrigger value="activities" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
    <Clock className="h-3.5 w-3.5" />
    <span>Activites</span>
  </TabsTrigger>
  {/* ... other triggers with shrink-0 ... */}
</TabsList>
```

Add scrollbar-hide utility in globals.css if not present:
```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

**Step 4: Style activity items as cards**

In `ContactTimeline` component, wrap each activity item:
```tsx
<div className="bg-card rounded-lg p-3 border border-border/50">
  {/* existing activity content */}
</div>
```

With `space-y-2` between items.

**Step 5: Commit**

```bash
git add frontend/app/\(app\)/contacts/\[id\]/page.tsx frontend/components/contacts/ frontend/app/globals.css
git commit -m "feat: redesign contact detail with section cards and scrollable tabs

- Each info section wrapped in card with border
- AI Summary moved to dedicated tab
- Mobile tabs horizontally scrollable with text always visible
- Activity items styled as cards

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Trash Page Padding & Accent Fixes

**Files:**
- Modify: `frontend/app/(app)/trash/page.tsx`
- Grep and fix accent issues across all pages

**Step 1: Fix trash page padding**

Find the main container and ensure it uses consistent padding:
```tsx
<div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
```

**Step 2: Fix missing accents across codebase**

Search for and fix:
- `"Cree le"` -> `"Cree le"` (already correct with accents in most places, verify)
- `"Taches"` in trash TYPE_LABELS -> `"Tâches"`
- `"Reinitialiser"` in FilterPanel line 39 -> `"Reinitialiser"` (verify accent)
- `"Toutes les periodes"` in funnel -> `"Toutes les periodes"` (verify)
- `"Cette annee"` -> `"Cette annee"` (verify)
- `"Aucun resultat"` in DataTable line 38 -> `"Aucun resultat."` (verify)

Run: `grep -rn "periodes\|annee\|Taches\|resultat\|Reinit" frontend/app/ frontend/components/ --include="*.tsx"` to find all instances.

**Step 3: Fix "Lead score" label -> "Score"**

In contacts page and filter controls, change label text from "Lead score" to "Score" where used as a UI label.

**Step 4: Commit**

```bash
git add frontend/
git commit -m "fix: consistent padding on trash page and fix missing accents

- Trash page uses same p-4/p-8/p-12 as other pages
- Fix missing French accents across labels
- Rename 'Lead score' to 'Score' in UI labels

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Tasks Mobile — Wrapping Titles & Validation

**Files:**
- Modify: `frontend/components/tasks/TaskList.tsx:114-120`
- Modify: `frontend/components/tasks/TaskDialog.tsx` (for title validation)

**Step 1: Allow task title wrapping on mobile**

In `TaskList.tsx`, on the task description `<p>` (line 114), ensure there's no `truncate` class and add:
```tsx
className={`text-sm font-medium font-[family-name:var(--font-body)] break-words ${
  task.is_done ? "line-through text-muted-foreground" : ""
}`}
```

**Step 2: Add title validation in TaskDialog**

In `TaskDialog.tsx`, find the title/description input and add:
```tsx
minLength={2}
required
```

Also add client-side validation before submit:
```tsx
if (formData.description.trim().length < 2) {
  toast.error("Le titre doit contenir au moins 2 caracteres")
  return
}
```

**Step 3: Commit**

```bash
git add frontend/components/tasks/TaskList.tsx frontend/components/tasks/TaskDialog.tsx
git commit -m "fix: task title wraps on mobile and minimum length validation

- Task titles use break-words instead of truncation
- TaskDialog validates title minimum 2 characters

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Quick Create FAB

**Files:**
- Create: `frontend/components/shared/QuickCreateFAB.tsx`
- Modify: `frontend/app/(app)/layout.tsx`

**Step 1: Create QuickCreateFAB component**

```tsx
"use client"

import { useState } from "react"
import { Plus, X, Users, Kanban, CheckSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const actions = [
  { label: "Contact", icon: Users, href: "/contacts", action: "create-contact" },
  { label: "Deal", icon: Kanban, href: "/deals", action: "create-deal" },
  { label: "Tache", icon: CheckSquare, href: "/tasks", action: "create-task" },
]

export function QuickCreateFAB() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2">
      {/* Action buttons */}
      {open && actions.map((action, i) => (
        <button
          key={action.action}
          onClick={() => {
            router.push(`${action.href}?action=${action.action}`)
            setOpen(false)
          }}
          className={cn(
            "flex items-center gap-2 rounded-full bg-card border border-border shadow-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            "hover:bg-secondary hover:shadow-xl",
            "animate-in fade-in slide-in-from-bottom-2"
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <action.icon className="h-4 w-4 text-primary" />
          {action.label}
        </button>
      ))}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200",
          "hover:shadow-xl hover:scale-105 active:scale-95",
          open && "rotate-45"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  )
}
```

**Step 2: Add to app layout**

In `frontend/app/(app)/layout.tsx`, import and add `<QuickCreateFAB />` inside the layout, after the main content area.

**Step 3: Commit**

```bash
git add frontend/components/shared/QuickCreateFAB.tsx frontend/app/\(app\)/layout.tsx
git commit -m "feat: add quick create floating action button

- FAB in bottom-right corner on all pages
- Radial menu to create Contact, Deal, or Task
- Animated expand/collapse with rotate transition

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Overdue Badge in Sidebar

**Files:**
- Modify: `frontend/components/Sidebar.tsx`
- Create: `frontend/hooks/useOverdueCount.ts`

**Step 1: Create hook for overdue count**

```tsx
"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

export function useOverdueCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await apiFetch<{ count: number }>("/tasks/?is_done=false&due_date=overdue&page_size=1")
        setCount(data.count ?? 0)
      } catch {
        // Silently fail — badge is non-critical
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  return count
}
```

**Step 2: Add badge to Sidebar**

In `Sidebar.tsx`, import and use the hook:

```tsx
import { useOverdueCount } from "@/hooks/useOverdueCount"
// Inside Sidebar component:
const overdueCount = useOverdueCount()
```

In the navigation rendering, when rendering the "Taches" item, add:

```tsx
{item.name === "Taches" && overdueCount > 0 && (
  <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
    {overdueCount}
  </span>
)}
```

**Step 3: Commit**

```bash
git add frontend/hooks/useOverdueCount.ts frontend/components/Sidebar.tsx
git commit -m "feat: add overdue task count badge to sidebar

- New useOverdueCount hook fetches count every 60s
- Red badge shows count next to Taches nav item

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 13: Empty States — Segments, Workflows, Reports

**Files:**
- Modify: `frontend/app/(app)/segments/page.tsx`
- Modify: `frontend/app/(app)/workflows/page.tsx`
- Modify: `frontend/app/(app)/reports/page.tsx`

**Step 1: Segments — suggested segments**

After the DataTable, when segment count < 5, add:

```tsx
{segments.length < 5 && (
  <div className="space-y-4">
    <h3 className="text-sm font-medium text-muted-foreground">Segments suggeres</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        { name: "Contacts actifs (30j)", description: "Contacts avec activite dans les 30 derniers jours" },
        { name: "Leads chauds sans deal", description: "Contacts 'chaud' sans deal associe" },
        { name: "Contacts sans email", description: "Contacts sans adresse email renseignee" },
      ].map((suggestion) => (
        <button
          key={suggestion.name}
          onClick={() => handleCreateFromSuggestion(suggestion)}
          className="text-left p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-card transition-colors"
        >
          <p className="text-sm font-medium">{suggestion.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 2: Workflows — inline templates**

When workflow count < 3, show templates directly on page instead of behind a button. Move the template list from the dialog to an inline grid.

**Step 3: Reports — descriptive icons**

Add chart-type icons (BarChart3, TrendingUp, PieChart) to each report template card for visual richness.

**Step 4: Commit**

```bash
git add frontend/app/\(app\)/segments/page.tsx frontend/app/\(app\)/workflows/page.tsx frontend/app/\(app\)/reports/page.tsx
git commit -m "feat: enrich empty states for segments, workflows, and reports

- Segments: suggested segment templates when < 5 items
- Workflows: inline templates when few workflows
- Reports: descriptive icons on template cards

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Chat Mobile — Conversation History Access

**Files:**
- Modify: `frontend/app/(app)/chat/page.tsx` or `frontend/components/chat/ChatWindow.tsx`

**Step 1: Add mobile conversation drawer**

Find the ChatWindow component and add a mobile-only button to toggle conversation list:

```tsx
{/* Mobile conversation list toggle */}
<button
  onClick={() => setShowConversations(!showConversations)}
  className="lg:hidden fixed top-16 left-4 z-30 p-2 rounded-lg bg-card border border-border shadow-sm"
>
  <MessageSquare className="h-4 w-4" />
</button>
```

Add a drawer similar to FilterPanel that shows the conversation list:

```tsx
{showConversations && (
  <>
    <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setShowConversations(false)} />
    <div className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] bg-background border-r border-border overflow-y-auto shadow-xl animate-in slide-in-from-left duration-300 lg:hidden">
      {/* Conversation list content */}
    </div>
  </>
)}
```

**Step 2: Commit**

```bash
git add frontend/components/chat/ frontend/app/\(app\)/chat/
git commit -m "feat: add mobile conversation history drawer for chat

- Toggle button to show conversation list on mobile
- Slide-in drawer from left with conversation history

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Products — Dynamic Reference Column

**Files:**
- Modify: `frontend/app/(app)/products/page.tsx`

**Step 1: Conditionally show reference column**

Find the columns definition and wrap the reference column:

```tsx
const hasReferences = products.some((p) => p.reference && p.reference !== "-")

// In columns array, conditionally include:
...(hasReferences ? [{
  key: "reference",
  header: "Reference",
  render: (item: Product) => item.reference || "\u2014",
}] : []),
```

**Step 2: Commit**

```bash
git add frontend/app/\(app\)/products/page.tsx
git commit -m "fix: hide products reference column when no products have references

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 16: Final Verification Pass

**Files:** All modified files

**Step 1: Build check**

```bash
cd frontend && npm run build
```

Fix any TypeScript errors.

**Step 2: Visual verification checklist**

Verify on each page:
- [ ] Contrast: muted text readable (5.2:1 ratio)
- [ ] Table headers have distinct background
- [ ] FilterBar hidden by default, toggles correctly
- [ ] Sidebar groups render with labels
- [ ] Sidebar inactive links are legible (80% opacity)
- [ ] Contact table shows ~12 rows at 1440x900
- [ ] Lead score shows text label
- [ ] Pipeline cards show EUR without $ sign
- [ ] Priority badges have correct contrast
- [ ] Mobile: task due dates visible
- [ ] Mobile: contact detail tabs scroll horizontally
- [ ] Mobile: chat has conversation history button
- [ ] Trash page has consistent padding
- [ ] FAB visible and working
- [ ] Overdue badge appears in sidebar

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors from UX audit fixes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
