"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { EntityLink } from "@/components/shared/EntityLink"
import { ContactNotes } from "@/components/contacts/ContactNotes"
import { ContactTimeline } from "@/components/contacts/ContactTimeline"
import { fetchTask, updateTask, deleteTask } from "@/services/tasks"
import { fetchContact, fetchContactTimeline } from "@/services/contacts"
import { fetchDeal, fetchPipelineStages } from "@/services/deals"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Calendar,
  User,
  Briefcase,
  Mail,
  Phone,
  Building2,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import type { Task, Contact, Deal, Stage, TimelineEntry } from "@/types"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "high":
      return { label: "Haute", className: "bg-red-100 text-red-700" }
    case "normal":
      return { label: "Normale", className: "bg-blue-100 text-blue-700" }
    case "low":
      return { label: "Basse", className: "bg-gray-100 text-gray-600" }
    default:
      return { label: priority, className: "bg-gray-100 text-gray-600" }
  }
}

function getSegmentConfig(segment: string) {
  switch (segment) {
    case "hot":
      return { label: "Hot", className: "bg-red-100 text-red-700" }
    case "warm":
      return { label: "Warm", className: "bg-amber-100 text-amber-700" }
    case "cold":
      return { label: "Cold", className: "bg-blue-100 text-blue-700" }
    default:
      return { label: segment, className: "bg-gray-100 text-gray-600" }
  }
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [notes, setNotes] = useState<TimelineEntry[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const loadTask = useCallback(async () => {
    try {
      const t = await fetchTask(id)
      setTask(t)
      return t
    } catch (err) {
      console.error("Failed to load task:", err)
      return null
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const t = await loadTask()
      if (!t) {
        setLoading(false)
        return
      }

      const promises: Promise<void>[] = []

      if (t.contact) {
        promises.push(
          fetchContact(t.contact).then((c) => setContact(c)).catch(console.error),
          fetchContactTimeline(t.contact, "journal").then((n) => setNotes(n)).catch(console.error),
          fetchContactTimeline(t.contact, "interactions").then((tl) => setTimeline(tl)).catch(console.error),
        )
      }

      if (t.deal) {
        promises.push(
          fetchDeal(t.deal).then((d) => setDeal(d)).catch(console.error),
          fetchPipelineStages().then((s) => setStages(s)).catch(console.error),
        )
      }

      await Promise.all(promises)
      setLoading(false)
    }
    init()
  }, [loadTask])

  const handleToggle = async () => {
    if (!task) return
    try {
      await updateTask(id, { is_done: !task.is_done })
      await loadTask()
    } catch (err) {
      console.error("Failed to toggle task:", err)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette tache ?")) return
    setDeleting(true)
    try {
      await deleteTask(id)
      toast("Tache supprimee", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreItems("task", [id])
              toast.success("Tache restauree")
            } catch {
              toast.error("Erreur lors de la restauration")
            }
          },
        },
        duration: 5000,
      })
      router.push("/tasks")
    } catch (err) {
      console.error("Failed to delete task:", err)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground">Tache introuvable.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/tasks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux taches
        </Button>
      </div>
    )
  }

  const priorityConfig = getPriorityConfig(task.priority)
  const stageName = deal ? stages.find((s) => s.id === deal.stage)?.name : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up font-[family-name:var(--font-body)]">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/tasks")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Retour aux taches</span>
      </Button>

      {/* Task Header */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.is_done}
            onCheckedChange={handleToggle}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-lg font-semibold ${task.is_done ? "line-through text-muted-foreground" : ""}`}>
              {task.description}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge className={priorityConfig.className}>{priorityConfig.label}</Badge>
              <Badge className={task.is_done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {task.is_done ? "Terminee" : "A faire"}
              </Badge>
              {task.due_date && (
                <div className={`flex items-center gap-1 text-sm ${!task.is_done && isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(task.due_date)}
                </div>
              )}
            </div>
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                {task.assignees.map((a) => (
                  <span
                    key={a.user_id}
                    title={`${a.first_name} ${a.last_name}`}
                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {a.first_name[0]}{a.last_name[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column — Contact & Deal cards */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-6">
          {/* Contact card */}
          {contact && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Contact
                </h2>
                <EntityLink type="contact" id={contact.id} name="Voir le contact" className="text-[11px]" />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-sm">{contact.first_name} {contact.last_name}</p>
                {contact.job_title && (
                  <p className="text-xs text-muted-foreground">{contact.job_title}</p>
                )}
                {contact.company && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {contact.company}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </div>
                )}
                {contact.lead_score && (
                  <Badge className={getSegmentConfig(contact.lead_score).className}>
                    {getSegmentConfig(contact.lead_score).label}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Deal card */}
          {deal && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  Deal
                </h2>
                <EntityLink type="deal" id={deal.id} name="Voir le deal" className="text-[11px]" />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-sm">{deal.name}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatAmount(deal.amount)}
                </div>
                {stageName && (
                  <Badge variant="secondary" className="text-xs">{stageName}</Badge>
                )}
                {deal.probability != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {deal.probability}% de probabilite
                  </div>
                )}
                {deal.expected_close && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Cloture prevue: {formatDate(deal.expected_close)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No linked entities */}
          {!contact && !deal && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun contact ou deal associe a cette tache.</p>
            </div>
          )}
        </div>

        {/* Right column — Notes & Timeline */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {contact && (
            <>
              {/* Notes */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm font-semibold">Notes du contact</h2>
                </div>
                <div className="p-4">
                  <ContactNotes
                    notes={notes}
                    contactId={contact.id}
                    onNoteAdded={async () => {
                      const n = await fetchContactTimeline(contact.id, "journal")
                      setNotes(n)
                    }}
                  />
                </div>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm font-semibold">Activites recentes</h2>
                  </div>
                  <div className="p-4">
                    <ContactTimeline entries={timeline} />
                  </div>
                </div>
              )}
            </>
          )}

          {!contact && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun contact associe — les notes et l&apos;historique s&apos;afficheront ici quand un contact sera lie.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
