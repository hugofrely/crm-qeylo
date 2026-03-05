"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchSegment, updateSegment, fetchSegmentContacts } from "@/services/segments"
import { SegmentBuilder } from "@/components/segments/SegmentBuilder"
import { ContactTable } from "@/components/contacts/ContactTable"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Pencil, Users, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import type { Segment, Contact } from "@/types"

const PAGE_SIZE = 20

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = []
  pages.push(1)
  if (current > 3) pages.push("...")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function SegmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [segment, setSegment] = useState<Segment | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [builderOpen, setBuilderOpen] = useState(false)

  const loadSegment = useCallback(async () => {
    try {
      const data = await fetchSegment(id)
      setSegment(data)
    } catch (err) {
      console.error("Failed to fetch segment:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const data = await fetchSegmentContacts(id, page)
      setContacts(data.results)
      setTotalCount(data.count)
    } catch (err) {
      console.error("Failed to fetch segment contacts:", err)
    } finally {
      setContactsLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    loadSegment()
  }, [loadSegment])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleSave = async (data: Partial<Segment>) => {
    await updateSegment(id, data)
    loadSegment()
    loadContacts()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!segment) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-muted-foreground">Segment non trouve.</p>
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/segments")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 font-[family-name:var(--font-body)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Segments
          </button>
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <h1 className="text-3xl tracking-tight">{segment.name}</h1>
          </div>
          {segment.description && (
            <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
              {segment.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            <Users className="h-3.5 w-3.5" />
            <span>{totalCount} contact{totalCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setBuilderOpen(true)}>
          <Pencil className="h-4 w-4" />
          Modifier les regles
        </Button>
      </div>

      {/* Contacts table */}
      {contactsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContactTable contacts={contacts} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-[family-name:var(--font-body)]">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <SegmentBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        segment={segment}
        onSave={handleSave}
      />
    </div>
  )
}
