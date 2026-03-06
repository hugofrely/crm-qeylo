"use client"

import type { Task } from "@/types"

interface CalendarTaskItemProps {
  task: Task
  onClick: (task: Task) => void
  compact?: boolean
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  normal: "bg-blue-500",
  low: "bg-gray-400",
}

export function CalendarTaskItem({ task, onClick, compact = false }: CalendarTaskItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(task)
      }}
      className={`w-full text-left rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-muted/80 group flex items-center gap-1.5 min-w-0 overflow-hidden ${
        task.is_done ? "opacity-50" : ""
      }`}
      title={task.description}
    >
      <span
        className={`inline-block shrink-0 h-1.5 w-1.5 rounded-full ${
          priorityColors[task.priority] || "bg-gray-400"
        }`}
      />
      <span className={`truncate min-w-0 ${task.is_done ? "line-through" : ""}`}>
        {!compact && task.due_date && (() => {
          const d = new Date(task.due_date)
          const h = d.getHours()
          const m = d.getMinutes()
          if (h === 23 && m === 59) return null
          return (
            <span className="text-muted-foreground font-medium mr-1">
              {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
            </span>
          )
        })()}
        {task.description}
      </span>
    </button>
  )
}
