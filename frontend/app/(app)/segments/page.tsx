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
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, ListFilter } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"
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

  const columns: DataTableColumn<Segment>[] = [
    {
      key: "name",
      header: "Nom",
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
          <span className="font-medium text-sm">{s.name}</span>
          {s.is_pinned && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-[family-name:var(--font-body)]">Épinglé</span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell text-sm text-muted-foreground font-[family-name:var(--font-body)]",
      render: (s) => s.description || "—",
    },
    {
      key: "contacts",
      header: "Contacts",
      headerClassName: "text-right",
      className: "text-right text-sm text-muted-foreground tabular-nums",
      render: (s) => <>{s.contact_count ?? 0}</>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      render: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(s) }}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(s) }}>
              <Copy className="h-4 w-4 mr-2" /> Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <PageHeader
        title="Segments"
        subtitle={`${segments.length} segment${segments.length !== 1 ? "s" : ""} dynamique${segments.length !== 1 ? "s" : ""}`}
      >
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Nouveau segment
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={segments}
        loading={loading}
        emptyIcon={<ListFilter className="h-12 w-12 text-muted-foreground/30 mb-4" />}
        emptyMessage="Aucun segment. Créez votre premier segment pour filtrer vos contacts dynamiquement."
        onRowClick={(s) => router.push(`/segments/${s.id}`)}
        rowKey={(s) => s.id}
      />

      {segments.length < 5 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Segments suggérés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: "Contacts actifs (30j)", description: "Contacts avec activité dans les 30 derniers jours" },
              { name: "Leads chauds sans deal", description: "Contacts avec score 'chaud' sans deal associé" },
              { name: "Contacts sans email", description: "Contacts sans adresse email renseignée" },
            ].map((suggestion) => (
              <div
                key={suggestion.name}
                className="text-left p-4 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-card transition-colors cursor-default"
              >
                <p className="text-sm font-medium">{suggestion.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
              </div>
            ))}
          </div>
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
