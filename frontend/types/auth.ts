export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_notifications: boolean
  is_superuser: boolean
  preferred_language?: string
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
}
