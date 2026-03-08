import { apiFetch } from "@/lib/api"
import type {
  EmailAccount,
  EmailTemplate,
  RenderedTemplate,
  Email,
  EmailThread,
  SyncStatus,
} from "@/types"

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

export async function fetchEmailTemplates(params?: {
  search?: string
  tag?: string
  mine_only?: boolean
  shared_only?: boolean
}): Promise<EmailTemplate[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set("search", params.search)
  if (params?.tag) searchParams.set("tag", params.tag)
  if (params?.mine_only) searchParams.set("mine_only", "true")
  if (params?.shared_only) searchParams.set("shared_only", "true")
  const qs = searchParams.toString()
  return apiFetch<EmailTemplate[]>(`/email/templates/${qs ? `?${qs}` : ""}`)
}

export async function fetchEmailTemplate(id: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/${id}/`)
}

export async function createEmailTemplate(
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/`, {
    method: "POST",
    json: data,
  })
}

export async function updateEmailTemplate(
  id: string,
  data: Partial<EmailTemplate>
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/email/templates/${id}/`, {
    method: "PUT",
    json: data,
  })
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiFetch(`/email/templates/${id}/`, { method: "DELETE" })
}

export async function renderEmailTemplate(
  id: string,
  data: { contact_id?: string; deal_id?: string }
): Promise<RenderedTemplate> {
  return apiFetch<RenderedTemplate>(`/email/templates/${id}/render/`, {
    method: "POST",
    json: data,
  })
}

export async function fetchInboxThreads(params?: {
  account?: string
  unread?: boolean
  contact?: string
  search?: string
  page?: number
}): Promise<{ count: number; results: EmailThread[] }> {
  const query = new URLSearchParams()
  if (params?.account) query.set("account", params.account)
  if (params?.unread) query.set("unread", "true")
  if (params?.contact) query.set("contact", params.contact)
  if (params?.search) query.set("search", params.search)
  if (params?.page) query.set("page", String(params.page))
  return apiFetch(`/email/inbox/threads/?${query.toString()}`)
}

export async function fetchThreadEmails(
  threadId: string
): Promise<Email[]> {
  return apiFetch(`/email/inbox/threads/${threadId}/`)
}

export async function markEmailRead(
  emailId: string,
  isRead: boolean
): Promise<void> {
  return apiFetch(`/email/inbox/emails/${emailId}/read/`, {
    method: "PATCH",
    body: JSON.stringify({ is_read: isRead }),
  })
}

export async function fetchContactEmails(
  contactId: string
): Promise<Email[]> {
  return apiFetch(`/email/inbox/contacts/${contactId}/`)
}

export async function triggerSync(): Promise<void> {
  return apiFetch("/email/inbox/sync/", { method: "POST" })
}

export async function fetchSyncStatus(): Promise<SyncStatus[]> {
  return apiFetch("/email/inbox/sync/status/")
}
