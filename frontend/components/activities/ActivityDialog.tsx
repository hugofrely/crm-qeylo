"use client"

import { useState } from "react"
import { createActivity } from "@/services/activities"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { ActivityForm } from "./ActivityForm"
import type { ActivityEntryType, CallFields, EmailSentFields, EmailReceivedFields, MeetingFields, CustomActivityFields } from "@/types"

interface ActivityDialogProps {
  contactId: string
  contactEmail?: string
  contactPhone?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
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

function getInitialCustomFields(): CustomActivityFields {
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
  const [activeTab, setActiveTab] = useState<ActivityEntryType>("call")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [callFields, setCallFields] = useState<CallFields>(getInitialCallFields(contactPhone))
  const [emailSentFields, setEmailSentFields] = useState<EmailSentFields>(getInitialEmailSentFields(contactEmail))
  const [emailReceivedFields, setEmailReceivedFields] = useState<EmailReceivedFields>(getInitialEmailReceivedFields(contactEmail))
  const [meetingFields, setMeetingFields] = useState<MeetingFields>(getInitialMeetingFields())
  const [customFields, setCustomFields] = useState<CustomActivityFields>(getInitialCustomFields())

  function resetForm() {
    setActiveTab("call")
    setError(null)
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
    setError(null)
    try {
      const payload = buildPayload()
      await createActivity(payload)
      resetForm()
      onCreated()
      onOpenChange(false)
    } catch (err) {
      setError("Impossible d'enregistrer l'activit\u00e9. V\u00e9rifiez les champs requis.")
      console.error("Failed to create activity:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Logger une activit&eacute;</DialogTitle>
        </DialogHeader>
        <div className="font-[family-name:var(--font-body)]">
          <ActivityForm
            activeTab={activeTab}
            onTabChange={setActiveTab}
            callFields={callFields}
            onCallFieldsChange={setCallFields}
            emailSentFields={emailSentFields}
            onEmailSentFieldsChange={setEmailSentFields}
            emailReceivedFields={emailReceivedFields}
            onEmailReceivedFieldsChange={setEmailReceivedFields}
            meetingFields={meetingFields}
            onMeetingFieldsChange={setMeetingFields}
            customFields={customFields}
            onCustomFieldsChange={setCustomFields}
          />

          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}

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
