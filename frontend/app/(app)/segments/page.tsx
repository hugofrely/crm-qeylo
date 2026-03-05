"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { fetchSegments, createSegment, updateSegment, deleteSegment } from "@/services/segments"
import { SegmentBuilder } from "@/components/segments/SegmentBuilder"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, Loader2, ListFilter, Users } from "lucide-react"
import type { Segment } from "@/types"

export default function SegmentsPage() {
  const router = useRouter()
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)

  const loadSegments = useCallback(async () => {
    try {
      const data = await fetchSegments()
      setSegments(data)
    } catch (err) {
      console.error("Failed to fetch segments:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSegments()
  }, [loadSegments])

  const handleSave = async (data: Partial<Segment>) => {
    if (editingSegment) {
      await updateSegment(editingSegment.id, data)
    } else {
      await createSegment(data)
    }
    setEditingSegment(null)
    loadSegments()
  }

  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment)
    setBuilderOpen(true)
  }

  const handleDuplicate = async (segment: Segment) => {
    await createSegment({
      name: `${segment.name} (copie)`,
      description: segment.description,
      color: segment.color,
      icon: segment.icon,
      rules: segment.rules,
      is_pinned: false,
    })
    loadSegments()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce segment ?")) return
    await deleteSegment(id)
    loadSegments()
  }

  const handleNew = () => {
    setEditingSegment(null)
    setBuilderOpen(true)
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Segments</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {segments.length} segment{segments.length !== 1 ? "s" : ""} dynamique{segments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Nouveau segment
        </Button>
      </div>

      {/* Segment grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ListFilter className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">Aucun segment</h3>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)] mb-4">
            Creez votre premier segment pour filtrer vos contacts dynamiquement.
          </p>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Creer un segment
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="group relative rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:shadow-sm transition-all cursor-pointer"
              onClick={() => router.push(`/segments/${segment.id}`)}
            >
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: segment.color }}
              />

              <div className="flex items-start justify-between mt-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{segment.name}</h3>
                    {segment.is_pinned && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-[family-name:var(--font-body)]">
                        Epingle
                      </span>
                    )}
                  </div>
                  {segment.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 font-[family-name:var(--font-body)]">
                      {segment.description}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(segment) }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(segment) }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Dupliquer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleDelete(segment.id) }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Count */}
              <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                <Users className="h-3.5 w-3.5" />
                <span>{segment.contact_count ?? 0} contact{(segment.contact_count ?? 0) !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <SegmentBuilder
        open={builderOpen}
        onOpenChange={(open) => {
          setBuilderOpen(open)
          if (!open) setEditingSegment(null)
        }}
        segment={editingSegment}
        onSave={handleSave}
      />
    </div>
  )
}
