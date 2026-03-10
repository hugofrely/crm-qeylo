# Contacts Ice-Glass Theme Prototype — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated prototype page at `/contacts-prototype` with a "liquide-glace" visual theme (Deep Ocean + Arctic Crystal search bar), supporting both light and dark modes.

**Architecture:** New route + new table component + scoped CSS. All data fetching reuses existing services. No changes to existing pages or global styles.

**Tech Stack:** Next.js 16 (app router), React 19, Tailwind CSS v4, shadcn/ui (DropdownMenu, Dialog, Button, Input, Checkbox), Lucide icons, next-intl, existing `@/services/contacts` and `@/lib/api`.

**Spec:** `docs/superpowers/specs/2026-03-10-contacts-ice-glass-theme-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/app/[locale]/(app)/contacts-prototype/page.tsx` | Prototype page — data fetching, state, actions dropdown, create dialog, search bar, filters, pagination |
| Create | `frontend/components/contacts/ContactTableIceGlass.tsx` | Ice-glass themed contact list — sortable column headers, rows with avatar ring, score dot, hover glass effect |
| Create | `frontend/app/[locale]/(app)/contacts-prototype/ice-glass.css` | Scoped CSS — all ice-glass theme variables, double-border, gradients, shadows for light+dark modes |

---

## Chunk 1: Ice-Glass CSS + Table Component

### Task 1: Create the scoped ice-glass CSS file

**Files:**
- Create: `frontend/app/[locale]/(app)/contacts-prototype/ice-glass.css`

This file defines all visual tokens for the ice-glass theme, scoped under a `.ice-glass` wrapper class so nothing leaks to the rest of the app.

- [ ] **Step 1: Create the CSS file with light and dark theme variables**

