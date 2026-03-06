"use client"

import type { Task } from "@/types"
import { CalendarTaskItem } from "./CalendarTaskItem"

interface MonthGridProps {
  currentDate: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onDateClick: (date: Date) => void
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MAX_VISIBLE = 3

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: Date[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  while (days.length < 42) {
    const nextDay = new Date(year, month + 1, days.length - lastDay.getDate() - startOffset + 1)
    days.push(nextDay)
  }

  return days
}

export function MonthGrid({ currentDate, tasks, onTaskClick, onDateClick }: MonthGridProps) {
  const days = getMonthDays(currentDate)
  const today = new Date()

  const tasksByDate = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.due_date) continue
    const d = new Date(task.due_date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!tasksByDate.has(key)) tasksByDate.set(key, [])
    tasksByDate.get(key)!.push(task)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_NAMES.map((name) => (
          <div key={name} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, today)
          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
          const dayTasks = tasksByDate.get(key) || []

          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/30 ${
                !isCurrentMonth ? "bg-muted/10" : ""
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <div className={`text-xs mb-1 ${
                isToday
                  ? "inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold"
                  : isCurrentMonth
                    ? "text-foreground font-medium"
                    : "text-muted-foreground/50"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, MAX_VISIBLE).map((task) => (
                  <CalendarTaskItem key={task.id} task={task} onClick={onTaskClick} compact />
                ))}
                {dayTasks.length > MAX_VISIBLE && (
                  <div className="text-[10px] text-muted-foreground pl-1.5">
                    +{dayTasks.length - MAX_VISIBLE} autre{dayTasks.length - MAX_VISIBLE > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
