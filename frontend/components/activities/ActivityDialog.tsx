"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Phone,
  Mail,
  MailOpen,
  Calendar,
  Tag,
  Loader2,
} from "lucide-react"

interface ActivityDialogProps {
  contactId: string
  contactEmail?: string
  contactPhone?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const inputClass = "h-11 bg-secondary/30 border-border/60"
const selectClass =
  "flex h-11 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const textareaClass =
  "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground"

type EntryType = "call" | "email_sent" | "email_received" | "meeting" | "custom"

interface CallFields {
  direction: string
  duration_minutes: string
  outcome: string
  phone_number: string
  notes: string
}

interface EmailSentFields {
  subject: string
  recipients: string
  body: string
}

interface EmailReceivedFields {
  subject: string
  sender: string
  body: string
}

interface MeetingFields {
  title: string
  scheduled_at: string
  duration_minutes: string
  location: string
  participants: string
  notes: string
}

interface CustomFields {
  custom_type_label: string
  description: string
}

function getInitialCallFields(contactPhone?: string): CallFields {
  return {
    direction: "outbound",
    duration_minutes: "",
    outcome: "answered",
    phone_number: contactPhone || "",
    notes: "",
  }
}

function getInitialEmailSentFields(contactEmail?: string): EmailSentFields {
  return {
    subject: "",
    recipients: contactEmail || "",
    body: "",
  }
}

function getInitialEmailReceivedFields(contactEmail?: string): EmailReceivedFields {
  return {
    subject: "",
    sender: contactEmail || "",
    body: "",
  }
}

function getInitialMeetingFields(): MeetingFields {
  return {
    title: "",
    scheduled_at: "",
    duration_minutes: "",
    location: "",
    participants: "",
    notes: "",
  }
}

function getInitialCustomFields(): CustomFields {
  return {
    custom_type_label: "",
    description: "",
  }
}

export function ActivityDialog({
  contactId,
  contactEmail,
  contactPhone,
  open,
  onOpenChange,
  onCreated,
}: ActivityDialogProps) {
  const [activeTab, setActiveTab] = useState<EntryType>("call")
  const [submitting, setSubmitting] = useState(false)

  const [callFields, setCallFields] = useState<CallFields>(getInitialCallFields(contactPhone))
  const [emailSentFields, setEmailSentFields] = useState<EmailSentFields>(getInitialEmailSentFields(contactEmail))
  const [emailReceivedFields, setEmailReceivedFields] = useState<EmailReceivedFields>(getInitialEmailReceivedFields(contactEmail))
  const [meetingFields, setMeetingFields] = useState<MeetingFields>(getInitialMeetingFields())
  const [customFields, setCustomFields] = useState<CustomFields>(getInitialCustomFields())

  function resetForm() {
    setActiveTab("call")
    setCallFields(getInitialCallFields(contactPhone))
    setEmailSentFields(getInitialEmailSentFields(contactEmail))
    setEmailReceivedFields(getInitialEmailReceivedFields(contactEmail))
    setMeetingFields(getInitialMeetingFields())
    setCustomFields(getInitialCustomFields())
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetForm()
    }
    onOpenChange(value)
  }

