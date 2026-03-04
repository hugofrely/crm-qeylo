"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  Pencil,
  Save,
  X,
  Loader2,
  Trash2,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  Linkedin,
  MapPin,
  Briefcase,
  Target,
  Heart,
  Clock,
  Languages,
  Cake,
  Sparkles,
  User,
  Thermometer,
  Wallet,
  MessageCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  source: string
  tags: string[]
  notes: string
  // Profile
  job_title: string
  linkedin_url: string
  website: string
  address: string
  industry: string
  // Qualification
  lead_score: string
  estimated_budget: string | null
  identified_needs: string
  decision_role: string
  // Preferences
  preferred_channel: string
  timezone: string
  language: string
  interests: string[]
  birthday: string | null
  // AI Summary
  ai_summary: string
  ai_summary_updated_at: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatCurrency(value: string | null): string {
  if (!value) return ""
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatBirthday(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function getLeadScoreStyle(score: string) {
  switch (score) {
    case "hot":
      return "bg-rose-100 text-rose-700 border-rose-200"
    case "warm":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "cold":
      return "bg-blue-100 text-blue-700 border-blue-200"
    default:
      return "bg-secondary text-muted-foreground border-border"
  }
}

function getLeadScoreLabel(score: string) {
  switch (score) {
    case "hot":
      return "Chaud"
    case "warm":
      return "Tiede"
    case "cold":
      return "Froid"
    default:
      return score
  }
}

function getDecisionRoleLabel(role: string) {
  switch (role) {
    case "decision_maker":
      return "Decideur"
    case "influencer":
      return "Influenceur"
    case "user":
      return "Utilisateur"
    case "other":
      return "Autre"
    default:
      return role
  }
}

function getChannelLabel(channel: string) {
  switch (channel) {
    case "email":
      return "Email"
    case "phone":
      return "Telephone"
    case "linkedin":
      return "LinkedIn"
    case "other":
      return "Autre"
    default:
      return channel
  }
}

function getTimelineIcon(entryType: string) {
  switch (entryType) {
    case "message":
    case "chat":
      return <MessageSquare className="h-3.5 w-3.5" />
    case "note":
      return <FileText className="h-3.5 w-3.5" />
    case "deal":
      return <DollarSign className="h-3.5 w-3.5" />
    case "call":
      return <Phone className="h-3.5 w-3.5" />
    case "email":
      return <Mail className="h-3.5 w-3.5" />
    case "contact_updated":
      return <Pencil className="h-3.5 w-3.5" />
    default:
      return <Calendar className="h-3.5 w-3.5" />
  }
}

function getTimelineColor(entryType: string) {
  switch (entryType) {
    case "message":
    case "chat":
      return "bg-teal-light text-primary"
    case "note":
      return "bg-warm-light text-warm"
    case "deal":
      return "bg-green-50 text-green-700"
    case "call":
      return "bg-purple-50 text-purple-700"
    case "email":
      return "bg-orange-50 text-orange-700"
    case "contact_updated":
      return "bg-blue-50 text-blue-700"
    default:
      return "bg-secondary text-muted-foreground"
  }
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h3>
  )
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="truncate">{value}</p>
        )}
      </div>
    </div>
  )
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
    job_title: "",
    linkedin_url: "",
    website: "",
    address: "",
    industry: "",
    lead_score: "",
    estimated_budget: "",
    identified_needs: "",
    decision_role: "",
    preferred_channel: "",
    timezone: "",
    language: "",
    interests: [] as string[],
    birthday: "",
  })

  const initFormData = useCallback((data: Contact) => {
    setFormData({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "",
      source: data.source || "",
      notes: data.notes || "",
      job_title: data.job_title || "",
      linkedin_url: data.linkedin_url || "",
      website: data.website || "",
      address: data.address || "",
      industry: data.industry || "",
      lead_score: data.lead_score || "",
      estimated_budget: data.estimated_budget || "",
      identified_needs: data.identified_needs || "",
      decision_role: data.decision_role || "",
      preferred_channel: data.preferred_channel || "",
      timezone: data.timezone || "",
      language: data.language || "",
      interests: data.interests || [],
      birthday: data.birthday || "",
    })
  }, [])

  const fetchContact = useCallback(async () => {
    try {
      const data = await apiFetch<Contact>(`/contacts/${id}/`)
      setContact(data)
      initFormData(data)
    } catch (err) {
      console.error("Failed to fetch contact:", err)
    }
  }, [id, initFormData])

  const fetchTimeline = useCallback(async () => {
    try {
      const data = await apiFetch<TimelineEntry[]>(`/timeline/?contact=${id}`)
      setTimeline(data)
    } catch (err) {
      console.error("Failed to fetch timeline:", err)
    }
  }, [id])

  useEffect(() => {
    Promise.all([fetchContact(), fetchTimeline()]).finally(() =>
      setLoading(false)
    )
  }, [fetchContact, fetchTimeline])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...formData,
        birthday: formData.birthday || null,
        estimated_budget: formData.estimated_budget || null,
      }
      const data = await apiFetch<Contact>(`/contacts/${id}/`, {
        method: "PATCH",
        json: payload,
      })
      setContact(data)
      setEditing(false)
      fetchTimeline()
    } catch (err) {
      console.error("Failed to update contact:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiFetch(`/contacts/${id}/`, { method: "DELETE" })
      router.push("/contacts")
    } catch (err) {
      console.error("Failed to delete contact:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">Contact introuvable.</p>
        </div>
      </div>
    )
  }

  const subtitle = [contact.job_title, contact.company].filter(Boolean).join(" chez ")

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-2 text-muted-foreground -ml-2">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-[family-name:var(--font-body)] text-sm">Retour aux contacts</span>
      </Button>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 flex flex-row items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl tracking-tight">
                {contact.first_name} {contact.last_name}
              </h1>
              {contact.lead_score && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getLeadScoreStyle(contact.lead_score)}`}
                >
                  <Thermometer className="h-3 w-3" />
                  {getLeadScoreLabel(contact.lead_score)}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                {subtitle}
              </p>
            )}
            <p className="text-muted-foreground text-xs mt-1 font-[family-name:var(--font-body)]">
              Cree le {formatDate(contact.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Supprimer le contact</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
                      Etes-vous sur de vouloir supprimer{" "}
                      <strong>{contact.first_name} {contact.last_name}</strong> ?
                      Cette action est irreversible.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Supprimer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    initFormData(contact)
                  }}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      {editing ? (
        <EditMode
          formData={formData}
          setFormData={setFormData}
          contact={contact}
        />
      ) : (
        <ViewMode contact={contact} />
      )}

      {/* AI Summary */}
      {contact.ai_summary && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium tracking-tight">Resume IA</h2>
            </div>
            <p className="text-sm font-[family-name:var(--font-body)] whitespace-pre-wrap leading-relaxed">
              {contact.ai_summary}
            </p>
            {contact.ai_summary_updated_at && (
              <p className="text-xs text-muted-foreground mt-3 font-[family-name:var(--font-body)]">
                Derniere mise a jour : {formatDateTime(contact.ai_summary_updated_at)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">Historique</h2>
        </div>
        <div className="p-6">
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
              Aucune interaction enregistree.
            </p>
          ) : (
            <div className="space-y-0">
              {timeline.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 ${getTimelineColor(entry.entry_type)}`}
                    >
                      {getTimelineIcon(entry.entry_type)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-6 flex-1 min-w-0 font-[family-name:var(--font-body)]">
                    <div className="flex items-baseline justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize font-normal">
                        {entry.entry_type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1.5 whitespace-pre-wrap break-words leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   VIEW MODE
   ────────────────────────────────────────────────────────────── */

function ViewMode({ contact }: { contact: Contact }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Coordonnees */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader>Coordonnees</SectionHeader>
          <div className="space-y-1 font-[family-name:var(--font-body)]">
            <InfoRow
              icon={<Mail className="h-3.5 w-3.5" />}
              label="Email"
              value={contact.email}
            />
            <InfoRow
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Telephone"
              value={contact.phone}
            />
            <InfoRow
              icon={<Linkedin className="h-3.5 w-3.5" />}
              label="LinkedIn"
              value={contact.linkedin_url}
              href={contact.linkedin_url}
            />
            <InfoRow
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Site web"
              value={contact.website}
              href={
                contact.website
                  ? contact.website.startsWith("http")
                    ? contact.website
                    : `https://${contact.website}`
                  : undefined
              }
            />
            <InfoRow
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Adresse"
              value={contact.address}
            />
            {!contact.email && !contact.phone && !contact.linkedin_url && !contact.website && !contact.address && (
              <p className="text-sm text-muted-foreground py-2">Aucune coordonnee renseignee.</p>
            )}
          </div>
        </div>

        {/* Qualification */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader>Qualification</SectionHeader>
          <div className="space-y-3 font-[family-name:var(--font-body)]">
            {contact.lead_score && (
              <div className="flex items-center gap-3 text-sm py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                  <Thermometer className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Score</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getLeadScoreStyle(contact.lead_score)}`}
                  >
                    {getLeadScoreLabel(contact.lead_score)}
                  </span>
                </div>
              </div>
            )}
            {contact.estimated_budget && (
              <InfoRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="Budget estime"
                value={formatCurrency(contact.estimated_budget)}
              />
            )}
            {contact.decision_role && (
              <InfoRow
                icon={<Target className="h-3.5 w-3.5" />}
                label="Role de decision"
                value={getDecisionRoleLabel(contact.decision_role)}
              />
            )}
            {contact.identified_needs && (
              <div className="pt-1">
                <div className="flex items-start gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0 mt-0.5">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">Besoins identifies</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-0.5">{contact.identified_needs}</p>
                  </div>
                </div>
              </div>
            )}
            {!contact.lead_score && !contact.estimated_budget && !contact.decision_role && !contact.identified_needs && (
              <p className="text-sm text-muted-foreground py-2">Aucune qualification renseignee.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="rounded-xl border border-border bg-card p-5">
            <SectionHeader>Notes</SectionHeader>
            <p className="text-sm whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body)]">
              {contact.notes}
            </p>
          </div>
        )}
      </div>

      {/* Right column (1/3) */}
      <div className="space-y-6">
        {/* Profil */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader>Profil</SectionHeader>
          <div className="space-y-1 font-[family-name:var(--font-body)]">
            {contact.industry && (
              <InfoRow
                icon={<Building2 className="h-3.5 w-3.5" />}
                label="Industrie"
                value={contact.industry}
              />
            )}
            {contact.source && (
              <InfoRow
                icon={<Globe className="h-3.5 w-3.5" />}
                label="Source"
                value={contact.source}
              />
            )}
            {contact.tags && contact.tags.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!contact.industry && !contact.source && (!contact.tags || contact.tags.length === 0) && (
              <p className="text-sm text-muted-foreground py-2">Aucune info profil.</p>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-border bg-card p-5">
          <SectionHeader>Preferences</SectionHeader>
          <div className="space-y-3 font-[family-name:var(--font-body)]">
            {contact.preferred_channel && (
              <div className="flex items-center gap-3 text-sm py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Canal prefere</p>
                  <Badge variant="secondary" className="font-normal text-xs mt-0.5">
                    {getChannelLabel(contact.preferred_channel)}
                  </Badge>
                </div>
              </div>
            )}
            {contact.language && (
              <InfoRow
                icon={<Languages className="h-3.5 w-3.5" />}
                label="Langue"
                value={contact.language}
              />
            )}
            {contact.timezone && (
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Fuseau horaire"
                value={contact.timezone}
              />
            )}
            {contact.birthday && (
              <InfoRow
                icon={<Cake className="h-3.5 w-3.5" />}
                label="Anniversaire"
                value={formatBirthday(contact.birthday)}
              />
            )}
            {contact.interests && contact.interests.length > 0 && (
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Heart className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">Centres d&apos;interet</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contact.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="font-normal text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!contact.preferred_channel && !contact.language && !contact.timezone && !contact.birthday && (!contact.interests || contact.interests.length === 0) && (
              <p className="text-sm text-muted-foreground py-2">Aucune preference renseignee.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   EDIT MODE
   ────────────────────────────────────────────────────────────── */

function EditMode({
  formData,
  setFormData,
  contact,
}: {
  formData: {
    first_name: string
    last_name: string
    email: string
    phone: string
    company: string
    source: string
    notes: string
    job_title: string
    linkedin_url: string
    website: string
    address: string
    industry: string
    lead_score: string
    estimated_budget: string
    identified_needs: string
    decision_role: string
    preferred_channel: string
    timezone: string
    language: string
    interests: string[]
    birthday: string
  }
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>
  contact: Contact
}) {
  const inputClass = "h-11 bg-secondary/30 border-border/60"
  const textareaClass =
    "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const selectClass =
    "flex h-11 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

  const update = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader>Identite</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Prenom</Label>
            <Input value={formData.first_name} onChange={(e) => update("first_name", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nom</Label>
            <Input value={formData.last_name} onChange={(e) => update("last_name", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Poste</Label>
            <Input value={formData.job_title} onChange={(e) => update("job_title", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entreprise</Label>
            <Input value={formData.company} onChange={(e) => update("company", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Coordonnees */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader>Coordonnees</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Telephone</Label>
            <Input value={formData.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">LinkedIn</Label>
            <Input value={formData.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Site web</Label>
            <Input value={formData.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Adresse</Label>
            <textarea
              className={textareaClass}
              value={formData.address}
              onChange={(e) => update("address", e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Qualification */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader>Qualification</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</Label>
            <select
              className={selectClass}
              value={formData.lead_score}
              onChange={(e) => update("lead_score", e.target.value)}
            >
              <option value="">-- Aucun --</option>
              <option value="hot">Chaud</option>
              <option value="warm">Tiede</option>
              <option value="cold">Froid</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Budget estime (EUR)</Label>
            <Input
              type="number"
              value={formData.estimated_budget}
              onChange={(e) => update("estimated_budget", e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Role de decision</Label>
            <select
              className={selectClass}
              value={formData.decision_role}
              onChange={(e) => update("decision_role", e.target.value)}
            >
              <option value="">-- Aucun --</option>
              <option value="decision_maker">Decideur</option>
              <option value="influencer">Influenceur</option>
              <option value="user">Utilisateur</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Industrie</Label>
            <Input value={formData.industry} onChange={(e) => update("industry", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Besoins identifies</Label>
            <textarea
              className={textareaClass}
              value={formData.identified_needs}
              onChange={(e) => update("identified_needs", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Profil & Preferences */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader>Profil & Preferences</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source</Label>
            <Input value={formData.source} onChange={(e) => update("source", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Canal prefere</Label>
            <select
              className={selectClass}
              value={formData.preferred_channel}
              onChange={(e) => update("preferred_channel", e.target.value)}
            >
              <option value="">-- Aucun --</option>
              <option value="email">Email</option>
              <option value="phone">Telephone</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Langue</Label>
            <Input value={formData.language} onChange={(e) => update("language", e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fuseau horaire</Label>
            <Input value={formData.timezone} onChange={(e) => update("timezone", e.target.value)} placeholder="Europe/Paris" className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Anniversaire</Label>
            <Input
              type="date"
              value={formData.birthday}
              onChange={(e) => update("birthday", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Interets (separes par des virgules)</Label>
            <Input
              value={formData.interests.join(", ")}
              onChange={(e) =>
                update(
                  "interests",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Tech, Sport, Marketing"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader>Notes</SectionHeader>
        <div className="font-[family-name:var(--font-body)]">
          <textarea
            className={textareaClass}
            value={formData.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {/* AI Summary (read-only even in edit mode) */}
      {contact.ai_summary && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium tracking-tight">Resume IA</h3>
            <Badge variant="outline" className="text-[10px] font-normal ml-auto">
              Lecture seule
            </Badge>
          </div>
          <p className="text-sm font-[family-name:var(--font-body)] whitespace-pre-wrap leading-relaxed">
            {contact.ai_summary}
          </p>
          {contact.ai_summary_updated_at && (
            <p className="text-xs text-muted-foreground mt-3 font-[family-name:var(--font-body)]">
              Derniere mise a jour : {formatDateTime(contact.ai_summary_updated_at)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
