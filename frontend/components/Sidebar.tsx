"use client"

import { useState } from "react"
import Image from "next/image"
import { Link, usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/auth"
import { useOrganization } from "@/lib/organization"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Mail,
  MessageSquare,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  BarChart3,
  Workflow,
  ListFilter,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Check,
  ChevronsUpDown,
  Plus,
  Filter,
  FileBarChart,
  Trash2,
  Zap,
  Calendar,
  Lock,
} from "lucide-react"
import { CreateOrgDialog } from "@/components/organizations/CreateOrgDialog"
import { useOverdueCount } from "@/hooks/useOverdueCount"
import { usePlanGate, type QuotaKey } from "@/contexts/PlanContext"

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { organizations, currentOrganization, switchOrganization } = useOrganization()
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const overdueCount = useOverdueCount()
  const { isFeatureLocked, getQuotaStatus, getQuotaInfo, openUpgradeModal } = usePlanGate()
  const t = useTranslations('sidebar')

  const navigationGroups = [
    {
      label: t('groups.crm'),
      items: [
        { name: t('items.chat'), href: "/chat", icon: MessageSquare, key: "chat" },
        { name: t('items.inbox'), href: "/inbox", icon: Mail, key: "inbox" },
        { name: t('items.contacts'), href: "/contacts", icon: Users, key: "contacts", quota: "contacts" as QuotaKey },
        { name: t('items.companies'), href: "/companies", icon: Building2, key: "companies" },
        { name: t('items.segments'), href: "/segments", icon: ListFilter, key: "segments", feature: "dynamic_segments" },
        { name: t('items.pipeline'), href: "/deals", icon: Kanban, key: "pipeline", quota: "pipelines" as QuotaKey },
        { name: t('items.funnel'), href: "/pipeline/funnel", icon: Filter, key: "funnel", feature: "conversion_funnel" },
      ],
    },
    {
      label: t('groups.management'),
      items: [
        { name: t('items.products'), href: "/products", icon: Package, key: "products", feature: "products_catalog" },
        { name: t('items.tasks'), href: "/tasks", icon: CheckSquare, key: "tasks" },
        { name: t('items.workflows'), href: "/workflows", icon: Workflow, key: "workflows", feature: "workflows" },
        { name: t('items.sequences'), href: "/sequences", icon: Zap, key: "sequences", feature: "workflows" },
        { name: t('items.calendar'), href: "/calendar", icon: Calendar, key: "calendar" },
      ],
    },
    {
      label: t('groups.analytics'),
      items: [
        { name: t('items.dashboard'), href: "/dashboard", icon: BarChart3, key: "dashboard" },
        { name: t('items.reports'), href: "/reports", icon: FileBarChart, key: "reports", feature: "custom_reports" },
      ],
    },
  ]

  const utilityItems = [
    { name: t('trash'), href: "/trash", icon: Trash2 },
  ]

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : t('user')

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-background/80 backdrop-blur-sm border border-border shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col transition-transform duration-300 ease-out lg:relative lg:translate-x-0",
          "bg-[var(--sidebar)] text-[var(--sidebar-foreground)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-2 flex items-center gap-2.5">
          <Image
            src="/images/qeylo-logo.webp"
            alt="Qeylo"
            width={32}
            height={32}
            className="rounded-lg shrink-0"
          />
          <span className="text-lg tracking-tight font-semibold text-[var(--sidebar-foreground)]">Qeylo</span>
        </div>

        {/* Organization switcher */}
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--sidebar-accent)]/50 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] shrink-0">
                  <span className="text-[var(--sidebar-primary-foreground)] text-sm font-bold font-[family-name:var(--font-body)]">
                    {currentOrganization?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <span className="flex-1 truncate text-sm font-medium text-[var(--sidebar-foreground)] font-[family-name:var(--font-body)]">
                  {currentOrganization?.name ?? t('organization')}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--sidebar-foreground)]/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[232px]">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary shrink-0">
                    {org.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === currentOrganization?.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreateOrg(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('createOrganization')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thin separator */}
        <div className="mx-5 h-px bg-[var(--sidebar-border)]" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--sidebar-foreground)]/40 px-3 pt-3 pb-1 font-[family-name:var(--font-body)]">
                {group.label}
              </span>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const locked = item.feature ? isFeatureLocked(item.feature) : false
                const quotaStatus = item.quota ? getQuotaStatus(item.quota) : null
                const quotaInfo = item.quota ? getQuotaInfo(item.quota) : null
                const requiredPlan = item.feature === "api_access" || item.feature === "team_assignment" ? "team" as const : "pro" as const

                if (locked) {
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        openUpgradeModal({
                          type: "feature",
                          feature: item.feature!,
                          requiredPlan,
                        })
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
                        "text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)]/60 hover:bg-[var(--sidebar-accent)]/30"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 opacity-50" />
                      <span className="opacity-50">{item.name}</span>
                      <Lock className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
                      isActive
                        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)] shadow-sm"
                        : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[var(--sidebar-primary)]")} />
                    {item.name}
                    {item.key === "tasks" && overdueCount > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                        {overdueCount}
                      </span>
                    )}
                    {quotaStatus && quotaStatus !== "ok" && quotaInfo && (
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold",
                          quotaStatus === "limit"
                            ? "bg-red-500 text-white"
                            : "bg-amber-500 text-white"
                        )}
                      >
                        {quotaInfo.current}/{quotaInfo.limit}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="mx-5 h-px bg-[var(--sidebar-border)]" />
        <div className="px-3 py-2 space-y-0.5">
          {utilityItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                    : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.name}
              </Link>
            )
          })}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
              pathname.startsWith("/settings")
                ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                : "text-[var(--sidebar-foreground)]/80 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {t('settings')}
          </Link>
        </div>

        {/* User section */}
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-lg bg-[var(--sidebar-accent)]/30 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--sidebar-primary)]/15 text-[var(--sidebar-primary)] text-xs font-semibold shrink-0 font-[family-name:var(--font-body)]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)] font-[family-name:var(--font-body)]">
                {fullName}
              </p>
              <p className="truncate text-[11px] text-[var(--sidebar-foreground)]/60 font-[family-name:var(--font-body)]">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded-md p-1.5 text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
              title={t('logout')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <CreateOrgDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />
    </>
  )
}
