"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { SearchHeader } from "@/components/SearchHeader"
import { OrganizationProvider } from "@/lib/organization"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <OrganizationProvider>
      <div className="h-screen flex overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <SearchHeader />
          <main className="flex-1 min-h-0 overflow-auto">{children}</main>
        </div>
      </div>
    </OrganizationProvider>
  )
}
