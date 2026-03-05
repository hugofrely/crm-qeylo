"use client"

import { useState } from "react"
import { Plus, Trash2, Pencil, MessageSquare, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { deleteConversation, renameConversation } from "@/services/chat"
import type { Conversation } from "@/types"

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDeleted: (id: string) => void
  onRenamed: (id: string, title: string) => void
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `il y a ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `il y a ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `il y a ${diffDays}j`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNew,
  onDeleted,
  onRenamed,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await renameConversation(id, editTitle.trim())
      onRenamed(id, editTitle.trim())
    } catch {
      // silently fail
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id)
      onDeleted(id)
    } catch {
      // silently fail
    }
    setDeletingId(null)
  }

  return (
    <div className="flex h-full w-64 flex-col border-l bg-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Conversations</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                activeConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
              onClick={() => {
                if (editingId !== conv.id && deletingId !== conv.id) {
                  onSelect(conv.id)
                }
              }}
            >
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
              <div className="min-w-0 flex-1">
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(conv.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="w-full rounded border bg-background px-1 py-0.5 text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleRename(conv.id) }}>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : deletingId === conv.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Supprimer ?</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}>
                      <Check className="h-3.5 w-3.5 text-destructive" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(null) }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="truncate font-medium">{conv.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.last_message_preview || "Nouvelle conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {formatRelativeDate(conv.updated_at)}
                    </p>
                  </>
                )}
              </div>
              {editingId !== conv.id && deletingId !== conv.id && (
                <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditTitle(conv.title)
                      setEditingId(conv.id)
                    }}
                    className="rounded p-1 hover:bg-muted-foreground/10"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingId(conv.id)
                    }}
                    className="rounded p-1 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Aucune conversation
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
