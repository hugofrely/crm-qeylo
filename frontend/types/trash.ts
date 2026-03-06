export interface TrashItem {
  type: "contact" | "deal" | "task"
  id: string
  name: string
  deleted_at: string
  deleted_by_name: string | null
  deletion_source: string | null
}

export interface TrashCounts {
  contact: number
  deal: number
  task: number
  total: number
}
