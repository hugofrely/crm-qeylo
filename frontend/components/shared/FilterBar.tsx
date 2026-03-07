"use client"

import * as React from "react"
import { FilterResetButton } from "./FilterControls"

interface FilterBarProps {
  activeFilterCount: number
  onReset: () => void
  children: React.ReactNode
}

export function FilterBar({ activeFilterCount, onReset, children }: FilterBarProps) {
  return (
    <div className="hidden lg:flex flex-wrap items-end gap-3 bg-muted/50 border border-border/40 rounded-lg px-4 py-3">
      {children}
      <div className="self-end">
        <FilterResetButton activeFilterCount={activeFilterCount} onReset={onReset} />
      </div>
    </div>
  )
}
