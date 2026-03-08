import { apiFetch } from "@/lib/api"
import type { Comment, MemberSearchResult, MentionItem } from "@/types/collaboration"

export async function fetchComments(params: { contact?: string; deal?: string; task?: string }): Promise<Comment[]> {
  const searchParams = new URLSearchParams()
  if (params.contact) searchParams.set("contact", params.contact)
  if (params.deal) searchParams.set("deal", params.deal)
  if (params.task) searchParams.set("task", params.task)
  return apiFetch<Comment[]>(`/collaboration/comments/?${searchParams}`)
}

export async function createComment(data: {
  content: string
  is_private?: boolean
  contact?: string
  deal?: string
  task?: string
}): Promise<Comment> {
  return apiFetch<Comment>("/collaboration/comments/", { method: "POST", json: data })
}

export async function updateComment(id: string, data: { content?: string; is_private?: boolean }): Promise<Comment> {
  return apiFetch<Comment>(`/collaboration/comments/${id}/`, { method: "PATCH", json: data })
}

export async function deleteComment(id: string): Promise<void> {
  await apiFetch(`/collaboration/comments/${id}/`, { method: "DELETE" })
}

export async function toggleReaction(commentId: string, emoji: string): Promise<{ action: string }> {
  return apiFetch<{ action: string }>(`/collaboration/comments/${commentId}/reactions/`, {
    method: "POST",
    json: { emoji },
  })
}

export async function fetchMyMentions(): Promise<MentionItem[]> {
  return apiFetch<MentionItem[]>("/collaboration/mentions/me/")
}

export async function searchMembers(orgId: string, query: string): Promise<MemberSearchResult[]> {
  return apiFetch<MemberSearchResult[]>(`/organizations/${orgId}/members/search/?q=${encodeURIComponent(query)}`)
}
