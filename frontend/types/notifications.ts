export interface Notification {
  id: number
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface UnreadCountResponse {
  count: number
}
