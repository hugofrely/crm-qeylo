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
import { FilterSearchInput, FilterSelect, FilterNumberRange, FilterDateRange, FilterContactSearch } from "@/components/shared/FilterControls"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { usePipelines } from "@/hooks/useDeals"
import { updatePipeline, deletePipeline } from "@/services/deals"
import { fetchMembers } from "@/services/organizations"
import { useOrganization } from "@/lib/organization"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
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
import { useRouter } from "next/navigation"
import type { Member } from "@/types/organizations"

export default function DealsPage() {
  const router = useRouter()
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
  const [filterSearch, setFilterSearch] = useState("")
  const [filterContactLabel, setFilterContactLabel] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const contactAutocomplete = useContactAutocomplete()

  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (filterContact) f.contact = filterContact
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
  }, [filterContact, filterAmountMin, filterAmountMax, filterProbabilityMin, filterProbabilityMax, filterExpectedCloseAfter, filterExpectedCloseBefore, filterCreatedAfter, filterCreatedBefore, filterCreatedBy, filterSearch])

  const activeFilterCount = Object.keys(filters).length

  const resetFilters = () => {
    setFilterContact("")
    setFilterContactLabel("")
    contactAutocomplete.reset()
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
        <PageHeader title="Pipeline" subtitle="Gérez vos deals par étape du pipeline">
          <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau deal
          </Button>
        </PageHeader>

        {/* Desktop filter bar */}
        <FilterBar activeFilterCount={activeFilterCount} onReset={resetFilters}>
          <FilterSearchInput
            value={filterSearch}
            onChange={setFilterSearch}
            placeholder="Rechercher un deal..."
            className="w-64"
          />
          <FilterContactSearch
            contactId={filterContact || null}
            contactLabel={filterContactLabel || null}
            onSelect={(id, label) => { setFilterContact(id); setFilterContactLabel(label) }}
            onClear={() => { setFilterContact(""); setFilterContactLabel(""); contactAutocomplete.reset() }}
            label="Contact"
          />
          <FilterNumberRange
            min={filterAmountMin}
            max={filterAmountMax}
            onMinChange={setFilterAmountMin}
            onMaxChange={setFilterAmountMax}
            placeholderMin="Min"
            placeholderMax="Max"
            label="Montant"
          />
          <FilterDateRange
            after={filterExpectedCloseAfter}
            before={filterExpectedCloseBefore}
            onAfterChange={setFilterExpectedCloseAfter}
            onBeforeChange={setFilterExpectedCloseBefore}
            label="Date de closing"
          />
          <FilterDateRange
            after={filterCreatedAfter}
            before={filterCreatedBefore}
            onAfterChange={setFilterCreatedAfter}
            onBeforeChange={setFilterCreatedBefore}
            label="Date de création"
          />
          {members.length > 0 && (
            <FilterSelect
              options={members.map((m) => ({ value: m.user_id, label: `${m.first_name} ${m.last_name}` }))}
              value={filterCreatedBy}
              onChange={setFilterCreatedBy}
              placeholder="Tous"
              label="Créé par"
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
                    Renommer
                  </DropdownMenuItem>
                  {!pipelines.find((p) => p.id === selectedPipelineId)?.is_default && (
                    <DropdownMenuItem onClick={() => handleSetDefault(selectedPipelineId)}>
                      <Star className="h-4 w-4" />
                      Définir par défaut
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push("/settings/pipeline")}>
                    <Settings className="h-4 w-4" />
                    Gérer les étapes
                  </DropdownMenuItem>
                  {pipelines.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogId(selectedPipelineId)}>
                        <Trash2 className="h-4 w-4" />
                        Supprimer
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
            <DialogTitle>Supprimer le pipeline</DialogTitle>
          </DialogHeader>
          {deletePipelineData && deletePipelineData.deal_count > 0 ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Ce pipeline contient <strong>{deletePipelineData.deal_count} deal{deletePipelineData.deal_count !== 1 ? "s" : ""}</strong>. Choisissez un pipeline de destination :
              </p>
              <select
                value={deleteMigrateTo}
                onChange={(e) => setDeleteMigrateTo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">-- Sélectionner --</option>
                {pipelines.filter((p) => p.id !== deleteDialogId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Êtes-vous sûr de vouloir supprimer le pipeline <strong>{deletePipelineData?.name}</strong> ?
            </p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogId(null); setDeleteMigrateTo("") }}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleDeletePipeline}
              disabled={deleting || (!!deletePipelineData && deletePipelineData.deal_count > 0 && !deleteMigrateTo)}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} onReset={resetFilters} activeFilterCount={activeFilterCount}>
        <FilterSection label="Recherche">
          <FilterSearchInput value={filterSearch} onChange={setFilterSearch} placeholder="Rechercher un deal..." />
        </FilterSection>
        <FilterSection label="Contact">
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
                  placeholder="Rechercher un contact…"
                  className="pl-8"
                />
                {contactAutocomplete.searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
            {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
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
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                Aucun contact trouvé
              </div>
            )}
          </div>
        </FilterSection>
        <FilterSection label="Montant">
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} className={selectClass} />
            <input type="number" placeholder="Max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label="Probabilité (%)">
          <div className="flex gap-2">
            <input type="number" placeholder="Min" min="0" max="100" value={filterProbabilityMin} onChange={(e) => setFilterProbabilityMin(e.target.value)} className={selectClass} />
            <input type="number" placeholder="Max" min="0" max="100" value={filterProbabilityMax} onChange={(e) => setFilterProbabilityMax(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label="Date de closing prévue">
          <div className="flex gap-2">
            <input type="date" value={filterExpectedCloseAfter} onChange={(e) => setFilterExpectedCloseAfter(e.target.value)} className={selectClass} />
            <input type="date" value={filterExpectedCloseBefore} onChange={(e) => setFilterExpectedCloseBefore(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label="Date de création">
          <div className="flex gap-2">
            <input type="date" value={filterCreatedAfter} onChange={(e) => setFilterCreatedAfter(e.target.value)} className={selectClass} />
            <input type="date" value={filterCreatedBefore} onChange={(e) => setFilterCreatedBefore(e.target.value)} className={selectClass} />
          </div>
        </FilterSection>
        <FilterSection label="Créé par">
          <select value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)} className={selectClass}>
            <option value="">Tous les utilisateurs</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</option>
            ))}
          </select>
        </FilterSection>
      </FilterPanel>
    </div>
  )
}
