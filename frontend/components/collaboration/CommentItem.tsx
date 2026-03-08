"use client"

import { useState } from "react"
import type { Comment } from "@/types/collaboration"
import { MarkdownContent } from "@/components/chat/MarkdownContent"
import { Button } from "@/components/ui/button"
import { Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toggleReaction, deleteComment, updateComment } from "@/services/collaboration"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { apiUploadImage } from "@/lib/api"
import { cn } from "@/lib/utils"

const EMOJI_OPTIONS = ["👍", "❤️", "🎉", "😄", "🤔", "👀"]

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr))
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onUpdated: () => void
  onDeleted: (commentId: string) => void
}

export function CommentItem({ comment, currentUserId, onUpdated, onDeleted }: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isAuthor = comment.author === currentUserId

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction(comment.id, emoji)
      onUpdated()
    } catch (err) {
      console.error("Failed to toggle reaction:", err)
    }
    setShowEmojiPicker(false)
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer ce commentaire ?")) return
    try {
      await deleteComment(comment.id)
      onDeleted(comment.id)
    } catch (err) {
      console.error("Failed to delete comment:", err)
    }
    setShowMenu(false)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    try {
      await updateComment(comment.id, { content: editContent })
      setEditing(false)
      onUpdated()
    } catch (err) {
      console.error("Failed to update comment:", err)
    }
  }

  return (
    <div className="group flex gap-3 py-3">
      {/* Avatar */}
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
        {getInitials(comment.author_name)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-[family-name:var(--font-body)]">
            {comment.author_name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatDateTime(comment.created_at)}
          </span>
          {comment.edited_at && (
            <span className="text-[10px] text-muted-foreground italic">
              (modifie)
            </span>
          )}
          {comment.is_private && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}

          {/* Menu */}
          {isAuthor && (
            <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-secondary"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => { setEditing(true); setShowMenu(false) }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-secondary"
                  >
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {editing ? (
          <div className="mt-2 space-y-2">
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="Modifier le commentaire..."
              minHeight="80px"
              onImageUpload={apiUploadImage}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim()}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm font-[family-name:var(--font-body)]">
            <MarkdownContent content={comment.content} />
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              title={r.users.map((u) => u.name).join(", ")}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                r.users.some((u) => u.id === currentUserId)
                  ? "border-primary/30 bg-primary/10"
                  : "border-border hover:bg-secondary"
              )}
            >
              <span>{r.emoji}</span>
              <span className="text-muted-foreground">{r.count}</span>
            </button>
          ))}

          {/* Add reaction */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
            >
              +
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 bottom-full mb-1 flex gap-1 bg-card border border-border rounded-lg shadow-lg p-1.5 z-10">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1 hover:bg-secondary rounded text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
