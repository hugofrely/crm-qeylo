"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Phone,
  Mail,
  MailOpen,
  Calendar,
  Tag,
} from "lucide-react"
import type {
  ActivityEntryType,
  CallFields,
  EmailSentFields,
  EmailReceivedFields,
  MeetingFields,
  CustomActivityFields,
} from "@/types"

const inputClass = "h-11 bg-secondary/30 border-border/60"
const selectClass =
  "flex h-11 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const textareaClass =
  "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
const labelClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground"

interface ActivityFormProps {
  activeTab: ActivityEntryType
  onTabChange: (tab: ActivityEntryType) => void
  callFields: CallFields
  onCallFieldsChange: (fields: CallFields) => void
  emailSentFields: EmailSentFields
  onEmailSentFieldsChange: (fields: EmailSentFields) => void
  emailReceivedFields: EmailReceivedFields
  onEmailReceivedFieldsChange: (fields: EmailReceivedFields) => void
  meetingFields: MeetingFields
  onMeetingFieldsChange: (fields: MeetingFields) => void
  customFields: CustomActivityFields
  onCustomFieldsChange: (fields: CustomActivityFields) => void
}

export function ActivityForm({
  activeTab,
  onTabChange,
  callFields,
  onCallFieldsChange,
  emailSentFields,
  onEmailSentFieldsChange,
  emailReceivedFields,
  onEmailReceivedFieldsChange,
  meetingFields,
  onMeetingFieldsChange,
  customFields,
  onCustomFieldsChange,
}: ActivityFormProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as ActivityEntryType)}
    >
      <TabsList responsive className="w-full">
        <TabsTrigger value="call" className="gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          <span>Appel</span>
        </TabsTrigger>
        <TabsTrigger value="email_sent" className="gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          <span>Email envoy&eacute;</span>
        </TabsTrigger>
        <TabsTrigger value="email_received" className="gap-1.5">
          <MailOpen className="h-3.5 w-3.5" />
          <span>Email re&ccedil;u</span>
        </TabsTrigger>
        <TabsTrigger value="meeting" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>R&eacute;union</span>
        </TabsTrigger>
        <TabsTrigger value="custom" className="gap-1.5">
          <Tag className="h-3.5 w-3.5" />
          <span>Custom</span>
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
              onChange={(e) => onCallFieldsChange({ ...callFields, direction: e.target.value })}
            >
              <option value="inbound">Entrant</option>
              <option value="outbound">Sortant</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>R&eacute;sultat</Label>
            <select
              className={selectClass}
              value={callFields.outcome}
              onChange={(e) => onCallFieldsChange({ ...callFields, outcome: e.target.value })}
            >
              <option value="answered">R&eacute;pondu</option>
              <option value="voicemail">Messagerie</option>
              <option value="no_answer">Pas de r&eacute;ponse</option>
              <option value="busy">Occup&eacute;</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={labelClass}>Dur&eacute;e (minutes)</Label>
            <Input
              type="number"
              value={callFields.duration_minutes}
              onChange={(e) => onCallFieldsChange({ ...callFields, duration_minutes: e.target.value })}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Num&eacute;ro</Label>
            <Input
              value={callFields.phone_number}
              onChange={(e) => onCallFieldsChange({ ...callFields, phone_number: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Notes</Label>
          <textarea
            className={textareaClass}
            value={callFields.notes}
            onChange={(e) => onCallFieldsChange({ ...callFields, notes: e.target.value })}
          />
        </div>
      </TabsContent>

      {/* Email Sent */}
      <TabsContent value="email_sent" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className={labelClass}>Sujet *</Label>
          <Input
            value={emailSentFields.subject}
            onChange={(e) => onEmailSentFieldsChange({ ...emailSentFields, subject: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Destinataires</Label>
          <Input
            value={emailSentFields.recipients}
            onChange={(e) => onEmailSentFieldsChange({ ...emailSentFields, recipients: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Corps / R&eacute;sum&eacute;</Label>
          <textarea
            className={textareaClass}
            value={emailSentFields.body}
            onChange={(e) => onEmailSentFieldsChange({ ...emailSentFields, body: e.target.value })}
          />
        </div>
      </TabsContent>

      {/* Email Received */}
      <TabsContent value="email_received" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className={labelClass}>Sujet *</Label>
          <Input
            value={emailReceivedFields.subject}
            onChange={(e) => onEmailReceivedFieldsChange({ ...emailReceivedFields, subject: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Exp&eacute;diteur</Label>
          <Input
            value={emailReceivedFields.sender}
            onChange={(e) => onEmailReceivedFieldsChange({ ...emailReceivedFields, sender: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Corps / R&eacute;sum&eacute;</Label>
          <textarea
            className={textareaClass}
            value={emailReceivedFields.body}
            onChange={(e) => onEmailReceivedFieldsChange({ ...emailReceivedFields, body: e.target.value })}
          />
        </div>
      </TabsContent>

      {/* Meeting */}
      <TabsContent value="meeting" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className={labelClass}>Titre *</Label>
          <Input
            value={meetingFields.title}
            onChange={(e) => onMeetingFieldsChange({ ...meetingFields, title: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={labelClass}>Date et heure *</Label>
            <Input
              type="datetime-local"
              value={meetingFields.scheduled_at}
              onChange={(e) => onMeetingFieldsChange({ ...meetingFields, scheduled_at: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Dur&eacute;e (minutes)</Label>
            <Input
              type="number"
              value={meetingFields.duration_minutes}
              onChange={(e) => onMeetingFieldsChange({ ...meetingFields, duration_minutes: e.target.value })}
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
              onChange={(e) => onMeetingFieldsChange({ ...meetingFields, location: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>Participants</Label>
            <Input
              value={meetingFields.participants}
              onChange={(e) => onMeetingFieldsChange({ ...meetingFields, participants: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Notes</Label>
          <textarea
            className={textareaClass}
            value={meetingFields.notes}
            onChange={(e) => onMeetingFieldsChange({ ...meetingFields, notes: e.target.value })}
          />
        </div>
      </TabsContent>

      {/* Custom */}
      <TabsContent value="custom" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label className={labelClass}>Type label *</Label>
          <Input
            value={customFields.custom_type_label}
            onChange={(e) => onCustomFieldsChange({ ...customFields, custom_type_label: e.target.value })}
            placeholder="Déjeuner, Salon, Démo..."
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Description</Label>
          <textarea
            className={textareaClass}
            value={customFields.description}
            onChange={(e) => onCustomFieldsChange({ ...customFields, description: e.target.value })}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
