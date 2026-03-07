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
  isMobileDrawer?: boolean
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
  isMobileDrawer = false,
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
    <div className={isMobileDrawer
      ? "flex h-full flex-col overflow-hidden"
      : "hidden lg:flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-l border-border bg-secondary/20"
    }>
      {!isMobileDrawer && (
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-medium font-[family-name:var(--font-body)]">Conversations</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1 [&>div>div]:!block">
        <div className="flex flex-col gap-0.5 p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-all duration-150 font-[family-name:var(--font-body)] ${
                activeConversationId === conv.id
                  ? "bg-primary/8 text-primary"
                  : "hover:bg-secondary"
              }`}
              onClick={() => {
                if (editingId !== conv.id && deletingId !== conv.id) {
                  onSelect(conv.id)
                }
              }}
            >
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40" />
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
                      className="w-full rounded-md border border-border bg-card px-2 py-0.5 text-xs"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); handleRename(conv.id) }}>
                      <Check className="h-3 w-3 text-primary" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }}>
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : deletingId === conv.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-destructive">Supprimer ?</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}>
                      <Check className="h-3 w-3 text-destructive" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(null) }}>
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{conv.title}</p>
                      <div className="hidden shrink-0 gap-0.5 group-hover:flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditTitle(conv.title)
                            setEditingId(conv.id)
                          }}
                          className="rounded p-0.5 hover:bg-muted-foreground/10"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingId(conv.id)
                          }}
                          className="rounded p-0.5 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                      {conv.last_message_preview || "Nouvelle conversation"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {formatRelativeDate(conv.updated_at)}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <p className="px-3 py-10 text-center text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
              Aucune conversation
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
