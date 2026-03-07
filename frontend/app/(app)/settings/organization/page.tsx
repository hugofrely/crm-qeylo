"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { fetchOrganizations, fetchMembers } from "@/services/organizations"
import { useAuth } from "@/lib/auth"
import { Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import MembersSection from "@/components/settings/MembersSection"
import CategoriesManager from "@/components/settings/CategoriesManager"
import CustomFieldsManager from "@/components/settings/CustomFieldsManager"
import ReminderSettings from "@/components/settings/ReminderSettings"
import BillingSection from "@/components/settings/BillingSection"

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false)

  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await fetchOrganizations()
        if (orgs.length > 0) {
          const id = orgs[0].id
          setOrgId(id)

          if (user) {
            const { members } = await fetchMembers(id)
            const currentMember = members.find((m) => m.user_id === user.id)
            if (currentMember && (currentMember.role === "owner" || currentMember.role === "admin")) {
              setIsOwnerOrAdmin(true)
            }
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [user])

  useEffect(() => {
    const checkout = searchParams.get("checkout")
    if (checkout === "success") {
      toast.success("Abonnement active avec succes !")
    } else if (checkout === "cancel") {
      toast.info("Paiement annule.")
    }
  }, [searchParams])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl tracking-tight flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          Organisation
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
          Gérez les membres de votre organisation
        </p>
      </div>

      {orgId && isOwnerOrAdmin && <BillingSection orgId={orgId} />}

      {orgId && <MembersSection orgId={orgId} />}

      {orgId && <ReminderSettings orgId={orgId} />}

      <CategoriesManager />

      <CustomFieldsManager />
    </div>
  )
}
