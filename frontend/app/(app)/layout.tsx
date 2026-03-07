"use client"

import { useAuth } from "@/lib/auth"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { SearchHeader } from "@/components/SearchHeader"
import { OrganizationProvider } from "@/lib/organization"
import { QuickCreateFAB } from "@/components/shared/QuickCreateFAB"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isChatPage = pathname === "/chat"

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
      <div className="h-dvh flex overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <SearchHeader />
          <main className="flex-1 min-h-0 overflow-auto bg-background [&>*]:min-h-full">{children}</main>
        </div>
        {!isChatPage && <QuickCreateFAB />}
      </div>
    </OrganizationProvider>
  )
}
