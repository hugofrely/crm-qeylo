# UI Harmonization Design

**Date:** 2026-03-06
**Goal:** Harmonize all CRM pages with consistent components for tabs, filters, lists, contrast, and responsiveness.

## Decisions

| Aspect | Choice |
|--------|--------|
| Lists | Unified `DataTable` for all tabular data; Cards only for Kanban/gallery |
| Filters | Right sidebar `FilterPanel` that opens/closes |
| Tabs | Shadcn `Tabs` variant `default` (muted bg + shadow) everywhere |
| Contrast | Subtle cards (border + hover shadow), primary-filled action buttons always visible |
| Approach | Bottom-up: build shared components first, then migrate pages |

## Shared Components

### 1. PageHeader

Unified header for all pages:
- Title (h1, `text-3xl tracking-tight`)
- Optional subtitle (`text-muted-foreground`)
- Right slot for action buttons (primary variant, always visible)
- Optional "Filters" button that toggles `FilterPanel` with active filter count badge
- Responsive: stack on mobile, row on sm+

### 2. FilterPanel

Right sidebar panel with slide-in animation:
- Header: title "Filtres" + close button + "Reinitialiser" button
- Content: vertical stack of fields (inputs, selects, checkboxes, pills)
- Active filter count shown on trigger button in PageHeader
- **Desktop (lg+):** inline panel, `w-[300px] flex-shrink-0`, content shrinks with `flex-1`
- **Mobile (<lg):** overlay `fixed inset-y-0 right-0` with dark backdrop, slide-in from right
- Each page provides its specific filters as children

### 3. DataTable (generic)

Wrapper around existing shadcn `Table`:
- Configurable columns with responsive visibility (`hidden md:table-cell`)
- Clickable rows: `hover:shadow-md` + `cursor-pointer` + `transition-all duration-200`
- Empty state (icon + message)
- Integrated pagination at bottom
- Loading skeleton
- Optional sortable column headers

### 4. Tabs

No new component. Systematically replace all custom tab implementations with existing Shadcn `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`, variant `default`.

## Contrast & Interaction Patterns

### Clickable cards
- Default: `border border-border`
- Hover: `hover:shadow-md` + `hover:border-primary/30` + `transition-all duration-200`
- `cursor-pointer` on full clickable area

### Primary action buttons
- Always `default` variant (solid primary bg, white text)
- Placed top-right in PageHeader
- Size: `sm` in headers, `default` in dialogs

### Secondary action buttons
- `outline` variant for secondary actions (export, filters)
- `ghost` variant only for contextual menus (... icon)

### Table rows
- Hover: `bg-muted/50` + `cursor-pointer`
- Inline actions (delete, edit, more): `ghost` + `icon-sm`

## Page Migration Plan

### List pages -> PageHeader + FilterPanel + DataTable

| Page | Tabs | Filters for FilterPanel | Table migration |
|------|------|------------------------|-----------------|
| Contacts | Categories as TabsTrigger | Search, segments, categories | ContactTable -> DataTable |
| Products | Status (Active/Archived/All) as TabsTrigger | Search, category | Raw HTML table -> DataTable |
| Tasks | Status (All/Todo/Done) - already Shadcn | Priority, date, contact, member, "my tasks" | TaskList -> DataTable |
| Workflows | None | None currently | Cards -> DataTable |
| Segments | None | None | Cards -> DataTable |
| Email templates | Filter (All/Mine/Shared) as TabsTrigger | Search, tags | Link list -> DataTable |
| Reports | None | None | Stays as grid cards (gallery, not tabular) |

### Detail pages -> PageHeader + Shadcn Tabs default

| Page | Tab migration | Other changes |
|------|--------------|---------------|
| Contact [id] | Custom border-b-2 -> Shadcn Tabs default | Action buttons in PageHeader |
| Deal [id] | Custom border-b-2 -> Shadcn Tabs default | Action buttons in PageHeader |
| Workflow [id] | Custom bg-card tabs -> Shadcn Tabs default | Unified header |

### Light-touch pages

- Dashboard: Uniform PageHeader only
- Deals (kanban): Pipeline tabs -> Shadcn Tabs default
- Settings: Uniform PageHeader only
- Funnel: Dropdowns -> FilterPanel
- Chat: No changes

### Migration order
1. Contacts (most complete, serves as reference)
2. Products (simple table, good DataTable test)
3. Tasks (already partially Shadcn)
4. Workflows, Segments, Email templates
5. Detail pages (Contact, Deal, Workflow)
6. Dashboard, Deals kanban, Funnel, Settings

## Responsiveness

### FilterPanel
- Desktop (lg+): inline right panel `w-[300px]`, content `flex-1`
- Mobile (<lg): fixed overlay from right with dark backdrop

### DataTable
- Primary columns always visible (name, status)
- Secondary columns hidden progressively: `hidden md:table-cell`, `hidden lg:table-cell`
- Mobile: 2-3 columns max

### PageHeader
- Mobile: vertical stack (`flex flex-col gap-2`)
- Desktop: horizontal (`sm:flex-row sm:items-center sm:justify-between`)
