"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Plus,
  Check,
  MessageSquare,
  Smartphone,
  Twitter,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ActivityDialog } from "@/components/activities/ActivityDialog"
import { ComposeEmailDialog } from "@/components/emails/ComposeEmailDialog"
import { RichTextEditor } from "@/components/ui/RichTextEditor"
import { apiUploadImage } from "@/lib/api"
import { MarkdownContent } from "@/components/chat/MarkdownContent"

/* ──────────────────────────────────────────────────────────────
   INTERFACES
   ────────────────────────────────────────────────────────────── */

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
  // Categories & custom fields
  categories: ContactCategory[]
  custom_fields: Record<string, unknown>
  // Address fields
  city: string
  postal_code: string
  country: string
  state: string
  // Additional contact fields
  secondary_email: string
  secondary_phone: string
  mobile_phone: string
  twitter_url: string
  siret: string
  // AI Summary
  ai_summary: string
  ai_summary_updated_at: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

interface ContactCategory {
  id: string
  name: string
  color: string
  icon: string
  order: number
  is_default: boolean
}

interface CustomFieldDefinition {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
  order: number
  section: string
}

interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  subject: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

interface Task {
  id: string
  description: string
  is_done: boolean
  priority: string
  due_date: string | null
  contact_name: string
  contact: string
}

interface Deal {
  id: string
  name: string
  amount: string
  stage: string
  created_at: string
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
}

/* ──────────────────────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────────────────────── */

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
    case "chat_action":
      return <MessageSquare className="h-3.5 w-3.5" />
    case "note_added":
      return <FileText className="h-3.5 w-3.5" />
    case "deal_created":
    case "deal_moved":
      return <DollarSign className="h-3.5 w-3.5" />
    case "call":
      return <Phone className="h-3.5 w-3.5" />
    case "email_sent":
    case "email_received":
      return <Mail className="h-3.5 w-3.5" />
    case "meeting":
      return <Calendar className="h-3.5 w-3.5" />
    case "contact_updated":
      return <Pencil className="h-3.5 w-3.5" />
    case "custom":
      return <Tag className="h-3.5 w-3.5" />
    default:
      return <Calendar className="h-3.5 w-3.5" />
  }
}

function getTimelineColor(entryType: string) {
  switch (entryType) {
    case "chat_action":
      return "bg-teal-light text-primary"
    case "note_added":
      return "bg-warm-light text-warm"
    case "deal_created":
    case "deal_moved":
      return "bg-green-50 text-green-700"
    case "call":
      return "bg-purple-50 text-purple-700"
    case "email_sent":
    case "email_received":
      return "bg-orange-50 text-orange-700"
    case "meeting":
      return "bg-blue-50 text-blue-700"
    case "contact_updated":
      return "bg-blue-50 text-blue-700"
    case "custom":
      return "bg-secondary text-muted-foreground"
    default:
      return "bg-secondary text-muted-foreground"
  }
}

function getEntryTypeLabel(entryType: string): string {
  const labels: Record<string, string> = {
    contact_created: "Contact cree",
    deal_created: "Deal cree",
    deal_moved: "Deal deplace",
    note_added: "Note",
    task_created: "Tache creee",
    chat_action: "Action chat",
    contact_updated: "Contact modifie",
    call: "Appel",
    email_sent: "Email envoye",
    email_received: "Email recu",
    meeting: "Reunion",
    custom: "Activite",
  }
  return labels[entryType] || entryType
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "high":
      return "bg-rose-100 text-rose-700 border-rose-200"
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-200"
    default:
      return "bg-secondary text-muted-foreground border-border"
  }
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case "high":
      return "Haute"
    case "medium":
      return "Moyenne"
    case "low":
      return "Basse"
    default:
      return priority
  }
}

/* ──────────────────────────────────────────────────────────────
   SMALL COMPONENTS
   ────────────────────────────────────────────────────────────── */

