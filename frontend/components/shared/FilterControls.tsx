"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, RotateCcw, Loader2 } from "lucide-react"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useMemberAutocomplete } from "@/hooks/useMemberAutocomplete"

// --- FilterLabel (internal helper) ---
function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
      {children}
    </span>
  )
}

// --- FilterGroup (wraps a filter with an optional label) ---
function FilterGroup({ label, children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  if (!label) return <>{children}</>
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <FilterLabel>{label}</FilterLabel>
      {children}
    </div>
  )
}

// --- FilterSearchInput ---
interface FilterSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export function FilterSearchInput({ value, onChange, placeholder = "Rechercher...", className, label }: FilterSearchInputProps) {
  return (
    <FilterGroup label={label} className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 h-9 bg-background border-border w-full"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </FilterGroup>
  )
}

// --- FilterPills ---
interface FilterPillsProps {
  options: { value: string; label: string; color?: string; count?: number }[]
  value: string | null
  onChange: (value: string | null) => void
  allLabel?: string
  showAll?: boolean
  label?: string
}

export function FilterPills({ options, value, onChange, allLabel = "Tous", showAll = false, label }: FilterPillsProps) {
  return (
    <FilterGroup label={label}>
      <div className="flex flex-wrap gap-1.5">
        {showAll && (
          <button
            onClick={() => onChange(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
              value === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {allLabel}
          </button>
        )}
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
              value === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />}
            {opt.label}
            {opt.count !== undefined && <span className="text-[10px] opacity-70">({opt.count})</span>}
          </button>
        ))}
      </div>
    </FilterGroup>
  )
}

// --- FilterSelect ---
interface FilterSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export function FilterSelect({ options, value, onChange, placeholder = "Tous", className, label }: FilterSelectProps) {
  return (
    <FilterGroup label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-[family-name:var(--font-body)] ${className ?? ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FilterGroup>
  )
}

// --- FilterDateRange ---
interface FilterDateRangeProps {
  after: string
  before: string
  onAfterChange: (value: string) => void
  onBeforeChange: (value: string) => void
  className?: string
  label?: string
}

export function FilterDateRange({ after, before, onAfterChange, onBeforeChange, className, label }: FilterDateRangeProps) {
  const inputClass = "h-9 rounded-md border border-border bg-background px-2 py-1 text-xs"
  return (
    <FilterGroup label={label}>
      <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
        <input type="date" value={after} onChange={(e) => onAfterChange(e.target.value)} className={inputClass} />
        <span className="text-muted-foreground text-xs">{"\u2192"}</span>
        <input type="date" value={before} onChange={(e) => onBeforeChange(e.target.value)} className={inputClass} />
      </div>
    </FilterGroup>
  )
}

// --- FilterNumberRange ---
interface FilterNumberRangeProps {
  min: string
  max: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  placeholderMin?: string
  placeholderMax?: string
  className?: string
  label?: string
}

export function FilterNumberRange({ min, max, onMinChange, onMaxChange, placeholderMin = "Min", placeholderMax = "Max", className, label }: FilterNumberRangeProps) {
  const inputClass = "h-9 w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
  return (
    <FilterGroup label={label}>
      <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
        <input type="number" placeholder={placeholderMin} value={min} onChange={(e) => onMinChange(e.target.value)} className={inputClass} />
        <span className="text-muted-foreground text-xs">{"\u2192"}</span>
        <input type="number" placeholder={placeholderMax} value={max} onChange={(e) => onMaxChange(e.target.value)} className={inputClass} />
      </div>
    </FilterGroup>
  )
}

// --- FilterContactSearch ---
interface FilterContactSearchProps {
  contactId: string | null
  contactLabel: string | null
  onSelect: (id: string, label: string) => void
  onClear: () => void
  label?: string
  className?: string
}

export function FilterContactSearch({ contactId, contactLabel, onSelect, onClear, label, className }: FilterContactSearchProps) {
  const autocomplete = useContactAutocomplete()

  return (
    <FilterGroup label={label} className={className}>
      <div className="relative" ref={autocomplete.wrapperRef}>
        {contactId ? (
          <button
            onClick={() => { onClear(); autocomplete.reset() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors"
          >
            {contactLabel}
            <X className="h-3 w-3" />
          </button>
        ) : (
          <>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact..."
              value={autocomplete.query}
              onChange={(e) => autocomplete.search(e.target.value)}
              onFocus={() => { if (autocomplete.results.length > 0) autocomplete.setOpen(true) }}
              className="pl-8 h-9 text-xs bg-background border-border w-48"
            />
            {autocomplete.searching && (
              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </>
        )}
        {autocomplete.open && autocomplete.results.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
            {autocomplete.results.map((c) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                onClick={() => {
                  onSelect(c.id, `${c.first_name} ${c.last_name}`.trim())
                  autocomplete.reset()
                }}
              >
                {c.first_name} {c.last_name}
                {c.email && <span className="text-muted-foreground ml-1">({c.email})</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </FilterGroup>
  )
}

// --- FilterMemberSearch ---
interface FilterMemberSearchProps {
  memberId: string | null
  memberLabel: string | null
  onSelect: (id: string, label: string) => void
  onClear: () => void
  showMyTasks?: boolean
  myTasksLabel?: string
  label?: string
  className?: string
}

export function FilterMemberSearch({ memberId, memberLabel, onSelect, onClear, showMyTasks, myTasksLabel = "Mes tâches", label, className }: FilterMemberSearchProps) {
  const autocomplete = useMemberAutocomplete()

  return (
    <FilterGroup label={label} className={className}>
      <div className="flex flex-col gap-1.5">
        {showMyTasks && (
          <button
            onClick={() => {
              if (memberId === "me") { onClear() } else { onSelect("me", myTasksLabel) }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left font-[family-name:var(--font-body)] ${
              memberId === "me" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {myTasksLabel}
          </button>
        )}
        <div className="relative" ref={autocomplete.wrapperRef}>
          {memberId && memberId !== "me" ? (
            <button
              onClick={() => { onClear(); autocomplete.reset() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground transition-colors"
            >
              {memberLabel}
              <X className="h-3 w-3" />
            </button>
          ) : memberId !== "me" ? (
            <>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un membre..."
                value={autocomplete.query}
                onChange={(e) => autocomplete.search(e.target.value)}
                onFocus={() => { if (autocomplete.results.length > 0) autocomplete.setOpen(true) }}
                className="pl-8 h-9 text-xs bg-background border-border w-48"
              />
            </>
          ) : null}
          {autocomplete.open && autocomplete.results.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
              {autocomplete.results.map((m) => (
                <button
                  key={m.user_id}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                  onClick={() => {
                    onSelect(m.user_id, `${m.first_name} ${m.last_name}`.trim())
                    autocomplete.reset()
                  }}
                >
                  {m.first_name} {m.last_name}
                  {m.email && <span className="text-muted-foreground ml-1">({m.email})</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </FilterGroup>
  )
}

// --- FilterResetButton ---
interface FilterResetButtonProps {
  activeFilterCount: number
  onReset: () => void
}

export function FilterResetButton({ activeFilterCount, onReset }: FilterResetButtonProps) {
  if (activeFilterCount === 0) return null
  return (
    <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-muted-foreground h-9 text-xs">
      <RotateCcw className="h-3 w-3" />
      Réinitialiser ({activeFilterCount})
    </Button>
  )
}
