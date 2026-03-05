export interface EmailAccount {
  id: string
  provider: "gmail" | "outlook"
  email_address: string
  is_active: boolean
}
