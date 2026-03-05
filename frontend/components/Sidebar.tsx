"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  MessageSquare,
  Users,
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
} from "lucide-react"
import { CreateOrgDialog } from "@/components/organizations/CreateOrgDialog"

const navigation = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Segments", href: "/segments", icon: ListFilter },
  { name: "Pipeline", href: "/deals", icon: Kanban },
  { name: "Produits", href: "/products", icon: Package },
  { name: "Tâches", href: "/tasks", icon: CheckSquare },
  { name: "Workflows", href: "/workflows", icon: Workflow },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { organizations, currentOrganization, switchOrganization } = useOrganization()
  const [showCreateOrg, setShowCreateOrg] = useState(false)

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  const fullName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : "Utilisateur"

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
        {/* Organization switcher */}
        <div className="px-3 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--sidebar-accent)]/50 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] shrink-0">
                  <span className="text-[var(--sidebar-primary-foreground)] text-sm font-bold font-[family-name:var(--font-body)]">
                    {currentOrganization?.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <span className="flex-1 truncate text-sm font-medium text-[var(--sidebar-foreground)] font-[family-name:var(--font-body)]">
                  {currentOrganization?.name ?? "Organisation"}
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
                Créer une organisation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thin separator */}
        <div className="mx-5 h-px bg-[var(--sidebar-border)]" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)] shadow-sm"
                    : "text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
                )}
              >
                <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-[var(--sidebar-primary)]")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="mx-5 h-px bg-[var(--sidebar-border)]" />

        {/* Settings link */}
        <div className="px-3 py-2">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 font-[family-name:var(--font-body)]",
              pathname.startsWith("/settings")
                ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                : "text-[var(--sidebar-foreground)]/60 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]/50"
            )}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            Paramètres
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
              <p className="truncate text-[11px] text-[var(--sidebar-foreground)]/40 font-[family-name:var(--font-body)]">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded-md p-1.5 text-[var(--sidebar-foreground)]/40 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
              title="Se déconnecter"
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
