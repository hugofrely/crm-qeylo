"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Copy, Loader2 } from "lucide-react"
import { fetchMembers } from "@/services/organizations"
import { fetchQuotas, bulkUpdateQuotas } from "@/services/deals"
import { toast } from "sonner"
import Link from "next/link"
import { PageHeader } from "@/components/shared/PageHeader"

interface MemberQuota {
  userId: string
  name: string
  targetAmount: string
}

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

export default function QuotasPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStr(new Date()))
  const [memberQuotas, setMemberQuotas] = useState<MemberQuota[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.organization) return
    setLoading(true)
    try {
      const [membersResp, quotas] = await Promise.all([
        fetchMembers(user.organization),
        fetchQuotas(currentMonth),
      ])
      const quotaMap = new Map(quotas.map((q) => [q.user, q]))
      setMemberQuotas(
        membersResp.members.map((m: { id: string; first_name: string; last_name: string }) => {
          const q = quotaMap.get(m.id)
          return {
            userId: m.id,
            name: `${m.first_name} ${m.last_name}`.trim() || "Utilisateur",
            targetAmount: q ? String(q.target_amount) : "",
          }
        })
      )
    } catch (err) {
      console.error("Failed to load quotas:", err)
    } finally {
      setLoading(false)
    }
  }, [user?.organization, currentMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAmountChange = (userId: string, value: string) => {
    setMemberQuotas((prev) =>
      prev.map((mq) => (mq.userId === userId ? { ...mq, targetAmount: value } : mq))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const quotas = memberQuotas
        .filter((mq) => mq.targetAmount !== "")
        .map((mq) => ({
          user: mq.userId,
          month: currentMonth,
          target_amount: parseFloat(mq.targetAmount) || 0,
        }))
      if (quotas.length > 0) {
        await bulkUpdateQuotas(quotas)
      }
      toast.success("Quotas enregistrés")
    } catch (err) {
      console.error("Failed to save quotas:", err)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleCopyPrevious = async () => {
    if (!user?.organization) return
    const prevDate = new Date(currentMonth)
    prevDate.setMonth(prevDate.getMonth() - 1)
    const prevMonth = getMonthStr(prevDate)
    try {
      const prevQuotas = await fetchQuotas(prevMonth)
      const prevMap = new Map(prevQuotas.map((q) => [q.user, q]))
      setMemberQuotas((prev) =>
        prev.map((mq) => {
          const pq = prevMap.get(mq.userId)
          return pq ? { ...mq, targetAmount: String(pq.target_amount) } : mq
        })
      )
      toast.success("Quotas du mois précédent copiés")
    } catch {
      toast.error("Impossible de charger les quotas précédents")
    }
  }

  const navigateMonth = (direction: number) => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + direction)
    setCurrentMonth(getMonthStr(d))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[900px] mx-auto animate-fade-in-up font-[family-name:var(--font-body)]">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Paramètres
      </Link>

      <PageHeader title="Quotas mensuels" description="Définir les objectifs de vente par commercial" />

      {/* Month navigation */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize min-w-[140px] text-center">
            {formatMonth(currentMonth)}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPrevious} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            Copier le mois précédent
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Commercial</th>
                <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Objectif (€)</th>
              </tr>
            </thead>
            <tbody>
              {memberQuotas.map((mq) => (
                <tr key={mq.userId} className="border-b last:border-0">
                  <td className="py-3 px-4 font-medium">{mq.name}</td>
                  <td className="py-3 px-4">
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={mq.targetAmount}
                      onChange={(e) => handleAmountChange(mq.userId, e.target.value)}
                      placeholder="0"
                      className="h-8 w-40 ml-auto text-right"
                    />
                  </td>
                </tr>
              ))}
              {memberQuotas.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-muted-foreground">
                    Aucun membre trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