function ActivityMetadata({ entry }: { entry: TimelineEntry }) {
  const meta = entry.metadata as Record<string, unknown>
  if (!meta || Object.keys(meta).length === 0) return null

  const badges: string[] = []

  switch (entry.entry_type) {
    case "call":
      if (meta.direction) badges.push(meta.direction === "inbound" ? "Entrant" : "Sortant")
      if (meta.outcome) {
        const outcomes: Record<string, string> = { answered: "Repondu", voicemail: "Messagerie", no_answer: "Pas de reponse", busy: "Occupe" }
        badges.push(outcomes[meta.outcome as string] || String(meta.outcome))
      }
      if (meta.duration_minutes) badges.push(`${meta.duration_minutes} min`)
      break
    case "email_sent":
    case "email_received":
      if (meta.subject) badges.push(String(meta.subject))
      break
    case "meeting":
      if (meta.scheduled_at) badges.push(formatDateTime(String(meta.scheduled_at)))
      if (meta.location) badges.push(String(meta.location))
      break
    case "custom":
      if (meta.custom_type_label) badges.push(String(meta.custom_type_label))
      break
  }

  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map((badge, i) => (
        <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          {badge}
        </span>
      ))}
    </div>
  )
}

function TimelineList({ entries, emptyMessage }: { entries: TimelineEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 ${getTimelineColor(entry.entry_type)}`}
            >
              {getTimelineIcon(entry.entry_type)}
            </div>
            {index < entries.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[20px]" />
            )}
          </div>
          <div className="pb-6 flex-1 min-w-0 font-[family-name:var(--font-body)]">
            <div className="flex items-baseline justify-between gap-2">
              <Badge variant="outline" className="text-[10px] capitalize font-normal">
                {getEntryTypeLabel(entry.entry_type)}
              </Badge>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDateTime(entry.created_at)}
              </span>
            </div>
            {entry.subject && (
              <p className="text-sm font-medium mt-1">{entry.subject}</p>
            )}
            {entry.content && (
              <div className="mt-1.5 text-sm">
                <MarkdownContent content={entry.content} />
              </div>
            )}
            <ActivityMetadata entry={entry} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   MAIN PAGE COMPONENT
   ────────────────────────────────────────────────────────────── */

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // Contact data
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})

  // Categories and custom fields
  const [availableCategories, setAvailableCategories] = useState<ContactCategory[]>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])

  // Tab state
  const [activeTab, setActiveTab] = useState<string>("activities")

  // Tab data
  const [activities, setActivities] = useState<TimelineEntry[]>([])
  const [notes, setNotes] = useState<TimelineEntry[]>([])
  const [emails, setEmails] = useState<TimelineEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [history, setHistory] = useState<TimelineEntry[]>([])

  // Dialogs
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasEmailAccount, setHasEmailAccount] = useState(false)

  // Note adding
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  /* ── Fetch contact ── */
  const fetchContact = useCallback(async () => {
    try {
      const data = await apiFetch<Contact>(`/contacts/${id}/`)
      setContact(data)
    } catch (err) {
      console.error("Failed to fetch contact:", err)
    }
  }, [id])

  /* ── Fetch categories + custom field defs (once) ── */
  useEffect(() => {
    apiFetch<ContactCategory[]>("/contacts/categories/")
      .then(setAvailableCategories)
      .catch(() => {})
    apiFetch<CustomFieldDefinition[]>("/contacts/custom-fields/")
      .then(setCustomFieldDefs)
      .catch(() => {})
    apiFetch<{ id: string }[]>("/email/accounts/")
      .then((data) => setHasEmailAccount(data.length > 0))
      .catch(() => {})
    apiFetch<PipelineStage[]>("/pipeline-stages/")
      .then(setStages)
      .catch(() => {})
  }, [])

  /* ── Initial load ── */
  useEffect(() => {
    fetchContact().finally(() => setLoading(false))
  }, [fetchContact])

  /* ── Fetch tab data when tab or contact changes ── */
  const fetchTabData = useCallback(async () => {
    if (!contact) return
    switch (activeTab) {
      case "activities":
        apiFetch<TimelineEntry[] | { results: TimelineEntry[] }>(`/timeline/?contact=${id}&type=interactions`)
          .then(data => setActivities(Array.isArray(data) ? data : data.results || []))
          .catch(() => {})
        break
      case "notes":
        apiFetch<TimelineEntry[] | { results: TimelineEntry[] }>(`/timeline/?contact=${id}&type=journal`)
          .then(data => {
            const all = Array.isArray(data) ? data : data.results || []
            setNotes(all.filter(e => e.entry_type === "note_added"))
          })
          .catch(() => {})
        break
      case "emails":
        apiFetch<TimelineEntry[] | { results: TimelineEntry[] }>(`/timeline/?contact=${id}&type=interactions`)
          .then(data => {
            const all = Array.isArray(data) ? data : data.results || []
            setEmails(all.filter(e => e.entry_type === "email_sent" || e.entry_type === "email_received"))
          })
          .catch(() => {})
        break
      case "tasks":
        apiFetch<Task[] | { results: Task[] }>(`/tasks/?contact=${id}`)
          .then(data => setTasks(Array.isArray(data) ? data : data.results || []))
          .catch(() => {})
        break
      case "deals":
        apiFetch<Deal[] | { results: Deal[] }>(`/deals/?contact=${id}`)
          .then(data => setDeals(Array.isArray(data) ? data : data.results || []))
          .catch(() => {})
        break
      case "history":
        apiFetch<TimelineEntry[] | { results: TimelineEntry[] }>(`/timeline/?contact=${id}&type=journal`)
          .then(data => {
            const all = Array.isArray(data) ? data : data.results || []
            setHistory(all.filter(e => e.entry_type === "contact_updated" || e.entry_type === "contact_created"))
          })
          .catch(() => {})
        break
    }
  }, [activeTab, contact, id])

  useEffect(() => {
    fetchTabData()
  }, [fetchTabData])

  /* ── Category toggle ── */
  const toggleCategory = async (categoryId: string) => {
    if (!contact) return
    const currentIds = (contact.categories || []).map((c) => c.id)
    const newIds = currentIds.includes(categoryId)
      ? currentIds.filter((cid) => cid !== categoryId)
      : [...currentIds, categoryId]
    try {
      await apiFetch(`/contacts/${contact.id}/`, {
        method: "PATCH",
        json: { category_ids: newIds },
      })
      fetchContact()
    } catch (err) {
      console.error("Failed to toggle category:", err)
    }
  }

  /* ── Save handler ── */
  const handleSave = async () => {
    if (!contact) return
    setSaving(true)
    try {
      const { categories, ...rest } = editForm
      await apiFetch(`/contacts/${contact.id}/`, {
        method: "PATCH",
        json: {
          ...rest,
          birthday: (rest.birthday as string) || null,
          estimated_budget: (rest.estimated_budget as string) || null,
        },
      })
      setEditing(false)
      fetchContact()
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete handler ── */
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

  /* ── Add note ── */
  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      await apiFetch("/activities/", {
        method: "POST",
        json: {
          entry_type: "note_added",
          contact: id,
          subject: "Note",
          content: newNote.trim(),
          metadata: {},
        },
      })
      setNewNote("")
      fetchTabData()
    } catch (err) {
      console.error("Failed to add note:", err)
    } finally {
      setAddingNote(false)
    }
  }

  /* ── Toggle task done ── */
  const toggleTaskDone = async (task: Task) => {
    try {
      await apiFetch(`/tasks/${task.id}/`, {
        method: "PATCH",
        json: { is_done: !task.is_done },
      })
      fetchTabData()
    } catch (err) {
      console.error("Failed to toggle task:", err)
    }
  }

  /* ── Start editing ── */
  const startEditing = () => {
    if (!contact) return
    setEditForm({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      source: contact.source || "",
      notes: contact.notes || "",
      job_title: contact.job_title || "",
      linkedin_url: contact.linkedin_url || "",
      website: contact.website || "",
      address: contact.address || "",
      industry: contact.industry || "",
      lead_score: contact.lead_score || "",
      estimated_budget: contact.estimated_budget || "",
      identified_needs: contact.identified_needs || "",
      decision_role: contact.decision_role || "",
      preferred_channel: contact.preferred_channel || "",
      timezone: contact.timezone || "",
      language: contact.language || "",
      interests: contact.interests || [],
      birthday: contact.birthday || "",
      category_ids: (contact.categories || []).map((c) => c.id),
      custom_fields: contact.custom_fields || {},
      city: contact.city || "",
      postal_code: contact.postal_code || "",
      country: contact.country || "",
      state: contact.state || "",
      secondary_email: contact.secondary_email || "",
      secondary_phone: contact.secondary_phone || "",
      mobile_phone: contact.mobile_phone || "",
      twitter_url: contact.twitter_url || "",
      siret: contact.siret || "",
    })
    setEditing(true)
  }

  /* ── Get stage name for a deal ── */
  const getStageName = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    return stage?.name || "—"
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ── Not found ── */
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

  /* ── Helper vars ── */
  const inputClass = "h-9 bg-secondary/30 border-border/60"
  const textareaClass =
    "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const selectClass =
    "flex h-9 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"

  const updateForm = (field: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateCustomField = (fieldId: string, value: unknown) => {
    setEditForm((prev) => ({
      ...prev,
      custom_fields: { ...(prev.custom_fields as Record<string, unknown>), [fieldId]: value },
    }))
  }

  /* ── Tab definitions ── */
  const tabs = [
    { key: "activities", label: "Activites", icon: MessageCircle },
    { key: "notes", label: "Notes", icon: FileText },
    { key: "emails", label: "Emails", icon: Mail },
    { key: "tasks", label: "Taches", icon: Target },
    { key: "deals", label: "Deals", icon: Briefcase },
    { key: "history", label: "Historique", icon: Clock },
  ]

  /* ── Helpers for address display ── */
  const addressParts = [contact.address, contact.city, contact.postal_code, contact.state, contact.country].filter(Boolean)
  const fullAddress = addressParts.join(", ")

  /* ── Contact has categories? ── */
  const contactCategoryIds = (contact.categories || []).map((c) => c.id)

  /* ──────────────────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────────────────── */

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-[family-name:var(--font-body)] text-sm">Retour aux contacts</span>
      </Button>

      {/* 2-column layout */}
      <div className="flex gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════════
           LEFT PANEL (~340px)
           ═══════════════════════════════════════════════════════════ */}
        <div className="w-[340px] shrink-0 space-y-4">
          {editing ? (
            /* ── EDIT MODE ── */
            <div className="space-y-4">
              {/* Save / Cancel */}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span className="font-[family-name:var(--font-body)]">Sauvegarder</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="gap-1.5">
                  <X className="h-4 w-4" />
                  <span className="font-[family-name:var(--font-body)]">Annuler</span>
                </Button>
              </div>

              {/* Identity */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className={labelClass}>Identite</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Prenom</Label>
                    <Input value={editForm.first_name as string} onChange={(e) => updateForm("first_name", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Nom</Label>
                    <Input value={editForm.last_name as string} onChange={(e) => updateForm("last_name", e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-[family-name:var(--font-body)]">Entreprise</Label>
                  <Input value={editForm.company as string} onChange={(e) => updateForm("company", e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-[family-name:var(--font-body)]">Poste</Label>
                  <Input value={editForm.job_title as string} onChange={(e) => updateForm("job_title", e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Coordonnees */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className={labelClass}>Coordonnees</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Email</Label>
                    <Input type="email" value={editForm.email as string} onChange={(e) => updateForm("email", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Email secondaire</Label>
                    <Input type="email" value={editForm.secondary_email as string} onChange={(e) => updateForm("secondary_email", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Telephone</Label>
                    <Input value={editForm.phone as string} onChange={(e) => updateForm("phone", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Telephone secondaire</Label>
                    <Input value={editForm.secondary_phone as string} onChange={(e) => updateForm("secondary_phone", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Mobile</Label>
                    <Input value={editForm.mobile_phone as string} onChange={(e) => updateForm("mobile_phone", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Adresse</Label>
                    <Input value={editForm.address as string} onChange={(e) => updateForm("address", e.target.value)} className={inputClass} placeholder="Adresse" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-[family-name:var(--font-body)]">Ville</Label>
                      <Input value={editForm.city as string} onChange={(e) => updateForm("city", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-[family-name:var(--font-body)]">Code postal</Label>
                      <Input value={editForm.postal_code as string} onChange={(e) => updateForm("postal_code", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-[family-name:var(--font-body)]">Region</Label>
                      <Input value={editForm.state as string} onChange={(e) => updateForm("state", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-[family-name:var(--font-body)]">Pays</Label>
                      <Input value={editForm.country as string} onChange={(e) => updateForm("country", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">LinkedIn</Label>
                    <Input value={editForm.linkedin_url as string} onChange={(e) => updateForm("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Site web</Label>
                    <Input value={editForm.website as string} onChange={(e) => updateForm("website", e.target.value)} placeholder="https://..." className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Twitter</Label>
                    <Input value={editForm.twitter_url as string} onChange={(e) => updateForm("twitter_url", e.target.value)} placeholder="https://twitter.com/..." className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Qualification */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className={labelClass}>Qualification</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Score</Label>
                    <select className={selectClass} value={editForm.lead_score as string} onChange={(e) => updateForm("lead_score", e.target.value)}>
                      <option value="">-- Aucun --</option>
                      <option value="hot">Chaud</option>
                      <option value="warm">Tiede</option>
                      <option value="cold">Froid</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Budget estime (EUR)</Label>
                    <Input type="number" value={editForm.estimated_budget as string} onChange={(e) => updateForm("estimated_budget", e.target.value)} placeholder="0" className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Role de decision</Label>
                    <select className={selectClass} value={editForm.decision_role as string} onChange={(e) => updateForm("decision_role", e.target.value)}>
                      <option value="">-- Aucun --</option>
                      <option value="decision_maker">Decideur</option>
                      <option value="influencer">Influenceur</option>
                      <option value="user">Utilisateur</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Besoins identifies</Label>
                    <textarea className={textareaClass} value={editForm.identified_needs as string} onChange={(e) => updateForm("identified_needs", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className={labelClass}>Profil & Preferences</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Source</Label>
                    <Input value={editForm.source as string} onChange={(e) => updateForm("source", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Industrie</Label>
                    <Input value={editForm.industry as string} onChange={(e) => updateForm("industry", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Canal prefere</Label>
                    <select className={selectClass} value={editForm.preferred_channel as string} onChange={(e) => updateForm("preferred_channel", e.target.value)}>
                      <option value="">-- Aucun --</option>
                      <option value="email">Email</option>
                      <option value="phone">Telephone</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Langue</Label>
                    <Input value={editForm.language as string} onChange={(e) => updateForm("language", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Fuseau horaire</Label>
                    <Input value={editForm.timezone as string} onChange={(e) => updateForm("timezone", e.target.value)} placeholder="Europe/Paris" className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Anniversaire</Label>
                    <Input type="date" value={editForm.birthday as string} onChange={(e) => updateForm("birthday", e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">Interets (virgules)</Label>
                    <Input
                      value={(editForm.interests as string[])?.join(", ") || ""}
                      onChange={(e) =>
                        updateForm(
                          "interests",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="Tech, Sport, Marketing"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-[family-name:var(--font-body)]">SIRET</Label>
                    <Input value={editForm.siret as string} onChange={(e) => updateForm("siret", e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className={labelClass}>Notes</h3>
                <textarea className={textareaClass} value={editForm.notes as string} onChange={(e) => updateForm("notes", e.target.value)} rows={4} />
              </div>

              {/* Custom fields */}
              {customFieldDefs.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className={labelClass}>Champs personnalises</h3>
                  <div className="space-y-3">
                    {customFieldDefs.map((def) => {
                      const cfValues = (editForm.custom_fields as Record<string, unknown>) || {}
                      const value = cfValues[def.id] ?? ""

                      return (
                        <div key={def.id} className="space-y-1">
                          <Label className="text-xs font-[family-name:var(--font-body)]">
                            {def.label}{def.is_required ? " *" : ""}
                          </Label>
                          {def.field_type === "long_text" ? (
                            <textarea
                              className={textareaClass}
                              value={value as string}
                              onChange={(e) => updateCustomField(def.id, e.target.value)}
                            />
                          ) : def.field_type === "select" ? (
                            <select
                              className={selectClass}
                              value={value as string}
                              onChange={(e) => updateCustomField(def.id, e.target.value)}
                            >
                              <option value="">-- Choisir --</option>
                              {(def.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : def.field_type === "checkbox" ? (
                            <div className="flex items-center gap-2 pt-1">
                              <Checkbox
                                checked={value === true || value === "true"}
                                onCheckedChange={(checked) => updateCustomField(def.id, checked)}
                              />
                              <span className="text-sm font-[family-name:var(--font-body)]">{def.label}</span>
                            </div>
                          ) : (
                            <Input
                              type={
                                def.field_type === "number" ? "number" :
                                def.field_type === "date" ? "date" :
                                def.field_type === "email" ? "email" :
                                def.field_type === "phone" ? "tel" :
                                def.field_type === "url" ? "url" :
                                "text"
                              }
                              value={value as string}
                              onChange={(e) => updateCustomField(def.id, e.target.value)}
                              className={inputClass}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── VIEW MODE ── */
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Avatar + Name */}
              <div className="text-center space-y-3 p-5 pb-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold mx-auto font-[family-name:var(--font-body)]">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div>
                  <h1 className="text-lg font-semibold font-[family-name:var(--font-body)]">
                    {contact.first_name} {contact.last_name}
                  </h1>
                  {(contact.job_title || contact.company) && (
                    <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                      {contact.job_title}{contact.job_title && contact.company ? " @ " : ""}{contact.company}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1 font-[family-name:var(--font-body)]">
                    Cree le {formatDate(contact.created_at)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {contact.email && hasEmailAccount && (
                    <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="gap-1.5">
                      <Mail className="h-4 w-4" />
                      <span className="font-[family-name:var(--font-body)]">Email</span>
                    </Button>
                  )}
                  {contact.phone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${contact.phone}`} className="gap-1.5">
                        <Phone className="h-4 w-4" />
                        <span className="font-[family-name:var(--font-body)]">Appeler</span>
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
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
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                          {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Supprimer
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Coordonnees */}
              <Separator />
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                  Coordonnees
                </h3>
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contact.email}`} className="truncate text-primary hover:underline">{contact.email}</a>
                    </div>
                  )}
                  {contact.secondary_email && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contact.secondary_email}`} className="truncate text-primary hover:underline">{contact.secondary_email}</a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`tel:${contact.phone}`} className="truncate">{contact.phone}</a>
                    </div>
                  )}
                  {contact.secondary_phone && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{contact.secondary_phone}</span>
                    </div>
                  )}
                  {contact.mobile_phone && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`tel:${contact.mobile_phone}`} className="truncate">{contact.mobile_phone}</a>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{fullAddress}</span>
                    </div>
                  )}
                  {contact.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Linkedin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">LinkedIn</a>
                    </div>
                  )}
                  {contact.website && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{contact.website}</a>
                    </div>
                  )}
                  {contact.twitter_url && (
                    <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                      <Twitter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={contact.twitter_url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">Twitter</a>
                    </div>
                  )}
                  {!contact.email && !contact.phone && !contact.mobile_phone && !fullAddress && !contact.linkedin_url && !contact.website && (
                    <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">Aucune coordonnee renseignee.</p>
                  )}
                </div>
              </div>

              {/* Categories */}
              {availableCategories.length > 0 && (
                <>
                  <Separator />
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                      Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {availableCategories.map((cat) => {
                        const isSelected = contactCategoryIds.includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border font-[family-name:var(--font-body)] ${
                              isSelected
                                ? "border-transparent text-white"
                                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                            }`}
                            style={isSelected ? { backgroundColor: cat.color } : undefined}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                            {cat.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Qualification */}
              {(contact.lead_score || contact.estimated_budget || contact.decision_role || contact.identified_needs) && (
                <>
                  <Separator />
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                      Qualification
                    </h3>
                    <div className="space-y-2">
                      {contact.lead_score && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Thermometer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${getLeadScoreStyle(contact.lead_score)}`}>
                            {getLeadScoreLabel(contact.lead_score)}
                          </span>
                        </div>
                      )}
                      {contact.estimated_budget && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatCurrency(contact.estimated_budget)}</span>
                        </div>
                      )}
                      {contact.decision_role && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{getDecisionRoleLabel(contact.decision_role)}</span>
                        </div>
                      )}
                      {contact.identified_needs && (
                        <div className="flex items-start gap-2 text-sm font-[family-name:var(--font-body)]">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="whitespace-pre-wrap leading-relaxed">{contact.identified_needs}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Profil info */}
              {(contact.industry || contact.source || (contact.tags && contact.tags.length > 0) || contact.preferred_channel || contact.language || contact.timezone || contact.birthday || (contact.interests && contact.interests.length > 0) || contact.siret) && (
                <>
                  <Separator />
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                      Profil
                    </h3>
                    <div className="space-y-2">
                      {contact.industry && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{contact.industry}</span>
                        </div>
                      )}
                      {contact.source && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{contact.source}</span>
                        </div>
                      )}
                      {contact.preferred_channel && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <Badge variant="secondary" className="font-normal text-xs">{getChannelLabel(contact.preferred_channel)}</Badge>
                        </div>
                      )}
                      {contact.language && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Languages className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{contact.language}</span>
                        </div>
                      )}
                      {contact.timezone && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{contact.timezone}</span>
                        </div>
                      )}
                      {contact.birthday && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Cake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{formatBirthday(contact.birthday)}</span>
                        </div>
                      )}
                      {contact.siret && (
                        <div className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">SIRET: {contact.siret}</span>
                        </div>
                      )}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {contact.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="font-normal text-xs font-[family-name:var(--font-body)]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {contact.interests && contact.interests.length > 0 && (
                        <div className="pt-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Heart className="h-3 w-3 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">Centres d&apos;interet</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {contact.interests.map((interest) => (
                              <Badge key={interest} variant="secondary" className="font-normal text-xs font-[family-name:var(--font-body)]">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Custom fields */}
              {customFieldDefs.length > 0 && (() => {
                const cf = contact.custom_fields || {}
                const filledFields = customFieldDefs.filter((def) => {
                  const val = cf[def.id]
                  return val !== undefined && val !== null && val !== ""
                })
                if (filledFields.length === 0) return null
                return (
                  <>
                    <Separator />
                    <div className="p-5 space-y-3">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                        Champs personnalises
                      </h3>
                      <div className="space-y-2">
                        {filledFields.map((def) => {
                          const val = cf[def.id]
                          let displayVal = String(val)
                          if (def.field_type === "checkbox") {
                            displayVal = val === true || val === "true" ? "Oui" : "Non"
                          } else if (def.field_type === "date" && val) {
                            displayVal = formatDate(String(val))
                          }
                          return (
                            <div key={def.id} className="flex items-center gap-2 text-sm font-[family-name:var(--font-body)]">
                              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground text-xs">{def.label}:</span>
                              <span className="truncate">{displayVal}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* Notes */}
              {contact.notes && (
                <>
                  <Separator />
                  <div className="p-5 space-y-3">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                      Notes
                    </h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed font-[family-name:var(--font-body)]">
                      {contact.notes}
                    </p>
                  </div>
                </>
              )}

              {/* AI Summary */}
              {contact.ai_summary && (
                <>
                  <Separator />
                  <div className="bg-primary/5 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                        Resume IA
                      </h3>
                    </div>
                    <p className="text-sm font-[family-name:var(--font-body)] whitespace-pre-wrap leading-relaxed">
                      {contact.ai_summary}
                    </p>
                    {contact.ai_summary_updated_at && (
                      <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                        Derniere mise a jour : {formatDateTime(contact.ai_summary_updated_at)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
           RIGHT PANEL (TABS)
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-border">
            <div className="flex gap-1 px-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors font-[family-name:var(--font-body)] whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {/* ── Activities Tab ── */}
            {activeTab === "activities" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Activites ({activities.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setActivityDialogOpen(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">Logger une activite</span>
                  </Button>
                </div>
                <TimelineList entries={activities} emptyMessage="Aucune activite pour ce contact." />
              </div>
            )}

            {/* ── Notes Tab ── */}
            {activeTab === "notes" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Notes ({notes.length})
                  </h2>
                </div>
                {/* Add note input */}
                <div className="mb-6 space-y-2">
                  <RichTextEditor
                    content={newNote}
                    onChange={setNewNote}
                    placeholder="Ajouter une note..."
                    minHeight="100px"
                    onImageUpload={apiUploadImage}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="gap-1.5">
                      {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span className="font-[family-name:var(--font-body)]">Ajouter</span>
                    </Button>
                  </div>
                </div>
                <TimelineList entries={notes} emptyMessage="Aucune note pour ce contact." />
              </div>
            )}

            {/* ── Emails Tab ── */}
            {activeTab === "emails" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Emails ({emails.length})
                  </h2>
                  {contact.email && hasEmailAccount && (
                    <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="font-[family-name:var(--font-body)]">Envoyer un email</span>
                    </Button>
                  )}
                </div>
                <TimelineList entries={emails} emptyMessage="Aucun email pour ce contact." />
              </div>
            )}

            {/* ── Tasks Tab ── */}
            {activeTab === "tasks" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Taches ({tasks.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/tasks?contact=${id}`)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">Creer une tache</span>
                  </Button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
                    Aucune tache pour ce contact.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 rounded-lg border border-border p-3 transition-colors ${
                          task.is_done ? "opacity-60" : ""
                        }`}
                      >
                        <button
                          onClick={() => toggleTaskDone(task)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            task.is_done
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {task.is_done && <Check className="h-3 w-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-[family-name:var(--font-body)] ${task.is_done ? "line-through" : ""}`}>
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {task.priority && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getPriorityStyle(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)] flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Deals Tab ── */}
            {activeTab === "deals" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Deals ({deals.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => router.push("/deals")} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">Voir les deals</span>
                  </Button>
                </div>
                {deals.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
                    Aucun deal pour ce contact.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deals`}
                        className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium font-[family-name:var(--font-body)] truncate">{deal.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] font-normal font-[family-name:var(--font-body)]">
                              {getStageName(deal.stage)}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)]">
                              {formatDate(deal.created_at)}
                            </span>
                          </div>
                        </div>
                        {deal.amount && (
                          <span className="text-sm font-semibold font-[family-name:var(--font-body)] ml-4 shrink-0">
                            {formatCurrency(deal.amount)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === "history" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Historique ({history.length})
                  </h2>
                </div>
                <TimelineList entries={history} emptyMessage="Aucun historique pour ce contact." />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ActivityDialog
        contactId={id}
        contactEmail={contact.email}
        contactPhone={contact.phone}
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        onCreated={() => fetchTabData()}
      />

      {contact && (
        <ComposeEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          contactId={id}
          contactEmail={contact.email}
          contactName={`${contact.first_name} ${contact.last_name}`}
          onSent={() => fetchTabData()}
        />
      )}
    </div>
  )
}
