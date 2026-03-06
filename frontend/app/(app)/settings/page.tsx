"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Users,
  Mail,
  Bell,
  ChevronRight,
  Plug,
  X,
  GitMerge,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { apiFetch } from "@/lib/api"
import { fetchDuplicateSettings, updateDuplicateSettings } from "@/services/contacts"
import type { DuplicateDetectionSettings } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/shared/PageHeader"

export default function SettingsPage() {
  const { user } = useAuth()

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  interface EmailAccount {
    id: string
    provider: "gmail" | "outlook"
    email_address: string
    is_active: boolean
    created_at: string
  }

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [dupSettings, setDupSettings] = useState<DuplicateDetectionSettings | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
  }, [])

  useEffect(() => {
    fetchDuplicateSettings().then(setDupSettings).catch(() => {})
  }, [])

  useEffect(() => {
    const connected = searchParams.get("email_connected")
    const error = searchParams.get("email_error")
    if (connected) {
      toast.success(`Compte ${connected === "gmail" ? "Gmail" : "Outlook"} connecté`)
      apiFetch<EmailAccount[]>("/email/accounts/").then(setEmailAccounts).catch(() => {})
    }
    if (error) {
      toast.error("Erreur lors de la connexion du compte email")
    }
  }, [searchParams])

  const disconnectAccount = async (id: string) => {
    await apiFetch(`/email/accounts/${id}/`, { method: "DELETE" })
    setEmailAccounts((prev) => prev.filter((a) => a.id !== id))
    toast.success("Compte déconnecté")
  }

  const handleDupSettingChange = async (field: string, value: boolean | number) => {
    if (!dupSettings) return
    const updated = { ...dupSettings, [field]: value }
    setDupSettings(updated)
    try {
      await updateDuplicateSettings({ [field]: value })
    } catch {
      toast.error("Erreur lors de la mise à jour")
      // Revert
      fetchDuplicateSettings().then(setDupSettings).catch(() => {})
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <PageHeader title="Paramètres" subtitle="Gérez votre profil et votre configuration" />

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">Profil</h2>
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
                Utilisateur
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nom complet</p>
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Adresse email</p>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email notifications toggle */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div className="font-[family-name:var(--font-body)]">
              <p className="text-sm font-medium">Notifications email</p>
              <p className="text-xs text-muted-foreground">
                Recevoir les rappels et alertes par email
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
      </div>

      {/* Connected email accounts */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">Comptes email connectés</h2>
          <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
            Envoyez des emails directement depuis le CRM
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

          <div className="flex gap-2">
            {!emailAccounts.find((a) => a.provider === "gmail") && (
              <button
                onClick={async () => {
                  try {
                    const data = await apiFetch<{ url: string }>("/email/connect/gmail/")
                    window.location.href = data.url
                  } catch {
                    toast.error("Impossible de lancer la connexion Gmail")
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                <Plug className="h-4 w-4" />
                Connecter Gmail
              </button>
            )}
            {!emailAccounts.find((a) => a.provider === "outlook") && (
              <button
                onClick={async () => {
                  try {
                    const data = await apiFetch<{ url: string }>("/email/connect/outlook/")
                    window.location.href = data.url
                  } catch {
                    toast.error("Impossible de lancer la connexion Outlook")
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 transition-colors"
              >
                <Plug className="h-4 w-4" />
                Connecter Outlook
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate detection settings */}
      {dupSettings && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                <GitMerge className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl tracking-tight">Détection de doublons</h2>
                <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
                  Configurer la détection automatique de contacts en double
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4 font-[family-name:var(--font-body)]">
            {/* Global toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Détection activée</p>
                <p className="text-xs text-muted-foreground">
                  Vérifier les doublons avant chaque création de contact
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
                    Critères de correspondance
                  </p>
                  <div className="space-y-3">
                    {[
                      { key: "match_email", label: "Email", desc: "Correspondance exacte de l'adresse email" },
                      { key: "match_name", label: "Nom et prénom", desc: "Correspondance approximative (tolère les fautes)" },
                      { key: "match_phone", label: "Téléphone", desc: "Correspondance exacte du numéro" },
                      { key: "match_siret", label: "SIRET", desc: "Correspondance exacte du numéro SIRET" },
                      { key: "match_company", label: "Entreprise", desc: "Correspondance approximative du nom" },
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

                {/* Similarity threshold */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Seuil de similarité
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Plus le seuil est bas, plus la détection est sensible (plus de faux positifs)
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
                <p className="text-sm font-medium">Templates d&apos;email</p>
                <p className="text-xs text-muted-foreground">
                  Créer et gérer des modèles d&apos;emails réutilisables
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Link>

      {/* Organization settings link */}
      <Link href="/settings/organization" className="block">
        <div className="rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/8 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="font-[family-name:var(--font-body)]">
                <p className="text-sm font-medium">Organisation</p>
                <p className="text-xs text-muted-foreground">
                  Gérer les membres et invitations
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Link>
    </div>
  )
}
