"use client"

import { useAuth } from "@/lib/auth"
import { useRouter, usePathname } from "@/i18n/navigation"
import { useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { SearchHeader } from "@/components/SearchHeader"
import { OrganizationProvider } from "@/lib/organization"
import { PlanProvider } from "@/contexts/PlanContext"
import { UpgradeModalWrapper } from "@/components/plan/UpgradeModalWrapper"
import { QuickCreateFAB } from "@/components/shared/QuickCreateFAB"
import { useTranslations } from "next-intl"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isChatPage = pathname.endsWith("/chat")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const t = useTranslations("common")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <OrganizationProvider>
      <PlanProvider>
        <div className="h-dvh flex overflow-hidden bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
            <SearchHeader />
            <main className="flex-1 min-h-0 overflow-auto bg-background [&>*]:min-h-full">{children}</main>
          </div>
          {!isChatPage && <QuickCreateFAB />}
        </div>
        <UpgradeModalWrapper />
      </PlanProvider>
    </OrganizationProvider>
  )
}
