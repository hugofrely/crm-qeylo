export interface ContactResult {
  id: string
  first_name: string
  last_name: string
  company: string
  email: string
}

export interface DealResult {
  id: string
  name: string
  amount: string
  stage_name: string
  contact_name: string
}

export interface TaskResult {
  id: string
  description: string
  priority: string
  due_date: string
  is_done: boolean
  contact_name: string
}

export interface CompanyResult {
  id: string
  name: string
  industry: string
  city: string
}

export interface SearchResults {
  contacts: ContactResult[]
  deals: DealResult[]
  tasks: TaskResult[]
  companies: CompanyResult[]
}