```css
/* Ice-Glass theme — scoped under .ice-glass wrapper */

.ice-glass {
  /* Light mode (default) */
  --ig-bg: linear-gradient(150deg, rgba(235, 245, 255, 0.97), rgba(240, 248, 255, 0.92), rgba(230, 242, 255, 0.97));
  --ig-surface: rgba(255, 255, 255, 0.45);
  --ig-surface-hover: rgba(255, 255, 255, 0.65);
  --ig-border-outer: rgba(255, 255, 255, 0.85);
  --ig-border-inset: rgba(255, 255, 255, 0.5);
  --ig-border-subtle: rgba(13, 50, 80, 0.08);
  --ig-shadow: 0 20px 60px rgba(13, 40, 70, 0.1), 0 8px 24px rgba(13, 40, 70, 0.06);
  --ig-shadow-ambient: 0 0 80px rgba(13, 79, 79, 0.04);
  --ig-text-primary: #1A2D3D;
  --ig-text-secondary: #4A6A80;
  --ig-text-muted: #6B8DA8;
  --ig-text-faint: #8AA0B2;
  --ig-row-border: transparent;
  --ig-row-hover-bg: rgba(255, 255, 255, 0.6);
  --ig-row-hover-border: rgba(255, 255, 255, 0.8);
  --ig-row-hover-shadow: 0 2px 8px rgba(13, 40, 70, 0.05);
  --ig-input-bg: rgba(255, 255, 255, 0.5);
  --ig-input-border: rgba(13, 50, 80, 0.12);
  --ig-toolbar-gradient: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2));
  --ig-avatar-inner-bg: #EEF4FA;
  --ig-btn-glass-bg: rgba(255, 255, 255, 0.6);
  --ig-btn-glass-border: rgba(13, 50, 80, 0.12);
  --ig-btn-glass-text: #3A5A70;
  --ig-btn-glass-shadow: 0 1px 3px rgba(13, 40, 70, 0.06);
}

:is(.dark *).ice-glass,
.dark .ice-glass {
  --ig-bg: linear-gradient(150deg, rgba(8, 25, 50, 0.97), rgba(15, 35, 55, 0.92), rgba(8, 20, 40, 0.97));
  --ig-surface: rgba(10, 25, 42, 0.8);
  --ig-surface-hover: rgba(100, 180, 255, 0.06);
  --ig-border-outer: rgba(100, 180, 255, 0.12);
  --ig-border-inset: rgba(100, 180, 255, 0.04);
  --ig-border-subtle: rgba(100, 180, 255, 0.06);
  --ig-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3);
  --ig-shadow-ambient: 0 0 80px rgba(13, 79, 79, 0.08);
  --ig-text-primary: #D0E4F2;
  --ig-text-secondary: #6B8DA8;
  --ig-text-muted: #4A7A98;
  --ig-text-faint: #3A6A88;
  --ig-row-border: transparent;
  --ig-row-hover-bg: rgba(100, 180, 255, 0.05);
  --ig-row-hover-border: rgba(100, 180, 255, 0.08);
  --ig-row-hover-shadow: none;
  --ig-input-bg: rgba(255, 255, 255, 0.04);
  --ig-input-border: rgba(255, 255, 255, 0.1);
  --ig-toolbar-gradient: linear-gradient(180deg, rgba(100, 180, 255, 0.04), transparent);
  --ig-avatar-inner-bg: #0A1A30;
  --ig-btn-glass-bg: rgba(255, 255, 255, 0.04);
  --ig-btn-glass-border: rgba(255, 255, 255, 0.1);
  --ig-btn-glass-text: #8AB0CC;
  --ig-btn-glass-shadow: none;
}

/* Main container */
.ig-container {
  background: var(--ig-bg);
  border: 1px solid var(--ig-border-outer);
  box-shadow:
    inset 0 0 0 4px var(--ig-border-inset),
    inset 0 1px 0 var(--ig-border-outer),
    var(--ig-shadow),
    var(--ig-shadow-ambient);
  border-radius: 20px;
  overflow: hidden;
}

/* Toolbar */
.ig-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--ig-border-subtle);
  background: var(--ig-toolbar-gradient);
}

/* Search bar */
.ig-search {
  padding: 10px 16px 10px 40px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--ig-input-border);
  background: var(--ig-input-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--ig-text-primary);
  font-size: 13px;
  font-family: var(--font-body), system-ui, sans-serif;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.ig-search::placeholder { color: var(--ig-text-muted); }
.ig-search:focus {
  border-color: var(--teal, #0D4F4F);
  background: var(--ig-surface-hover);
}

/* Table head */
.ig-table-head {
  display: grid;
  grid-template-columns: 2.4fr 1.4fr 0.8fr 1fr;
  gap: 8px;
  padding: 10px 24px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ig-text-muted);
  border-bottom: 1px solid var(--ig-border-subtle);
  font-family: var(--font-body), system-ui, sans-serif;
}

.ig-table-head-cell {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}
.ig-table-head-cell:hover { color: var(--ig-text-primary); }

/* Row */
.ig-row {
  display: grid;
  grid-template-columns: 2.4fr 1.4fr 0.8fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 13px 24px;
  margin: 3px 12px;
  border-radius: 12px;
  border: 1px solid var(--ig-row-border);
  cursor: pointer;
  transition: all 0.2s ease;
}
.ig-row:hover {
  background: var(--ig-row-hover-bg);
  border-color: var(--ig-row-hover-border);
  box-shadow: var(--ig-row-hover-shadow);
}

/* Avatar ring */
.ig-avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--teal, #0D4F4F), var(--teal-dark, #3DD9D9));
  padding: 2px;
  flex-shrink: 0;
}
.ig-avatar-ring-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--ig-avatar-inner-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--ig-text-secondary);
  font-family: var(--font-body), system-ui, sans-serif;
}

/* Score dots */
.ig-score-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ig-score-hot { background: #E85670; }
.ig-score-warm { background: #F0A040; }
.ig-score-cold { background: #38B0E8; }

/* Glass button (for Actions dropdown trigger) */
.ig-btn-glass {
  font-size: 12px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid var(--ig-btn-glass-border);
  background: var(--ig-btn-glass-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--ig-btn-glass-text);
  box-shadow: var(--ig-btn-glass-shadow);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  font-family: var(--font-body), system-ui, sans-serif;
}
.ig-btn-glass:hover {
  background: var(--ig-surface-hover);
}

/* Empty state */
.ig-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--ig-text-muted);
  font-size: 14px;
  font-family: var(--font-body), system-ui, sans-serif;
}

/* List padding bottom */
.ig-list {
  padding: 4px 0 12px;
}
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `ls -la frontend/app/\[locale\]/\(app\)/contacts-prototype/`
Expected: `ice-glass.css` exists

- [ ] **Step 3: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/contacts-prototype/ice-glass.css
git commit -m "feat: add ice-glass scoped CSS for contacts prototype"
```

---

### Task 2: Create the ContactTableIceGlass component

**Files:**
- Create: `frontend/components/contacts/ContactTableIceGlass.tsx`

