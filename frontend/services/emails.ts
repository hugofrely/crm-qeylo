import { apiFetch } from "@/lib/api"
import type { EmailAccount } from "@/types"

export async function fetchEmailAccounts(): Promise<EmailAccount[]> {
  return apiFetch<EmailAccount[]>(`/email/accounts/`)
}

export async function sendEmail(data: {
  contact_id: string
  subject: string
  body_html: string
  provider?: string
}): Promise<void> {
  await apiFetch(`/email/send/`, { method: "POST", json: data })
}
