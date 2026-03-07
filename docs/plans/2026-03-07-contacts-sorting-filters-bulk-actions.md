# Contacts: Tri, Filtres avancés & Actions en masse — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add column sorting (name, date, lead score, company), advanced combined filters (date + score + source + tags), and bulk actions (delete, export, categorize, assign company) to the contacts module.

**Architecture:** Query params on `GET /contacts/` for sorting (`ordering`) and filtering (`created_after`, `created_before`, `lead_score`, `source`, `tags`). A new `POST /contacts/bulk-actions/` endpoint for bulk operations. Frontend uses existing FilterBar/FilterPanel/FilterControls components and enhances ContactTable headers for sorting.

**Tech Stack:** Django 5 + DRF (backend), Next.js + shadcn/ui + Tailwind CSS 4 (frontend)

---

## Task 1: Backend — Add sorting and filtering to ContactViewSet

**Files:**
- Modify: `backend/contacts/views.py:11-20`

**Step 1: Add sorting and filtering to `get_queryset`**

Replace the `get_queryset` method in `ContactViewSet` with:

```python
ALLOWED_ORDERING = {
    "last_name", "-last_name",
    "created_at", "-created_at",
    "lead_score", "-lead_score",
    "company", "-company",
}

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Contact.objects.filter(organization=self.request.organization)
        params = self.request.query_params

        # Category filter (existing)
        category_id = params.get("category")
        if category_id:
            qs = qs.filter(categories__id=category_id)

        # Date range filters
        created_after = params.get("created_after")
        if created_after:
            qs = qs.filter(created_at__date__gte=created_after)

        created_before = params.get("created_before")
        if created_before:
            qs = qs.filter(created_at__date__lte=created_before)

        # Lead score filter
        lead_score = params.get("lead_score")
        if lead_score:
            qs = qs.filter(lead_score=lead_score)

        # Source filter
        source = params.get("source")
        if source:
            qs = qs.filter(source=source)

        # Tags filter (OR between tags, JSONField is a list)
        tags = params.get("tags")
        if tags:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]
            if tag_list:
                tag_q = Q()
                for tag in tag_list:
                    tag_q |= Q(tags__contains=[tag])
                qs = qs.filter(tag_q)

        # Ordering
        ordering = params.get("ordering", "-created_at")
        if ordering not in ALLOWED_ORDERING:
            ordering = "-created_at"
        qs = qs.order_by(ordering)

        return qs.distinct()
```

**Step 2: Verify the backend runs**

Run: `cd backend && python manage.py check`
Expected: System check identified no issues.

**Step 3: Commit**

```bash
git add backend/contacts/views.py
git commit -m "feat(contacts): add sorting and advanced filters to ContactViewSet"
```

---

## Task 2: Backend — Add tags endpoint for autocomplete

**Files:**
- Modify: `backend/contacts/views.py` (add new view at bottom)
- Modify: `backend/contacts/urls.py` (add route)

**Step 1: Add `list_tags` view to views.py**

Add at the bottom of `backend/contacts/views.py`:

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_tags(request):
    """Return all distinct tags used across contacts in this organization."""
    contacts = Contact.objects.filter(
        organization=request.organization
    ).exclude(tags=[]).values_list("tags", flat=True)
    all_tags = set()
    for tag_list in contacts:
        if isinstance(tag_list, list):
            all_tags.update(tag_list)
    return Response(sorted(all_tags))
```

**Step 2: Add `list_sources` view to views.py**

Add right after `list_tags`:

```python
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sources(request):
    """Return all distinct source values used across contacts in this organization."""
    sources = (
        Contact.objects.filter(organization=request.organization)
        .exclude(source="")
        .values_list("source", flat=True)
        .distinct()
    )
    return Response(sorted(set(sources)))
