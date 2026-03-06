import { apiFetch } from "@/lib/api"
import type { Report } from "@/types"

export async function fetchDashboard(): Promise<Report> {
  return apiFetch<Report>("/dashboard/")
}
