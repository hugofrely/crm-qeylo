# UX Audit Fixes - Design Document

Date: 2026-03-07
Status: Approved

## Overview

Fix all ~34 UX/UI problems identified in AUDIT-UX.md. Create reusable components, ensure WCAG AA contrast compliance, optimize spacing/density, and improve responsive behavior across all pages.

Excludes: Pipeline drag & drop (already working).

---

## 1. Design Tokens & Contrasts

### 1.1 CSS Variable Corrections (globals.css)

| Variable | Old Value | New Value | Reason |
|----------|-----------|-----------|--------|
| `--muted-foreground` | `#64635E` (3.8:1) | `#504F4A` (~5.2:1) | WCAG AA compliance |
| NEW `--table-header-bg` | n/a | `#F0EDE8` | Distinct table header background |
| NEW `--border-strong` | n/a | `#C8C5BF` | Reinforced borders for pills/filters |

### 1.2 Sidebar Contrast
- Inactive links: `/60` opacity -> `/80` opacity
- User email: `/40` -> `/60`

### 1.3 Tab Inactive Contrast
- Replace opacity-based styling with direct `text-muted-foreground` color

### 1.4 Lead Score Accessibility
- Add text labels: "Chaud", "Tiede", "Froid" next to colored dots
- Use distinct icons: Flame, Thermometer, Snowflake

### 1.5 Priority Badges (TaskList)
- High: `bg-red-50 text-red-800` (was red-100/red-700)
- Normal: `bg-blue-50 text-blue-800` (was blue-100/blue-700)
- Low: `bg-gray-100 text-gray-700` (was gray-100/gray-600)

### 1.6 Deal Amounts Color
- Replace `text-green-700` with theme-aware color that works in both modes

### 1.7 Dark Mode
- All new variables must have dark mode equivalents in `.dark {}` block

---

## 2. Sidebar Restructure

### 2.1 Grouped Navigation

```
CRM:       Chat, Contacts, Segments, Pipeline, Entonnoir
GESTION:   Produits, Taches, Workflows
ANALYSE:   Dashboard, Rapports
UTILS:     Corbeille (moved from main nav)
           Parametres (stays at bottom)
```

### 2.2 Implementation
- Define `navigationGroups` array with `{ label, items }` structure
- Section labels: `text-[10px] uppercase tracking-wider text-[var(--sidebar-foreground)]/40 px-6 pt-4 pb-1`
- Move Corbeille to bottom section with Parametres
- Inactive links: `text-[var(--sidebar-foreground)]/80`

---

## 3. Collapsible Filter System

### 3.1 New Behavior
- Desktop FilterBar hidden by default (was always visible)
- FilterTriggerButton works on ALL breakpoints (remove `lg:hidden`)
- FilterBar receives `open: boolean` prop
- Animation: slide-down with `transition-all duration-200`

### 3.2 FilterBar Styling
- Background: `bg-card` (was `bg-muted/50`)
- Border: `border-border` (was `border-border/40`)
- Active filter badge on trigger button at all sizes

### 3.3 Affected Pages
- Contacts, Pipeline (deals), Tasks, Products, Funnel

---

## 4. Tables & Data Density

### 4.1 Table Header Background
- DataTable & ContactTable: `bg-[var(--table-header-bg)]` instead of `bg-secondary/30`

### 4.2 Contact Table Density
- Move job_title to inline with name (single line)
- Categories: max 2 inline, rest in tooltip
- Tags: show on hover via tooltip
- Target: 12-14 visible contacts at 1440x900 (was ~7)

### 4.3 Contact Multi-Select
- Add checkbox column (left)
- Header checkbox for select-all
- Floating action bar when selected: Delete, Add Tag, Export

### 4.4 Trash Page Padding
- Apply `p-4 sm:p-8 lg:p-12` (consistent with other pages)

---

## 5. Contact Detail

### 5.1 Section Cards
- Each section gets: `bg-card border border-border rounded-xl p-5`
- Spacing between cards: `space-y-4`

