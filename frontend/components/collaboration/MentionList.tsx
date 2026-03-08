"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"

export interface MentionSuggestion {
  id: string
  name: string
  email: string
}

interface MentionListProps {
  items: MentionSuggestion[]
  command: (item: { id: string; label: string }) => void
  noResultsLabel?: string
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, noResultsLabel }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex]
          if (item) command({ id: item.id, label: item.name })
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-2 text-xs text-muted-foreground">
          {noResultsLabel || "Aucun membre trouvé"}
        </div>
      )
    }

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto z-50">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.id, label: item.name })}
            className={`flex flex-col w-full px-3 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-primary/10" : "hover:bg-secondary"
            }`}
          >
            <span className="font-medium text-xs">{item.name}</span>
            <span className="text-[11px] text-muted-foreground">{item.email}</span>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = "MentionList"
