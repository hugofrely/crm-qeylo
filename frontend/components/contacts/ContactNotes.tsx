"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import type { TimelineEntry } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Loader2,
  Plus,
} from "lucide-react"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { createActivity } from "@/services/activities"
import { apiUploadImage } from "@/lib/api"

/* ── Helpers ── */

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/* ── Props ── */

export interface ContactNotesProps {
  notes: TimelineEntry[]
  contactId: string
  onNoteAdded: () => void
}

export function ContactNotes({ notes, contactId, onNoteAdded }: ContactNotesProps) {
  const t = useTranslations("contacts")
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      await createActivity({
        entry_type: "note_added",
        contact: contactId,
        subject: "Note",
        content: newNote.trim(),
        metadata: {},
      })
      setNewNote("")
      onNoteAdded()
    } catch (err) {
      console.error("Failed to add note:", err)
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
          {t("tabs.notes")} ({notes.length})
        </h2>
      </div>
      {/* Add note input */}
      <div className="mb-6 space-y-2">
        <RichTextEditor
          content={newNote}
          onChange={setNewNote}
          placeholder={t("actions.addNotePlaceholder")}
          minHeight="100px"
          onImageUpload={apiUploadImage}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="gap-1.5">
            {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span className="font-[family-name:var(--font-body)]">{t("actions.addNote")}</span>
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
          {t("emptyState.noNotes")}
        </p>
      ) : (
        <div className="space-y-0">
          {notes.map((entry, index) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0 bg-warm-light text-warm">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                {index < notes.length - 1 && (
                  <div className="w-px flex-1 bg-border min-h-[20px]" />
                )}
              </div>
              <div className="pb-6 flex-1 min-w-0 font-[family-name:var(--font-body)]">
                <div className="flex items-baseline justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize font-normal">
                    Note
                  </Badge>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
                {entry.subject && (
                  <p className="text-sm font-medium mt-1">{entry.subject}</p>
                )}
                {entry.content && (
                  <div className="mt-1.5 text-sm">
                    <MarkdownContent content={entry.content} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
