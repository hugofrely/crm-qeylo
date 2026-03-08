export interface ReactionGroup {
  emoji: string
  count: number
  users: { id: string; name: string }[]
}

export interface CommentMention {
  id: string
  user: string
  user_name: string
  created_at: string
}

export interface Comment {
  id: string
  author: string
  author_name: string
  author_email: string
  content: string
  is_private: boolean
  contact: string | null
  deal: string | null
  task: string | null
  reactions: ReactionGroup[]
  mentions: CommentMention[]
  created_at: string
  updated_at: string
  edited_at: string | null
}

export interface MemberSearchResult {
  id: string
  first_name: string
  last_name: string
  email: string
  name: string
}

export interface MentionItem {
  id: string
  comment_id: string
  author_name: string
  content: string
  entity_type: string
  entity_id: string
  created_at: string
}
