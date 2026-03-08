"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Clock, MapPin, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { fetchCalendarAccounts, createMeeting } from "@/services/calendar"
import type { CalendarAccount } from "@/types/calendar"

interface CreateMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId?: string
  contactName?: string
  dealId?: string
  defaultDate?: string
  onSuccess?: () => void
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  dealId,
  defaultDate,
  onSuccess,
}: CreateMeetingDialogProps) {
  const [title, setTitle] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [calendarAccountId, setCalendarAccountId] = useState<string>("")
  const [attendeeEmail, setAttendeeEmail] = useState("")
  const [attendees, setAttendees] = useState<string[]>([])
  const [reminderMinutes, setReminderMinutes] = useState("15")
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      fetchCalendarAccounts()
        .then((accounts) => {
          setCalendarAccounts(accounts)
          // Auto-select the first account if available
          if (accounts.length > 0 && !calendarAccountId) {
            setCalendarAccountId(accounts[0].id)
          }
        })
        .catch(() => setCalendarAccounts([]))

      // Set default start/end times
      const base = defaultDate ? new Date(defaultDate) : new Date()
      if (!defaultDate) {
        base.setMinutes(0, 0, 0)
        base.setHours(base.getHours() + 1)
      } else {
        base.setHours(9, 0, 0, 0)
      }
      const end = new Date(base.getTime() + 60 * 60 * 1000)
      setStartAt(toLocalDatetime(base))
      setEndAt(toLocalDatetime(end))
    }
  }, [open, defaultDate])

  useEffect(() => {
    if (!open) {
      setTitle("")
      setStartAt("")
      setEndAt("")
      setIsAllDay(false)
      setLocation("")
      setDescription("")
      setCalendarAccountId("")
      setAttendeeEmail("")
      setAttendees([])
      setReminderMinutes("15")
      setError("")
    }
  }, [open])

  // Auto-adjust end when start changes
  useEffect(() => {
    if (startAt) {
      const start = new Date(startAt)
      const end = new Date(start.getTime() + 60 * 60 * 1000)
      setEndAt(toLocalDatetime(end))
    }
  }, [startAt])

  function addAttendee() {
    const email = attendeeEmail.trim()
    if (email && !attendees.includes(email)) {
      setAttendees([...attendees, email])
      setAttendeeEmail("")
    }
  }

  function removeAttendee(email: string) {
    setAttendees(attendees.filter((a) => a !== email))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await createMeeting({
        title,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        is_all_day: isAllDay,
        location: location || "",
        description: description || "",
        calendar_account: calendarAccountId || null,
        attendees: attendees.map((email) => ({ email })),
        reminder_minutes: Number(reminderMinutes),
        contact: contactId || null,
        deal: dealId || null,
      })
      toast.success("Meeting créé avec succès")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      setError("Erreur lors de la création du meeting.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nouveau meeting
          </DialogTitle>
          <DialogDescription>
            {contactName
              ? `Planifier un meeting avec ${contactName}`
              : "Planifier un nouveau meeting"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Titre *</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du meeting"
              required
              disabled={isLoading}
              className="h-11"
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-start" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Début
              </Label>
              <Input
                id="meeting-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Fin
              </Label>
              <Input
                id="meeting-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
          </div>

          {/* All day */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="meeting-all-day"
              checked={isAllDay}
              onCheckedChange={(checked) => setIsAllDay(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="meeting-all-day" className="text-sm font-normal cursor-pointer">
              Journée entière
            </Label>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="meeting-location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Lieu
            </Label>
            <Input
              id="meeting-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lieu ou lien visio"
              disabled={isLoading}
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="meeting-description">Description</Label>
            <Textarea
              id="meeting-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes ou ordre du jour..."
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Calendar Account */}
          {calendarAccounts.length > 0 && (
            <div className="space-y-2">
              <Label>Compte calendrier</Label>
              <Select value={calendarAccountId} onValueChange={setCalendarAccountId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Aucun (meeting local)" />
                </SelectTrigger>
                <SelectContent>
                  {calendarAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.email_address || account.email_account} ({account.provider === "google" ? "Google" : "Outlook"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Attendees */}
          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="flex gap-2">
              <Input
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="email@exemple.com"
                type="email"
                disabled={isLoading}
                className="h-11 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAttendee()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addAttendee}
                disabled={isLoading || !attendeeEmail.trim()}
                className="h-11"
              >
                Ajouter
              </Button>
            </div>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {attendees.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label>Rappel</Label>
            <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes avant</SelectItem>
                <SelectItem value="15">15 minutes avant</SelectItem>
                <SelectItem value="30">30 minutes avant</SelectItem>
                <SelectItem value="60">1 heure avant</SelectItem>
                <SelectItem value="1440">1 jour avant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
