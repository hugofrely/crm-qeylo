"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { fetchContact as fetchContactApi, updateContact, deleteContact as deleteContactApi, fetchContactCategories, fetchCustomFieldDefinitions, checkEmailAccount, fetchContactTimeline, fetchContactTasks, fetchContactDeals } from "@/services/contacts"
import { fetchContactEmails } from "@/services/emails"
import { fetchMeetings } from "@/services/calendar"
import { fetchEnrollments, fetchSequences } from "@/services/sequences"
import type { Email } from "@/types/emails"
import type { Meeting } from "@/types/calendar"
import type { SequenceEnrollment, Sequence } from "@/types/sequences"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import posthog from "posthog-js"
import { fetchPipelineStages } from "@/services/deals"
import { updateTask as updateTaskApi } from "@/services/tasks"
import type { Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, Task, Deal, Stage } from "@/types"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Loader2,
  FileText,
  Target,
  Briefcase,
  Clock,
  MessageCircle,
  Plus,
  Sparkles,
  Phone,
  Calendar,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityDialog } from "@/components/activities/ActivityDialog"
import { ComposeEmailDialog } from "@/components/emails/ComposeEmailDialog"
import { LogCallDialog } from "@/components/calls/LogCallDialog"

import { ContactHeader } from "@/components/contacts/ContactHeader"
import { ContactInfo } from "@/components/contacts/ContactInfo"
import { ContactTimeline } from "@/components/contacts/ContactTimeline"
import { ContactNotes } from "@/components/contacts/ContactNotes"
import { ContactTasks } from "@/components/contacts/ContactTasks"
import { ContactDeals } from "@/components/contacts/ContactDeals"
import { CommentSection } from "@/components/collaboration/CommentSection"

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations("contacts")
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
  const [emails, setEmails] = useState<Email[]>([])
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [history, setHistory] = useState<TimelineEntry[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [enrollmentSequences, setEnrollmentSequences] = useState<Sequence[]>([])

  // Dialogs
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [hasEmailAccount, setHasEmailAccount] = useState(false)

  /* ── Fetch contact ── */
  const fetchContact = useCallback(async () => {
    try {
      const data = await fetchContactApi(id)
      setContact(data)
    } catch (err) {
      console.error("Failed to fetch contact:", err)
    }
  }, [id])

  /* ── Fetch categories + custom field defs (once) ── */
  useEffect(() => {
    fetchContactCategories()
      .then(setAvailableCategories)
      .catch(() => {})
    fetchCustomFieldDefinitions()
      .then(setCustomFieldDefs)
      .catch(() => {})
    checkEmailAccount()
      .then(setHasEmailAccount)
      .catch(() => {})
    fetchPipelineStages()
      .then(setStages)
      .catch(() => {})
  }, [])

  /* ── Initial load ── */
  useEffect(() => {
    fetchContact().finally(() => setLoading(false))
  }, [fetchContact])

  /* ── Fetch meetings & sequence enrollments ── */
  useEffect(() => {
    if (!id) return
    fetchMeetings({ contact: id })
      .then(setMeetings)
      .catch(() => {})
    // Fetch all sequences, then check enrollments for this contact
    fetchSequences()
      .then(async (sequences) => {
        setEnrollmentSequences(sequences)
        const allEnrollments: SequenceEnrollment[] = []
        for (const seq of sequences) {
          try {
            const enrolls = await fetchEnrollments(seq.id, "active")
            const matching = enrolls.filter((e) => e.contact === id)
            allEnrollments.push(...matching)
          } catch {
            // ignore
          }
        }
        setEnrollments(allEnrollments)
      })
      .catch(() => {})
  }, [id])

  /* ── Fetch tab data when tab or contact changes ── */
  const fetchTabData = useCallback(async () => {
    if (!contact) return
    switch (activeTab) {
      case "activities":
        fetchContactTimeline(id, "interactions")
          .then(data => setActivities(data))
          .catch(() => {})
        break
      case "notes":
        fetchContactTimeline(id, "journal")
          .then(data => {
            setNotes(data.filter(e => e.entry_type === "note_added"))
          })
          .catch(() => {})
        break
      case "emails":
        fetchContactEmails(contact.id)
          .then(data => setEmails(data))
          .catch(() => {})
        break
      case "tasks":
        fetchContactTasks(id)
          .then(data => setTasks(data))
          .catch(() => {})
        break
      case "deals":
        fetchContactDeals(id)
          .then(data => setDeals(data))
          .catch(() => {})
        break
      case "history":
        fetchContactTimeline(id, "journal")
          .then(data => {
            setHistory(data.filter(e => e.entry_type === "contact_updated" || e.entry_type === "contact_created"))
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
      await updateContact(contact.id, { category_ids: newIds })
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
      const { categories, _company_entity_name, ...rest } = editForm
      await updateContact(contact.id, {
        ...rest,
        birthday: (rest.birthday as string) || null,
        estimated_budget: (rest.estimated_budget as string) || null,
      })
      posthog.capture("contact_edited")
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
    try {
      await deleteContactApi(id as string)
      posthog.capture("contact_deleted")
      toast(t("toasts.deleted"), {
        action: {
          label: t("toasts.undo"),
          onClick: async () => {
            try {
              await restoreItems("contact", [id])
              toast.success(t("toasts.restored"))
            } catch {
              toast.error(t("toasts.restoreError"))
            }
          },
        },
        duration: 5000,
      })
      router.push("/contacts")
    } catch (err) {
      console.error("Failed to delete contact:", err)
    }
  }

  /* ── Toggle task done ── */
  const toggleTaskDone = async (taskId: string, isDone: boolean) => {
    try {
      await updateTaskApi(taskId, { is_done: isDone })
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
      company_entity: contact.company_entity || null,
      _company_entity_name: contact.company_entity_name || null,
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
      tags: contact.tags || [],
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

  const updateForm = (field: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
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
          {t("detail.back")}
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">{t("detail.notFound")}</p>
        </div>
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-2 text-muted-foreground -ml-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-[family-name:var(--font-body)] text-sm">{t("detail.backToContacts")}</span>
      </Button>

      {/* 2-column layout — stacks on mobile */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[340px] lg:shrink-0 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <ContactHeader
                contact={contact}
                availableCategories={availableCategories}
                editing={true}
                saving={saving}
                hasEmailAccount={hasEmailAccount}
                onToggleEdit={startEditing}
                onSave={handleSave}
                onCancelEdit={() => setEditing(false)}
                onDelete={handleDelete}
                onToggleCategory={toggleCategory}
                onOpenActivityDialog={() => setActivityDialogOpen(true)}
                onOpenEmailDialog={() => setEmailDialogOpen(true)}
                onOpenCallDialog={() => setCallDialogOpen(true)}
              />
              <ContactInfo
                contact={contact}
                editing={true}
                editForm={editForm}
                onEditFormChange={updateForm}
                customFieldDefs={customFieldDefs}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ContactHeader
                  contact={contact}
                  availableCategories={availableCategories}
                  editing={false}
                  saving={saving}
                  hasEmailAccount={hasEmailAccount}
                  onToggleEdit={startEditing}
                  onSave={handleSave}
                  onCancelEdit={() => setEditing(false)}
                  onDelete={handleDelete}
                  onToggleCategory={toggleCategory}
                  onOpenActivityDialog={() => setActivityDialogOpen(true)}
                  onOpenEmailDialog={() => setEmailDialogOpen(true)}
                />
              </div>
              <ContactInfo
                contact={contact}
                editing={false}
                editForm={editForm}
                onEditFormChange={updateForm}
                customFieldDefs={customFieldDefs}
              />
            </div>
          )}
        </div>

        {/* RIGHT PANEL (TABS) */}
        <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-hidden pt-2 w-full">
          {/* Sequence enrollment banner */}
          {enrollments.length > 0 && (
            <div className="mx-4 mt-2 mb-1 px-3 py-2 bg-primary/10 rounded-lg flex items-center gap-2 flex-wrap">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium font-[family-name:var(--font-body)] text-primary">
                {t("detail.sequenceEnrolled")}
              </span>
              {enrollments.map((enrollment) => {
                const seq = enrollmentSequences.find((s) => s.id === enrollment.sequence)
                return (
                  <Badge key={enrollment.id} variant="secondary" className="text-xs">
                    {seq?.name || t("detail.sequenceFallback")}
                  </Badge>
                )
              })}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-2">
              <TabsList responsive className="w-full justify-start overflow-x-auto scrollbar-hide">
                <TabsTrigger value="activities" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{t("tabs.activities")}</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{t("tabs.notes")}</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t("tabs.comments")}</span>
                </TabsTrigger>
                <TabsTrigger value="emails" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{t("tabs.emails")}</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Target className="h-3.5 w-3.5" />
                  <span>{t("tabs.tasks")}</span>
                </TabsTrigger>
                <TabsTrigger value="deals" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{t("tabs.deals")}</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("tabs.history")}</span>
                </TabsTrigger>
                <TabsTrigger value="ai-summary" className="gap-1.5 px-2.5 py-1.5 text-xs shrink-0">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t("tabs.aiSummary")}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="activities" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("tabs.activities")} ({activities.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setActivityDialogOpen(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">{t("actions.logActivity")}</span>
                  </Button>
                </div>
                <ContactTimeline entries={activities} />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-6">
              <ContactNotes
                notes={notes}
                contactId={id}
                onNoteAdded={() => fetchTabData()}
              />
            </TabsContent>

            <TabsContent value="comments" className="p-6">
              <CommentSection entityType="contact" entityId={id} />
            </TabsContent>

            <TabsContent value="emails" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("tabs.emails")} ({emails.length})
                  </h2>
                  {contact.email && hasEmailAccount && (
                    <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="font-[family-name:var(--font-body)]">{t("actions.sendEmail")}</span>
                    </Button>
                  )}
                </div>
                {emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Mail className="h-8 w-8 mb-3" />
                    <p className="text-sm font-[family-name:var(--font-body)]">{t("emptyState.noEmails")}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className="border-b border-border p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => setExpandedEmailId(expandedEmailId === email.id ? null : email.id)}
                      >
                        <div className="flex items-start gap-3">
                          {email.direction === "outbound" ? (
                            <ArrowUpRight className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-medium text-sm truncate ${!email.is_read ? "font-bold" : ""}`}>
                                {email.subject || t("emailNoSubject")}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Intl.DateTimeFormat("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }).format(new Date(email.sent_at))}
                              </span>
                            </div>
                            {expandedEmailId !== email.id && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {email.snippet}
                              </p>
                            )}
                            {expandedEmailId === email.id && (
                              <div
                                className="mt-3 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: email.body_html }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("tabs.tasks")} ({tasks.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/tasks?contact=${id}`)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">{t("actions.createTask")}</span>
                  </Button>
                </div>
                <ContactTasks tasks={tasks} onToggle={toggleTaskDone} />
              </div>
            </TabsContent>

            <TabsContent value="deals" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("tabs.deals")} ({deals.length})
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => router.push("/deals")} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="font-[family-name:var(--font-body)]">{t("actions.viewDeals")}</span>
                  </Button>
                </div>
                <ContactDeals deals={deals} stages={stages} />
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("tabs.history")} ({history.length})
                  </h2>
                </div>
                <ContactTimeline entries={history} />
              </div>
            </TabsContent>

            <TabsContent value="ai-summary" className="p-6">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    {t("aiSummary.title")}
                  </h2>
                </div>
                {contact.ai_summary ? (
                  <div className="bg-primary/5 rounded-xl p-5 space-y-3">
                    <p className="text-sm font-[family-name:var(--font-body)] whitespace-pre-wrap leading-relaxed">
                      {contact.ai_summary}
                    </p>
                    {contact.ai_summary_updated_at && (
                      <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                        {t("aiSummary.lastUpdated", { date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(contact.ai_summary_updated_at)) })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
                    {t("emptyState.noAiSummary")}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
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

      <LogCallDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        contactId={id}
        contactName={contact ? `${contact.first_name} ${contact.last_name}` : undefined}
        onSuccess={() => fetchTabData()}
      />
    </div>
  )
}
