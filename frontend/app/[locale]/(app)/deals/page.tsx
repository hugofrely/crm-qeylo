"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Plus, Loader2, MoreHorizontal, Pencil, Star, Trash2, Settings, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KanbanBoard } from "@/components/deals/KanbanBoard"
import { CreatePipelineDialog } from "@/components/deals/CreatePipelineDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterBar } from "@/components/shared/FilterBar"
import { FilterSearchInput, FilterSelect, FilterNumberRange, FilterDateRange, FilterContactSearch, FilterCompanySearch } from "@/components/shared/FilterControls"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { usePipelines } from "@/hooks/useDeals"
import { updatePipeline, deletePipeline } from "@/services/deals"
import { fetchMembers } from "@/services/organizations"
import { useOrganization } from "@/lib/organization"
import { sanitizeHtml } from "@/lib/sanitize"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useCompanyAutocomplete } from "@/hooks/useCompanyAutocomplete"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { QuotaBanner } from "@/components/plan/QuotaBanner"
import type { Member } from "@/types/organizations"

export default function DealsPage() {
  const router = useRouter()
  const t = useTranslations("deals")
  const { currentOrganization } = useOrganization()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false)
  const { pipelines, loading: pipelinesLoading, refresh: refreshPipelines } = usePipelines()
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Delete state
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [deleteMigrateTo, setDeleteMigrateTo] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterContact, setFilterContact] = useState("")
  const [filterAmountMin, setFilterAmountMin] = useState("")
  const [filterAmountMax, setFilterAmountMax] = useState("")
  const [filterProbabilityMin, setFilterProbabilityMin] = useState("")
  const [filterProbabilityMax, setFilterProbabilityMax] = useState("")
  const [filterExpectedCloseAfter, setFilterExpectedCloseAfter] = useState("")
  const [filterExpectedCloseBefore, setFilterExpectedCloseBefore] = useState("")
  const [filterCreatedAfter, setFilterCreatedAfter] = useState("")
  const [filterCreatedBefore, setFilterCreatedBefore] = useState("")
  const [filterCreatedBy, setFilterCreatedBy] = useState("")
  const [filterCompany, setFilterCompany] = useState("")
  const [filterCompanyLabel, setFilterCompanyLabel] = useState("")
  const [filterSearch, setFilterSearch] = useState("")
  const [filterContactLabel, setFilterContactLabel] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const contactAutocomplete = useContactAutocomplete()
  const companyAutocomplete = useCompanyAutocomplete()

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (filterContact) f.contact = filterContact
    if (filterCompany) f.company = filterCompany
    if (filterAmountMin) f.amount_min = filterAmountMin
    if (filterAmountMax) f.amount_max = filterAmountMax
    if (filterProbabilityMin) f.probability_min = filterProbabilityMin
    if (filterProbabilityMax) f.probability_max = filterProbabilityMax
    if (filterExpectedCloseAfter) f.expected_close_after = filterExpectedCloseAfter
    if (filterExpectedCloseBefore) f.expected_close_before = filterExpectedCloseBefore
    if (filterCreatedAfter) f.created_after = filterCreatedAfter
    if (filterCreatedBefore) f.created_before = filterCreatedBefore
    if (filterCreatedBy) f.created_by = filterCreatedBy
    if (filterSearch) f.search = filterSearch
    return f
  }, [filterContact, filterCompany, filterAmountMin, filterAmountMax, filterProbabilityMin, filterProbabilityMax, filterExpectedCloseAfter, filterExpectedCloseBefore, filterCreatedAfter, filterCreatedBefore, filterCreatedBy, filterSearch])

  const activeFilterCount = Object.keys(filters).length

  const resetFilters = () => {
    setFilterContact("")
    setFilterContactLabel("")
    contactAutocomplete.reset()
    setFilterCompany("")
    setFilterCompanyLabel("")
    setFilterAmountMin("")
    setFilterAmountMax("")
    setFilterProbabilityMin("")
    setFilterProbabilityMax("")
    setFilterExpectedCloseAfter("")
    setFilterExpectedCloseBefore("")
    setFilterCreatedAfter("")
    setFilterCreatedBefore("")
    setFilterCreatedBy("")
    setFilterSearch("")
  }

  // Load members for filter select
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchMembers(currentOrganization.id).then((res) => setMembers(res.members))
    }
  }, [currentOrganization?.id])

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find((p) => p.is_default) || pipelines[0]
      setSelectedPipelineId(defaultPipeline.id)
    }
  }, [pipelines, selectedPipelineId])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleRename = async () => {
    if (!renamingId || !renameValue.trim()) return
    setRenameSaving(true)
    try {
      await updatePipeline(renamingId, { name: renameValue.trim() })
      setRenamingId(null)
      refreshPipelines()
    } catch (err) {
      console.error("Failed to rename pipeline:", err)
    } finally {
      setRenameSaving(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await updatePipeline(id, { is_default: true })
      refreshPipelines()
    } catch (err) {
      console.error("Failed to set default:", err)
    }
  }

  const handleDeletePipeline = async () => {
    if (!deleteDialogId) return
    setDeleting(true)
    try {
      const pipeline = pipelines.find((p) => p.id === deleteDialogId)
      if (pipeline && pipeline.deal_count > 0 && !deleteMigrateTo) return
      await deletePipeline(deleteDialogId, deleteMigrateTo || undefined)
      if (selectedPipelineId === deleteDialogId) {
        setSelectedPipelineId(null)
      }
      setDeleteDialogId(null)
      setDeleteMigrateTo("")
      refreshPipelines()
    } catch (err) {
      console.error("Failed to delete pipeline:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (pipelinesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full"

  const deletePipelineData = pipelines.find((p) => p.id === deleteDialogId)

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="p-4 sm:p-8 lg:px-12 lg:pt-12 lg:pb-0 space-y-6 shrink-0">
        <QuotaBanner quota="pipelines" label="pipelines" />
        <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")}>
          <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newDeal")}
          </Button>
        </PageHeader>

        {/* Desktop filter bar */}
        <FilterBar open={filterOpen} activeFilterCount={activeFilterCount} onReset={resetFilters}>
          <FilterSearchInput
            value={filterSearch}
            onChange={setFilterSearch}
            placeholder={t("searchPlaceholder")}
            className="w-64"
          />
          <FilterContactSearch
            contactId={filterContact || null}
            contactLabel={filterContactLabel || null}
            onSelect={(id, label) => { setFilterContact(id); setFilterContactLabel(label) }}
            onClear={() => { setFilterContact(""); setFilterContactLabel(""); contactAutocomplete.reset() }}
            label={t("filterContact")}
          />
          <FilterCompanySearch
            companyId={filterCompany || null}
            companyLabel={filterCompanyLabel || null}
            onSelect={(id, label) => { setFilterCompany(id); setFilterCompanyLabel(label) }}
            onClear={() => { setFilterCompany(""); setFilterCompanyLabel("") }}
            label={t("filterCompany")}
          />
          <FilterNumberRange
            min={filterAmountMin}
            max={filterAmountMax}
            onMinChange={setFilterAmountMin}
            onMaxChange={setFilterAmountMax}
            placeholderMin="Min"
            placeholderMax="Max"
            label={t("filterAmount")}
          />
          <FilterDateRange
            after={filterExpectedCloseAfter}
            before={filterExpectedCloseBefore}
            onAfterChange={setFilterExpectedCloseAfter}
            onBeforeChange={setFilterExpectedCloseBefore}
            label={t("filterClosingDate")}
          />
          <FilterDateRange
            after={filterCreatedAfter}
            before={filterCreatedBefore}
            onAfterChange={setFilterCreatedAfter}
            onBeforeChange={setFilterCreatedBefore}
            label={t("filterCreatedDate")}
          />
          {members.length > 0 && (
            <FilterSelect
              options={members.map((m) => ({ value: m.user_id, label: `${m.first_name} ${m.last_name}` }))}
              value={filterCreatedBy}
              onChange={setFilterCreatedBy}
              placeholder={t("filterAll")}
              label={t("filterCreatedBy")}
            />
          )}
        </FilterBar>

        {/* Pipeline tabs */}
        <Tabs value={selectedPipelineId ?? undefined} onValueChange={setSelectedPipelineId}>
          <div className="flex items-center gap-2">
            <TabsList>
              {pipelines.map((p) => (
                renamingId === p.id ? (
                  <div key={p.id} className="flex items-center gap-1 px-1">
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename()
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="h-7 w-32 text-sm"
                      disabled={renameSaving}
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleRename} disabled={renameSaving || !renameValue.trim()}>
                      {renameSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                    </Button>
                  </div>
                ) : (
                  <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
                )
              ))}
            </TabsList>

            {/* Actions outside TabsList */}
            {selectedPipelineId && !renamingId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => { setRenamingId(selectedPipelineId); setRenameValue(pipelines.find((p) => p.id === selectedPipelineId)?.name ?? "") }}>
                    <Pencil className="h-4 w-4" />
                    {t("rename")}
                  </DropdownMenuItem>
                  {!pipelines.find((p) => p.id === selectedPipelineId)?.is_default && (
                    <DropdownMenuItem onClick={() => handleSetDefault(selectedPipelineId)}>
                      <Star className="h-4 w-4" />
                      {t("setDefault")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push("/settings/pipeline")}>
                    <Settings className="h-4 w-4" />
                    {t("manageStages")}
                  </DropdownMenuItem>
                  {pipelines.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogId(selectedPipelineId)}>
                        <Trash2 className="h-4 w-4" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              onClick={() => setCreatePipelineOpen(true)}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </Tabs>
      </div>

      {/* Kanban Board — fills remaining height */}
      <div className="flex-1 min-h-0 px-4 sm:px-8 lg:px-12 py-6">
        {selectedPipelineId && (
          <KanbanBoard
            pipelineId={selectedPipelineId}
            dialogOpen={dialogOpen}
            onDialogOpenChange={setDialogOpen}
            filters={filters}
          />
        )}
      </div>

      <CreatePipelineDialog
        open={createPipelineOpen}
        onOpenChange={setCreatePipelineOpen}
        onCreated={(newPipeline) => {
          refreshPipelines()
          setSelectedPipelineId(newPipeline.id)
        }}
      />

      {/* Delete pipeline dialog */}
      <Dialog open={!!deleteDialogId} onOpenChange={(open) => { if (!open) { setDeleteDialogId(null); setDeleteMigrateTo("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deletePipelineTitle")}</DialogTitle>
          </DialogHeader>
          {deletePipelineData && deletePipelineData.deal_count > 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm"

                dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("deletePipelineHasDeals", { count: deletePipelineData.deal_count })) }}
              />
              <select
                value={deleteMigrateTo}
                onChange={(e) => setDeleteMigrateTo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">{t("selectPlaceholder")}</option>
                {pipelines.filter((p) => p.id !== deleteDialogId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("deletePipelineConfirm", { name: deletePipelineData?.name ?? "" })) }}
            />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogId(null); setDeleteMigrateTo("") }}>{t("cancel")}</Button>
            <Button
              variant="destructive"
              onClick={handleDeletePipeline}
              disabled={deleting || (!!deletePipelineData && deletePipelineData.deal_count > 0 && !deleteMigrateTo)}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} onReset={resetFilters} activeFilterCount={activeFilterCount}>
        <FilterSection label={t("filterSearch")}>
          <FilterSearchInput value={filterSearch} onChange={setFilterSearch} placeholder={t("searchPlaceholder")} />
        </FilterSection>
        <FilterSection label={t("filterContact")}>
          <div ref={contactAutocomplete.wrapperRef} className="relative">
            {filterContact ? (
              <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                <span className="truncate">{filterContactLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterContact("")
                    setFilterContactLabel("")
                    contactAutocomplete.reset()
                  }}
                  className="ml-2 shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={contactAutocomplete.query}
                  onChange={(e) => contactAutocomplete.search(e.target.value)}
                  onFocus={() => {
                    if (contactAutocomplete.results.length > 0) contactAutocomplete.setOpen(true)
                  }}
                  placeholder={t("searchContactPlaceholder")}
                  className="pl-8"
                />
                {contactAutocomplete.searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
            {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
              <div className="mt-1 w-full rounded-md border border-border bg-background max-h-48 overflow-y-auto">
                {contactAutocomplete.results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFilterContact(c.id)
                      setFilterContactLabel(`${c.first_name} ${c.last_name}`)
                      contactAutocomplete.reset()
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                  >
                    {c.first_name} {c.last_name}
                  </button>
                ))}
              </div>
            )}
            {contactAutocomplete.open && contactAutocomplete.query && !contactAutocomplete.searching && contactAutocomplete.results.length === 0 && (
              <div className="mt-1 w-full rounded-md border border-border bg-background px-3 py-3 text-sm text-muted-foreground text-center">
                {t("noContactFound")}
              </div>
            )}
          </div>
        </FilterSection>
        <FilterSection label={t("filterCompany")}>
          <div ref={companyAutocomplete.wrapperRef} className="relative">
            {filterCompany ? (
              <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                <span className="truncate">{filterCompanyLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCompany("")
                    setFilterCompanyLabel("")
                    companyAutocomplete.reset()
                  }}
                  className="ml-2 shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={companyAutocomplete.query}
                  onChange={(e) => companyAutocomplete.search(e.target.value)}
                  onFocus={() => {
                    if (companyAutocomplete.results.length > 0) companyAutocomplete.setOpen(true)
                  }}
                  placeholder={t("searchCompanyPlaceholder")}
                  className="pl-8"
                />
                {companyAutocomplete.searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
            {companyAutocomplete.open && companyAutocomplete.results.length > 0 && (
              <div className="mt-1 w-full rounded-md border border-border bg-background max-h-48 overflow-y-auto">
                {companyAutocomplete.results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFilterCompany(c.id)
                      setFilterCompanyLabel(c.name)
                      companyAutocomplete.reset()
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                  >
                    {c.name}
                    {c.industry && <span className="text-muted-foreground ml-1">({c.industry})</span>}
                  </button>
                ))}
              </div>
            )}
            {companyAutocomplete.open && companyAutocomplete.query && !companyAutocomplete.searching && companyAutocomplete.results.length === 0 && (
              <div className="mt-1 w-full rounded-md border border-border bg-background px-3 py-3 text-sm text-muted-foreground text-center">
                {t("noCompanyFound")}
              </div>
            )}
          </div>
        </FilterSection>
        <FilterSection label={t("filterAmount")}>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} className={selectClass} />
            <input type="number" placeholder="Max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label={t("filterProbability")}>
          <div className="flex gap-2">
            <input type="number" placeholder="Min" min="0" max="100" value={filterProbabilityMin} onChange={(e) => setFilterProbabilityMin(e.target.value)} className={selectClass} />
            <input type="number" placeholder="Max" min="0" max="100" value={filterProbabilityMax} onChange={(e) => setFilterProbabilityMax(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label={t("filterExpectedCloseDate")}>
          <div className="flex gap-2">
            <input type="date" value={filterExpectedCloseAfter} onChange={(e) => setFilterExpectedCloseAfter(e.target.value)} className={selectClass} />
            <input type="date" value={filterExpectedCloseBefore} onChange={(e) => setFilterExpectedCloseBefore(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label={t("filterCreatedDate")}>
          <div className="flex gap-2">
            <input type="date" value={filterCreatedAfter} onChange={(e) => setFilterCreatedAfter(e.target.value)} className={selectClass} />
            <input type="date" value={filterCreatedBefore} onChange={(e) => setFilterCreatedBefore(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label={t("filterCreatedBy")}>
          <select value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)} className={selectClass}>
            <option value="">{t("filterAllUsers")}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </FilterSection>
      </FilterPanel>
    </div>
  )
}
