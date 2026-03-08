"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { fetchMeetings } from "@/services/calendar"
import { CreateMeetingDialog } from "@/components/calendar/CreateMeetingDialog"
import { MeetingDetailDialog } from "@/components/calendar/MeetingDetailDialog"
import type { Meeting } from "@/types/calendar"

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

function getMonthDays(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday = 0 in our grid
  let startDayOfWeek = firstDay.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  // Days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }

  // Fill remaining to complete the grid (6 rows)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

function formatTime(isoString: string, locale: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function formatMonthYear(year: number, month: number, locale: string): string {
  const d = new Date(year, month, 1)
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" })
}

export default function CalendarPage() {
  const t = useTranslations("calendar")
  const locale = useLocale()
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])

  const loadMeetings = useCallback(() => {
    const start = days[0].date.toISOString()
    const end = days[days.length - 1].date.toISOString()
    fetchMeetings({ start, end })
      .then(setMeetings)
      .catch(() => setMeetings([]))
  }, [days])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  function openDialogForDate(date: Date) {
    setSelectedDate(date.toISOString())
    setDialogOpen(true)
  }

  function openNewMeeting() {
    setSelectedDate(undefined)
    setDialogOpen(true)
  }

  function getMeetingsForDay(date: Date): Meeting[] {
    return meetings.filter((m) => isSameDay(new Date(m.start_at), date))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[160px] text-center capitalize">
              {formatMonthYear(currentYear, currentMonth, locale)}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            {t("today")}
          </Button>
        </div>
        <Button onClick={openNewMeeting}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newMeeting")}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
          {DAY_KEYS.map((key) => (
            <div
              key={key}
              className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {t(`dayLabels.${key}`)}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
          {days.map((day, index) => {
            const isToday = isSameDay(day.date, today)
            const dayMeetings = getMeetingsForDay(day.date)

            return (
              <div
                key={index}
                className={cn(
                  "bg-background min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-muted/50",
                  isToday && "bg-primary/5 ring-1 ring-primary/20 ring-inset"
                )}
                onClick={() => openDialogForDate(day.date)}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    !day.isCurrentMonth && "text-muted-foreground/40",
                    isToday && "text-primary font-semibold"
                  )}
                >
                  {day.date.getDate()}
                </span>

                <div className="mt-1 space-y-0.5">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <button
                      key={meeting.id}
                      type="button"
                      className="w-full text-left text-xs px-1 py-0.5 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailMeeting(meeting)
                        setDetailOpen(true)
                      }}
                    >
                      {!meeting.is_all_day && (
                        <span className="font-medium">{formatTime(meeting.start_at, locale)} </span>
                      )}
                      {meeting.title}
                    </button>
                  ))}
                  {dayMeetings.length > 3 && (
                    <span className="text-[10px] text-muted-foreground pl-1">
                      {t("moreEvents", { count: dayMeetings.length - 3 })}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <CreateMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate}
        onSuccess={loadMeetings}
      />

      <MeetingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        meeting={detailMeeting}
        onUpdated={loadMeetings}
      />
    </div>
  )
}
