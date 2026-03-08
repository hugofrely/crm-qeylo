import { apiFetch } from "@/lib/api"
import type { CalendarAccount, Meeting } from "@/types/calendar"

export async function fetchCalendarAccounts(): Promise<CalendarAccount[]> {
  return apiFetch<CalendarAccount[]>("/calendar/accounts/")
}

export async function createCalendarAccount(emailAccountId: string): Promise<CalendarAccount> {
  return apiFetch<CalendarAccount>("/calendar/accounts/", {
    method: "POST",
    json: { email_account: emailAccountId },
  })
}

export async function fetchMeetings(params?: {
  contact?: string
  deal?: string
  start?: string
  end?: string
}): Promise<Meeting[]> {
  const query = new URLSearchParams()
  if (params?.contact) query.set("contact", params.contact)
  if (params?.deal) query.set("deal", params.deal)
  if (params?.start) query.set("start", params.start)
  if (params?.end) query.set("end", params.end)
  const qs = query.toString()
  return apiFetch<Meeting[]>(`/calendar/meetings/${qs ? `?${qs}` : ""}`)
}

export async function createMeeting(data: Partial<Meeting> & { contact_ids?: string[] }): Promise<Meeting> {
  return apiFetch<Meeting>("/calendar/meetings/", { method: "POST", json: data })
}

export async function updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
  return apiFetch<Meeting>(`/calendar/meetings/${id}/`, { method: "PUT", json: data })
}

export async function deleteMeeting(id: string): Promise<void> {
  await apiFetch(`/calendar/meetings/${id}/`, { method: "DELETE" })
}