  function buildPayload() {
    switch (activeTab) {
      case "call":
        return {
          entry_type: "call" as const,
          contact: contactId,
          subject: callFields.outcome
            ? `Appel ${callFields.direction === "inbound" ? "entrant" : "sortant"}`
            : "Appel",
          content: callFields.notes,
          metadata: {
            direction: callFields.direction,
            duration_minutes: callFields.duration_minutes ? Number(callFields.duration_minutes) : null,
            outcome: callFields.outcome,
            phone_number: callFields.phone_number,
          },
        }
      case "email_sent":
        return {
          entry_type: "email_sent" as const,
          contact: contactId,
          subject: emailSentFields.subject,
          content: emailSentFields.body,
          metadata: {
            subject: emailSentFields.subject,
            recipients: emailSentFields.recipients,
          },
        }
      case "email_received":
        return {
          entry_type: "email_received" as const,
          contact: contactId,
          subject: emailReceivedFields.subject,
          content: emailReceivedFields.body,
          metadata: {
            subject: emailReceivedFields.subject,
            sender: emailReceivedFields.sender,
          },
        }
      case "meeting":
        return {
          entry_type: "meeting" as const,
          contact: contactId,
          subject: meetingFields.title,
          content: meetingFields.notes,
          metadata: {
            title: meetingFields.title,
            scheduled_at: meetingFields.scheduled_at || null,
            duration_minutes: meetingFields.duration_minutes ? Number(meetingFields.duration_minutes) : null,
            location: meetingFields.location,
            participants: meetingFields.participants,
          },
        }
      case "custom":
        return {
          entry_type: "custom" as const,
          contact: contactId,
          subject: customFields.custom_type_label,
          content: customFields.description,
          metadata: {
            custom_type_label: customFields.custom_type_label,
          },
        }
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const payload = buildPayload()
      await apiFetch("/activities/", { method: "POST", json: payload })
      resetForm()
      onCreated()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to create activity:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Logger une activite</DialogTitle>
        </DialogHeader>
        <div className="font-[family-name:var(--font-body)]">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as EntryType)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="call" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Appel
              </TabsTrigger>
              <TabsTrigger value="email_sent" className="gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email envoye
              </TabsTrigger>
              <TabsTrigger value="email_received" className="gap-1.5">
                <MailOpen className="h-3.5 w-3.5" />
                Email recu
              </TabsTrigger>
              <TabsTrigger value="meeting" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Reunion
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Call */}
            <TabsContent value="call" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Direction</Label>
                  <select
                    className={selectClass}
                    value={callFields.direction}
                    onChange={(e) => setCallFields({ ...callFields, direction: e.target.value })}
                  >
                    <option value="inbound">Entrant</option>
                    <option value="outbound">Sortant</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Resultat</Label>
                  <select
                    className={selectClass}
                    value={callFields.outcome}
                    onChange={(e) => setCallFields({ ...callFields, outcome: e.target.value })}
                  >
                    <option value="answered">Repondu</option>
                    <option value="voicemail">Messagerie</option>
                    <option value="no_answer">Pas de reponse</option>
                    <option value="busy">Occupe</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Duree (minutes)</Label>
                  <Input
                    type="number"
                    value={callFields.duration_minutes}
                    onChange={(e) => setCallFields({ ...callFields, duration_minutes: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Numero</Label>
                  <Input
                    value={callFields.phone_number}
                    onChange={(e) => setCallFields({ ...callFields, phone_number: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Notes</Label>
                <textarea
                  className={textareaClass}
                  value={callFields.notes}
                  onChange={(e) => setCallFields({ ...callFields, notes: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Email Sent */}
            <TabsContent value="email_sent" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>Sujet *</Label>
                <Input
                  value={emailSentFields.subject}
                  onChange={(e) => setEmailSentFields({ ...emailSentFields, subject: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Destinataires</Label>
                <Input
                  value={emailSentFields.recipients}
                  onChange={(e) => setEmailSentFields({ ...emailSentFields, recipients: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Corps / Resume</Label>
                <textarea
                  className={textareaClass}
                  value={emailSentFields.body}
                  onChange={(e) => setEmailSentFields({ ...emailSentFields, body: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Email Received */}
            <TabsContent value="email_received" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>Sujet *</Label>
                <Input
                  value={emailReceivedFields.subject}
                  onChange={(e) => setEmailReceivedFields({ ...emailReceivedFields, subject: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Expediteur</Label>
                <Input
                  value={emailReceivedFields.sender}
                  onChange={(e) => setEmailReceivedFields({ ...emailReceivedFields, sender: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Corps / Resume</Label>
                <textarea
                  className={textareaClass}
                  value={emailReceivedFields.body}
                  onChange={(e) => setEmailReceivedFields({ ...emailReceivedFields, body: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Meeting */}
            <TabsContent value="meeting" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>Titre *</Label>
                <Input
                  value={meetingFields.title}
                  onChange={(e) => setMeetingFields({ ...meetingFields, title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Date et heure</Label>
                  <Input
                    type="datetime-local"
                    value={meetingFields.scheduled_at}
                    onChange={(e) => setMeetingFields({ ...meetingFields, scheduled_at: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Duree (minutes)</Label>
                  <Input
                    type="number"
                    value={meetingFields.duration_minutes}
                    onChange={(e) => setMeetingFields({ ...meetingFields, duration_minutes: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Lieu</Label>
                  <Input
                    value={meetingFields.location}
                    onChange={(e) => setMeetingFields({ ...meetingFields, location: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Participants</Label>
                  <Input
                    value={meetingFields.participants}
                    onChange={(e) => setMeetingFields({ ...meetingFields, participants: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Notes</Label>
                <textarea
                  className={textareaClass}
                  value={meetingFields.notes}
                  onChange={(e) => setMeetingFields({ ...meetingFields, notes: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* Custom */}
            <TabsContent value="custom" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label className={labelClass}>Type label *</Label>
                <Input
                  value={customFields.custom_type_label}
                  onChange={(e) => setCustomFields({ ...customFields, custom_type_label: e.target.value })}
                  placeholder="Dejeuner, Salon, Demo..."
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>Description</Label>
                <textarea
                  className={textareaClass}
                  value={customFields.description}
                  onChange={(e) => setCustomFields({ ...customFields, description: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
