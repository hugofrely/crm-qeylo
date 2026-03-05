"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Briefcase } from "lucide-react"

interface Task {
  id: string
  description: string
  due_date: string | null
  contact: string | null
  contact_name?: string
  deal: string | null
  deal_name?: string
  priority: string
  is_done: boolean
  created_at: string
}

interface TaskListProps {
  tasks: Task[]
  onToggle: (taskId: string, isDone: boolean) => void
  onEdit: (task: Task) => void
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
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 text-[10px] font-medium">
          Haute
        </Badge>
      )
    case "normal":
      return (
        <Badge className="bg-primary/8 text-primary border-primary/20 hover:bg-primary/8 text-[10px] font-medium">
          Normale
        </Badge>
      )
    case "low":
      return (
        <Badge className="bg-secondary text-muted-foreground border-border hover:bg-secondary text-[10px] font-medium">
          Basse
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-[10px] font-medium">
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

export function TaskList({ tasks, onToggle, onEdit }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucune tâche trouvée.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card transition-all hover:shadow-sm font-[family-name:var(--font-body)] cursor-pointer ${
            task.is_done ? "opacity-50" : ""
          }`}
          onClick={() => onEdit(task)}
        >
          <Checkbox
            checked={task.is_done}
            onCheckedChange={(checked) =>
              onToggle(task.id, checked === true)
            }
            className="mt-0.5"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p
              className={`text-sm font-medium leading-relaxed ${
                task.is_done ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.description}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-[11px] ${
                    !task.is_done && isOverdue(task.due_date)
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.due_date)}
                </div>
              )}
              {task.contact_name && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3" />
                  {task.contact_name}
                </div>
              )}
              {task.deal_name && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
