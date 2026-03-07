"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Briefcase } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Task } from "@/types"
import { EntityLink } from "@/components/shared/EntityLink"

interface TaskListProps {
  tasks: Task[]
  onToggle: (taskId: string, isDone: boolean) => void
  onEdit: (task: Task) => void
  onViewDetails: (task: Task) => void
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
        <Badge className="bg-red-50 text-red-800 hover:bg-red-50">
          Haute
        </Badge>
      )
    case "normal":
      return (
        <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-50">
          Normale
        </Badge>
      )
    case "low":
      return (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
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

const thClass = "text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"

export function TaskList({ tasks, onToggle, onEdit, onViewDetails }: TaskListProps) {
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
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-table-header-bg hover:bg-table-header-bg">
            <TableHead className={`w-10 ${thClass}`} />
            <TableHead className={thClass}>Tâche</TableHead>
            <TableHead className={`hidden md:table-cell ${thClass}`}>Échéance</TableHead>
            <TableHead className={`hidden md:table-cell ${thClass}`}>Contact / Deal</TableHead>
            <TableHead className={`hidden lg:table-cell ${thClass}`}>Assigné</TableHead>
            <TableHead className={thClass}>Priorité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              className={`cursor-pointer hover:bg-secondary/30 transition-colors ${
                task.is_done ? "opacity-60" : ""
              }`}
              onClick={() => onViewDetails(task)}
            >
              <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={task.is_done}
                  onCheckedChange={(checked) =>
                    onToggle(task.id, checked === true)
                  }
                />
              </TableCell>
              <TableCell>
                <p
                  className={`text-sm font-medium font-[family-name:var(--font-body)] break-words ${
                    task.is_done ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.description}
                </p>
                {task.due_date && (
                  <span className={`md:hidden text-xs mt-0.5 block font-[family-name:var(--font-body)] ${
                    !task.is_done && isOverdue(task.due_date) ? "text-red-600 font-medium" : "text-muted-foreground"
                  }`}>
                    {!task.is_done && isOverdue(task.due_date) && "\u26A0 "}
                    {formatDate(task.due_date)}
                  </span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {task.due_date ? (
                  <span
                    className={`text-sm font-[family-name:var(--font-body)] ${
                      !task.is_done && isOverdue(task.due_date)
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatDate(task.due_date)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">&mdash;</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex flex-col gap-1">
                  {task.contact_name && task.contact && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                      <User className="h-3 w-3 shrink-0" />
                      <EntityLink type="contact" id={task.contact} name={task.contact_name} />
                    </div>
                  )}
                  {task.deal_name && task.deal && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground font-[family-name:var(--font-body)]">
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <EntityLink type="deal" id={task.deal} name={task.deal_name} />
                    </div>
                  )}
                  {!task.contact_name && !task.deal_name && (
                    <span className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">&mdash;</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {task.assignees.slice(0, 3).map((a) => (
                      <span
                        key={a.user_id}
                        title={`${a.first_name} ${a.last_name}`}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-medium shrink-0"
                      >
                        {a.first_name[0]}{a.last_name[0]}
                      </span>
                    ))}
                    {task.assignees.length > 3 && (
                      <span
                        title={task.assignees.slice(3).map((a) => `${a.first_name} ${a.last_name}`).join(", ")}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-muted-foreground text-[10px] font-medium shrink-0"
                      >
                        +{task.assignees.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">&mdash;</span>
                )}
              </TableCell>
              <TableCell>
                {getPriorityBadge(task.priority)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
