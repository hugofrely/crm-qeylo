"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import Cookies from "js-cookie"
import type { Organization } from "@/types/organization"
import { fetchOrganizations, createOrganization as createOrgApi } from "@/services/organizations"

interface OrganizationContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  orgVersion: number
  switchOrganization: (orgId: string) => void
  createOrganization: (name: string) => Promise<Organization>
  loading: boolean
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [orgVersion, setOrgVersion] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations()
      .then((orgs) => {
        setOrganizations(orgs)
        const savedId = Cookies.get("organization_id")
        const saved = orgs.find((o) => o.id === savedId)
        const selected = saved || orgs[0] || null
        setCurrentOrganization(selected)
        if (selected) Cookies.set("organization_id", selected.id, { expires: 365 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const switchOrganization = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId)
      if (org) {
        setCurrentOrganization(org)
        Cookies.set("organization_id", org.id, { expires: 365 })
        setOrgVersion((v) => v + 1)
      }
    },
    [organizations]
  )

  const createOrganization = useCallback(async (name: string) => {
    const org = await createOrgApi(name)
    setOrganizations((prev) => [...prev, org])
    setCurrentOrganization(org)
    Cookies.set("organization_id", org.id, { expires: 365 })
    setOrgVersion((v) => v + 1)
    return org
  }, [])

  return (
    <OrganizationContext.Provider
      value={{ organizations, currentOrganization, orgVersion, switchOrganization, createOrganization, loading }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) throw new Error("useOrganization must be used within OrganizationProvider")
  return context
}
