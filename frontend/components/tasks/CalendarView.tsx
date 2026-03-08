"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task, TaskFilters } from "@/types"
import { fetchTasks } from "@/services/tasks"
import { useOrganization } from "@/lib/organization"
import { MonthGrid } from "./MonthGrid"
import { WeekGrid } from "./WeekGrid"

type CalendarMode = "week" | "month"

interface CalendarViewProps {
  filters: TaskFilters
  onTaskClick: (task: Task) => void
  onCreateTask: (prefilledDate?: string, prefilledTime?: string) => void
}

function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const start = new Date(year, month, 1 - startOffset)
  const end = new Date(year, month + 1, 0)
  end.setDate(end.getDate() + (42 - (startOffset + end.getDate())))
  return {
    start: start.toISOString(),
    end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
  }
}

function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay()
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday.toISOString(), end: sunday.toISOString() }
}

function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" }).format(date)
}

function formatWeekRange(date: Date, locale: string): string {
  const day = date.getDay()
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" })
  return `${fmt.format(monday)} - ${fmt.format(sunday)}`
}

export function CalendarView({ filters, onTaskClick, onCreateTask }: CalendarViewProps) {
  const { orgVersion } = useOrganization()
  const t = useTranslations('tasks')
  const locale = useLocale()
  const [mode, setMode] = useState<CalendarMode>("month")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const range = mode === "month" ? getMonthRange(currentDate) : getWeekRange(currentDate)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const calendarFilters: TaskFilters = {
        ...filters,
        due_date_gte: range.start,
        due_date_lte: range.end,
      }
      delete calendarFilters.page
      delete calendarFilters.due_date
      const data = await fetchTasks(calendarFilters)
      setTasks(data.results)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters), range.start, range.end, orgVersion])

  useEffect(() => { loadTasks() }, [loadTasks])

  const navigate = (direction: -1 | 1) => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      if (mode === "month") {
        next.setMonth(next.getMonth() + direction)
      } else {
        next.setDate(next.getDate() + direction * 7)
      }
      return next
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const handleDateClick = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    onCreateTask(dateStr)
  }

  const handleSlotClick = (date: Date, hour?: number) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const timeStr = hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : undefined
    onCreateTask(dateStr, timeStr)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            {t('calendar.today')}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold tracking-tight capitalize ml-2">
            {mode === "month" ? formatMonthYear(currentDate, locale) : formatWeekRange(currentDate, locale)}
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMode("week")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "week" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('calendar.week')}
          </button>
          <button
            onClick={() => setMode("month")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === "month" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t('calendar.month')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : mode === "month" ? (
        <MonthGrid currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onDateClick={handleDateClick} />
      ) : (
        <WeekGrid currentDate={currentDate} tasks={tasks} onTaskClick={onTaskClick} onSlotClick={handleSlotClick} />
      )}
    </div>
  )
}
