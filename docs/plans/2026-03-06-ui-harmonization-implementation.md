# UI Harmonization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harmonize all CRM pages with consistent shared components for headers, filters, tables, tabs, and interactions.

**Architecture:** Bottom-up approach — create 4 shared components (PageHeader, FilterPanel, DataTable, Pagination), then migrate each page to use them. All custom tab implementations replaced with Shadcn Tabs variant `default`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), lucide-react

---

## Task 1: Create PageHeader component

**Files:**
- Create: `frontend/components/shared/PageHeader.tsx`

**Step 1: Create the component**

```tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4", className)}>
      <div>
        <h1 className="text-3xl tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/PageHeader.tsx
git commit -m "feat: add shared PageHeader component"
```

---

## Task 2: Create Pagination component

**Files:**
- Create: `frontend/components/shared/Pagination.tsx`

**Step 1: Create the component**

Extract the duplicated pagination logic from contacts/products/tasks pages into a shared component.

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between font-[family-name:var(--font-body)]">
      <p className="text-sm text-muted-foreground">
        Page {page} sur {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/Pagination.tsx
git commit -m "feat: add shared Pagination component"
```

---

## Task 3: Create FilterPanel component

**Files:**
- Create: `frontend/components/shared/FilterPanel.tsx`

**Step 1: Create the component**

```tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { X, RotateCcw, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FilterPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onReset: () => void
  activeFilterCount: number
  children: React.ReactNode
}

export function FilterPanel({ open, onOpenChange, onReset, activeFilterCount, children }: FilterPanelProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "flex-shrink-0 border-l border-border bg-background overflow-y-auto transition-all duration-300",
          // Mobile: fixed overlay from right
          "fixed inset-y-0 right-0 z-50 w-[300px] lg:relative lg:z-auto",
          open ? "translate-x-0" : "translate-x-full lg:hidden lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h3 className="font-medium text-sm">Filtres</h3>
          <div className="flex items-center gap-1">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="xs" onClick={onReset} className="gap-1 text-muted-foreground">
                <RotateCcw className="h-3 w-3" />
                Reinitialiser
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {children}
        </div>
      </div>
    </>
  )
}

interface FilterTriggerButtonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeFilterCount: number
}

export function FilterTriggerButton({ open, onOpenChange, activeFilterCount }: FilterTriggerButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onOpenChange(!open)}
      className="gap-2"
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

interface FilterSectionProps {
  label: string
  children: React.ReactNode
}

export function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
        {label}
      </label>
      {children}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/FilterPanel.tsx
git commit -m "feat: add shared FilterPanel component with trigger button"
```

---

## Task 4: Create DataTable component

**Files:**
- Create: `frontend/components/shared/DataTable.tsx`

**Step 1: Create the component**

Generic table component wrapping shadcn Table with consistent styling.

```tsx
"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: string
  className?: string
  headerClassName?: string
  render: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyIcon?: React.ReactNode
  emptyMessage?: string
  onRowClick?: (item: T) => void
  rowKey: (item: T) => string
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyIcon,
  emptyMessage = "Aucun resultat.",
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {emptyIcon}
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          {emptyMessage}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]",
                  col.headerClassName
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={rowKey(item)}
              className={cn(
                "transition-all duration-200",
                onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/30"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/components/shared/DataTable.tsx
git commit -m "feat: add shared DataTable component"
```

---

## Task 5: Migrate Contacts page

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Replace header with PageHeader**

Replace the header div (lines 209-340) with:

```tsx
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { Pagination } from "@/components/shared/Pagination"
```

Replace the header JSX:
```tsx
<PageHeader
  title="Contacts"
  subtitle={`${totalCount} contact${totalCount !== 1 ? "s" : ""} au total`}
>
  <FilterTriggerButton
    open={filterOpen}
    onOpenChange={setFilterOpen}
    activeFilterCount={activeFilterCount}
  />
  <ImportCSVDialog onImported={fetchContacts} />
  <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    Exporter
  </Button>
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogTrigger asChild>
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        Ajouter
      </Button>
    </DialogTrigger>
    {/* ... existing dialog content stays the same ... */}
  </Dialog>
</PageHeader>
```

**Step 2: Add filter state and wrap content with FilterPanel**

Add state:
```tsx
const [filterOpen, setFilterOpen] = useState(false)
const activeFilterCount = [search, selectedCategory, selectedSegment].filter(Boolean).length
```

Wrap the main content area in a flex container:
```tsx
<div className="flex gap-0">
  <div className="flex-1 min-w-0 space-y-8">
    {/* Table + Pagination content here */}
    <ContactTable contacts={contacts} />
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
  </div>
  <FilterPanel
    open={filterOpen}
    onOpenChange={setFilterOpen}
    onReset={() => { setSearch(""); setSelectedCategory(null); setSelectedSegment(null) }}
    activeFilterCount={activeFilterCount}
  >
    <FilterSection label="Recherche">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-secondary/30 border-border/60"
        />
      </div>
    </FilterSection>
    <FilterSection label="Segment">
      <SegmentSelector
        selectedSegmentId={selectedSegment}
        onSelect={(id) => { setSelectedSegment(id); setSelectedCategory(null); setSearch("") }}
      />
    </FilterSection>
    <FilterSection label="Categorie">
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { setSelectedCategory(null); setSelectedSegment(null) }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          Tous
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSelectedSegment(null) }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </button>
        ))}
      </div>
    </FilterSection>
  </FilterPanel>
