"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
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
import { Plus, Search, Loader2, Download, Building2, X, Tag, FolderOpen, Lock } from "lucide-react"
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterPills, FilterSelect, FilterDateRange, FilterCompanySearch } from "@/components/shared/FilterControls"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { Pagination } from "@/components/shared/Pagination"
import { useCompanyAutocomplete } from "@/hooks/useCompanyAutocomplete"
import posthog from "posthog-js"
import { handleQuotaError } from "@/lib/quota-error"
import { QuotaBanner } from "@/components/plan/QuotaBanner"
import { usePlanGate } from "@/contexts/PlanContext"
import type { Contact, ContactCategory } from "@/types"

interface ContactsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

const PAGE_SIZE = 20

export default function ContactsPage() {
  const t = useTranslations("contacts")
  const { getQuotaStatus, openUpgradeModal, refreshUsage } = usePlanGate()
  const contactsAtLimit = getQuotaStatus("contacts") === "limit"

  const LEAD_SCORE_OPTIONS = [
    { value: "hot", label: t("leadScore.hot") },
    { value: "warm", label: t("leadScore.warm") },
    { value: "cold", label: t("leadScore.cold") },
  ]

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
      await refreshUsage()
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
      <QuotaBanner quota="contacts" label="contacts" />
      {/* Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", { count: totalCount })}
      >
        <FilterTriggerButton
          open={filterOpen}
          onOpenChange={setFilterOpen}
          activeFilterCount={activeFilterCount}
        />
        <ImportCSVDialog onImported={fetchContacts} />
        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t("export")}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {contactsAtLimit ? (
            <Button
              onClick={() => openUpgradeModal({ type: "quota", quota: "contacts", requiredPlan: "pro" })}
              variant="outline"
              className="opacity-60 gap-2"
            >
              <Lock className="h-4 w-4" />
              {t("add")}
            </Button>
          ) : (
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("add")}
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("form.newContact")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.firstName")}</Label>
                  <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required className="h-11 bg-secondary/30 border-border/60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.lastName")}</Label>
                  <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required className="h-11 bg-secondary/30 border-border/60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.email")}</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.phone")}</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.company")}</Label>
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
                        placeholder={t("form.companySearchPlaceholder")}
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
                <Label htmlFor="job_title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.jobTitle")}</Label>
                <Input id="job_title" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_score" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.score")}</Label>
                <select id="lead_score" value={formData.lead_score} onChange={(e) => setFormData({ ...formData, lead_score: e.target.value })} className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="">{t("form.scoreNone")}</option>
                  <option value="hot">{t("leadScore.hot")}</option>
                  <option value="warm">{t("leadScore.warm")}</option>
                  <option value="cold">{t("leadScore.cold")}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("form.cancel")}</Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("form.create")}
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
          placeholder={t("searchPlaceholder")}
          className="w-64"
        />
        {categories.length > 0 && (
          <FilterPills
            label={t("filter.category")}
            options={categories.map((cat) => ({ value: cat.id, label: cat.name, color: cat.color, count: cat.contact_count ?? undefined }))}
            value={selectedCategory}
            onChange={(v) => { setSelectedCategory(v); setSelectedSegment(null) }}
            showAll
          />
        )}
        <FilterPills
          label={t("filter.score")}
          options={LEAD_SCORE_OPTIONS}
          value={leadScore}
          onChange={setLeadScore}
          showAll
          allLabel={t("filter.all")}
        />
        {availableSources.length > 0 && (
          <FilterSelect
            label={t("filter.source")}
            options={availableSources.map((s) => ({ value: s, label: s }))}
            value={source}
            onChange={setSource}
            placeholder={t("filter.allSources")}
          />
        )}
        <FilterDateRange
          label={t("filter.createdDate")}
          after={createdAfter}
          before={createdBefore}
          onAfterChange={setCreatedAfter}
          onBeforeChange={setCreatedBefore}
        />
        {availableTags.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("filter.tags")}</span>
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
            {t("bulk.selected", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              {t("bulk.cancel")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkExport}>
              <Download className="h-3.5 w-3.5" />
              {t("bulk.export")}
            </Button>
            <Dialog open={bulkCategorizeOpen} onOpenChange={setBulkCategorizeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {t("bulk.categorize")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("bulk.categorizeTitle", { count: selectedIds.size })}</DialogTitle>
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
                    <Button variant="outline" onClick={() => { setBulkCategorizeOpen(false); setBulkCategorizeIds([]) }}>{t("form.cancel")}</Button>
                    <Button onClick={handleBulkCategorize} disabled={bulkCategorizeIds.length === 0}>{t("form.apply")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={bulkAssignCompanyOpen} onOpenChange={setBulkAssignCompanyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {t("bulk.company")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("bulk.assignCompanyTitle", { count: selectedIds.size })}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <FilterCompanySearch
                    companyId={bulkCompanyId}
                    companyLabel={bulkCompanyLabel}
                    onSelect={(id, label) => { setBulkCompanyId(id); setBulkCompanyLabel(label) }}
                    onClear={() => { setBulkCompanyId(null); setBulkCompanyLabel(null) }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setBulkAssignCompanyOpen(false); setBulkCompanyId(null); setBulkCompanyLabel(null) }}>{t("form.cancel")}</Button>
                    <Button onClick={handleBulkAssignCompany} disabled={!bulkCompanyId}>{t("form.assign")}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              {t("bulk.delete", { count: selectedIds.size })}
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
        <FilterSection label={t("filter.search")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary/30 border-border/60"
            />
          </div>
        </FilterSection>
        <FilterSection label={t("filter.segment")}>
          <SegmentSelector
            selectedSegmentId={selectedSegment}
            onSelect={(id) => { setSelectedSegment(id); setSelectedCategory(null); setSearch("") }}
          />
        </FilterSection>
        {categories.length > 0 && (
          <FilterSection label={t("filter.category")}>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setSelectedCategory(null); setSelectedSegment(null) }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
                  selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t("filter.all")}
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
        <FilterSection label={t("filter.score")}>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setLeadScore(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
                leadScore === null ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t("filter.all")}
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
          <FilterSection label={t("filter.source")}>
            <FilterSelect
              options={availableSources.map((s) => ({ value: s, label: s }))}
              value={source}
              onChange={setSource}
              placeholder={t("filter.allSources")}
            />
          </FilterSection>
        )}
        <FilterSection label={t("filter.createdDate")}>
          <FilterDateRange
            after={createdAfter}
            before={createdBefore}
            onAfterChange={setCreatedAfter}
            onBeforeChange={setCreatedBefore}
          />
        </FilterSection>
        {availableTags.length > 0 && (
          <FilterSection label={t("filter.tags")}>
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
