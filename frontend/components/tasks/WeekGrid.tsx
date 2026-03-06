"use client"

import type { Task } from "@/types"
import { CalendarTaskItem } from "./CalendarTaskItem"

interface WeekGridProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onSlotClick: (date: Date, hour?: number) => void
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const START_HOUR = 8
const END_HOUR = 20

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  let mondayOffset = day - 1
  if (mondayOffset < 0) mondayOffset = 6

  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

function isAllDay(task: Task): boolean {
  if (!task.due_date) return true
  const d = new Date(task.due_date)
  return d.getHours() === 23 && d.getMinutes() === 59
}

function formatDayHeader(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date)
}

export function WeekGrid({ currentDate, tasks, onTaskClick, onSlotClick }: WeekGridProps) {
  const weekDays = getWeekDays(currentDate)
  const today = new Date()
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  const tasksByDay = new Map<number, { allDay: Task[]; timed: Map<number, Task[]> }>()
  for (let i = 0; i < 7; i++) {
    tasksByDay.set(i, { allDay: [], timed: new Map() })
  }

  for (const task of tasks) {
    if (!task.due_date) continue
    const d = new Date(task.due_date)
    const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, d))
    if (dayIndex === -1) continue

    const dayData = tasksByDay.get(dayIndex)!
    if (isAllDay(task)) {
      dayData.allDay.push(task)
    } else {
      const hour = d.getHours()
      if (!dayData.timed.has(hour)) dayData.timed.set(hour, [])
      dayData.timed.get(hour)!.push(task)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div key={i} className="px-2 py-2 text-center border-l">
              <div className="text-xs text-muted-foreground">{DAY_NAMES[i]}</div>
              <div className={`text-sm font-medium ${
                isToday
                  ? "inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground"
                  : ""
              }`}>
                {formatDayHeader(day)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/10">
        <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-start justify-end pr-3 pt-2">
          Journée
        </div>
        {weekDays.map((day, i) => {
          const dayData = tasksByDay.get(i)!
          return (
            <div
              key={i}
              onClick={() => onSlotClick(day)}
              className="border-l p-1 min-h-[36px] cursor-pointer hover:bg-muted/30 transition-colors"
            >
              {dayData.allDay.map((task) => (
                <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} compact />
              ))}
            </div>
          )
        })}
      </div>

      {hours.map((hour) => (
        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
          <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-start justify-end pr-3 pt-1">
            {String(hour).padStart(2, "0")}:00
          </div>
          {weekDays.map((day, i) => {
            const dayData = tasksByDay.get(i)!
            const hourTasks = dayData.timed.get(hour) || []
            return (
              <div
                key={i}
                onClick={() => onSlotClick(day, hour)}
                className="border-l p-0.5 min-h-[48px] cursor-pointer hover:bg-muted/30 transition-colors"
              >
                {hourTasks.map((task) => (
                  <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
