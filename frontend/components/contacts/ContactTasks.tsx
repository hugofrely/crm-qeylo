"use client"

import type { Task } from "@/types"
import { Check, Calendar } from "lucide-react"

/* ── Helpers ── */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "high":
      return "bg-rose-100 text-rose-700 border-rose-200"
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-200"
    default:
      return "bg-secondary text-muted-foreground border-border"
  }
}

function getPriorityLabel(priority: string) {
  switch (priority) {
    case "high":
      return "Haute"
    case "medium":
      return "Moyenne"
    case "low":
      return "Basse"
    default:
      return priority
  }
}

/* ── Props ── */

export interface ContactTasksProps {
  tasks: Task[]
  onToggle: (taskId: string, isDone: boolean) => void
}

export function ContactTasks({ tasks, onToggle }: ContactTasksProps) {
  if (tasks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-10 font-[family-name:var(--font-body)]">
        Aucune tache pour ce contact.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start gap-3 rounded-lg border border-border p-3 transition-colors ${
            task.is_done ? "opacity-60" : ""
          }`}
        >
          <button
            onClick={() => onToggle(String(task.id), !task.is_done)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              task.is_done
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-primary"
            }`}
          >
            {task.is_done && <Check className="h-3 w-3" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-[family-name:var(--font-body)] ${task.is_done ? "line-through" : ""}`}>
              {task.description}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {task.priority && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${getPriorityStyle(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
              )}
              {task.due_date && (
                <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)] flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
