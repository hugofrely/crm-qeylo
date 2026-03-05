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
}

export interface TasksResponse {
  count: number
  results: Task[]
}

export type TaskFilterTab = "all" | "todo" | "done"
