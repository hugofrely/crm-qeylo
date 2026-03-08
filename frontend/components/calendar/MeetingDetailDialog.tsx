"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calendar, Clock, MapPin, User, Loader2, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { updateMeeting, deleteMeeting, fetchCalendarAccounts } from "@/services/calendar"
import type { Meeting, CalendarAccount } from "@/types/calendar"

interface MeetingDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting: Meeting | null
  onUpdated: () => void
}

function toLocalDatetime(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(isoString: string, locale: string): string {
  return new Date(isoString).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MeetingDetailDialog({
  open,
  onOpenChange,
  meeting,
  onUpdated,
}: MeetingDetailDialogProps) {
  const t = useTranslations("calendar.detailDialog")
  const locale = useLocale()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Edit form state
  const [title, setTitle] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [calendarAccountId, setCalendarAccountId] = useState("")
  const [reminderMinutes, setReminderMinutes] = useState("15")
  const [calendarAccounts, setCalendarAccounts] = useState<CalendarAccount[]>([])

  useEffect(() => {
    if (meeting && open) {
      setTitle(meeting.title)
      setStartAt(toLocalDatetime(meeting.start_at))
      setEndAt(toLocalDatetime(meeting.end_at))
      setIsAllDay(meeting.is_all_day)
      setLocation(meeting.location || "")
      setDescription(meeting.description || "")
      setCalendarAccountId(meeting.calendar_account || "")
      setReminderMinutes(String(meeting.reminder_minutes))
      setEditing(false)
    }
  }, [meeting, open])

  useEffect(() => {
    if (editing) {
      fetchCalendarAccounts()
        .then((accounts) => {
          setCalendarAccounts(accounts)
          if (accounts.length > 0 && !calendarAccountId) {
            setCalendarAccountId(accounts[0].id)
          }
        })
        .catch(() => setCalendarAccounts([]))
    }
  }, [editing])

  async function handleSave() {
    if (!meeting) return
    setSaving(true)
    try {
      await updateMeeting(meeting.id, {
        title,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        is_all_day: isAllDay,
        location,
        description,
        calendar_account: calendarAccountId || null,
        reminder_minutes: Number(reminderMinutes),
      })
      toast.success(t("successUpdate"))
      setEditing(false)
      onUpdated()
      onOpenChange(false)
    } catch {
      toast.error(t("errorUpdate"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!meeting) return
    setDeleting(true)
    try {
      await deleteMeeting(meeting.id)
      toast.success(t("successDelete"))
      onUpdated()
      onOpenChange(false)
    } catch {
      toast.error(t("errorDelete"))
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (!meeting) return null

  const syncStatus = meeting.sync_status || "not_synced"
  const syncLabel = t(`syncStatus.${syncStatus as "synced" | "pending" | "failed" | "not_synced"}`)
  const SYNC_COLORS: Record<string, string> = {
    synced: "text-green-600 bg-green-500/10",
    pending: "text-yellow-600 bg-yellow-500/10",
    failed: "text-red-600 bg-red-500/10",
    not_synced: "text-muted-foreground bg-muted",
  }
  const syncColor = SYNC_COLORS[syncStatus] || SYNC_COLORS.not_synced

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {editing ? t("editTitle") : meeting.title}
            </DialogTitle>
          </DialogHeader>

          {editing ? (
            /* ─── Edit Mode ─── */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("titleLabel")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {t("start")}
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="h-11"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {t("end")}
                  </Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="h-11"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAllDay}
                  onCheckedChange={(c) => setIsAllDay(c === true)}
                  disabled={saving}
                />
                <Label className="text-sm font-normal cursor-pointer">{t("allDay")}</Label>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {t("location")}
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("locationPlaceholder")}
                  className="h-11"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("description")}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={saving}
                />
              </div>

              {calendarAccounts.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("calendarAccount")}</Label>
                  <Select value={calendarAccountId} onValueChange={setCalendarAccountId}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("calendarAccountPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {calendarAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.provider === "google" ? "Google" : "Outlook"} Calendar
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("reminder")}</Label>
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t("reminder5")}</SelectItem>
                    <SelectItem value="15">{t("reminder15")}</SelectItem>
                    <SelectItem value="30">{t("reminder30")}</SelectItem>
                    <SelectItem value="60">{t("reminder60")}</SelectItem>
                    <SelectItem value="1440">{t("reminder1440")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={saving || !title.trim()}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* ─── View Mode ─── */
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  {meeting.is_all_day
                    ? t("allDay")
                    : (
                        <>
                          {formatDateTime(meeting.start_at, locale)}
                          <span className="mx-1">&rarr;</span>
                          {formatDateTime(meeting.end_at, locale)}
                        </>
                      )}
                </div>

                {meeting.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {meeting.location}
                  </div>
                )}

                {meeting.contact_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    {meeting.contact_name}
                  </div>
                )}

                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("attendees")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {meeting.attendees.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs"
                        >
                          {a.email || a.address}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {meeting.description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("description")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{meeting.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${syncColor}`}>
                    {syncLabel}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("delete")}
                </Button>
                <Button size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("edit")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription", { title: meeting.title })}
              {meeting.sync_status === "synced" && t("confirmDeleteSynced")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