This component renders a contact list using the ice-glass CSS classes. It reuses the same `Contact` type and sorting logic from the existing codebase.

- [ ] **Step 1: Create the component file**

```tsx
"use client"

import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import type { Contact } from "@/types"

interface ContactTableIceGlassProps {
  contacts: Contact[]
  ordering?: string
  onOrderingChange?: (ordering: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

type SortField = "last_name" | "company" | "created_at"

function SortIcon({ field, ordering }: { field: SortField; ordering: string }) {
  const isAsc = ordering === field
  const isDesc = ordering === `-${field}`
  if (isAsc) return <ArrowUp className="h-3 w-3" />
  if (isDesc) return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-30" />
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function ContactTableIceGlass({
  contacts,
  ordering = "-created_at",
  onOrderingChange,
}: ContactTableIceGlassProps) {
  const router = useRouter()
  const t = useTranslations("contacts")

  const handleSort = (field: SortField) => {
    if (!onOrderingChange) return
    const isAsc = ordering === field
    const isDesc = ordering === `-${field}`
    if (isAsc) onOrderingChange(`-${field}`)
    else if (isDesc) onOrderingChange("-created_at")
    else onOrderingChange(field)
  }

  if (contacts.length === 0) {
    return (
      <div className="ig-empty">
        <p>{t("emptyState.noContacts")}</p>
      </div>
    )
  }

  return (
    <>
      {/* Column headers */}
      <div className="ig-table-head">
        <span className="ig-table-head-cell" onClick={() => handleSort("last_name")}>
          {t("table.name")}
          <SortIcon field="last_name" ordering={ordering} />
        </span>
        <span className="ig-table-head-cell" onClick={() => handleSort("company")}>
          {t("table.company")}
          <SortIcon field="company" ordering={ordering} />
        </span>
        <span>{t("filter.score")}</span>
        <span className="ig-table-head-cell" onClick={() => handleSort("created_at")}>
          {t("table.createdAt")}
          <SortIcon field="created_at" ordering={ordering} />
        </span>
      </div>

      {/* Rows */}
      <div className="ig-list">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="ig-row"
            onClick={() => router.push(`/contacts/${contact.id}`)}
          >
            {/* Name cell */}
            <div className="flex items-center gap-3">
              <div className="ig-avatar-ring">
                <div className="ig-avatar-ring-inner">
                  {getInitials(contact.first_name, contact.last_name)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-primary)" }}>
                  {contact.first_name} {contact.last_name}
                </div>
                {contact.job_title && (
                  <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-muted)" }}>
                    {contact.job_title}
                  </div>
                )}
              </div>
            </div>

            {/* Company cell */}
            <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-secondary)" }}>
              {contact.company || "\u2014"}
            </div>

            {/* Score cell */}
            <div className="flex items-center gap-1.5">
              {contact.lead_score && (
                <>
                  <span className={`ig-score-dot ${
                    contact.lead_score === "hot"
                      ? "ig-score-hot"
                      : contact.lead_score === "warm"
                        ? "ig-score-warm"
                        : "ig-score-cold"
                  }`} />
                  <span className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-secondary)" }}>
                    {t(`leadScore.${contact.lead_score}`)}
                  </span>
                </>
              )}
            </div>

            {/* Date cell */}
            <div className="text-xs font-[family-name:var(--font-body)]" style={{ color: "var(--ig-text-faint)" }}>
              {formatDate(contact.created_at)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `ContactTableIceGlass.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/contacts/ContactTableIceGlass.tsx
