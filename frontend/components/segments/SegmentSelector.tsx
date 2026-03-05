"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchSegments } from "@/services/segments"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ListFilter, X, ExternalLink } from "lucide-react"
import type { Segment } from "@/types"

interface Props {
  selectedSegmentId: string | null
  onSelect: (segmentId: string | null) => void
}

export function SegmentSelector({ selectedSegmentId, onSelect }: Props) {
  const router = useRouter()
  const [segments, setSegments] = useState<Segment[]>([])

  useEffect(() => {
    fetchSegments()
      .then((data) => setSegments(data))
      .catch(() => {})
  }, [])

  const pinnedSegments = segments.filter((s) => s.is_pinned)
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId)

  if (segments.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {selectedSegment ? (
        <div className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium font-[family-name:var(--font-body)]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selectedSegment.color }}
          />
          {selectedSegment.name}
          <span className="text-[10px] opacity-70">
            ({selectedSegment.contact_count ?? 0})
          </span>
          <button
            onClick={() => onSelect(null)}
            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ListFilter className="h-3.5 w-3.5" />
              Segments
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {pinnedSegments.length > 0 && (
              <>
                {pinnedSegments.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.contact_count ?? 0}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {segments
              .filter((s) => !s.is_pinned)
              .map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.contact_count ?? 0}
                  </span>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/segments")} className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Voir tous les segments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