</div>
```

**Step 3: Remove inline search, segment selector, and category pills**

Remove the separate search div, segment selector div, and category tabs div that were previously inline. They are now inside the FilterPanel.

**Step 4: Replace pagination**

Remove the custom pagination JSX and replace with:
```tsx
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

Remove the local `getPageNumbers` function.

**Step 5: Commit**

```bash
git add frontend/app/(app)/contacts/page.tsx
git commit -m "refactor(contacts): use PageHeader, FilterPanel, Pagination"
```

---

## Task 6: Migrate Products page

**Files:**
- Modify: `frontend/app/(app)/products/page.tsx`

**Step 1: Replace header with PageHeader**

```tsx
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { Pagination } from "@/components/shared/Pagination"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
```

Replace header:
```tsx
<PageHeader
  title="Produits"
  subtitle={`${totalCount} produit${totalCount !== 1 ? "s" : ""} au total`}
>
  <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
  <Button className="gap-2" onClick={openCreateDialog}>
    <Plus className="h-4 w-4" />
    Nouveau produit
  </Button>
</PageHeader>
```

**Step 2: Replace raw HTML table with DataTable**

Define columns:
```tsx
const columns: DataTableColumn<Product>[] = [
  {
    key: "reference",
    header: "Reference",
    className: "text-muted-foreground text-sm font-[family-name:var(--font-body)]",
    render: (p) => p.reference || "-",
  },
  {
    key: "name",
    header: "Nom",
    className: "font-medium text-sm",
    render: (p) => p.name,
  },
  {
    key: "category",
    header: "Categorie",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]",
    render: (p) => p.category_name || "-",
  },
  {
    key: "price",
    header: "Prix unitaire",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-sm",
    render: (p) => p.unit_price ? formatEUR(p.unit_price) : "-",
  },
  {
    key: "unit",
    header: "Unite",
    headerClassName: "hidden lg:table-cell",
    className: "hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]",
    render: (p) => UNIT_LABELS[p.unit],
  },
  {
    key: "tax",
    header: "TVA",
    headerClassName: "hidden lg:table-cell text-right",
    className: "hidden lg:table-cell text-right text-muted-foreground tabular-nums text-sm",
    render: (p) => p.tax_rate ? `${p.tax_rate}%` : "-",
  },
  {
    key: "status",
    header: "Statut",
    render: (p) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        p.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
      }`}>
        {p.is_active ? "Actif" : "Archive"}
      </span>
    ),
  },
]
```

Replace the table JSX with:
```tsx
<DataTable
  columns={columns}
  data={products}
  loading={loading}
  emptyMessage="Aucun produit trouve."
  onRowClick={openEditDialog}
  rowKey={(p) => p.id}
/>
```

**Step 3: Move filters to FilterPanel**

Add state:
```tsx
const [filterOpen, setFilterOpen] = useState(false)
const activeFilterCount = [search, selectedCategory, showActive !== "active" ? showActive : null].filter(Boolean).length
```

Move search, category dropdown, and status buttons into a FilterPanel:
```tsx
<FilterPanel
  open={filterOpen}
  onOpenChange={setFilterOpen}
  onReset={() => { setSearch(""); setSelectedCategory(""); setShowActive("active") }}
  activeFilterCount={activeFilterCount}
