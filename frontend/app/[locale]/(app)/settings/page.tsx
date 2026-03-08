"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Bell,
  ChevronRight,
  Plug,
  X,
  Activity,
  GitMerge,
  Target,
  Loader2,
  Globe,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiFetch } from "@/lib/api"
import { fetchOrganizations, fetchMembers } from "@/services/organizations"
import { fetchDuplicateSettings, updateDuplicateSettings } from "@/services/contacts"
import type { DuplicateDetectionSettings } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"
import MembersSection from "@/components/settings/MembersSection"
import CategoriesManager from "@/components/settings/CategoriesManager"
import CustomFieldsManager from "@/components/settings/CustomFieldsManager"
import ReminderSettings from "@/components/settings/ReminderSettings"
import ScoringSettings from "@/components/settings/ScoringSettings"
import RoutingSettings from "@/components/settings/RoutingSettings"
import BillingSection from "@/components/settings/BillingSection"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"

interface EmailAccount {
  id: string
  provider: "gmail" | "outlook"
  email_address: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const t = useTranslations('settings')
  const locale = useLocale()

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  // Personal tab state
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])

  // Organization tab state
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false)
  const [dupSettings, setDupSettings] = useState<DuplicateDetectionSettings | null>(null)

  // Active tab from URL or default
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam === "organisation" ? "organisation" : "personnel")

  // Organisation sub-tab
  const subTabParam = searchParams.get("section")
  const [activeSubTab, setActiveSubTab] = useState(subTabParam === "facturation" ? "facturation" : "parametres")

  useEffect(() => {
    apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
  }, [])

  useEffect(() => {
    const connected = searchParams.get("email_connected")
    const error = searchParams.get("email_error")
    if (connected) {
      const provider = connected === "gmail" ? "Gmail" : "Outlook"
      toast.success(t('emailAccounts.connected', { provider }))
      apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
    }
    if (error) {
      toast.error(t('emailAccounts.connectionError'))
    }
  }, [searchParams, t])

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
        setOrgLoading(false)
      }
    }
    fetchOrg()
  }, [user])

  useEffect(() => {
    fetchDuplicateSettings().then(setDupSettings).catch(() => {})
  }, [])

  useEffect(() => {
    const checkout = searchParams.get("checkout")
    if (checkout === "success") {
      toast.success(t('checkout.success'))
    } else if (checkout === "cancel") {
      toast.info(t('checkout.cancel'))
    }
  }, [searchParams, t])

  const disconnectAccount = async (id: string) => {
    await apiFetch(`/email/accounts/${id}/`, { method: "DELETE" })
    setEmailAccounts((prev) => prev.filter((a) => a.id !== id))
    toast.success(t('emailAccounts.disconnected'))
  }

  const handleDupSettingChange = async (field: string, value: boolean | number) => {
    if (!dupSettings) return
    const updated = { ...dupSettings, [field]: value }
    setDupSettings(updated)
    try {
      await updateDuplicateSettings({ [field]: value })
    } catch {
      toast.error(t('duplicates.updateError'))
      fetchDuplicateSettings().then(setDupSettings).catch(() => {})
    }
  }

  const handleLanguageChange = async (newLocale: string) => {
    try {
      await apiFetch("/accounts/me/", {
        method: "PATCH",
        json: { preferred_language: newLocale },
      })
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
      // Redirect to the same page with the new locale
      const currentPath = window.location.pathname
      // Replace the current locale segment with the new one
      const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`)
      window.location.href = newPath + window.location.search
    } catch {
      // silently fail - the API endpoint might not exist yet
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
      const currentPath = window.location.pathname
      const newPath = currentPath.replace(`/${locale}`, `/${newLocale}`)
      window.location.href = newPath + window.location.search
    }
  }

  return (
    <div className="p-6 sm:p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="personnel" className="flex-1 sm:flex-initial gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.personalPrefix')}</span> {t('tabs.personal')}
          </TabsTrigger>
          <TabsTrigger value="organisation" className="flex-1 sm:flex-initial gap-1.5">
            {t('tabs.organisation')}
          </TabsTrigger>
        </TabsList>

        {/* ═══ PERSONAL TAB ═══ */}
        <TabsContent value="personnel" className="space-y-6 mt-6">
          {/* Profile card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-xl tracking-tight">{t('profile.title')}</h2>
            </div>
            <div className="p-6 space-y-5 font-[family-name:var(--font-body)]">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/8 text-primary text-lg font-semibold">
                  {initials}
                </div>
                <div>
                  <h3 className="text-lg font-medium" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    {user?.first_name} {user?.last_name}
                  </h3>
                  <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                    {t('profile.badge')}
                  </Badge>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('profile.fullName')}</p>
                    <p className="text-sm font-medium">
                      {user?.first_name} {user?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('profile.email')}</p>
                    <p className="text-sm font-medium">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Language selector */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="font-[family-name:var(--font-body)]">
                  <p className="text-sm font-medium">{t('profile.language')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.languageDesc')}
                  </p>
                </div>
              </div>
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">{t('profile.languageFr')}</SelectItem>
                  <SelectItem value="en">{t('profile.languageEn')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email notifications */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Master switch */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="font-[family-name:var(--font-body)]">
                  <p className="text-sm font-medium">{t('notifications.emailNotifications')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('notifications.emailNotificationsDesc')}
                  </p>
                </div>
              </div>
              <Checkbox
                checked={user?.email_notifications ?? true}
                onCheckedChange={async (checked) => {
                  await apiFetch("/auth/me/", {
                    method: "PATCH",
                    json: { email_notifications: !!checked },
                  })
                }}
              />
            </div>

            {/* Per-type toggles */}
            <div className={cn(
              "px-6 py-4 space-y-5 font-[family-name:var(--font-body)] transition-opacity",
              !(user?.email_notifications ?? true) && "opacity-40 pointer-events-none"
            )}>
              {/* Tasks */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.tasks')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_task_reminder" as const, label: t('notifications.taskReminder'), desc: t('notifications.taskReminderDesc') },
                    { field: "email_notify_task_assigned" as const, label: t('notifications.taskAssigned'), desc: t('notifications.taskAssignedDesc') },
                    { field: "email_notify_task_due" as const, label: t('notifications.taskDue'), desc: t('notifications.taskDueDesc') },
                  ]).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Activity */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.activity')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_mention" as const, label: t('notifications.mention'), desc: t('notifications.mentionDesc') },
                    { field: "email_notify_new_comment" as const, label: t('notifications.newComment'), desc: t('notifications.newCommentDesc') },
                    { field: "email_notify_reaction" as const, label: t('notifications.reaction'), desc: t('notifications.reactionDesc') },
                  ]).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* CRM */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.crm')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_deal_update" as const, label: t('notifications.dealUpdate'), desc: t('notifications.dealUpdateDesc') },
                    { field: "email_notify_workflow" as const, label: t('notifications.workflow'), desc: t('notifications.workflowDesc') },
                  ]).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* General */}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                  {t('notifications.categories.general')}
                </p>
                <div className="space-y-3">
                  {([
                    { field: "email_notify_daily_digest" as const, label: t('notifications.dailyDigest'), desc: t('notifications.dailyDigestDesc') },
                    { field: "email_notify_import_complete" as const, label: t('notifications.importComplete'), desc: t('notifications.importCompleteDesc') },
                    { field: "email_notify_invitation" as const, label: t('notifications.invitation'), desc: t('notifications.invitationDesc') },
                  ]).map(({ field, label, desc }) => (
                    <div key={field} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Checkbox
                        checked={user?.[field] ?? true}
                        onCheckedChange={async (checked) => {
                          await apiFetch("/auth/me/", {
                            method: "PATCH",
                            json: { [field]: !!checked },
                          })
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connected email accounts */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-xl tracking-tight">{t('emailAccounts.title')}</h2>
              <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                {t('emailAccounts.subtitle')}
              </p>
            </div>
            <div className="p-6 space-y-4 font-[family-name:var(--font-body)]">
              {emailAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      account.is_active ? "bg-green-500" : "bg-red-500"
                    )} />
                    <div>
                      <p className="text-sm font-medium">
                        {account.provider === "gmail" ? "Gmail" : "Outlook"}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.email_address}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectAccount(account.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                {!emailAccounts.find((a) => a.provider === "gmail") && (
                  <button
                    onClick={async () => {
                      try {
                        const data = await apiFetch<{ url: string }>("/email/connect/gmail/")
                        window.location.href = data.url
                      } catch {
                        toast.error(t('emailAccounts.gmailConnectError'))
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
                  >
                    <Plug className="h-4 w-4" />
                    {t('emailAccounts.connectGmail')}
                  </button>
                )}
                {!emailAccounts.find((a) => a.provider === "outlook") && (
                  <button
                    onClick={async () => {
                      try {
                        const data = await apiFetch<{ url: string }>("/email/connect/outlook/")
                        window.location.href = data.url
                      } catch {
                        toast.error(t('emailAccounts.outlookConnectError'))
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
                  >
                    <Plug className="h-4 w-4" />
                    {t('emailAccounts.connectOutlook')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Usage dashboard link (superuser only) */}
          {user?.is_superuser && (
            <Link href="/settings/ai-usage" className="block">
              <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
                <div className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="font-[family-name:var(--font-body)]">
                      <p className="text-sm font-medium">{t('aiUsage.title')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('aiUsage.subtitle')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          )}
        </TabsContent>

        {/* ═══ ORGANISATION TAB ═══ */}
        <TabsContent value="organisation" className="mt-6">
          {orgLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Sub-tabs: Paramètres / Facturation */}
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList variant="line" className="w-full sm:w-auto mb-6">
                  <TabsTrigger value="parametres" className="flex-1 sm:flex-initial">
                    {t('orgSubTabs.settings')}
                  </TabsTrigger>
                  {isOwnerOrAdmin && (
                    <TabsTrigger value="facturation" className="flex-1 sm:flex-initial">
                      {t('orgSubTabs.billing')}
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* ─── Paramètres sub-tab ─── */}
                <TabsContent value="parametres" className="space-y-6">
                  {orgId && <MembersSection orgId={orgId} />}

                  {orgId && <ReminderSettings orgId={orgId} />}

                  {orgId && <ScoringSettings orgId={orgId} />}

                  {orgId && <RoutingSettings orgId={orgId} />}

                  <CategoriesManager />

                  <CustomFieldsManager />

                  {/* Duplicate detection settings */}
                  {dupSettings && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-6 py-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                            <GitMerge className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl tracking-tight">{t('duplicates.title')}</h2>
                            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                              {t('duplicates.subtitle')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4 font-[family-name:var(--font-body)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t('duplicates.enabled')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('duplicates.enabledDesc')}
                            </p>
                          </div>
                          <Checkbox
                            checked={dupSettings.enabled}
                            onCheckedChange={(checked) => handleDupSettingChange("enabled", !!checked)}
                          />
                        </div>

                        {dupSettings.enabled && (
                          <>
                            <div className="h-px bg-border" />

                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">
                                {t('duplicates.matchCriteria')}
                              </p>
                              <div className="space-y-3">
                                {[
                                  { key: "match_email", label: t('duplicates.matchEmail'), desc: t('duplicates.matchEmailDesc') },
                                  { key: "match_name", label: t('duplicates.matchName'), desc: t('duplicates.matchNameDesc') },
                                  { key: "match_phone", label: t('duplicates.matchPhone'), desc: t('duplicates.matchPhoneDesc') },
                                  { key: "match_siret", label: t('duplicates.matchSiret'), desc: t('duplicates.matchSiretDesc') },
                                  { key: "match_company", label: t('duplicates.matchCompany'), desc: t('duplicates.matchCompanyDesc') },
                                ].map(({ key, label, desc }) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm">{label}</p>
                                      <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                    <Checkbox
                                      checked={dupSettings[key as keyof DuplicateDetectionSettings] as boolean}
                                      onCheckedChange={(checked) => handleDupSettingChange(key, !!checked)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="h-px bg-border" />

                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                                {t('duplicates.similarityThreshold')}
                              </p>
                              <p className="text-xs text-muted-foreground mb-3">
                                {t('duplicates.similarityThresholdDesc')}
                              </p>
                              <div className="flex items-center gap-4">
                                <input
                                  type="range"
                                  min="0.4"
                                  max="0.9"
                                  step="0.1"
                                  value={dupSettings.similarity_threshold}
                                  onChange={(e) => handleDupSettingChange("similarity_threshold", parseFloat(e.target.value))}
                                  className="flex-1 h-2 rounded-full appearance-none bg-secondary cursor-pointer accent-primary"
                                />
                                <span className="text-sm font-medium w-10 text-right">
                                  {dupSettings.similarity_threshold.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email templates link */}
                  <Link href="/settings/email-templates" className="block">
                    <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="font-[family-name:var(--font-body)]">
                            <p className="text-sm font-medium">{t('emailTemplates.title')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('emailTemplates.subtitle')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>

                  {/* Quotas link */}
                  <Link href="/settings/quotas" className="block">
                    <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                            <Target className="h-5 w-5" />
                          </div>
                          <div className="font-[family-name:var(--font-body)]">
                            <p className="text-sm font-medium">{t('quotas.title')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('quotas.subtitle')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                </TabsContent>

                {/* ─── Facturation sub-tab ─── */}
                {isOwnerOrAdmin && (
                  <TabsContent value="facturation" className="space-y-6">
                    {orgId && <BillingSection orgId={orgId} />}
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
