"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Comment } from "@/types/collaboration"
import { fetchComments, createComment, searchMembers } from "@/services/collaboration"
import { CommentItem } from "./CommentItem"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { Button } from "@/components/ui/button"
import { Loader2, MessageSquare } from "lucide-react"
import { apiUploadImage } from "@/lib/api"
import { useWebSocket } from "@/hooks/useWebSocket"
import Cookies from "js-cookie"

interface CommentSectionProps {
  entityType: "contact" | "deal" | "task"
  entityId: string
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const currentUserId = Cookies.get("user_id") || ""
  const orgId = Cookies.get("organization_id") || ""
  const editorKeyRef = useRef(0)

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchComments({ [entityType]: entityId })
      setComments(data)
    } catch (err) {
      console.error("Failed to load comments:", err)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // WebSocket for live updates
  useWebSocket({
    path: `/ws/collaboration/${entityType}/${entityId}/`,
    onMessage: (data: unknown) => {
      const event = data as { event: string; comment?: Comment; comment_id?: string; reactions?: Comment["reactions"] }

      switch (event.event) {
        case "comment_created":
          if (event.comment) {
            setComments((prev) => {
              if (prev.some((c) => c.id === event.comment!.id)) return prev
              return [...prev, event.comment!]
            })
          }
          break
        case "comment_updated":
          if (event.comment) {
            setComments((prev) =>
              prev.map((c) => (c.id === event.comment!.id ? event.comment! : c))
            )
          }
          break
        case "comment_deleted":
          if (event.comment_id) {
            setComments((prev) => prev.filter((c) => c.id !== event.comment_id))
          }
          break
        case "reaction_updated":
          if (event.comment_id && event.reactions) {
            setComments((prev) =>
              prev.map((c) =>
                c.id === event.comment_id ? { ...c, reactions: event.reactions! } : c
              )
            )
          }
          break
      }
    },
  })

  const handleSubmit = async () => {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      const created = await createComment({
        content: newComment,
        [entityType]: entityId,
      })
      setNewComment("")
      editorKeyRef.current += 1
      setComments((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev
        return [...prev, created]
      })
    } catch (err) {
      console.error("Failed to create comment:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMentionQuery = async (query: string) => {
    if (!orgId) return []
    try {
      const members = await searchMembers(orgId, query)
      return members.map((m) => ({ id: m.id, name: m.name, email: m.email }))
    } catch {
      return []
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
          Commentaires ({comments.length})
        </h2>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <MessageSquare className="h-5 w-5 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            Aucun commentaire
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50 mb-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onUpdated={loadComments}
              onDeleted={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="space-y-2">
        <RichTextEditor
          key={editorKeyRef.current}
          content={newComment}
          onChange={setNewComment}
          placeholder="Ecrire un commentaire... Utilisez @ pour mentionner"
          minHeight="80px"
          onImageUpload={apiUploadImage}
          onMentionQuery={handleMentionQuery}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            <span className="font-[family-name:var(--font-body)]">Commenter</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
