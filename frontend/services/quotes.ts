import Cookies from "js-cookie"
import { apiFetch } from "@/lib/api"
import type { Quote, QuoteListItem } from "@/types/deals"

export async function fetchQuotes(dealId: string): Promise<QuoteListItem[]> {
  return apiFetch<QuoteListItem[]>(`/quotes/?deal=${dealId}`)
}

export async function fetchQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/`)
}

export async function createQuote(data: { deal: string; lines?: unknown[]; notes?: string }): Promise<Quote> {
  return apiFetch<Quote>("/quotes/", { method: "POST", json: data })
}

export async function updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/`, { method: "PATCH", json: data })
}

export async function deleteQuote(id: string): Promise<void> {
  await apiFetch(`/quotes/${id}/`, { method: "DELETE" })
}

export async function duplicateQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/duplicate/`, { method: "POST" })
}

export async function sendQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/send/`, { method: "POST" })
}

export async function acceptQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/accept/`, { method: "POST" })
}

export async function refuseQuote(id: string): Promise<Quote> {
  return apiFetch<Quote>(`/quotes/${id}/refuse/`, { method: "POST" })
}

export async function downloadQuotePdf(id: string): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  const token = Cookies.get("access_token") || ""
  const orgId = Cookies.get("organization_id") || ""

  const response = await fetch(`${API_URL}/quotes/${id}/pdf/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Organization": orgId,
    },
  })
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `devis-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
