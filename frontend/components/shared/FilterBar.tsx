"use client"

import * as React from "react"
import { FilterResetButton } from "./FilterControls"

interface FilterBarProps {
  open: boolean
  activeFilterCount: number
  onReset: () => void
  children: React.ReactNode
}

export function FilterBar({ open, activeFilterCount, onReset, children }: FilterBarProps) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ease-out ${
        open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="hidden lg:flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg px-4 py-3">
        {children}
        <div className="self-end">
          <FilterResetButton activeFilterCount={activeFilterCount} onReset={onReset} />
        </div>
      </div>
    </div>
  )
}