>
  <FilterSection label="Recherche">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-secondary/30 border-border/60" />
    </div>
  </FilterSection>
  <FilterSection label="Categorie">
    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm">
      <option value="">Toutes</option>
      {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
    </select>
    <button onClick={() => setCategoryDialogOpen(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
      Gerer les categories
    </button>
  </FilterSection>
  <FilterSection label="Statut">
    <div className="flex flex-col gap-1">
      {(["active", "archived", "all"] as const).map((status) => (
        <button
          key={status}
          onClick={() => setShowActive(status)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
            showActive === status ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {status === "active" ? "Actifs" : status === "archived" ? "Archives" : "Tous"}
        </button>
      ))}
    </div>
  </FilterSection>
</FilterPanel>
```

**Step 4: Replace pagination with Pagination component**

```tsx
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

Remove local `getPageNumbers` function.

**Step 5: Commit**

```bash
git add frontend/app/(app)/products/page.tsx
git commit -m "refactor(products): use PageHeader, DataTable, FilterPanel, Pagination"
```

---

## Task 7: Migrate Tasks page

**Files:**
- Modify: `frontend/app/(app)/tasks/page.tsx`

**Step 1: Replace header with PageHeader**

```tsx
<PageHeader
  title="Taches"
  subtitle={`${todoCount} a faire, ${doneCount} terminee${doneCount !== 1 ? "s" : ""}`}
>
  <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
    <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Vue liste">
      <List className="h-4 w-4" />
    </button>
    <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded-md transition-colors ${viewMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Vue calendrier">
      <CalendarIcon className="h-4 w-4" />
    </button>
  </div>
  <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
  <Button onClick={() => handleCreate()} className="gap-2">
    <Plus className="h-4 w-4" />
    Nouvelle tache
  </Button>
</PageHeader>
```

**Step 2: Keep Tabs (already Shadcn) but move filters to FilterPanel**

The status Tabs stay inline (they are a primary navigation concern, not filters). Move all secondary filters (priority, due date, contact, member) into a FilterPanel.

Add state:
```tsx
const [filterOpen, setFilterOpen] = useState(false)
const activeFilterCount = [priority, dueDate, contactId, assignedTo].filter(Boolean).length
```

Move filter pills and autocomplete inputs into FilterPanel:
```tsx
<FilterPanel
  open={filterOpen}
  onOpenChange={setFilterOpen}
  onReset={() => { setPriority(null); setDueDate(null); clearContact(); setAssignedTo(null); setAssignedLabel(null) }}
  activeFilterCount={activeFilterCount}
>
  <FilterSection label="Priorite">
    <div className="flex flex-col gap-1">
      {priorityOptions.map((opt) => (
        <button key={opt.value} onClick={() => togglePriority(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
            priority === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </FilterSection>
  {viewMode === "list" && (
    <FilterSection label="Echeance">
      <div className="flex flex-col gap-1">
        {dueDateOptions.map((opt) => (
          <button key={opt.value} onClick={() => toggleDueDate(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
              dueDate === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FilterSection>
  )}
  <FilterSection label="Contact">
    {/* Contact autocomplete — same logic as current, styled for panel */}
  </FilterSection>
  <FilterSection label="Assigne">
    {/* Member autocomplete + "Mes taches" toggle — same logic */}
  </FilterSection>
</FilterPanel>
```

**Step 3: Replace pagination with Pagination component**

Remove local `getPageNumbers` function. Replace with:
```tsx
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

**Step 4: Commit**

```bash
git add frontend/app/(app)/tasks/page.tsx
git commit -m "refactor(tasks): use PageHeader, FilterPanel, Pagination"
```

---

## Task 8: Migrate Workflows page

**Files:**
- Modify: `frontend/app/(app)/workflows/page.tsx`

**Step 1: Replace header with PageHeader, replace card list with DataTable**

```tsx
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
```

Replace header:
```tsx
<PageHeader
  title="Workflows"
  subtitle="Automatisez vos processus CRM avec des workflows visuels"
>
  <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-2">
    <LayoutTemplate className="h-4 w-4" />
    Templates
  </Button>
  <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
    <Plus className="h-4 w-4" />
    Nouveau
  </Button>
</PageHeader>
```

Define columns and use DataTable:
```tsx
const columns: DataTableColumn<Workflow>[] = [
  {
    key: "status",
    header: "",
    headerClassName: "w-10",
    className: "w-10",
    render: (w) => (
      <button onClick={(e) => { e.stopPropagation(); handleToggle(w) }} title={w.is_active ? "Desactiver" : "Activer"}>
        {w.is_active ? <Zap className="h-5 w-5 text-primary" /> : <ZapOff className="h-5 w-5 text-muted-foreground/40" />}
      </button>
    ),
  },
  {
    key: "name",
    header: "Nom",
    render: (w) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{w.name}</span>
          {w.is_active && (
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Actif</span>
          )}
        </div>
        {w.trigger_type && (
          <span className="text-xs text-muted-foreground">{TRIGGER_LABELS[w.trigger_type] || w.trigger_type}</span>
        )}
      </div>
    ),
  },
  {
    key: "executions",
    header: "Executions",
    headerClassName: "hidden md:table-cell text-right",
    className: "hidden md:table-cell text-right text-sm text-muted-foreground tabular-nums",
    render: (w) => w.execution_count,
  },
  {
    key: "actions",
    header: "",
    headerClassName: "w-10",
    className: "w-10",
    render: (w) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${w.id}`) }}>
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/workflows/${w.id}?tab=history`) }}>
            <History className="h-4 w-4 mr-2" /> Historique
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(w.id) }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
```

Replace the workflow list with:
```tsx
<DataTable
  columns={columns}
  data={workflows}
  loading={loading}
  emptyIcon={<Zap className="h-10 w-10 text-muted-foreground/30 mb-2" />}
  emptyMessage="Aucun workflow. Creez votre premier workflow ou utilisez un template."
  onRowClick={(w) => router.push(`/workflows/${w.id}`)}
  rowKey={(w) => w.id}
/>
```

Add DropdownMenu imports:
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
```

Remove the custom dropdown menu implementation (menuOpenId state and related JSX).

Also update max-w from `max-w-4xl` to `max-w-7xl` for consistency with other list pages.

**Step 2: Commit**

```bash
git add frontend/app/(app)/workflows/page.tsx
git commit -m "refactor(workflows): use PageHeader, DataTable, DropdownMenu"
```

---

## Task 9: Migrate Segments page

**Files:**
- Modify: `frontend/app/(app)/segments/page.tsx`

**Step 1: Replace header with PageHeader, convert cards to DataTable**

```tsx
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
```

Replace header:
```tsx
<PageHeader
  title="Segments"
  subtitle={`${segments.length} segment${segments.length !== 1 ? "s" : ""} dynamique${segments.length !== 1 ? "s" : ""}`}
>
  <Button className="gap-2" onClick={handleNew}>
    <Plus className="h-4 w-4" />
    Nouveau segment
  </Button>
</PageHeader>
```

Define columns:
```tsx
const columns: DataTableColumn<Segment>[] = [
  {
    key: "name",
    header: "Nom",
    render: (s) => (
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
        <span className="font-medium text-sm">{s.name}</span>
        {s.is_pinned && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Epingle</span>
        )}
      </div>
    ),
  },
  {
    key: "description",
    header: "Description",
    headerClassName: "hidden md:table-cell",
    className: "hidden md:table-cell text-sm text-muted-foreground font-[family-name:var(--font-body)]",
    render: (s) => s.description || "-",
  },
  {
    key: "contacts",
    header: "Contacts",
    headerClassName: "text-right",
    className: "text-right text-sm text-muted-foreground tabular-nums",
    render: (s) => s.contact_count ?? 0,
  },
  {
    key: "actions",
    header: "",
    headerClassName: "w-10",
    className: "w-10",
    render: (s) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(s) }}>
            <Pencil className="h-4 w-4 mr-2" /> Modifier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(s) }}>
            <Copy className="h-4 w-4 mr-2" /> Dupliquer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
```

Replace the grid with:
```tsx
<DataTable
  columns={columns}
  data={segments}
  loading={loading}
  emptyIcon={<ListFilter className="h-12 w-12 text-muted-foreground/30 mb-4" />}
  emptyMessage="Aucun segment. Creez votre premier segment pour filtrer vos contacts dynamiquement."
  onRowClick={(s) => router.push(`/segments/${s.id}`)}
  rowKey={(s) => s.id}
/>
```

**Step 2: Commit**

```bash
git add frontend/app/(app)/segments/page.tsx
git commit -m "refactor(segments): use PageHeader, DataTable"
```

---

## Task 10: Migrate Email Templates page

**Files:**
- Modify: `frontend/app/(app)/settings/email-templates/page.tsx`

**Step 1: Read and understand the current page**

Read the file first to understand current implementation.

**Step 2: Replace with PageHeader + DataTable + FilterPanel**

Apply same patterns as other pages:
- PageHeader with "Nouveau template" button and FilterTriggerButton
- FilterPanel with search input and filter buttons (Tous/Mes templates/Partages)
- DataTable with columns: name, shared badge, subject, tags

**Step 3: Commit**

```bash
git add frontend/app/(app)/settings/email-templates/page.tsx
git commit -m "refactor(email-templates): use PageHeader, DataTable, FilterPanel"
```

---

## Task 11: Migrate Contact Detail page tabs

**Files:**
- Modify: `frontend/app/(app)/contacts/[id]/page.tsx`

**Step 1: Read the current page**

Read the file first to understand the current tab implementation.

**Step 2: Replace custom tabs with Shadcn Tabs**

Replace the custom border-b-2 tab implementation with:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
```

Replace:
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="activities">Activites</TabsTrigger>
    <TabsTrigger value="notes">Notes</TabsTrigger>
    <TabsTrigger value="emails">Emails</TabsTrigger>
    <TabsTrigger value="tasks">Taches</TabsTrigger>
    <TabsTrigger value="deals">Deals</TabsTrigger>
    <TabsTrigger value="history">Historique</TabsTrigger>
  </TabsList>
  <TabsContent value="activities">...</TabsContent>
  {/* etc */}
</Tabs>
```

Also replace the header with PageHeader if applicable (back button + contact name).

**Step 3: Commit**

```bash
git add frontend/app/(app)/contacts/[id]/page.tsx
git commit -m "refactor(contact-detail): use Shadcn Tabs"
```

---

## Task 12: Migrate Deal Detail page tabs

**Files:**
- Modify: `frontend/app/(app)/deals/[id]/page.tsx`

**Step 1: Read the current page**

Read the file first.

**Step 2: Replace custom tabs with Shadcn Tabs**

Same pattern as Task 11 — replace custom border-b-2 tabs with Shadcn Tabs.

**Step 3: Commit**

```bash
git add frontend/app/(app)/deals/[id]/page.tsx
git commit -m "refactor(deal-detail): use Shadcn Tabs"
```

---

## Task 13: Migrate Workflow Detail page tabs

**Files:**
- Modify: `frontend/app/(app)/workflows/[id]/page.tsx`

**Step 1: Read the current page**

Read the file first.

**Step 2: Replace custom tabs with Shadcn Tabs**

Replace the custom bg-card/shadow tab implementation with Shadcn Tabs.

**Step 3: Commit**

```bash
git add frontend/app/(app)/workflows/[id]/page.tsx
git commit -m "refactor(workflow-detail): use Shadcn Tabs"
```

---

## Task 14: Migrate Deals (Kanban) page tabs

**Files:**
- Modify: `frontend/app/(app)/deals/page.tsx`

**Step 1: Read the current page**

Read the file first.

**Step 2: Replace pipeline tabs with Shadcn Tabs**

Replace the custom pipeline tab buttons with Shadcn Tabs:
```tsx
<Tabs value={selectedPipeline} onValueChange={setSelectedPipeline}>
  <TabsList>
    {pipelines.map((p) => (
      <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
    ))}
  </TabsList>
</Tabs>
```

Also add PageHeader.

**Step 3: Commit**

```bash
git add frontend/app/(app)/deals/page.tsx
git commit -m "refactor(deals): use PageHeader, Shadcn Tabs for pipeline selector"
```

---

## Task 15: Light-touch pages (Dashboard, Settings, Funnel, Reports)

**Files:**
- Modify: `frontend/app/(app)/dashboard/page.tsx`
- Modify: `frontend/app/(app)/settings/page.tsx`
- Modify: `frontend/app/(app)/pipeline/funnel/page.tsx`
- Modify: `frontend/app/(app)/reports/page.tsx`

**Step 1: Read each page**

Read all four files.

**Step 2: Replace headers with PageHeader**

For each page, replace the inline header JSX with:
```tsx
<PageHeader title="..." subtitle="...">
  {/* existing action buttons */}
</PageHeader>
```

For Funnel page: additionally move the filter dropdowns (pipeline, filter mode, date range) into a FilterPanel.

For Reports page: add PageHeader.

**Step 3: Commit each separately**

```bash
git add frontend/app/(app)/dashboard/page.tsx
git commit -m "refactor(dashboard): use PageHeader"

git add frontend/app/(app)/settings/page.tsx
git commit -m "refactor(settings): use PageHeader"

git add frontend/app/(app)/pipeline/funnel/page.tsx
git commit -m "refactor(funnel): use PageHeader, FilterPanel"

git add frontend/app/(app)/reports/page.tsx
git commit -m "refactor(reports): use PageHeader"
```

---

## Task 16: Visual verification

**Step 1: Run the dev server**

```bash
cd frontend && npm run dev
```

**Step 2: Check each page visually**

Navigate through every page and verify:
- PageHeader renders correctly with title, subtitle, and action buttons
- FilterPanel opens/closes properly on both desktop and mobile
- DataTable renders with correct columns and responsive hiding
- Tabs use the Shadcn default variant consistently
- Clickable cards/rows have proper hover effects
- Pagination works correctly
- Mobile responsiveness (resize browser to check)

**Step 3: Fix any issues found**

Address each issue and commit fixes.

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix: visual adjustments for UI harmonization"
```
