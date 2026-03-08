"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import {
  fetchSequence,
  updateSequence,
  deleteSequence,
  addSequenceStep,
  updateSequenceStep,
  deleteSequenceStep,
  enrollContacts,
  fetchEnrollments,
  unenrollContact,
} from "@/services/sequences"
import { searchContacts } from "@/services/contacts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Trash2,
  Plus,
  PenLine,
  Mail,
  ClipboardList,
  Users,
  Reply,
  CheckCircle2,
  Zap,
  UserMinus,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import type { Sequence, SequenceStep, SequenceEnrollment } from "@/types/sequences"
import type { ContactSearchResult } from "@/types/contacts"

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  completed: "bg-blue-500/10 text-blue-600",
  replied: "bg-purple-500/10 text-purple-600",
  bounced: "bg-red-500/10 text-red-600",
  opted_out: "bg-muted text-muted-foreground",
  paused: "bg-yellow-500/10 text-yellow-600",
  unenrolled: "bg-muted text-muted-foreground",
}

export default function SequenceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const t = useTranslations("sequences")
  const sequenceId = params.id as string

  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Steps state
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [stepForm, setStepForm] = useState({
    subject: "",
    body_html: "",
    delay_days: 0,
    delay_hours: 0,
    step_type: "email" as "email" | "manual_task",
  })
  const [savingStep, setSavingStep] = useState(false)

  // Enrollments state
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [contactResults, setContactResults] = useState<ContactSearchResult[]>([])
  const [selectedContacts, setSelectedContacts] = useState<ContactSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  const loadSequence = useCallback(async () => {
    try {
      const data = await fetchSequence(sequenceId)
      setSequence(data)
      setName(data.name)
    } catch {
      toast.error(t("detail.notFound"))
      router.push("/sequences")
    } finally {
      setLoading(false)
    }
  }, [sequenceId, router, t])

  const loadEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true)
    try {
      const data = await fetchEnrollments(sequenceId)
      setEnrollments(data)
    } catch {
      console.error("Failed to fetch enrollments")
    } finally {
      setEnrollmentsLoading(false)
    }
  }, [sequenceId])

  useEffect(() => {
    loadSequence()
  }, [loadSequence])

  const handleNameSave = async () => {
    setEditingName(false)
    if (!sequence || name === sequence.name) return
    try {
      const updated = await updateSequence(sequenceId, { name })
      setSequence(updated)
      toast.success(t("detail.nameUpdated"))
    } catch {
      toast.error(t("detail.updateError"))
      setName(sequence.name)
    }
  }

  const handleStatusToggle = async () => {
    if (!sequence) return
    const newStatus =
      sequence.status === "draft" || sequence.status === "paused"
        ? "active"
        : "paused"
    try {
      const updated = await updateSequence(sequenceId, { status: newStatus })
      setSequence(updated)
      toast.success(newStatus === "active" ? t("detail.activated") : t("detail.paused"))
    } catch {
      toast.error(t("detail.statusError"))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSequence(sequenceId)
      toast.success(t("detail.deleted"))
      router.push("/sequences")
    } catch {
      toast.error(t("detail.deleteError"))
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  // Steps handlers
  const resetStepForm = () => {
    setStepForm({ subject: "", body_html: "", delay_days: 0, delay_hours: 0, step_type: "email" })
  }

  const handleAddStep = async () => {
    if (!sequence) return
    setSavingStep(true)
    try {
      const newStep = await addSequenceStep(sequenceId, {
        ...stepForm,
        order: sequence.steps.length + 1,
        body_text: stepForm.body_html.replace(/<[^>]*>/g, ""),
      })
      setSequence({ ...sequence, steps: [...sequence.steps, newStep] })
      setAddingStep(false)
      resetStepForm()
      toast.success(t("detail.stepAdded"))
    } catch {
      toast.error(t("detail.stepAddError"))
    } finally {
      setSavingStep(false)
    }
  }

  const handleEditStep = (step: SequenceStep) => {
    setEditingStepId(step.id)
    setStepForm({
      subject: step.subject,
      body_html: step.body_html,
      delay_days: step.delay_days,
      delay_hours: step.delay_hours,
      step_type: step.step_type,
    })
  }

  const handleSaveStep = async (stepId: string) => {
    if (!sequence) return
    setSavingStep(true)
    try {
      const updated = await updateSequenceStep(sequenceId, stepId, {
        ...stepForm,
        body_text: stepForm.body_html.replace(/<[^>]*>/g, ""),
      })
      setSequence({
        ...sequence,
        steps: sequence.steps.map((s) => (s.id === stepId ? updated : s)),
      })
      setEditingStepId(null)
      resetStepForm()
      toast.success(t("detail.stepUpdated"))
    } catch {
      toast.error(t("detail.stepUpdateError"))
    } finally {
      setSavingStep(false)
    }
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!sequence) return
    try {
      await deleteSequenceStep(sequenceId, stepId)
      setSequence({
        ...sequence,
        steps: sequence.steps.filter((s) => s.id !== stepId),
      })
      toast.success(t("detail.stepDeleted"))
    } catch {
      toast.error(t("detail.stepDeleteError"))
    }
  }

  // Enrollment handlers
  const handleSearchContacts = async (query: string) => {
    setContactSearch(query)
    if (query.length < 2) {
      setContactResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchContacts(query)
      setContactResults(results.filter((r) => !selectedContacts.some((s) => s.id === r.id)))
    } catch {
      console.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  const handleSelectContact = (contact: ContactSearchResult) => {
    setSelectedContacts((prev) => [...prev, contact])
    setContactResults((prev) => prev.filter((c) => c.id !== contact.id))
    setContactSearch("")
  }

  const handleRemoveSelected = (contactId: string) => {
    setSelectedContacts((prev) => prev.filter((c) => c.id !== contactId))
  }

  const handleEnroll = async () => {
    if (selectedContacts.length === 0) return
    setEnrolling(true)
    try {
      const result = await enrollContacts(
        sequenceId,
        selectedContacts.map((c) => c.id)
      )
      toast.success(t("enrollments.enrolledSuccess", { count: result.enrolled_count }))
      setEnrollDialogOpen(false)
      setSelectedContacts([])
      setContactSearch("")
      loadEnrollments()
      loadSequence()
    } catch {
      toast.error(t("enrollments.enrollError"))
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (enrollmentId: string) => {
    try {
      await unenrollContact(enrollmentId)
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId))
      toast.success(t("detail.unenrolled"))
    } catch {
      toast.error(t("detail.unenrollError"))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!sequence) return null

  const sortedSteps = [...sequence.steps].sort((a, b) => a.order - b.order)

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/sequences")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              className="h-9 max-w-[400px] text-lg font-semibold"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
            >
              {name}
              <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(`statusLabels.${sequence.status}` as any) || sequence.status}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sequence.status !== "archived" && (
            <Button variant="outline" size="sm" onClick={handleStatusToggle} className="gap-1.5">
              {sequence.status === "active" ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  {t("detail.pause")}
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  {t("detail.activate")}
                </>
              )}
            </Button>
          )}
          {!confirmDelete ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("detail.confirm")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                {t("detail.cancel")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="steps" onValueChange={(v) => { if (v === "enrollments") loadEnrollments() }}>
        <TabsList>
          <TabsTrigger value="steps">{t("detail.stepsTab")}</TabsTrigger>
          <TabsTrigger value="enrollments">{t("detail.enrollmentsTab")}</TabsTrigger>
        </TabsList>

        {/* Steps tab */}
        <TabsContent value="steps" className="space-y-4 mt-4">
          {sortedSteps.length === 0 && !addingStep && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t("detail.noSteps")}</p>
            </div>
          )}

          {sortedSteps.map((step, index) => (
            <div key={step.id} className="bg-card border border-border rounded-lg p-5">
              {editingStepId === step.id ? (
                <StepForm
                  form={stepForm}
                  onChange={setStepForm}
                  onSave={() => handleSaveStep(step.id)}
                  onCancel={() => { setEditingStepId(null); resetStepForm() }}
                  saving={savingStep}
                />
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        step.step_type === "email"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-orange-500/10 text-orange-600"
                      }`}>
                        {step.step_type === "email" ? (
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {t("detail.email")}</span>
                        ) : (
                          <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> {t("detail.manualTask")}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleEditStep(step)}>
                        <PenLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("detail.afterDelay", {
                      days: step.delay_days,
                      hasHours: step.delay_hours > 0 ? "true" : "false",
                      hours: step.delay_hours,
                    })}
                  </p>
                  {step.subject && (
                    <p className="text-sm font-medium mt-2">{step.subject}</p>
                  )}
                  {step.body_text && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {step.body_text}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {addingStep ? (
            <div className="bg-card border border-border rounded-lg p-5">
              <StepForm
                form={stepForm}
                onChange={setStepForm}
                onSave={handleAddStep}
                onCancel={() => { setAddingStep(false); resetStepForm() }}
                saving={savingStep}
              />
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => { resetStepForm(); setAddingStep(true) }}
              className="gap-2 w-full border-dashed"
            >
              <Plus className="h-4 w-4" />
              {t("detail.addStep")}
            </Button>
          )}
        </TabsContent>

        {/* Enrollments tab */}
        <TabsContent value="enrollments" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: t("enrollments.enrolled"), value: sequence.stats.total_enrolled, icon: Users },
              { label: t("enrollments.active"), value: sequence.stats.active, icon: Play },
              { label: t("enrollments.completed"), value: sequence.stats.completed, icon: CheckCircle2 },
              { label: t("enrollments.replied"), value: sequence.stats.replied, icon: Reply },
              { label: t("enrollments.replyRate"), value: `${sequence.stats.reply_rate.toFixed(1)}%`, icon: Reply },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-lg p-3 text-center">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setEnrollDialogOpen(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {t("enrollments.enrollContacts")}
            </Button>
          </div>

          {enrollmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t("enrollments.noEnrollments")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{enrollment.contact_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{enrollment.contact_email}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      ENROLLMENT_STATUS_COLORS[enrollment.status] || "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t(`enrollments.statusLabels.${enrollment.status}` as any) || enrollment.status}
                  </span>
                  {enrollment.current_step && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t("detail.currentStep")}
                    </span>
                  )}
                  {enrollment.status === "active" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleUnenroll(enrollment.id)}
                      className="shrink-0 text-destructive hover:text-destructive"
                      title={t("detail.unenroll")}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enroll contacts dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("enrollments.enrollDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={contactSearch}
                onChange={(e) => handleSearchContacts(e.target.value)}
                placeholder={t("enrollments.searchPlaceholder")}
                className="h-11 pl-10 bg-secondary/30 border-border/60"
              />
            </div>

            {/* Search results */}
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {contactResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {contactResults.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary/30 transition-colors"
                  >
                    <p className="text-sm font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.email && (
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected contacts */}
            {selectedContacts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("enrollments.selectedCount", { count: selectedContacts.length })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((contact) => (
                    <span
                      key={contact.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {contact.first_name} {contact.last_name}
                      <button
                        onClick={() => handleRemoveSelected(contact.id)}
                        className="hover:text-destructive"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                {t("enrollments.cancel")}
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={enrolling || selectedContacts.length === 0}
              >
                {enrolling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("enrollments.enroll")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Step form component
function StepForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  form: { subject: string; body_html: string; delay_days: number; delay_hours: number; step_type: "email" | "manual_task" }
  onChange: (form: { subject: string; body_html: string; delay_days: number; delay_hours: number; step_type: "email" | "manual_task" }) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const t = useTranslations("sequences.stepForm")

  return (
    <div className="space-y-4 font-[family-name:var(--font-body)]">
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("type")}
        </Label>
        <select
          value={form.step_type}
          onChange={(e) => onChange({ ...form, step_type: e.target.value as "email" | "manual_task" })}
          className="flex h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-1 text-sm"
        >
          <option value="email">{t("email")}</option>
          <option value="manual_task">{t("manualTask")}</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("delayDays")}
          </Label>
          <Input
            type="number"
            min={0}
            value={form.delay_days}
            onChange={(e) => onChange({ ...form, delay_days: parseInt(e.target.value) || 0 })}
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("delayHours")}
          </Label>
          <Input
            type="number"
            min={0}
            max={23}
            value={form.delay_hours}
            onChange={(e) => onChange({ ...form, delay_hours: parseInt(e.target.value) || 0 })}
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("subject")}
        </Label>
        <Input
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
          placeholder={t("subjectPlaceholder")}
          className="h-9 bg-secondary/30 border-border/60"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("content")}
        </Label>
        <textarea
          value={form.body_html}
          onChange={(e) => onChange({ ...form, body_html: e.target.value })}
          placeholder={t("contentPlaceholder")}
          rows={4}
          className="flex w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  )
}
