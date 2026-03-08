export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_notifications: boolean
  is_superuser: boolean
  preferred_language?: string
  email_notify_task_reminder: boolean
  email_notify_task_assigned: boolean
  email_notify_task_due: boolean
  email_notify_daily_digest: boolean
  email_notify_deal_update: boolean
  email_notify_mention: boolean
  email_notify_new_comment: boolean
  email_notify_reaction: boolean
  email_notify_import_complete: boolean
  email_notify_invitation: boolean
  email_notify_workflow: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    organization_name: string
    invite_token?: string
  }) => Promise<void>
  logout: () => void
  updateUser: (fields: Partial<User>) => void
}
