"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Building2, Plus, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/PageHeader"
import { Pagination } from "@/components/shared/Pagination"
import { CompanyForm } from "@/components/companies/CompanyForm"
import { fetchCompanies } from "@/services/companies"
import type { CompanyListItem } from "@/types"

const PAGE_SIZE = 20

function getHealthBadge(score: string) {
  switch (score) {
    case "excellent":
      return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Excellent</Badge>
    case "good":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Bon</Badge>
    case "at_risk":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">A risque</Badge>
    case "churned":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Churned</Badge>
    default:
      return <Badge variant="secondary">--</Badge>
  }
}

function formatCurrency(value: string | null): string {
  if (!value) return "--"
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCompanies({
        search: search.trim() || undefined,
        page,
      })
      setCompanies(data.results)
      setTotalCount(data.count)
    } catch (err) {
      console.error("Failed to fetch companies:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCompanies()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadCompanies, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Entreprises"
        subtitle={`${totalCount} entreprise${totalCount !== 1 ? "s" : ""} au total`}
      >
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Building2 className="h-4 w-4" />
          Nouvelle entreprise
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une entreprise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 bg-secondary/30 border-border/60"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucune entreprise trouvee.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                    Nom
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] hidden sm:table-cell">
                    Secteur
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] hidden md:table-cell">
                    Contacts
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] hidden md:table-cell">
                    Deals ouverts
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] hidden lg:table-cell">
                    CA gagne
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                    Sante
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => router.push(`/companies/${company.id}`)}
                    className="border-b border-border/50 hover:bg-secondary/20 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate font-[family-name:var(--font-body)]">{company.name}</p>
                          {company.domain && (
                            <p className="text-xs text-muted-foreground truncate font-[family-name:var(--font-body)]">{company.domain}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-[family-name:var(--font-body)] hidden sm:table-cell">
                      {company.industry || "--"}
                    </td>
                    <td className="px-4 py-3 text-center font-[family-name:var(--font-body)] hidden md:table-cell">
                      {company.contacts_count}
                    </td>
                    <td className="px-4 py-3 text-center font-[family-name:var(--font-body)] hidden md:table-cell">
                      {company.deals_count}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-[family-name:var(--font-body)] hidden lg:table-cell">
                      {formatCurrency(company.won_deals_value)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getHealthBadge(company.health_score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!search && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      {/* Create dialog */}
      <CompanyForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadCompanies}
      />
    </div>
  )
}
