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
