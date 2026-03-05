import { apiFetch } from "@/lib/api"
import type { SearchResults } from "@/types"

export async function globalSearch(query: string): Promise<SearchResults> {
  return apiFetch<SearchResults>(`/search/?q=${encodeURIComponent(query)}`)
}
