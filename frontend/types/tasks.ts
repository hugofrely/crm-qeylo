export interface TaskAssignee {
  user_id: string
  email: string
  first_name: string
  last_name: string
  assigned_at: string
}

export interface Task {
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
  assignees: TaskAssignee[]
}

export interface TasksResponse {
  count: number
  todo_count: number
  done_count: number
  results: Task[]
}

export type TaskFilterTab = "all" | "todo" | "done"

export interface TaskFilters {
  is_done?: "true" | "false"
  priority?: "high" | "normal" | "low"
  contact?: string
  due_date?: "overdue" | "today" | "this_week"
  assigned_to?: string
  due_date_gte?: string
  due_date_lte?: string
  page?: number
}