```

**Step 3: Add routes in urls.py**

In `backend/contacts/urls.py`, add these two paths before the `path("", include(router.urls))` line:

```python
path("tags/", views.list_tags),
path("sources/", views.list_sources),
```

**Step 4: Verify**

Run: `cd backend && python manage.py check`
Expected: System check identified no issues.

**Step 5: Commit**

```bash
git add backend/contacts/views.py backend/contacts/urls.py
git commit -m "feat(contacts): add tags and sources list endpoints"
```

---

## Task 3: Backend — Add bulk actions endpoint

**Files:**
- Modify: `backend/contacts/views.py` (add new view)
- Modify: `backend/contacts/urls.py` (add route)
- Modify: `backend/contacts/serializers.py` (add serializer)

**Step 1: Add `BulkActionSerializer` to serializers.py**

Add at the bottom of `backend/contacts/serializers.py`:

```python
class BulkActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["delete", "export", "categorize", "assign_company"]
    )
    ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=500,
    )
    params = serializers.DictField(required=False, default=dict)
```

**Step 2: Add `bulk_actions` view to views.py**

Add this import at the top of `backend/contacts/views.py`:

```python
from .serializers import ContactSerializer, ContactCategorySerializer, CustomFieldDefinitionSerializer, BulkActionSerializer
```

Add the view at the bottom of `views.py`:

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_actions(request):
    serializer = BulkActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    action = serializer.validated_data["action"]
    ids = serializer.validated_data["ids"]
    params = serializer.validated_data["params"]

    qs = Contact.objects.filter(
        organization=request.organization,
        id__in=ids,
    )

    if action == "delete":
        from django.utils import timezone
        qs.update(deleted_at=timezone.now(), deleted_by=request.user)
        return Response({"status": "ok", "count": qs.count()})

    elif action == "export":
        from .export import _rows
        from django.http import StreamingHttpResponse
        from datetime import date
        export_qs = qs.prefetch_related("categories")
        filename = f"contacts-export-{date.today().isoformat()}.csv"
        response = StreamingHttpResponse(
            _rows(export_qs), content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    elif action == "categorize":
        category_ids = params.get("category_ids", [])
        if not category_ids:
            return Response(
                {"error": "category_ids required"}, status=400
            )
        categories = ContactCategory.objects.filter(
            id__in=category_ids,
            organization=request.organization,
        )
        for contact in qs:
            contact.categories.add(*categories)
        return Response({"status": "ok", "count": qs.count()})

    elif action == "assign_company":
        company_entity_id = params.get("company_entity_id")
        if not company_entity_id:
            return Response(
                {"error": "company_entity_id required"}, status=400
            )
        from companies.models import Company
        try:
            company = Company.objects.get(
                id=company_entity_id,
                organization=request.organization,
            )
        except Company.DoesNotExist:
            return Response({"error": "Company not found"}, status=404)
        qs.update(company_entity=company, company=company.name)
        return Response({"status": "ok", "count": qs.count()})
```

**Step 3: Add route in urls.py**

In `backend/contacts/urls.py`, add before the `path("", include(router.urls))` line:

```python
path("bulk-actions/", views.bulk_actions),
```

**Step 4: Add import in urls.py if not already present**

The `views` import should already be there. No change needed.

**Step 5: Verify**

Run: `cd backend && python manage.py check`
Expected: System check identified no issues.

**Step 6: Commit**

```bash
git add backend/contacts/views.py backend/contacts/urls.py backend/contacts/serializers.py
git commit -m "feat(contacts): add bulk actions endpoint (delete, export, categorize, assign company)"
```

---

## Task 4: Frontend — Add sorting to ContactTable

**Files:**
- Modify: `frontend/components/contacts/ContactTable.tsx`

**Step 1: Update ContactTable props and add sortable headers**

