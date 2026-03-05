"use client"

import { useEffect, useState } from "react"
import { fetchOrganizations } from "@/services/organizations"
import { Building2, Loader2 } from "lucide-react"
import MembersSection from "@/components/settings/MembersSection"
import CategoriesManager from "@/components/settings/CategoriesManager"
import CustomFieldsManager from "@/components/settings/CustomFieldsManager"

export default function OrganizationSettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await fetchOrganizations()
        if (orgs.length > 0) setOrgId(orgs[0].id)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [])

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

      {orgId && <MembersSection orgId={orgId} />}

      <CategoriesManager />

      <CustomFieldsManager />
    </div>
  )
}
