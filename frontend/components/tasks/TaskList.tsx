"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Briefcase } from "lucide-react"

interface Task {
  id: number
  description: string
  due_date: string | null
  contact: number | null
  contact_name?: string
  deal: number | null
  deal_name?: string
  priority: string
  is_done: boolean
  created_at: string
  updated_at: string
}

interface TaskListProps {
  tasks: Task[]
  onToggle: (taskId: number, isDone: boolean) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          Haute
        </Badge>
      )
    case "normal":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Normale
        </Badge>
      )
    case "low":
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
          Basse
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          {priority}
        </Badge>
      )
  }
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

export function TaskList({ tasks, onToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">
          Aucune t&acirc;che trouv&eacute;e.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
            task.is_done ? "opacity-60" : ""
          }`}
        >
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) =>
              onToggle(task.id, checked === true)
            }
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <p
              className={`text-sm font-medium ${
                task.is_done ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.description}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    !task.is_done && isOverdue(task.due_date)
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.due_date)}
                </div>
              )}
              {task.contact_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {task.contact_name}
                </div>
              )}
              {task.deal_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  {task.deal_name}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {getPriorityBadge(task.priority)}
          </div>
        </div>
      ))}
    </div>
  )
}