### 5.2 AI Summary Relocation
- Move from left sidebar to dedicated tab in right panel
- New tab order: Activites, Notes, Emails, Taches, Deals, Historique, Resume IA

### 5.3 Mobile Tabs Scroll
- `TabsList`: `overflow-x-auto scrollbar-hide`
- Always show text + icon (reduced padding: `px-2.5 py-1.5 text-xs`)
- Fade indicator on right edge when scrollable

### 5.4 Activity Items as Cards
- Each activity: `bg-card rounded-lg` with `space-y-2` between items
- Colored icon by type: teal=email, warm=call, violet=meeting

---

## 6. Pipeline & Funnel

### 6.1 Currency Fix (DealCard)
- Remove `DollarSign` icon
- Use `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`

### 6.2 Kanban Scroll Indicator
- Right-edge gradient fade: `bg-gradient-to-l from-background to-transparent w-12`
- Disappears when scrolled to end
- Optional left-edge gradient when scrolled from start

### 6.3 Funnel Table Toggle
- Hide table by default
- Add "Voir les details" toggle button below chart
- Slide-down animation

### 6.4 Tabs Warning Fix
- `deals/page.tsx` line 244: `value={selectedPipelineId ?? undefined}`

---

## 7. Empty States & Mobile

### 7.1 Empty State Enrichment
- Segments: "Segments suggeres" section when < 5 items
- Workflows: Show templates inline on page when few workflows
- Reports: Add descriptive icon/miniature per card

### 7.2 Chat Mobile History
- Add list button top-left in chat on mobile
- Opens drawer from left with conversation list
- Same animation pattern as FilterPanel

### 7.3 Tasks Mobile Enhancements
- Due date shown below title: `text-xs text-muted-foreground`
- Overdue: `text-xs text-red-600 font-medium` + alert icon
- Title wraps: `whitespace-normal` instead of truncation

### 7.4 Dashboard Mobile
- Already uses responsive grid
- Add tap-to-expand: widget goes fullscreen via dialog on tap

### 7.5 Intercom/Support Button
- Add `bottom-20` offset on mobile if widget exists, or make dismissable

---

## 8. Consistency & Features

### 8.1 Accent Fixes
- "Cree le" -> "Cree le" (verify all headers/labels for missing accents)
- "Lead score" -> "Score" in filter labels

### 8.2 Product Reference Column
- Hide column dynamically if no products have references

### 8.3 Task Validation
- `minLength: 2` on task title creation

### 8.4 Quick Create FAB
- Floating action button bottom-right on all pages
- Radial menu: Contact, Deal, Tache
- `z-40 bottom-6 right-6`

### 8.5 Overdue Badge in Sidebar
- Red badge next to "Taches" with overdue count
- Light fetch on sidebar mount

### 8.6 Recent Activity Widget (Dashboard)
- New widget showing cross-entity recent actions

---

## Reusable Components Created/Modified

| Component | Action |
|-----------|--------|
| `globals.css` | Updated design tokens |
| `Sidebar.tsx` | Grouped nav, contrast fix, overdue badge |
| `FilterBar.tsx` | Collapsible with `open` prop |
| `FilterTriggerButton` | Works on all breakpoints |
| `FilterControls.tsx` | Updated contrast/border styles |
| `DataTable.tsx` | Table header background |
| `ContactTable.tsx` | Density, multi-select, lead score labels |
| `DealCard.tsx` | Currency formatting |
| `TaskList.tsx` | Priority badge contrast, mobile due date |
| `PageHeader.tsx` | No changes needed |
| `QuickCreateFAB.tsx` | NEW - floating action button |
| `ScrollFadeIndicator.tsx` | NEW - gradient fade for scrollable areas |
| Contact detail page | Section cards, AI tab, mobile tabs scroll |
| Chat page | Mobile conversation drawer |
| Funnel page | Toggleable table |
| Trash page | Consistent padding |
