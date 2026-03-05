export interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
}

export interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

export interface MembersResponse {
  members: Member[]
  invitations: PendingInvitation[]
}
