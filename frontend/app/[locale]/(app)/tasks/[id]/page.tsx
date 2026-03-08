"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EntityLink } from "@/components/shared/EntityLink"
import { ContactNotes } from "@/components/contacts/ContactNotes"
import { ContactTimeline } from "@/components/contacts/ContactTimeline"
import { fetchTask, updateTask, deleteTask } from "@/services/tasks"
import { fetchContact, fetchContactTimeline } from "@/services/contacts"
import { fetchDeal, fetchPipelineStages } from "@/services/deals"
import { restoreItems } from "@/services/trash"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useMemberAutocomplete } from "@/hooks/useMemberAutocomplete"
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
  Pencil,
  Search,
  X,
  Users,
} from "lucide-react"
import type { Task, Contact, Deal, Stage, TimelineEntry } from "@/types"
import { CommentSection } from "@/components/collaboration/CommentSection"

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatAmount(amount: string | number, locale: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
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
  const t = useTranslations('tasks')
  const locale = useLocale()
  const id = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [notes, setNotes] = useState<TimelineEntry[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editDescription, setEditDescription] = useState("")
  const [editDueDate, setEditDueDate] = useState("")
  const [editDueTime, setEditDueTime] = useState("")
  const [editPriority, setEditPriority] = useState("normal")
  const [editContactId, setEditContactId] = useState("")
  const [editContactLabel, setEditContactLabel] = useState("")
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([])

  const contactAutocomplete = useContactAutocomplete()
  const memberAutocomplete = useMemberAutocomplete()

  function getPriorityConfig(priority: string) {
    switch (priority) {
      case "high":
        return { label: t('priority.high'), className: "bg-red-100 text-red-700" }
      case "normal":
        return { label: t('priority.normal'), className: "bg-blue-100 text-blue-700" }
      case "low":
        return { label: t('priority.low'), className: "bg-gray-100 text-gray-600" }
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
    if (!window.confirm(t('confirm.delete'))) return
    setDeleting(true)
    try {
      await deleteTask(id)
      toast(t('toast.deleted'), {
        action: {
          label: t('toast.undo'),
          onClick: async () => {
            try {
              await restoreItems("task", [id])
              toast.success(t('toast.restored'))
            } catch {
              toast.error(t('toast.restoreError'))
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

  const startEditing = () => {
    if (!task) return
    setEditDescription(task.description)
    setEditDueDate(task.due_date ? task.due_date.split("T")[0] : "")
    const timeMatch = task.due_date?.match(/T(\d{2}:\d{2})/)
    setEditDueTime(timeMatch && timeMatch[1] !== "23:59" ? timeMatch[1] : "")
    setEditPriority(task.priority)
    setEditContactId(task.contact || "")
    setEditContactLabel(task.contact_name || "")
    setEditAssigneeIds(task.assignees ? task.assignees.map((a) => a.user_id) : [])
    contactAutocomplete.reset()
    memberAutocomplete.reset()
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    contactAutocomplete.reset()
    memberAutocomplete.reset()
  }

  const handleSave = async () => {
    if (!editDescription.trim()) return
    setSaving(true)
    try {
      await updateTask(id, {
        description: editDescription.trim(),
        due_date: editDueDate
          ? new Date(`${editDueDate}T${editDueTime || "23:59"}:00`).toISOString()
          : null,
        priority: editPriority,
        contact: editContactId || null,
        assigned_to: editAssigneeIds,
      })
      setEditing(false)
      const t = await loadTask()
      if (t) {
        // Reload contact/deal if changed
        if (t.contact) {
          fetchContact(t.contact).then(setContact).catch(console.error)
        } else {
          setContact(null)
        }
      }
    } catch (err) {
      console.error("Failed to save task:", err)
    } finally {
      setSaving(false)
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
        <p className="text-muted-foreground">{t('notFound')}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/tasks")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToTasks')}
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
        <span className="text-sm">{t('backToTasks')}</span>
      </Button>

      {/* Task Header */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        {editing ? (
          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">{t('detail.description')}</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t('detail.descriptionPlaceholder')}
              />
            </div>

            {/* Date + Heure + Priorité */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-due-date">{t('detail.dueDateLabel')}</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-due-time">{t('detail.timeLabel')}</Label>
                <Input
                  id="edit-due-time"
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-priority">{t('detail.priorityLabel')}</Label>
                <select
                  id="edit-priority"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="high">{t('priority.high')}</option>
                  <option value="normal">{t('priority.normal')}</option>
                  <option value="low">{t('priority.low')}</option>
                </select>
              </div>
            </div>

            {/* Contact autocomplete */}
            <div className="space-y-1.5">
              <Label>{t('detail.linkedContact')}</Label>
              <div ref={contactAutocomplete.wrapperRef} className="relative">
                {editContactId ? (
                  <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                    <span>{editContactLabel}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditContactId("")
                        setEditContactLabel("")
                        contactAutocomplete.reset()
                      }}
                      className="ml-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={contactAutocomplete.query}
                      onChange={(e) => contactAutocomplete.search(e.target.value)}
                      onFocus={() => {
                        if (contactAutocomplete.results.length > 0) contactAutocomplete.setOpen(true)
                      }}
                      placeholder={t('detail.searchContact')}
                      className="pl-8"
                    />
                    {contactAutocomplete.searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )}
                {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                    {contactAutocomplete.results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setEditContactId(c.id)
                          setEditContactLabel(`${c.first_name} ${c.last_name}`)
                          contactAutocomplete.reset()
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                      >
                        {c.first_name} {c.last_name}
                      </button>
                    ))}
                  </div>
                )}
                {contactAutocomplete.open && contactAutocomplete.query && !contactAutocomplete.searching && contactAutocomplete.results.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                    {t('detail.noContactFound')}
                  </div>
                )}
              </div>
            </div>

            {/* Assignés */}
            <div className="space-y-1.5">
              <Label>{t('detail.assignees')}</Label>
              {editAssigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editAssigneeIds.map((uid) => {
                    const member = memberAutocomplete.allMembers.find((m) => m.user_id === uid)
                    if (!member) return null
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium"
                      >
                        {member.first_name} {member.last_name}
                        <button
                          type="button"
                          onClick={() => setEditAssigneeIds((prev) => prev.filter((i) => i !== uid))}
                          className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div ref={memberAutocomplete.wrapperRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={memberAutocomplete.query}
                    onChange={(e) => memberAutocomplete.search(e.target.value)}
                    onFocus={() => memberAutocomplete.search(memberAutocomplete.query)}
                    placeholder={t('detail.searchMember')}
                    className="pl-8"
                  />
                </div>
                {memberAutocomplete.open && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                    {memberAutocomplete.results
                      .filter((m) => !editAssigneeIds.includes(m.user_id))
                      .map((m) => (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => {
                            setEditAssigneeIds((prev) => [...prev, m.user_id])
                            memberAutocomplete.reset()
                          }}
                          className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                        >
                          {m.first_name} {m.last_name}
                          <span className="ml-auto text-xs text-muted-foreground">{m.email}</span>
                        </button>
                      ))}
                    {memberAutocomplete.results.filter((m) => !editAssigneeIds.includes(m.user_id)).length === 0 && (
                      <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                        {memberAutocomplete.query ? t('detail.noMemberFound') : t('detail.allMembersAssigned')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons Annuler / Enregistrer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                {t('detail.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!editDescription.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('detail.save')}
              </Button>
            </div>
          </div>
        ) : (
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
                  {task.is_done ? t('status.done') : t('status.todo')}
                </Badge>
                {task.due_date && (
                  <div className={`flex items-center gap-1 text-sm ${!task.is_done && isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(task.due_date, locale)}
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
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={startEditing}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
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
                  {t('detail.contact')}
                </h2>
                <EntityLink type="contact" id={contact.id} name={t('detail.viewContact')} className="text-[11px]" />
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
                  {t('detail.deal')}
                </h2>
                <EntityLink type="deal" id={deal.id} name={t('detail.viewDeal')} className="text-[11px]" />
              </div>
              <div className="p-4 space-y-2">
                <p className="font-medium text-sm">{deal.name}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatAmount(deal.amount, locale)}
                </div>
                {stageName && (
                  <Badge variant="secondary" className="text-xs">{stageName}</Badge>
                )}
                {deal.probability != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {t('detail.probability', { value: deal.probability })}
                  </div>
                )}
                {deal.expected_close && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {t('detail.expectedClose', { date: formatDate(deal.expected_close, locale) })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No linked entities */}
          {!contact && !deal && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">{t('detail.noLinkedEntities')}</p>
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
                  <h2 className="text-sm font-semibold">{t('detail.contactNotes')}</h2>
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
                    <h2 className="text-sm font-semibold">{t('detail.recentActivities')}</h2>
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
              <p className="text-sm text-muted-foreground">{t('detail.noContactHint')}</p>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {t('detail.comments')}
              </h2>
            </div>
            <div className="p-4">
              <CommentSection entityType="task" entityId={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