Replace the full content of `frontend/components/contacts/ContactTable.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import type { Contact } from "@/types"

interface ContactTableProps {
  contacts: Contact[]
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleAll?: () => void
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

function SortableHeader({
  label,
  field,
  ordering,
  onOrderingChange,
  className,
}: {
  label: string
  field: SortField
  ordering: string
  onOrderingChange: (ordering: string) => void
  className?: string
}) {
  const isAsc = ordering === field
  const isDesc = ordering === `-${field}`

  const handleClick = () => {
    if (isAsc) {
      onOrderingChange(`-${field}`)
    } else if (isDesc) {
      onOrderingChange("-created_at") // reset to default
    } else {
      onOrderingChange(field)
    }
  }

  return (
    <TableHead
      className={`text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isAsc ? (
          <ArrowUp className="h-3 w-3" />
        ) : isDesc ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}

export function ContactTable({
  contacts,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  ordering = "-created_at",
  onOrderingChange,
}: ContactTableProps) {
  const router = useRouter()

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucun contact trouvé.
        </p>
      </div>
    )
  }

  const handleOrderingChange = onOrderingChange ?? (() => {})

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-table-header-bg hover:bg-table-header-bg">
            {onToggleSelect && (
              <TableHead className="w-10">
                <Checkbox
                  checked={contacts.length > 0 && selectedIds?.size === contacts.length}
                  onCheckedChange={() => onToggleAll?.()}
                />
              </TableHead>
            )}
            <SortableHeader label="Nom" field="last_name" ordering={ordering} onOrderingChange={handleOrderingChange} />
            <SortableHeader label="Entreprise" field="company" ordering={ordering} onOrderingChange={handleOrderingChange} />
            <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Email</TableHead>
            <TableHead className="hidden lg:table-cell text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Téléphone</TableHead>
            <SortableHeader label="Créé le" field="created_at" ordering={ordering} onOrderingChange={handleOrderingChange} className="hidden lg:table-cell" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow
              key={contact.id}
              className="cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              {onToggleSelect && (
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds?.has(contact.id) ?? false}
                    onCheckedChange={() => onToggleSelect(contact.id)}
                  />
                </TableCell>
              )}
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
                        {contact.lead_score === "hot" ? "Chaud" : contact.lead_score === "warm" ? "Tiède" : "Froid"}
                      </span>
                    )}
                  </div>
                  {contact.categories && contact.categories.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1">
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
              <TableCell className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.company || "\u2014"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.email || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {contact.phone || "\u2014"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                {formatDate(contact.created_at)}
              </TableCell>
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
git add frontend/components/contacts/ContactTable.tsx
git commit -m "feat(contacts): add sortable column headers to ContactTable"
```

---

## Task 5: Frontend — Add service functions for new endpoints

**Files:**
- Modify: `frontend/services/contacts.ts`

**Step 1: Add new service functions**

Add these functions at the bottom of `frontend/services/contacts.ts`:

```typescript
export async function fetchContactTags(): Promise<string[]> {
  return apiFetch<string[]>(`/contacts/tags/`)
}

export async function fetchContactSources(): Promise<string[]> {
  return apiFetch<string[]>(`/contacts/sources/`)
}

export interface BulkActionParams {
  action: "delete" | "export" | "categorize" | "assign_company"
  ids: string[]
  params?: Record<string, unknown>
}

export async function bulkContactAction(data: BulkActionParams): Promise<void> {
  if (data.action === "export") {
    // Export needs special handling — returns a file
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
    const token = (await import("js-cookie")).default.get("access_token")
    const orgId = (await import("js-cookie")).default.get("organization_id")

    const response = await fetch(`${API_URL}/contacts/bulk-actions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { "X-Organization": orgId } : {}),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) throw new Error("Export failed")

    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = downloadUrl
    a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(downloadUrl)
    return
  }

  await apiFetch(`/contacts/bulk-actions/`, { method: "POST", json: data })
}
```

**Step 2: Commit**

```bash
git add frontend/services/contacts.ts
git commit -m "feat(contacts): add service functions for tags, sources, and bulk actions"
```

---

## Task 6: Frontend — Update contacts page with sorting, filters, and bulk actions

**Files:**
- Modify: `frontend/app/(app)/contacts/page.tsx`

**Step 1: Update the contacts page**

This is the largest change. The full updated file replaces `frontend/app/(app)/contacts/page.tsx`. Key changes:
- Add state for `ordering`, `leadScore`, `source`, `createdAfter`, `createdBefore`, `selectedTags`
- Load tags and sources on mount
- Pass all filter params to `fetchContacts`
- Pass `ordering` + `onOrderingChange` to `ContactTable`
- Add filter components in FilterBar and FilterPanel
- Replace bulk delete loop with `bulkContactAction`
- Add bulk categorize, export, and assign company buttons with dialogs

Replace the full content of the page with:

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { fetchContactCategories, checkDuplicates, exportContactsCSV, fetchContactTags, fetchContactSources, bulkContactAction } from "@/services/contacts"
import { DuplicateDetectionDialog } from "@/components/contacts/DuplicateDetectionDialog"
import type { DuplicateMatch } from "@/types"
import { SegmentSelector } from "@/components/segments/SegmentSelector"
import { fetchSegmentContacts } from "@/services/segments"
import { ContactTable } from "@/components/contacts/ContactTable"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Loader2, Download, Building2, X, Tag, FolderOpen } from "lucide-react"
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterPills, FilterSelect, FilterDateRange } from "@/components/shared/FilterControls"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { FilterCompanySearch } from "@/components/shared/FilterControls"
import { Pagination } from "@/components/shared/Pagination"
import { useCompanyAutocomplete } from "@/hooks/useCompanyAutocomplete"
import posthog from "posthog-js"
import { handleQuotaError } from "@/lib/quota-error"
import type { Contact, ContactCategory } from "@/types"

interface ContactsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

const PAGE_SIZE = 20

const LEAD_SCORE_OPTIONS = [
  { value: "hot", label: "Chaud" },
  { value: "warm", label: "Tiède" },
  { value: "cold", label: "Froid" },
]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // New filter states
  const [ordering, setOrdering] = useState("-created_at")
  const [leadScore, setLeadScore] = useState<string | null>(null)
  const [source, setSource] = useState("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [createdBefore, setCreatedBefore] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Autocomplete data
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])

  // Bulk action dialogs
  const [bulkCategorizeOpen, setBulkCategorizeOpen] = useState(false)
  const [bulkCategorizeIds, setBulkCategorizeIds] = useState<string[]>([])
  const [bulkAssignCompanyOpen, setBulkAssignCompanyOpen] = useState(false)
  const [bulkCompanyId, setBulkCompanyId] = useState<string | null>(null)
  const [bulkCompanyLabel, setBulkCompanyLabel] = useState<string | null>(null)

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

  const activeFilterCount = [search, selectedCategory, selectedSegment, leadScore, source, createdAfter, createdBefore, selectedTags.length > 0].filter(Boolean).length

  const companyAutocomplete = useCompanyAutocomplete()
  const [companyEntityLabel, setCompanyEntityLabel] = useState("")

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile_phone: "",
    company: "",
    company_entity: null as string | null,
    job_title: "",
    lead_score: "",
    city: "",
    postal_code: "",
    country: "",
    category_ids: [] as string[],
  })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      if (selectedSegment) {
        const data = await fetchSegmentContacts(selectedSegment, page)
        setContacts(data.results)
        setSelectedIds(new Set())
        setTotalCount(data.count)
      } else if (search.trim()) {
        const results = await apiFetch<Contact[]>(
          `/contacts/search/?q=${encodeURIComponent(search.trim())}`
        )
        setContacts(results)
        setSelectedIds(new Set())
        setTotalCount(results.length)
      } else {
        const params = new URLSearchParams()
        params.set("page", String(page))
        if (selectedCategory) params.set("category", selectedCategory)
        if (ordering && ordering !== "-created_at") params.set("ordering", ordering)
        if (leadScore) params.set("lead_score", leadScore)
        if (source) params.set("source", source)
        if (createdAfter) params.set("created_after", createdAfter)
        if (createdBefore) params.set("created_before", createdBefore)
        if (selectedTags.length > 0) params.set("tags", selectedTags.join(","))

        const data = await apiFetch<ContactsResponse>(
          `/contacts/?${params.toString()}`
        )
        setContacts(data.results)
        setSelectedIds(new Set())
        setTotalCount(data.count)
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page, selectedCategory, selectedSegment, ordering, leadScore, source, createdAfter, createdBefore, selectedTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchContacts, search])

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { setPage(1) }, [selectedCategory])
  useEffect(() => { setPage(1) }, [selectedSegment])
  useEffect(() => { setPage(1) }, [leadScore, source, createdAfter, createdBefore, selectedTags])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, tags, sources] = await Promise.all([
          fetchContactCategories(),
          fetchContactTags(),
          fetchContactSources(),
        ])
        setCategories(cats)
        setAvailableTags(tags)
        setAvailableSources(sources)
      } catch (err) {
        console.error("Failed to fetch filter data:", err)
      }
    }
    loadData()
  }, [])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const createContact = async () => {
    try {
      await apiFetch("/contacts/", { method: "POST", json: formData })
      posthog.capture("contact_created", { has_email: !!formData.email, has_company: !!formData.company, lead_score: formData.lead_score || null })
      setFormData({ first_name: "", last_name: "", email: "", phone: "", mobile_phone: "", company: "", company_entity: null, job_title: "", lead_score: "", city: "", postal_code: "", country: "", category_ids: [] })
      setCompanyEntityLabel("")
      companyAutocomplete.reset()
      setDialogOpen(false)
      setShowDuplicateDialog(false)
      setDuplicates([])
      fetchContacts()
    } catch (err) {
      if (handleQuotaError(err)) return
      console.error("Failed to create contact:", err)
    } finally {
      setCreating(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const result = await checkDuplicates(formData)
      if (result.duplicates.length > 0) {
        setDuplicates(result.duplicates)
        setShowDuplicateDialog(true)
        setCreating(false)
        return
      }
      await createContact()
    } catch (err) {
      console.error("Failed to check duplicates:", err)
      await createContact()
    }
  }

  const handleCreateAnyway = async () => {
    setCreating(true)
    await createContact()
  }

  const handleMerge = async (primaryId: string, fieldOverrides: Record<string, unknown>) => {
    try {
      await apiFetch(`/contacts/${primaryId}/`, { method: "PATCH", json: fieldOverrides })
      setFormData({ first_name: "", last_name: "", email: "", phone: "", mobile_phone: "", company: "", company_entity: null, job_title: "", lead_score: "", city: "", postal_code: "", country: "", category_ids: [] })
      setCompanyEntityLabel("")
      companyAutocomplete.reset()
      setDialogOpen(false)
      setShowDuplicateDialog(false)
      setDuplicates([])
      fetchContacts()
    } catch (err) {
      console.error("Failed to merge:", err)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportContactsCSV({
        ...(selectedSegment ? { segment: selectedSegment } : {}),
        ...(selectedCategory ? { category: selectedCategory } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
      })
      posthog.capture("contacts_exported")
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkContactAction({ action: "delete", ids: Array.from(selectedIds) })
      setSelectedIds(new Set())
      fetchContacts()
    } catch (err) {
      console.error("Bulk delete failed:", err)
    }
  }

  const handleBulkExport = async () => {
    try {
      await bulkContactAction({ action: "export", ids: Array.from(selectedIds) })
      setSelectedIds(new Set())
    } catch (err) {
      console.error("Bulk export failed:", err)
    }
  }

  const handleBulkCategorize = async () => {
    if (bulkCategorizeIds.length === 0) return
    try {
      await bulkContactAction({
        action: "categorize",
        ids: Array.from(selectedIds),
        params: { category_ids: bulkCategorizeIds },
      })
      setSelectedIds(new Set())
      setBulkCategorizeOpen(false)
      setBulkCategorizeIds([])
      fetchContacts()
    } catch (err) {
      console.error("Bulk categorize failed:", err)
    }
  }

  const handleBulkAssignCompany = async () => {
    if (!bulkCompanyId) return
    try {
      await bulkContactAction({
        action: "assign_company",
        ids: Array.from(selectedIds),
        params: { company_entity_id: bulkCompanyId },
      })
      setSelectedIds(new Set())
      setBulkAssignCompanyOpen(false)
      setBulkCompanyId(null)
      setBulkCompanyLabel(null)
      fetchContacts()
    } catch (err) {
      console.error("Bulk assign company failed:", err)
    }
  }

  const resetFilters = () => {
    setSearch("")
    setSelectedCategory(null)
    setSelectedSegment(null)
    setLeadScore(null)
    setSource("")
    setCreatedAfter("")
    setCreatedBefore("")
    setSelectedTags([])
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Prénom</Label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required className="h-11 bg-secondary/30 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Nom</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required className="h-11 bg-secondary/30 border-border/60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Téléphone</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Entreprise</Label>
                {formData.company_entity && companyEntityLabel ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 h-11 bg-secondary/30 border border-border/60 rounded-md px-3">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{companyEntityLabel}</span>
                    </div>
                    <button type="button" onClick={() => { setFormData({ ...formData, company_entity: null, company: "" }); setCompanyEntityLabel(""); companyAutocomplete.reset() }} className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div ref={companyAutocomplete.wrapperRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="company"
                        value={companyAutocomplete.query || formData.company}
                        onChange={(e) => { setFormData({ ...formData, company: e.target.value }); companyAutocomplete.search(e.target.value) }}
                        onFocus={() => { if (formData.company && !companyAutocomplete.query) companyAutocomplete.search(formData.company); if (companyAutocomplete.results.length > 0) companyAutocomplete.setOpen(true) }}
                        placeholder="Rechercher ou saisir une entreprise..."
                        className="h-11 bg-secondary/30 border-border/60 pl-8"
                      />
                      {companyAutocomplete.searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    {companyAutocomplete.open && companyAutocomplete.results.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {companyAutocomplete.results.map((c) => (
                          <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors" onClick={() => { setFormData({ ...formData, company: c.name, company_entity: c.id }); setCompanyEntityLabel(c.name); companyAutocomplete.reset() }}>
                            <span className="font-medium">{c.name}</span>
                            {c.industry && <span className="text-muted-foreground ml-1">({c.industry})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Poste</Label>
                <Input id="job_title" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_score" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Score</Label>
                <select id="lead_score" value={formData.lead_score} onChange={(e) => setFormData({ ...formData, lead_score: e.target.value })} className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">-- Aucun --</option>
                  <option value="hot">Chaud</option>
                  <option value="warm">Tiede</option>
                  <option value="cold">Froid</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Desktop filter bar */}
      <FilterBar
        open={filterOpen}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      >
        <FilterSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un contact..."
          className="w-64"
        />
        {categories.length > 0 && (
          <FilterPills
            label="Catégorie"
            options={categories.map((cat) => ({ value: cat.id, label: cat.name, color: cat.color, count: cat.contact_count ?? undefined }))}
            value={selectedCategory}
            onChange={(v) => { setSelectedCategory(v); setSelectedSegment(null) }}
            showAll
          />
        )}
        <FilterPills
          label="Score"
          options={LEAD_SCORE_OPTIONS}
          value={leadScore}
          onChange={setLeadScore}
          showAll
          allLabel="Tous"
        />
        {availableSources.length > 0 && (
          <FilterSelect
            label="Source"
            options={availableSources.map((s) => ({ value: s, label: s }))}
            value={source}
            onChange={setSource}
            placeholder="Toutes les sources"
          />
        )}
        <FilterDateRange
          label="Date de création"
          after={createdAfter}
          before={createdBefore}
          onAfterChange={setCreatedAfter}
          onBeforeChange={setCreatedBefore}
        />
        {availableTags.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-muted-foreground border border-border hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </FilterBar>

      <DuplicateDetectionDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicates={duplicates}
        newContactData={formData}
        onCreateAnyway={handleCreateAnyway}
        onMerge={handleMerge}
        onCancel={() => { setShowDuplicateDialog(false); setDuplicates([]) }}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Annuler
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkExport}>
              <Download className="h-3.5 w-3.5" />
              Exporter
            </Button>
            <Dialog open={bulkCategorizeOpen} onOpenChange={setBulkCategorizeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Catégoriser
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Catégoriser {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setBulkCategorizeIds((prev) => prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id])}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
                          bulkCategorizeIds.includes(cat.id)
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setBulkCategorizeOpen(false); setBulkCategorizeIds([]) }}>Annuler</Button>
                    <Button onClick={handleBulkCategorize} disabled={bulkCategorizeIds.length === 0}>Appliquer</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={bulkAssignCompanyOpen} onOpenChange={setBulkAssignCompanyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Entreprise
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assigner une entreprise à {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <FilterCompanySearch
                    companyId={bulkCompanyId}
                    companyLabel={bulkCompanyLabel}
                    onSelect={(id, label) => { setBulkCompanyId(id); setBulkCompanyLabel(label) }}
                    onClear={() => { setBulkCompanyId(null); setBulkCompanyLabel(null) }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setBulkAssignCompanyOpen(false); setBulkCompanyId(null); setBulkCompanyLabel(null) }}>Annuler</Button>
                    <Button onClick={handleBulkAssignCompany} disabled={!bulkCompanyId}>Assigner</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              Supprimer ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Loading / ContactTable */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContactTable
          contacts={contacts}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
          ordering={ordering}
          onOrderingChange={setOrdering}
        />
      )}

      {/* Pagination */}
      {!search && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <FilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      >
        <FilterSection label="Recherche">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact..."
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
        {categories.length > 0 && (
          <FilterSection label="Catégorie">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSegment(null) }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
                  selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                Tous
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedSegment(null) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
                    selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                  {(cat.contact_count ?? 0) > 0 && <span className="text-[10px] opacity-70">({cat.contact_count})</span>}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
        <FilterSection label="Score">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setLeadScore(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
                leadScore === null ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Tous
            </button>
            {LEAD_SCORE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLeadScore(leadScore === opt.value ? null : opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
                  leadScore === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>
        {availableSources.length > 0 && (
          <FilterSection label="Source">
            <FilterSelect
              options={availableSources.map((s) => ({ value: s, label: s }))}
              value={source}
              onChange={setSource}
              placeholder="Toutes les sources"
            />
          </FilterSection>
        )}
        <FilterSection label="Date de création">
          <FilterDateRange
            after={createdAfter}
            before={createdBefore}
            onAfterChange={setCreatedAfter}
            onBeforeChange={setCreatedBefore}
          />
        </FilterSection>
        {availableTags.length > 0 && (
          <FilterSection label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
      </FilterPanel>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -20`

If there are TypeScript errors, fix them.

**Step 3: Commit**

```bash
git add frontend/app/\(app\)/contacts/page.tsx
git commit -m "feat(contacts): add sorting, advanced filters, and bulk actions to contacts page"
```

---

## Task 7: Verify everything works end-to-end

**Step 1: Start backend**

Run: `cd backend && python manage.py runserver`

**Step 2: Start frontend**

Run: `cd frontend && npm run dev`

**Step 3: Manual verification checklist**

- [ ] Contacts page loads with all new filter controls visible
- [ ] Clicking column headers sorts the table (arrow icons toggle)
- [ ] Lead score filter pills work (hot/warm/cold)
- [ ] Source dropdown shows available sources
- [ ] Date range filters narrow results
- [ ] Tag pills filter contacts (OR logic)
- [ ] Multiple filters combine (AND logic)
- [ ] Reset button clears all filters
- [ ] Bulk select + Delete works via new endpoint
- [ ] Bulk select + Export downloads CSV
- [ ] Bulk select + Categorize dialog works
- [ ] Bulk select + Assign Company dialog works
- [ ] Mobile filter panel shows all new filters
- [ ] Pagination works with filters active

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
