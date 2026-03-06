"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { fetchContact as fetchContactApi, updateContact, deleteContact as deleteContactApi, fetchContactCategories, fetchCustomFieldDefinitions, checkEmailAccount, fetchContactTimeline, fetchContactTasks, fetchContactDeals } from "@/services/contacts"
import { restoreItems } from "@/services/trash"
import { toast } from "sonner"
import { fetchPipelineStages } from "@/services/deals"
import { updateTask as updateTaskApi } from "@/services/tasks"
import type { Contact, ContactCategory, CustomFieldDefinition, TimelineEntry, Task, Deal, Stage } from "@/types"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Mail,
  Loader2,
  FileText,
  Target,
  Briefcase,
  Clock,
  MessageCircle,
  Plus,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ActivityDialog } from "@/components/activities/ActivityDialog"
import { ComposeEmailDialog } from "@/components/emails/ComposeEmailDialog"

import { ContactHeader } from "@/components/contacts/ContactHeader"
import { ContactInfo } from "@/components/contacts/ContactInfo"
import { ContactTimeline } from "@/components/contacts/ContactTimeline"
import { ContactNotes } from "@/components/contacts/ContactNotes"
import { ContactTasks } from "@/components/contacts/ContactTasks"
import { ContactDeals } from "@/components/contacts/ContactDeals"

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
  const [stages, setStages] = useState<Stage[]>([])
  const [history, setHistory] = useState<TimelineEntry[]>([])

  // Dialogs
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
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
        fetchContactTimeline(id, "interactions")
          .then(data => {
            setEmails(data.filter(e => e.entry_type === "email_sent" || e.entry_type === "email_received"))
          })
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
      const { categories, ...rest } = editForm
      await updateContact(contact.id, {
        ...rest,
        birthday: (rest.birthday as string) || null,
        estimated_budget: (rest.estimated_budget as string) || null,
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
    try {
      await deleteContactApi(id as string)
      toast("Element supprime", {
        action: {
          label: "Annuler",
          onClick: async () => {
            try {
              await restoreItems("contact", [id])
              toast.success("Element restaure")
            } catch {
              toast.error("Erreur lors de la restauration")
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
          Retour
        </Button>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">Contact introuvable.</p>
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
        <span className="font-[family-name:var(--font-body)] text-sm">Retour aux contacts</span>
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-2">
              <TabsList className="w-full">
                <TabsTrigger value="activities" className="group/tab">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Activites</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="group/tab">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Notes</span>
                </TabsTrigger>
                <TabsTrigger value="emails" className="group/tab">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Emails</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="group/tab">
                  <Target className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Taches</span>
                </TabsTrigger>
                <TabsTrigger value="deals" className="group/tab">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Deals</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="group/tab">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline group-data-[state=active]/tab:inline">Historique</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="activities" className="p-6">
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

            <TabsContent value="emails" className="p-6">
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
                <ContactTimeline entries={emails} />
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="p-6">
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
                <ContactTasks tasks={tasks} onToggle={toggleTaskDone} />
              </div>
            </TabsContent>

            <TabsContent value="deals" className="p-6">
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
                <ContactDeals deals={deals} stages={stages} />
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium font-[family-name:var(--font-body)]">
                    Historique ({history.length})
                  </h2>
                </div>
                <ContactTimeline entries={history} />
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
    </div>
  )
}