git commit -m "feat: add ContactTableIceGlass component"
```

---

## Chunk 2: Prototype Page

### Task 3: Create the contacts-prototype page

**Files:**
- Create: `frontend/app/[locale]/(app)/contacts-prototype/page.tsx`

This page reuses all the data fetching logic and services from the existing contacts page but renders with the ice-glass theme. Key differences from the original page:
- Wraps everything in a `.ice-glass` class
- Uses `ContactTableIceGlass` instead of `ContactTable`
- Has an "Actions" dropdown (using shadcn DropdownMenu) instead of separate buttons
- Includes a full-width search bar below the toolbar
- Imports `./ice-glass.css` for scoped styles

**Reference files:**
- Existing page: `frontend/app/[locale]/(app)/contacts/page.tsx` (full data fetching, state, handlers)
- Services: `frontend/services/contacts.ts` (all API functions)
- Types: `frontend/types/contacts.ts` (Contact, ContactCategory)
- Components: `frontend/components/contacts/ImportCSVDialog.tsx`, `frontend/components/shared/Pagination.tsx`, `frontend/components/shared/FilterBar.tsx`, `frontend/components/shared/FilterControls.tsx`, `frontend/components/shared/FilterPanel.tsx`

- [ ] **Step 1: Create the page file**

The page should:
1. Import `./ice-glass.css` at the top
2. Copy all state and handlers from the existing contacts page (search, pagination, filters, create contact, export, bulk actions)
3. Render the outer wrapper with `className="ice-glass"`
4. Replace the `<PageHeader>` with a custom toolbar inside `ig-container`:
   - Left side: page title (Instrument Serif) + count
   - Right side: "Actions" DropdownMenu (items: Import CSV trigger, Export CSV, Detect Duplicates) + "+ Ajouter" primary button
5. Below toolbar: full-width search input with `ig-search` class + search icon
6. Then `<ContactTableIceGlass>` component
7. Pagination below the container
8. Keep existing FilterPanel (mobile) — it's a slide-over so it doesn't need restyling
9. Keep the create contact Dialog and DuplicateDetectionDialog as-is (they use shadcn Dialog which already looks fine)
10. Bulk action bar: keep at bottom with slightly adapted styling

Key imports needed:
```tsx
import "./ice-glass.css"
import { ContactTableIceGlass } from "@/components/contacts/ContactTableIceGlass"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
```

The toolbar section should look like:
```tsx
<div className="ig-toolbar">
  <div>
    <h1 className="text-xl tracking-tight font-[family-name:var(--font-display)]"
        style={{ color: "var(--ig-text-primary)" }}>
      {t("title")}
      <span className="text-sm font-normal ml-2 font-[family-name:var(--font-body)]"
            style={{ color: "var(--ig-text-muted)" }}>
        {totalCount}
      </span>
    </h1>
  </div>
  <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ig-btn-glass">
          Actions
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          {t("import.button")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {t("export")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button className="gap-2" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {t("add")}
    </Button>
  </div>
</div>
```

The search bar section (inside ig-container, below toolbar):
```tsx
<div className="relative px-6 py-3">
  <Search className="absolute left-9 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: "var(--ig-text-muted)" }} />
  <input
    type="text"
    className="ig-search"
    placeholder={t("searchPlaceholder")}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>
```

For ImportCSVDialog: The existing component uses `<DialogTrigger>` internally. Since we're moving it into a dropdown, we need to control the dialog open state externally. Add state `importOpen` and render `<ImportCSVDialog>` with an `open` and `onOpenChange` prop if available, otherwise render it outside the dropdown and trigger it via state. Check the ImportCSVDialog component's interface — if it uses an internal trigger button, we can render it hidden and trigger programmatically, or simply render it alongside with its own trigger hidden. The simplest approach: render ImportCSVDialog outside the dropdown normally (it has its own trigger button), and in the Actions dropdown just provide an "Import CSV" item that clicks the hidden trigger. **Alternative simpler approach:** Keep ImportCSVDialog as a standalone button outside the dropdown if its API doesn't support controlled open state, and only put Export in the dropdown. This is the recommended approach for the prototype.

- [ ] **Step 2: Verify the page renders**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3000/fr/contacts-prototype` (or the Docker-mapped port).
Expected: The page renders with the ice-glass theme, contacts load from the API, search works, sorting works, pagination works.

- [ ] **Step 4: Verify dark mode**

Toggle dark mode in the app.
Expected: The theme switches to the dark ocean variant with blue-tinted borders and deep shadows.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/\[locale\]/\(app\)/contacts-prototype/
git commit -m "feat: add contacts-prototype page with ice-glass theme"
```

---

## Chunk 3: Polish & Gitignore

### Task 4: Add .superpowers to .gitignore

**Files:**
- Modify: `frontend/.gitignore` or root `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Check which .gitignore exists at root and add `.superpowers/` if not already present.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```

### Task 5: Visual polish pass

After the page is working, do a visual pass:

- [ ] **Step 1: Check spacing and alignment**

Open the prototype in browser and verify:
- Toolbar has consistent padding
- Search bar aligns with content
- Rows have consistent vertical rhythm
- Avatar rings are perfectly circular
- Score dots are vertically centered

- [ ] **Step 2: Check light/dark mode transitions**

Toggle between modes and verify all CSS variables switch correctly.

- [ ] **Step 3: Fix any visual issues found**

Edit CSS or component as needed.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: polish ice-glass contacts prototype"
```
