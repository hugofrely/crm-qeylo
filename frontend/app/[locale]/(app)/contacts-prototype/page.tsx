"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { apiFetch } from "@/lib/api"
import { fetchContactCategories, checkDuplicates, exportContactsCSV, fetchContactTags, fetchContactSources, bulkContactAction } from "@/services/contacts"
import { DuplicateDetectionDialog } from "@/components/contacts/DuplicateDetectionDialog"
import type { DuplicateMatch } from "@/types"
import { ContactTableIceGlass } from "@/components/contacts/ContactTableIceGlass"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus, Search, Loader2, Download, Upload, ChevronDown, Building2, X } from "lucide-react"
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog"
import { Pagination } from "@/components/shared/Pagination"
import { useCompanyAutocomplete } from "@/hooks/useCompanyAutocomplete"
import posthog from "posthog-js"
import { handleQuotaError } from "@/lib/quota-error"
import type { Contact, ContactCategory } from "@/types"
import "./ice-glass.css"

interface ContactsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

const PAGE_SIZE = 20

export default function ContactsPrototypePage() {
  const t = useTranslations("contacts")

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
  const [exporting, setExporting] = useState(false)
  const [ordering, setOrdering] = useState("-created_at")
  const [leadScore, setLeadScore] = useState<string | null>(null)
  const [source, setSource] = useState("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [createdBefore, setCreatedBefore] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
      if (search.trim()) {
        const results = await apiFetch<Contact[]>(
          `/contacts/search/?q=${encodeURIComponent(search.trim())}`
        )
        setContacts(results)
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
        setTotalCount(data.count)
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page, selectedCategory, ordering, leadScore, source, createdAfter, createdBefore, selectedTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchContacts, search])

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { setPage(1) }, [selectedCategory])
  useEffect(() => { setPage(1) }, [leadScore, source, createdAfter, createdBefore, selectedTags])

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchContactCategories()
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

  return (
    <div className="ice-glass p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Main ice-glass container */}
      <div className="ig-container">
        {/* Toolbar */}
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
            <ImportCSVDialog onImported={fetchContacts} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ig-btn-glass">
                  Actions
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
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

        {/* Search bar */}
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

        {/* Loading / Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ig-text-muted)" }} />
          </div>
        ) : (
          <ContactTableIceGlass
            contacts={contacts}
            ordering={ordering}
            onOrderingChange={setOrdering}
          />
        )}
      </div>

      {/* Pagination */}
      {!search && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      {/* Create contact dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label htmlFor="company_proto" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.company")}</Label>
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
                      id="company_proto"
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
              <Label htmlFor="job_title_proto" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.jobTitle")}</Label>
              <Input id="job_title_proto" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} className="h-11 bg-secondary/30 border-border/60" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_score_proto" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">{t("form.score")}</Label>
              <select id="lead_score_proto" value={formData.lead_score} onChange={(e) => setFormData({ ...formData, lead_score: e.target.value })} className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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

      <DuplicateDetectionDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicates={duplicates}
        newContactData={formData}
        onCreateAnyway={handleCreateAnyway}
        onMerge={handleMerge}
        onCancel={() => { setShowDuplicateDialog(false); setDuplicates([]) }}
      />
    </div>
  )
}
